import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { request } from '../api';
import { ErrorMessage, SuccessMessage } from '../components';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || '';

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [phoneOtpMode, setPhoneOtpMode] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const googleButton = useRef(null);
  const { login, register, acceptSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const safeRedirect = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/';
  const isPhone = /\d/.test(identifier.trim()) && /^[+\d\s()-]+$/.test(identifier.trim());
  const usePhoneOtp = isPhone && (mode === 'register' || phoneOtpMode);

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
      const width = Math.floor(googleButton.current.getBoundingClientRect().width);
      if (!width) return;
      googleButton.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => finishSocialLogin('/auth/google', { credential: response.credential })
      });
      window.google.accounts.id.renderButton(googleButton.current, { theme: 'outline', size: 'large', shape: 'rectangular', text: 'continue', logo_alignment: 'left', width, locale: 'vi' });
    };
    window.addEventListener('resize', renderGoogleButton);
    if (window.google?.accounts?.id) renderGoogleButton();
    else {
      let script = document.getElementById('google-identity-script');
      if (!script) { script = document.createElement('script'); script.id = 'google-identity-script'; script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true; document.head.appendChild(script); }
      script.addEventListener('load', renderGoogleButton);
    }
    return () => {
      disposed = true;
      window.removeEventListener('resize', renderGoogleButton);
    };
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

  async function submitCredentials(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'login') { await login(identifier, password); navigate(safeRedirect); }
      else { const data = await register(name, identifier, password); setMessage(data.message || 'Tạo tài khoản thành công. Bạn có thể đăng nhập.'); setMode('login'); setPassword(''); }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function sendPhoneOtp() {
    setBusy(true); setError(''); setMessage('');
    try { const data = await request('/auth/phone/send-otp', { method: 'POST', body: JSON.stringify({ phone: identifier, intent: mode }) }); setOtpSent(true); setMessage(data.message); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function verifyPhoneOtp(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { const data = await request('/auth/phone/verify-otp', { method: 'POST', body: JSON.stringify({ phone: identifier, code: otp, name, password: mode === 'register' ? password : undefined, intent: mode }) }); acceptSession(data); navigate(safeRedirect); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <section className="auth-wrap"><div className="auth-aside"><span className="eyebrow"><Sparkles size={15}/> CLUBHUB COMMUNITY</span><h2>Đi cùng nhau.<br/><em>Đi xa hơn.</em></h2><p>Một tài khoản mở ra cơ hội gia nhập câu lạc bộ, đăng ký sự kiện và kết nối với những người cùng đam mê.</p><div className="auth-security-note">🔒 Thông tin xác thực được kiểm tra ở máy chủ. Mật khẩu không được gửi cho Google hoặc Facebook.</div></div>
    <div className="auth-card"><span className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'JOIN THE COMMUNITY'}</span><h1>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h1><p className="muted">{mode === 'login' ? 'Dùng email hoặc số điện thoại để tiếp tục.' : 'Đăng ký bằng email hoặc số điện thoại của bạn.'}</p>
      <form onSubmit={usePhoneOtp ? verifyPhoneOtp : submitCredentials}>
        {mode === 'register' && <label>Họ và tên<input required minLength="2" maxLength="80" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" autoComplete="name"/></label>}
        <label>Email hoặc số điện thoại<input type={isPhone ? 'tel' : 'email'} required value={identifier} onChange={(e) => { setIdentifier(e.target.value); setOtpSent(false); setOtp(''); setError(''); setMessage(''); }} placeholder="Email hoặc +84901234567" autoComplete="username"/></label>
        {isPhone && <small>Số điện thoại cần có mã quốc gia, ví dụ +84901234567.</small>}
        {(!usePhoneOtp || mode === 'register') && <label>Mật khẩu<div className="password-field"><input type={showPassword ? 'text' : 'password'} required minLength={mode === 'register' ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'register' ? 'Tối thiểu 8 ký tự' : 'Nhập mật khẩu'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/><button type="button" className="password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>}
        {usePhoneOtp ? (!otpSent ? <button type="button" className="btn btn-primary full" disabled={busy || !identifier.trim()} onClick={sendPhoneOtp}>{busy ? 'Đang gửi...' : 'Gửi mã xác minh qua SMS'}</button> : <><label>Mã xác minh SMS<input inputMode="numeric" autoComplete="one-time-code" required value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Nhập mã SMS"/></label><button className="btn btn-primary full" disabled={busy}>{busy ? 'Đang xác minh...' : mode === 'register' ? 'Xác minh và tạo tài khoản' : 'Xác minh và đăng nhập'}</button><button type="button" className="text-link resend-otp" disabled={busy} onClick={sendPhoneOtp}>Gửi lại mã</button></>) : <button className="btn btn-primary full" disabled={busy}>{busy ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản'}</button>}
        {isPhone && mode === 'login' && !phoneOtpMode && <button type="button" className="text-link resend-otp" onClick={() => { setPhoneOtpMode(true); setOtpSent(false); setError(''); setMessage(''); }}>Đăng nhập bằng mã SMS</button>}
        {isPhone && mode === 'login' && phoneOtpMode && <button type="button" className="text-link resend-otp" onClick={() => { setPhoneOtpMode(false); setOtpSent(false); setError(''); setMessage(''); }}>Đăng nhập bằng mật khẩu</button>}
      </form>
      <ErrorMessage>{error}</ErrorMessage><SuccessMessage>{message}</SuccessMessage>
      <><div className="auth-divider"><span>hoặc tiếp tục với</span></div><div className="social-login-area">{GOOGLE_CLIENT_ID ? <div ref={googleButton} className="google-login-button"><span className="google-login-label" aria-hidden="true"><svg viewBox="0 0 48 48" focusable="false"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8V33A20 20 0 0 0 24 44z"/><path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5H5.8a20 20 0 0 0 0 17.2z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.9 29.5 4 24 4A20 20 0 0 0 5.8 15.4l6.8 5.2C14.2 15.6 18.7 12 24 12z"/></svg><span>Tiếp tục với Google</span></span></div> : <button type="button" className="social-login-button" disabled>Google · Chưa cấu hình</button>}{FACEBOOK_APP_ID ? <button type="button" className="social-login-button facebook-login" onClick={handleFacebook} disabled={busy}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="11" fill="#1877F2"/><path d="M15.8 12.6h-2.2v7.1h-2.9v-7.1H8.9v-2.5h1.8V8.6c0-2.2 1-3.5 3.6-3.5h2.2v2.5h-1.4c-1 0-1.5.6-1.5 1.5v1h2.9l-.7 2.5z" fill="#fff"/></svg><span>{busy ? 'Đang xử lý...' : 'Tiếp tục với Facebook'}</span></button> : <button type="button" className="social-login-button" disabled><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="11" fill="#1877F2"/><path d="M15.8 12.6h-2.2v7.1h-2.9v-7.1H8.9v-2.5h1.8V8.6c0-2.2 1-3.5 3.6-3.5h2.2v2.5h-1.4c-1 0-1.5.6-1.5 1.5v1h2.9l-.7 2.5z" fill="#fff"/></svg><span>Facebook · Chưa cấu hình</span></button>}</div><p className="auth-config-hint">Để bật Google/Facebook, hãy khai báo Client ID/App ID trong file môi trường và thêm domain localhost/website vào cấu hình của nhà cung cấp.</p></>
      <p className="auth-switch">{mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setMessage(''); setOtpSent(false); setOtp(''); setPhoneOtpMode(false); }}>{mode === 'login' ? 'Đăng ký' : 'Đăng nhập'}</button></p><Link className="back-link" to="/">← Về trang chủ</Link>
    </div></section>;
}
