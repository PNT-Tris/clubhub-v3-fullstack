import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, MapPin, Users, UserCheck, XCircle, ShieldCheck } from 'lucide-react';
import { request } from '../api';
import { useAuth } from '../context/AuthContext';
import { Empty, ErrorMessage, Loading, SuccessMessage } from '../components';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [canManageAttendance, setCanManageAttendance] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadEvent = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await request(`/events/${id}`);
      setEvent(data.event);
      if (user) {
        const mine = await request(`/events/${id}/registration/me`);
        setRegistration(mine.registration);
        try { const list = await request(`/events/${id}/registrations`); setAttendees(list.registrations || []); setCanManageAttendance(true); }
        catch { setAttendees([]); setCanManageAttendance(false); }
      } else { setRegistration(null); setAttendees([]); setCanManageAttendance(false); }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [id, user?.id]);

  useEffect(() => { loadEvent(); }, [loadEvent]);

  async function register() {
    if (!user) { navigate(`/auth?redirect=${encodeURIComponent(`/events/${id}`)}`); return; }
    setBusy(true); setMessage(''); setError('');
    try { const data = await request(`/events/${id}/register`, { method: 'POST' }); setMessage(data.message); await loadEvent(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function cancelRegistration() {
    if (!window.confirm('Bạn muốn hủy đăng ký sự kiện này?')) return;
    setBusy(true); setMessage(''); setError('');
    try { const data = await request(`/events/${id}/register`, { method: 'DELETE' }); setMessage(data.message); await loadEvent(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function setAttendance(userId, attended) {
    setBusy(true); setError(''); setMessage('');
    try { const data = await request(`/events/${id}/attendance/${userId}`, { method: 'PATCH', body: JSON.stringify({ attended }) }); setMessage(data.message); await loadEvent(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="container page"><Loading/></div>;
  if (!event) return <section className="container page"><ErrorMessage>{error || 'Không tìm thấy sự kiện.'}</ErrorMessage><Link to="/events" className="back-link"><ArrowLeft size={16}/> Trở về sự kiện</Link></section>;
  const eventStarted = new Date(event.startAt) <= new Date();
  const full = event.capacity && event.registrationsCount >= event.capacity;

  return <section className="container page">
    <Link to="/events" className="back-link"><ArrowLeft size={16}/> Trở về sự kiện</Link>
    <div className="detail-layout"><div>
      <div className="detail-cover" style={event.cover ? { backgroundImage: `linear-gradient(180deg,#10172a20,#10172a80),url(${event.cover})` } : undefined}>✦</div>
      <span className="eyebrow">{event.category || 'EVENT'}</span><h1>{event.title}</h1>
      {event.club && <p className="event-organizer">Tổ chức bởi <Link className="text-link" to={`/clubs/${event.club._id}`}>{event.club.name}</Link></p>}
      <p className="detail-description">{event.description}</p><h3>Về sự kiện</h3><p>{event.content || event.description}</p>
      {event.requiresClubMembership && <div className="notice">Sự kiện dành cho thành viên đã được duyệt của câu lạc bộ tổ chức.</div>}
    </div>
    <aside className="register-panel"><h3>Thông tin sự kiện</h3>
      <p><CalendarDays/> {new Date(event.startAt).toLocaleString('vi-VN')}</p><p><MapPin/> {event.location}</p><p><Users/> {event.registrationsCount || 0}/{event.capacity || '∞'} người tham gia</p>
      {registration ? <><div className="status-pill approved"><UserCheck size={15}/> Bạn đã đăng ký</div><button className="btn btn-ghost full cancel-btn" disabled={busy || eventStarted} onClick={cancelRegistration}><XCircle size={16}/> Hủy đăng ký</button></> : <button className="btn btn-primary full" disabled={busy || eventStarted || full || event.status === 'cancelled'} onClick={register}>{busy ? 'Đang xử lý...' : eventStarted ? 'Sự kiện đã bắt đầu' : full ? 'Đã đủ số lượng' : 'Đăng ký tham gia'}</button>}
      {event.status === 'cancelled' && <div className="notice error">Sự kiện đã bị hủy.</div>}
      <ErrorMessage>{error}</ErrorMessage><SuccessMessage>{message}</SuccessMessage>
    </aside></div>
    {canManageAttendance && <section className="management-panel"><div className="section-title"><div><span className="eyebrow">EVENT CHECK-IN</span><h2>Danh sách điểm danh</h2><p>Chủ nhiệm, Điều phối viên và quản trị viên có thể cập nhật trạng thái tham dự.</p></div><span className="status-pill approved"><ShieldCheck size={14}/> Quản lý sự kiện</span></div>{attendees.length ? <div className="member-list">{attendees.map((item) => <div className="member-row" key={item.user?._id}><div className="member-avatar">{item.user?.name?.[0]?.toUpperCase() || '?'}</div><div className="member-info"><strong>{item.user?.name}</strong><span>{item.user?.email || item.user?.phone || 'Chưa có thông tin liên hệ'}</span></div><span className={`status-pill ${item.attended ? 'approved' : 'pending'}`}>{item.attended ? 'Đã điểm danh' : 'Chưa điểm danh'}</span><button className="btn btn-small" disabled={busy} onClick={() => setAttendance(item.user?._id, !item.attended)}>{item.attended ? 'Bỏ điểm danh' : 'Xác nhận có mặt'}</button></div>)}</div> : <Empty text="Chưa có người đăng ký" desc="Danh sách điểm danh sẽ xuất hiện khi sinh viên đăng ký sự kiện."/>}</section>}
  </section>;
}
