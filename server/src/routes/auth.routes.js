import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Event from '../models/Event.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();
const googleOAuthClient = new OAuth2Client();
const makeToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (user) => {
  const providers = user.authProviders?.length ? [...user.authProviders] : [];
  if (!providers.length) {
    if (user.googleId) providers.push('google');
    if (user.facebookId) providers.push('facebook');
    if (user.phone) providers.push('phone');
    if (!providers.length && !user.email?.endsWith('@phone.clubhub.invalid')) providers.push('password');
  }
  return {
    id: user._id, name: user.name, email: user.email?.endsWith('@phone.clubhub.invalid') ? '' : user.email,
    phone: user.phone || '', role: user.role, avatar: user.avatar || '', emailVerified: Boolean(user.emailVerified), authProviders: providers
  };
};
const sessionResponse = (user) => ({ token: makeToken(user._id), user: publicUser(user) });
const normalizePhone = (value) => String(value || '').trim().replace(/[\s()-]/g, '');
const validPhone = (phone) => /^\+[1-9]\d{7,14}$/.test(phone);
const otpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau 15 phút.' } });

async function verifyGoogleIdToken(credential) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!credential || !clientId) {
      const error = new Error('Google Login chưa được cấu hình GOOGLE_CLIENT_ID.'); error.status = 503; throw error;
    }
    const ticket = await googleOAuthClient.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      const error = new Error('Google ID token không hợp lệ hoặc email chưa được xác minh.'); error.status = 401; throw error;
    }
    return payload;
  } catch (cause) {
    if (cause.status) throw cause;
    const error = new Error('Không thể xác minh Google ID token. Token có thể không hợp lệ hoặc đã hết hạn.'); error.status = 401; throw error;
  }
}

async function sendTwilioOtp(phone) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    const error = new Error('Đăng nhập số điện thoại chưa được cấu hình. Quản trị viên cần thiết lập Twilio Verify trong server/.env.');
    error.status = 503; throw error;
  }
  const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`;
  const body = new URLSearchParams({ To: phone, Channel: 'sms' });
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.message || 'Không thể gửi mã OTP.'); error.status = response.status === 429 ? 429 : 502; throw error; }
  return data;
}

async function verifyTwilioOtp(phone, code) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    const error = new Error('Đăng nhập số điện thoại chưa được cấu hình Twilio Verify.'); error.status = 503; throw error;
  }
  const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`;
  const body = new URLSearchParams({ To: phone, Code: String(code || '').trim() });
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await response.json();
  if (!response.ok || data.status !== 'approved') return false;
  return true;
}

async function findOrCreateSocialUser({ provider, providerId, email, name, avatar }) {
  const providerField = provider === 'google' ? 'googleId' : 'facebookId';
  let user = await User.findOne({ [providerField]: providerId });
  if (!user) user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    if (!user[providerField] && !user.emailVerified) {
      const error = new Error('Email này đã có tài khoản ClubHub chưa xác minh. Hãy đăng nhập bằng phương thức hiện tại, sau đó liên kết Google/Facebook trong Hồ sơ cá nhân.'); error.status = 409; throw error;
    }
    if (user[providerField] && user[providerField] !== providerId) {
      const error = new Error('Email này đã được liên kết với một tài khoản mạng xã hội khác.'); error.status = 409; throw error;
    }
    const emailOwner = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
    if (emailOwner) { const error = new Error('Email từ nhà cung cấp đang thuộc một tài khoản ClubHub khác. Hãy đăng nhập tài khoản đó để liên kết.'); error.status = 409; throw error; }
    user[providerField] = providerId;
    user.authProviders = [...new Set([...(user.authProviders || []), provider])];
    if (!user.avatar && avatar) user.avatar = avatar;
    if ((!user.name || user.name === 'Thành viên ClubHub') && name) user.name = name;
    await user.save();
    return user;
  }
  user = await User.create({ name: name || email.split('@')[0], email: email.toLowerCase(), emailVerified: true, [providerField]: providerId, avatar: avatar || '', authProviders: [provider] });
  return user;
}

router.post('/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!name || !email || !password) return res.status(400).json({ message: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu.' });
    if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Họ tên phải có từ 2 đến 80 ký tự.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Email không đúng định dạng.' });
    if (password.length < 8) return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự.' });
    if (await User.findOne({ email })) return res.status(409).json({ message: 'Email đã được sử dụng.' });
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hash, authProviders: ['password'] });
    res.status(201).json({ message: 'Tạo tài khoản thành công. Bạn có thể đăng nhập.', user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' });
    res.json(sessionResponse(user));
  } catch (error) { next(error); }
});

// Google Identity Services gửi ID token; backend tự xác minh chữ ký/audience tại Google.
router.post('/google', async (req, res, next) => {
  try {
    const credential = String(req.body.credential || '');
    const payload = await verifyGoogleIdToken(credential);
    const user = await findOrCreateSocialUser({ provider: 'google', providerId: payload.sub, email: payload.email, name: payload.name, avatar: payload.picture });
    res.json(sessionResponse(user));
  } catch (error) { next(error); }
});

// Facebook access token được kiểm tra với Graph API và app id/secret phía server.
router.post('/facebook', async (req, res, next) => {
  try {
    const accessToken = String(req.body.accessToken || '');
    const { FACEBOOK_APP_ID, FACEBOOK_APP_SECRET } = process.env;
    if (!accessToken || !FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) return res.status(503).json({ message: 'Facebook Login chưa được cấu hình FACEBOOK_APP_ID/FACEBOOK_APP_SECRET.' });
    const appToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
    const debugResponse = await fetch(`https://graph.facebook.com/v26.0/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appToken)}`);
    const debugData = await debugResponse.json();
    if (!debugResponse.ok || !debugData.data?.is_valid || debugData.data.app_id !== FACEBOOK_APP_ID) return res.status(401).json({ message: 'Facebook access token không hợp lệ.' });
    const profileResponse = await fetch(`https://graph.facebook.com/v26.0/me?fields=id,name,email,picture&access_token=${encodeURIComponent(accessToken)}`);
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.id || !profile.email) return res.status(400).json({ message: 'Facebook không cung cấp email. Hãy cấp quyền email hoặc dùng phương thức khác.' });
    const user = await findOrCreateSocialUser({ provider: 'facebook', providerId: profile.id, email: profile.email, name: profile.name, avatar: profile.picture?.data?.url });
    res.json(sessionResponse(user));
  } catch (error) { next(error); }
});

router.post('/phone/send-otp', otpLimiter, async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const intent = req.body.intent === 'register' ? 'register' : 'login';
    if (!validPhone(phone)) return res.status(400).json({ message: 'Nhập số điện thoại theo định dạng quốc tế, ví dụ +84901234567.' });
    const existingUser = await User.findOne({ phone }).select('_id');
    if (intent === 'login' && !existingUser) return res.status(404).json({ message: 'Số điện thoại chưa có tài khoản. Hãy chuyển sang tab Đăng ký để tạo tài khoản mới.' });
    if (intent === 'register' && existingUser) return res.status(409).json({ message: 'Số điện thoại đã có tài khoản. Hãy chuyển sang tab Đăng nhập.' });
    await sendTwilioOtp(phone);
    res.json({ message: intent === 'register' ? 'Mã OTP đăng ký đã được gửi qua SMS.' : 'Mã OTP đăng nhập đã được gửi qua SMS.' });
  } catch (error) { next(error); }
});

router.post('/phone/verify-otp', otpLimiter, async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const code = String(req.body.code || '').trim();
    const name = String(req.body.name || '').trim();
    const intent = req.body.intent === 'register' ? 'register' : 'login';
    if (!validPhone(phone) || !/^\d{4,10}$/.test(code)) return res.status(400).json({ message: 'Số điện thoại hoặc mã OTP không hợp lệ.' });
    let user = await User.findOne({ phone });
    if (intent === 'login' && !user) return res.status(404).json({ message: 'Số điện thoại chưa có tài khoản. Hãy chuyển sang tab Đăng ký.' });
    if (intent === 'register' && user) return res.status(409).json({ message: 'Số điện thoại đã có tài khoản. Hãy chuyển sang tab Đăng nhập.' });
    if (!await verifyTwilioOtp(phone, code)) return res.status(401).json({ message: 'Mã OTP không đúng hoặc đã hết hạn.' });
    user = await User.findOne({ phone });
    if (!user) {
      const safeName = name.length >= 2 ? name.slice(0, 80) : `Thành viên ${phone.slice(-4)}`;
      const internalEmail = `phone.${phone.replace(/\D/g, '')}@phone.clubhub.invalid`;
      user = await User.create({ name: safeName, email: internalEmail, phone, authProviders: ['phone'] });
    } else {
      user.authProviders = [...new Set([...(user.authProviders || []), 'phone'])];
      await user.save();
    }
    res.json(sessionResponse(user));
  } catch (error) { next(error); }
});

// Liên kết số điện thoại đã xác minh vào tài khoản hiện tại.
router.post('/phone/link/send-otp', protect, otpLimiter, async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    if (!validPhone(phone)) return res.status(400).json({ message: 'Số điện thoại phải ở định dạng quốc tế, ví dụ +84901234567.' });
    if (await User.findOne({ phone, _id: { $ne: req.user._id } })) return res.status(409).json({ message: 'Số điện thoại này đã được liên kết với tài khoản khác.' });
    await sendTwilioOtp(phone);
    res.json({ message: 'Đã gửi mã xác minh để liên kết số điện thoại.' });
  } catch (error) { next(error); }
});

router.post('/phone/link/verify-otp', protect, otpLimiter, async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const code = String(req.body.code || '').trim();
    if (!validPhone(phone) || !/^\d{4,10}$/.test(code)) return res.status(400).json({ message: 'Số điện thoại hoặc mã OTP không hợp lệ.' });
    if (!await verifyTwilioOtp(phone, code)) return res.status(401).json({ message: 'Mã OTP không đúng hoặc đã hết hạn.' });
    if (await User.findOne({ phone, _id: { $ne: req.user._id } })) return res.status(409).json({ message: 'Số điện thoại này đã được liên kết với tài khoản khác.' });
    req.user.phone = phone;
    req.user.authProviders = [...new Set([...(req.user.authProviders || []), 'phone'])];
    await req.user.save();
    res.json({ message: 'Đã liên kết số điện thoại.', user: publicUser(req.user) });
  } catch (error) { next(error); }
});

// Liên kết Google vào tài khoản đang đăng nhập (hữu ích với tài khoản tạo bằng số điện thoại).
router.post('/google/link', protect, async (req, res, next) => {
  try {
    const credential = String(req.body.credential || '');
    const payload = await verifyGoogleIdToken(credential);
    const otherAccount = await User.findOne({ googleId: payload.sub, _id: { $ne: req.user._id } });
    if (otherAccount) return res.status(409).json({ message: 'Google account này đã được liên kết với tài khoản ClubHub khác.' });
    const emailOwner = await User.findOne({ email: payload.email.toLowerCase(), _id: { $ne: req.user._id } });
    if (emailOwner) return res.status(409).json({ message: 'Email Google đang thuộc một tài khoản ClubHub khác. Hãy đăng nhập bằng tài khoản đó để liên kết.' });
    req.user.googleId = payload.sub;
    if (req.user.email?.endsWith('@phone.clubhub.invalid')) { req.user.email = payload.email.toLowerCase(); req.user.emailVerified = true; }
    else if (req.user.email?.toLowerCase() === payload.email.toLowerCase()) req.user.emailVerified = true;
    req.user.authProviders = [...new Set([...(req.user.authProviders || []), 'google'])];
    if (!req.user.avatar && payload.picture) req.user.avatar = payload.picture;
    await req.user.save();
    res.json({ message: 'Đã liên kết tài khoản Google.', user: publicUser(req.user) });
  } catch (error) { next(error); }
});

// Liên kết Facebook vào tài khoản đang đăng nhập.
router.post('/facebook/link', protect, async (req, res, next) => {
  try {
    const accessToken = String(req.body.accessToken || '');
    const { FACEBOOK_APP_ID, FACEBOOK_APP_SECRET } = process.env;
    if (!accessToken || !FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) return res.status(503).json({ message: 'Facebook Login chưa được cấu hình.' });
    const appToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
    const debugResponse = await fetch(`https://graph.facebook.com/v26.0/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appToken)}`);
    const debugData = await debugResponse.json();
    if (!debugResponse.ok || !debugData.data?.is_valid || debugData.data.app_id !== FACEBOOK_APP_ID) return res.status(401).json({ message: 'Facebook access token không hợp lệ.' });
    const profileResponse = await fetch(`https://graph.facebook.com/v26.0/me?fields=id,name,email,picture&access_token=${encodeURIComponent(accessToken)}`);
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.id || !profile.email) return res.status(400).json({ message: 'Facebook cần cấp quyền email để liên kết.' });
    const otherAccount = await User.findOne({ facebookId: profile.id, _id: { $ne: req.user._id } });
    if (otherAccount) return res.status(409).json({ message: 'Facebook account này đã được liên kết với tài khoản ClubHub khác.' });
    const emailOwner = await User.findOne({ email: profile.email.toLowerCase(), _id: { $ne: req.user._id } });
    if (emailOwner) return res.status(409).json({ message: 'Email Facebook đang thuộc một tài khoản ClubHub khác. Hãy đăng nhập bằng tài khoản đó để liên kết.' });
    req.user.facebookId = profile.id;
    if (req.user.email?.endsWith('@phone.clubhub.invalid')) { req.user.email = profile.email.toLowerCase(); req.user.emailVerified = true; }
    else if (req.user.email?.toLowerCase() === profile.email.toLowerCase()) req.user.emailVerified = true;
    req.user.authProviders = [...new Set([...(req.user.authProviders || []), 'facebook'])];
    if (!req.user.avatar && profile.picture?.data?.url) req.user.avatar = profile.picture.data.url;
    await req.user.save();
    res.json({ message: 'Đã liên kết tài khoản Facebook.', user: publicUser(req.user) });
  } catch (error) { next(error); }
});

router.get('/me', protect, (req, res) => res.json({ user: publicUser(req.user) }));

router.patch('/me', protect, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Họ tên phải có từ 2 đến 80 ký tự.' });
    req.user.name = name;
    await req.user.save();
    res.json({ message: 'Đã cập nhật hồ sơ.', user: publicUser(req.user) });
  } catch (error) { next(error); }
});

router.get('/me/summary', protect, async (req, res, next) => {
  try {
    const [memberships, upcomingEvents] = await Promise.all([
      Membership.find({ user: req.user._id }).populate('club', 'name category').sort({ updatedAt: -1 }),
      Event.find({ 'registrations.user': req.user._id, startAt: { $gte: new Date() }, status: 'published' }).populate('club', 'name').sort({ startAt: 1 })
    ]);
    res.json({ memberships, upcomingEvents });
  } catch (error) { next(error); }
});

export default router;
