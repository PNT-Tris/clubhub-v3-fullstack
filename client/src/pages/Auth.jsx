import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Facebook, Mail, Phone, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { request } from '../api';
import { ErrorMessage, SuccessMessage } from '../components';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || '';

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [method, setMethod] = useState('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const googleButton = useRef(null);
  const { login, register, acceptSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const safeRedirect = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/';

  async function finishSocialLogin(path, payload) {
    setBusy(true); setError(''); setMessage('');
    try {
      const data = await request(path, { method: 'POST', body: JSON.stringify(payload) });
      acceptSession(data); navigate(safeRedirect);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleButton.current) return undefined;
    let disposed = false;
    const renderGoogleButton = () => {
      if (disposed || !window.google?.accounts?.id || !googleButton.current) return;
      googleButton.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => finishSocialLogin('/auth/google', { credential: response.credential })
      });
      window.google.accounts.id.renderButton(googleButton.current, { theme: 'filled_black', size: 'large', shape: 'rectangular', text: mode === 'register' ? 'signup_with' : 'signin_with', width: 320, locale: 'vi' });
    };
    if (window.google?.accounts?.id) renderGoogleButton();
    else {
      let script = document.getElementById('google-identity-script');
      if (!script) { script = document.createElement('script'); script.id = 'google-identity-script'; script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true; document.head.appendChild(script); }
      script.addEventListener('load', renderGoogleButton);
    }
    return () => { disposed = true; };
  }, [mode]);

  async function handleFacebook() {
    if (!FACEBOOK_APP_ID) { setError('Facebook Login chưa được cấu hình. Hãy nhập VITE_FACEBOOK_APP_ID trong client/.env.'); return; }
    setBusy(true); setError(''); setMessage('');
    const loginWithFacebookSdk = () => {
      if (!window.FB) { setBusy(false); setError('Không tải được Facebook SDK. Kiểm tra kết nối Internet hoặc cấu hình domain trong Meta Developer.'); return; }
      if (!window.__clubhubFacebookInitialized) {
        window.FB.init({ appId: FACEBOOK_APP_ID, cookie: true, xfbml: false, version: 'v26.0' });
        window.__clubhubFacebookInitialized = true;
      }
      window.FB.login((response) => {
        if (!response.authResponse?.accessToken) { setBusy(false); setError('Bạn đã hủy hoặc Facebook không cấp quyền đăng nhập.'); return; }
        finishSocialLogin('/auth/facebook', { accessToken: response.authResponse.accessToken });
      }, { scope: 'public_profile,email' });
    };
    if (window.FB) loginWithFacebookSdk();
    else {
      window.fbAsyncInit = loginWithFacebookSdk;
      if (!document.getElementById('facebook-jssdk')) {
        const script = document.createElement('script'); script.id = 'facebook-jssdk'; script.src = 'https://connect.facebook.net/vi_VN/sdk.js'; script.async = true; script.defer = true;
        script.onerror = () => { setBusy(false); setError('Không thể tải Facebook SDK.'); };
        document.body.appendChild(script);
      }
    }
  }

  async function submitEmail(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'login') { await login(email, password); navigate(safeRedirect); }
      else { const data = await register(name, email, password); setMessage(data.message || 'Tạo tài khoản thành công. Bạn có thể đăng nhập.'); setMode('login'); setPassword(''); }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function sendPhoneOtp() {
    setBusy(true); setError(''); setMessage('');
    try { const data = await request('/auth/phone/send-otp', { method: 'POST', body: JSON.stringify({ phone, intent: mode }) }); setOtpSent(true); setMessage(data.message); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function verifyPhoneOtp(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { const data = await request('/auth/phone/verify-otp', { method: 'POST', body: JSON.stringify({ phone, code: otp, name, intent: mode }) }); acceptSession(data); navigate(safeRedirect); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <section className="auth-wrap"><div className="auth-aside"><span className="eyebrow"><Sparkles size={15}/> CLUBHUB COMMUNITY</span><h2>Đi cùng nhau.<br/><em>Đi xa hơn.</em></h2><p>Một tài khoản mở ra cơ hội gia nhập câu lạc bộ, đăng ký sự kiện và kết nối với những người cùng đam mê.</p><div className="auth-security-note">🔒 Thông tin xác thực được kiểm tra ở máy chủ. Mật khẩu không được gửi cho Google hoặc Facebook.</div></div>
    <div className="auth-card"><span className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'JOIN THE COMMUNITY'}</span><h1>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h1><p className="muted">{mode === 'login' ? 'Chọn phương thức đăng nhập của bạn.' : 'Đăng ký để tham gia những cộng đồng bạn yêu thích.'}</p>
      <div className="auth-method-tabs"><button type="button" className={method === 'email' ? 'active' : ''} onClick={() => { setMethod('email'); setError(''); setMessage(''); }}> <Mail size={15}/> Email</button><button type="button" className={method === 'phone' ? 'active' : ''} onClick={() => { setMethod('phone'); setError(''); setMessage(''); }}><Phone size={15}/> Số điện thoại</button></div>
      {method === 'email' ? <form onSubmit={submitEmail}>
        {mode === 'register' && <label>Họ và tên<input required minLength="2" maxLength="80" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" autoComplete="name"/></label>}
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></label>
        <label>Mật khẩu<div className="password-field"><input type={showPassword ? 'text' : 'password'} required minLength={mode === 'register' ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'register' ? 'Tối thiểu 8 ký tự' : 'Nhập mật khẩu'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/><button type="button" className="password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
        <button className="btn btn-primary full" disabled={busy}>{busy ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản'}</button>
      </form> : <form onSubmit={verifyPhoneOtp}>
        {mode === 'register' && <label>Họ và tên (dùng khi tạo tài khoản mới)<input required minLength="2" maxLength="80" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A"/></label>}
        <label>Số điện thoại<input type="tel" required value={phone} onChange={(e) => { setPhone(e.target.value); setOtpSent(false); }} placeholder="+84901234567" autoComplete="tel"/><small>Nhập theo định dạng quốc tế, ví dụ +84901234567.</small></label>
        {!otpSent ? <button type="button" className="btn btn-primary full" disabled={busy || !phone.trim()} onClick={sendPhoneOtp}>{busy ? 'Đang gửi...' : mode === 'register' ? 'Gửi OTP đăng ký qua SMS' : 'Gửi OTP đăng nhập qua SMS'}</button> : <><label>Mã OTP<input inputMode="numeric" autoComplete="one-time-code" required value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Nhập mã SMS"/></label><button className="btn btn-primary full" disabled={busy}>{busy ? 'Đang xác minh...' : mode === 'register' ? 'Xác minh và tạo tài khoản' : 'Xác minh và đăng nhập'}</button><button type="button" className="text-link resend-otp" disabled={busy} onClick={sendPhoneOtp}>Gửi lại mã OTP</button></>}
      </form>}
      <ErrorMessage>{error}</ErrorMessage><SuccessMessage>{message}</SuccessMessage>
      {method === 'email' && <><div className="auth-divider"><span>hoặc tiếp tục với</span></div><div className="social-login-area">{GOOGLE_CLIENT_ID ? <div ref={googleButton} className="google-login-button"/> : <button type="button" className="social-login-button" disabled>Google · Chưa cấu hình</button>}{FACEBOOK_APP_ID ? <button type="button" className="social-login-button facebook-login" onClick={handleFacebook} disabled={busy}><Facebook size={17} fill="currentColor"/> Tiếp tục với Facebook</button> : <button type="button" className="social-login-button" disabled><Facebook size={17}/> Facebook · Chưa cấu hình</button>}</div><p className="auth-config-hint">Để bật Google/Facebook, hãy khai báo Client ID/App ID trong file môi trường và thêm domain localhost/website vào cấu hình của nhà cung cấp.</p></>}
      <p className="auth-switch">{mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setMessage(''); setOtpSent(false); }}>{mode === 'login' ? 'Đăng ký' : 'Đăng nhập'}</button></p><Link className="back-link" to="/">← Về trang chủ</Link>
    </div></section>;
}
