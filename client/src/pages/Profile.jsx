import { useEffect, useRef, useState } from 'react';
import { Mail, Shield, UserRound, Save, Phone, Link2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { request } from '../api';
import { ErrorMessage, SuccessMessage } from '../components';
import { Link } from 'react-router-dom';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || '';
const providerNames = { password: 'Email và mật khẩu', google: 'Google', facebook: 'Facebook', phone: 'Số điện thoại' };
export default function Profile() {
  const { user, updateProfile, updateCurrentUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState(user?.phone || ''); const [otp, setOtp] = useState(''); const [otpSent, setOtpSent] = useState(false);
  const [providerBusy, setProviderBusy] = useState(false); const googleSlot = useRef(null);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { const data = await updateProfile(name); setName(data.user.name); setMessage(data.message); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function sendPhoneOtp() {
    setBusy(true); setError(''); setMessage('');
    try { const data = await request('/auth/phone/link/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }); setOtpSent(true); setMessage(data.message); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function verifyPhone(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { const data = await request('/auth/phone/link/verify-otp', { method: 'POST', body: JSON.stringify({ phone, code: otp }) }); updateCurrentUser(data.user); setMessage(data.message); setOtpSent(false); setOtp(''); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleSlot.current) return undefined;
    let disposed = false;
    const renderGoogleButton = () => {
      if (disposed || !window.google?.accounts?.id || !googleSlot.current) return;
      googleSlot.current.innerHTML = '';
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: async (response) => {
        setProviderBusy(true); setError(''); setMessage('');
        try { const data = await request('/auth/google/link', { method: 'POST', body: JSON.stringify({ credential: response.credential }) }); updateCurrentUser(data.user); setMessage(data.message); }
        catch (err) { setError(err.message); }
        finally { setProviderBusy(false); }
      } });
      window.google.accounts.id.renderButton(googleSlot.current, { theme: 'filled_black', size: 'large', shape: 'rectangular', text: 'continue_with', width: 300, locale: 'vi' });
    };
    if (window.google?.accounts?.id) renderGoogleButton();
    else {
      let script = document.getElementById('google-identity-script');
      if (!script) { script = document.createElement('script'); script.id = 'google-identity-script'; script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true; document.head.appendChild(script); }
      script.addEventListener('load', renderGoogleButton);
    }
    return () => { disposed = true; };
  }, [user?.id]);

  async function linkFacebook() {
    if (!FACEBOOK_APP_ID) { setError('Chưa cấu hình Facebook App ID trong client/.env.'); return; }
    setProviderBusy(true); setError(''); setMessage('');
    const start = () => {
      if (!window.FB) { setProviderBusy(false); setError('Không tải được Facebook SDK.'); return; }
      if (!window.__clubhubFacebookInitialized) { window.FB.init({ appId: FACEBOOK_APP_ID, cookie: true, xfbml: false, version: 'v26.0' }); window.__clubhubFacebookInitialized = true; }
      window.FB.login(async (response) => {
        if (!response.authResponse?.accessToken) { setProviderBusy(false); setError('Bạn đã hủy thao tác liên kết Facebook.'); return; }
        try { const data = await request('/auth/facebook/link', { method: 'POST', body: JSON.stringify({ accessToken: response.authResponse.accessToken }) }); updateCurrentUser(data.user); setMessage(data.message); }
        catch (err) { setError(err.message); }
        finally { setProviderBusy(false); }
      }, { scope: 'public_profile,email' });
    };
    if (window.FB) start();
    else { window.fbAsyncInit = start; if (!document.getElementById('facebook-jssdk')) { const script = document.createElement('script'); script.id = 'facebook-jssdk'; script.src = 'https://connect.facebook.net/vi_VN/sdk.js'; script.async = true; script.defer = true; script.onerror = () => { setProviderBusy(false); setError('Không thể tải Facebook SDK.'); }; document.body.appendChild(script); } }
  }

  const providers = user?.authProviders?.length ? user.authProviders : (user?.email ? ['password'] : []);
  return <section className="container page"><div className="page-heading"><span className="eyebrow">YOUR SPACE</span><h1>Hồ sơ cá nhân</h1><p>Quản lý thông tin và các phương thức đăng nhập được liên kết với tài khoản.</p></div>
    <ErrorMessage>{error}</ErrorMessage><SuccessMessage>{message}</SuccessMessage>
    <div className="profile-layout"><div className="profile-card"><div className="avatar">{user?.name?.[0]?.toUpperCase()}</div><h2>{user?.name}</h2>{user?.email && !user.email.endsWith('@phone.clubhub.invalid') && <p><Mail/> {user.email}</p>}{user?.phone && <p><Phone/> {user.phone}</p>}<p><Shield/> Vai trò hệ thống: {user?.role === 'admin' ? 'Admin toàn website' : 'Thành viên'}</p><Link className="btn btn-ghost" to="/my-activities">Xem hoạt động của tôi</Link><div className="linked-providers"><b>Phương thức đăng nhập liên kết</b>{providers.map((provider) => <span key={provider}><CheckCircle2 size={14}/> {providerNames[provider] || provider}</span>)}</div></div>
      <div className="profile-settings-column"><form className="form-panel" onSubmit={submit}><span className="eyebrow">ACCOUNT SETTINGS</span><h2>Thông tin tài khoản</h2><label>Họ và tên<input required minLength="2" maxLength="80" value={name} onChange={(e) => setName(e.target.value)}/></label><label>Email<input value={user?.email?.endsWith('@phone.clubhub.invalid') ? '' : user?.email || ''} disabled placeholder="Chưa liên kết email"/></label><button className="btn btn-primary" disabled={busy}><Save size={16}/>{busy ? 'Đang lưu...' : 'Lưu thay đổi'}</button></form>
      <form className="form-panel phone-link-panel" onSubmit={verifyPhone}><span className="eyebrow">PHONE VERIFICATION</span><h2><Link2 size={18}/> Liên kết số điện thoại</h2><p className="form-help">Xác minh số điện thoại bằng SMS để có thể sử dụng số này đăng nhập cho tài khoản hiện tại.</p><label>Số điện thoại<input type="tel" required pattern="\+[1-9][0-9]{7,14}" value={phone} onChange={(e) => { setPhone(e.target.value); setOtpSent(false); }} placeholder="+84901234567"/></label>{otpSent && <label>Mã OTP<input required inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Mã xác minh SMS"/></label>}{!otpSent ? <button type="button" className="btn btn-ghost" disabled={busy || !phone.trim()} onClick={sendPhoneOtp}>Gửi mã xác minh</button> : <button className="btn btn-primary" disabled={busy}>{busy ? 'Đang xác minh...' : 'Xác minh và liên kết'}</button>}</form>
      <div className="form-panel phone-link-panel"><span className="eyebrow">SOCIAL CONNECTIONS</span><h2><Link2 size={18}/> Liên kết tài khoản mạng xã hội</h2><p className="form-help">Bạn có thể liên kết Google/Facebook với tài khoản hiện tại. Nếu đăng nhập bằng nhà cung cấp có cùng email đã xác minh, hệ thống cũng tự nhận diện cùng tài khoản.</p><div className="provider-link-actions">{providers.includes('google') ? <span className="provider-linked"><CheckCircle2 size={15}/> Google đã liên kết</span> : GOOGLE_CLIENT_ID ? <div ref={googleSlot} className="google-login-button"/> : <button type="button" className="btn btn-ghost" disabled>Google · Chưa cấu hình</button>}{providers.includes('facebook') ? <span className="provider-linked"><CheckCircle2 size={15}/> Facebook đã liên kết</span> : <button type="button" className="btn btn-ghost" disabled={providerBusy || !FACEBOOK_APP_ID} onClick={linkFacebook}><Link2 size={15}/> {FACEBOOK_APP_ID ? 'Liên kết Facebook' : 'Facebook · Chưa cấu hình'}</button>}</div></div></div></div>
  </section>;
}
