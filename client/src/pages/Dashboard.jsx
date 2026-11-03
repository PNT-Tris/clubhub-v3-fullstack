import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Activity, CalendarDays, ClipboardList, Edit3, Plus, Ticket, Trash2, Users, X } from 'lucide-react';
import { request } from '../api';
import { useAuth } from '../context/AuthContext';
import { Empty, ErrorMessage, Loading, SuccessMessage } from '../components';
import AdminClubApplications from './AdminClubApplications';

const localDateTime = (date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const blankClub = { name: '', description: '', category: 'Công nghệ', location: 'PTIT – Hà Nội', contactEmail: '', joinApprovalRequired: true, isActive: true };
const blankEvent = () => ({ title: '', description: '', category: 'Workshop', location: 'PTIT – Hà Nội', startAt: localDateTime(new Date(Date.now() + 7 * 86400000)), capacity: 100, club: '', status: 'published', requiresClubMembership: false });

export default function Dashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [clubForm, setClubForm] = useState(blankClub);
  const [eventForm, setEventForm] = useState(blankEvent());
  const [editingClub, setEditingClub] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [summary, clubData, eventData] = await Promise.all([
        request('/dashboard/stats'), request('/clubs/manage/all'), request('/events/manage/all')
      ]);
      setStats(summary); setClubs(clubData.clubs || []); setEvents(eventData.events || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (user?.role === 'admin') refresh(); }, [user?.role, refresh]);

  if (!user) return <Navigate to="/auth"/>;
  if (user.role !== 'admin') return <section className="container page"><div className="empty"><h2>Không có quyền truy cập</h2><p>Dashboard hệ thống dành cho quản trị viên.</p></div></section>;

  async function saveClub(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const data = await request(editingClub ? `/clubs/${editingClub}` : '/clubs', { method: editingClub ? 'PUT' : 'POST', body: JSON.stringify(clubForm) });
      setMessage(data.message || 'Đã lưu câu lạc bộ.'); setClubForm(blankClub); setEditingClub(null); await refresh();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  function startEditClub(club) {
    setEditingClub(club._id);
    setClubForm({ name: club.name || '', description: club.description || '', category: club.category || '', location: club.location || '', contactEmail: club.contactEmail || '', joinApprovalRequired: club.joinApprovalRequired !== false, isActive: club.isActive !== false });
    setTab('clubs'); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function deleteClub(club) {
    if (!window.confirm(`Xóa câu lạc bộ “${club.name}”? Các hồ sơ thành viên sẽ bị xóa theo.`)) return;
    setBusy(true); setError(''); setMessage('');
    try { const data = await request(`/clubs/${club._id}`, { method: 'DELETE' }); setMessage(data.message); await refresh(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function saveEvent(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const payload = { ...eventForm, startAt: new Date(eventForm.startAt).toISOString(), capacity: Number(eventForm.capacity) };
      const data = await request(editingEvent ? `/events/${editingEvent}` : '/events', { method: editingEvent ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      setMessage(data.message || 'Đã lưu sự kiện.'); setEventForm(blankEvent()); setEditingEvent(null); await refresh();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  function startEditEvent(event) {
    setEditingEvent(event._id);
    setEventForm({ title: event.title || '', description: event.description || '', category: event.category || '', location: event.location || '', startAt: localDateTime(new Date(event.startAt)), capacity: event.capacity || 100, club: event.club?._id || event.club || '', status: event.status || 'published', requiresClubMembership: Boolean(event.requiresClubMembership) });
    setTab('events'); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function deleteEvent(event) {
    if (!window.confirm(`Xóa sự kiện “${event.title}”?`)) return;
    setBusy(true); setError(''); setMessage('');
    try { const data = await request(`/events/${event._id}`, { method: 'DELETE' }); setMessage(data.message); await refresh(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <section className="container page dashboard-page">
    <div className="page-heading"><span className="eyebrow">ADMINISTRATION</span><h1>Dashboard quản trị</h1><p>Quản lý câu lạc bộ, sự kiện và theo dõi hoạt động của nền tảng ClubHub.</p></div>
    <ErrorMessage>{error}</ErrorMessage><SuccessMessage>{message}</SuccessMessage>
    <div className="dashboard-tabs"><button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Tổng quan</button><button className={tab === 'applications' ? 'active' : ''} onClick={() => setTab('applications')}>Hồ sơ thành lập</button><button className={tab === 'clubs' ? 'active' : ''} onClick={() => setTab('clubs')}>Câu lạc bộ ({clubs.length})</button><button className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>Sự kiện ({events.length})</button></div>
    {loading ? <Loading/> : <>
      {tab === 'overview' && <>
        <div className="stats-grid">
          {[["Sự kiện", stats?.events, CalendarDays], ["Câu lạc bộ", stats?.clubs, Users], ["Tài khoản", stats?.members, Activity], ["Lượt đăng ký", stats?.registrations, Ticket]].map(([label, value, Icon]) => <div className="stat-card" key={label}><Icon/><span>{label}</span><strong>{value ?? 0}</strong></div>)}
        </div>
        <div className="admin-shortcuts"><button className="btn btn-primary" onClick={() => setTab('applications')}><ClipboardList size={16}/> Xét duyệt hồ sơ thành lập CLB</button><button className="btn btn-ghost" onClick={() => { setEventForm(blankEvent()); setEditingEvent(null); setTab('events'); }}><Plus size={16}/> Tạo sự kiện</button></div>
        <div className="admin-note"><h3>Quản trị theo nghiệp vụ</h3><p>Mọi CLB mới phải gửi hồ sơ và được Admin toàn website phê duyệt tại mục Hồ sơ thành lập. Sau khi duyệt, người đề xuất tự động trở thành Chủ nhiệm của CLB đó; quyền admin toàn website vẫn thuộc tài khoản quản trị viên nền tảng. Chủ nhiệm quản lý thành viên và sự kiện trong phạm vi CLB của mình.</p></div>
      </>}
      {tab === 'applications' && <AdminClubApplications/>}
      {tab === 'clubs' && <div className="admin-grid">
        {editingClub && <form className="form-panel" onSubmit={saveClub}><div className="form-heading"><div><span className="eyebrow">CLUB MANAGEMENT</span><h2>Cập nhật câu lạc bộ</h2></div>{editingClub && <button type="button" className="icon-action" onClick={() => { setEditingClub(null); setClubForm(blankClub); }}><X/></button>}</div>
          <label>Tên câu lạc bộ<input required minLength="2" value={clubForm.name} onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })}/></label>
          <label>Mô tả<textarea required rows="4" value={clubForm.description} onChange={(e) => setClubForm({ ...clubForm, description: e.target.value })}/></label>
          <div className="form-two-col"><label>Danh mục<input value={clubForm.category} onChange={(e) => setClubForm({ ...clubForm, category: e.target.value })}/></label><label>Địa điểm<input value={clubForm.location} onChange={(e) => setClubForm({ ...clubForm, location: e.target.value })}/></label></div>
          <label>Email liên hệ<input type="email" value={clubForm.contactEmail} onChange={(e) => setClubForm({ ...clubForm, contactEmail: e.target.value })}/></label>
          <label className="checkbox-label"><input type="checkbox" checked={clubForm.joinApprovalRequired} onChange={(e) => setClubForm({ ...clubForm, joinApprovalRequired: e.target.checked })}/> Yêu cầu Ban chủ nhiệm duyệt đơn tham gia</label>
          <label className="checkbox-label"><input type="checkbox" checked={clubForm.isActive} onChange={(e) => setClubForm({ ...clubForm, isActive: e.target.checked })}/> CLB đang hoạt động và được công khai</label>
          <button className="btn btn-primary" disabled={busy}><Plus size={16}/>{busy ? 'Đang lưu...' : editingClub ? 'Lưu thay đổi' : 'Tạo câu lạc bộ'}</button>
        </form>}
        <div className="admin-list-panel"><div className="section-title"><div><span className="eyebrow">CLUB DIRECTORY</span><h2>Danh sách câu lạc bộ</h2></div></div>
          {clubs.length ? <div className="admin-item-list">{clubs.map((club) => <div className="admin-item" key={club._id}><div className="club-icon">{club.name?.[0]}</div><div className="admin-item-info"><strong>{club.name}</strong><span>{club.category} · {club.membersCount} thành viên · {club.isActive ? 'Đang hoạt động' : 'Đã ẩn'}</span>{club.isActive ? <Link className="text-link" to={`/clubs/${club._id}`}>Mở trang CLB và quản lý thành viên</Link> : <span>CLB đang ẩn · bật lại để mở trang chi tiết</span>}</div><div className="admin-item-actions"><button className="icon-action" title="Sửa" onClick={() => startEditClub(club)}><Edit3 size={16}/></button><button className="icon-action danger" title="Xóa" disabled={busy} onClick={() => deleteClub(club)}><Trash2 size={16}/></button></div></div>)}</div> : <Empty text="Chưa có câu lạc bộ"/>}
        </div>
      </div>}
      {tab === 'events' && <div className="admin-grid">
        <form className="form-panel" onSubmit={saveEvent}><div className="form-heading"><div><span className="eyebrow">EVENT MANAGEMENT</span><h2>{editingEvent ? 'Cập nhật sự kiện' : 'Tạo sự kiện mới'}</h2></div>{editingEvent && <button type="button" className="icon-action" onClick={() => { setEditingEvent(null); setEventForm(blankEvent()); }}><X/></button>}</div>
          <label>Tên sự kiện<input required minLength="3" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}/></label>
          <label>Mô tả<textarea required rows="3" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}/></label>
          <div className="form-two-col"><label>Danh mục<input value={eventForm.category} onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}/></label><label>Sức chứa<input type="number" min="1" required value={eventForm.capacity} onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })}/></label></div>
          <label>Địa điểm<input required value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}/></label>
          <label>Thời gian bắt đầu<input type="datetime-local" required value={eventForm.startAt} onChange={(e) => setEventForm({ ...eventForm, startAt: e.target.value })}/></label>
          <label>Câu lạc bộ tổ chức<select required value={eventForm.club} onChange={(e) => setEventForm({ ...eventForm, club: e.target.value })}><option value="">-- Chọn câu lạc bộ --</option>{clubs.filter((club) => club.isActive).map((club) => <option value={club._id} key={club._id}>{club.name}</option>)}</select></label>
          <label>Trạng thái<select value={eventForm.status} onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}><option value="published">Công khai</option><option value="draft">Bản nháp</option><option value="cancelled">Đã hủy</option></select></label>
          <label className="checkbox-label"><input type="checkbox" checked={eventForm.requiresClubMembership} onChange={(e) => setEventForm({ ...eventForm, requiresClubMembership: e.target.checked })}/> Chỉ thành viên CLB đã được duyệt mới được đăng ký</label>
          <button className="btn btn-primary" disabled={busy}><Plus size={16}/>{busy ? 'Đang lưu...' : editingEvent ? 'Lưu thay đổi' : 'Tạo sự kiện'}</button>
        </form>
        <div className="admin-list-panel"><div className="section-title"><div><span className="eyebrow">EVENT CALENDAR</span><h2>Danh sách sự kiện</h2></div></div>
          {events.length ? <div className="admin-item-list">{events.map((event) => <div className="admin-item" key={event._id}><div className="activity-icon"><CalendarDays/></div><div className="admin-item-info"><strong>{event.title}</strong><span>{event.club?.name || 'Chưa phân CLB'} · {new Date(event.startAt).toLocaleString('vi-VN')} · {event.registrationsCount || 0}/{event.capacity}</span><span className={`status-pill ${event.status === 'published' ? 'approved' : event.status === 'draft' ? 'pending' : 'rejected'}`}>{event.status === 'published' ? 'Công khai' : event.status === 'draft' ? 'Bản nháp' : 'Đã hủy'}</span>{event.status === 'published' && <Link className="text-link" to={`/events/${event._id}`}>Xem trang sự kiện</Link>}</div><div className="admin-item-actions"><button className="icon-action" title="Sửa" onClick={() => startEditEvent(event)}><Edit3 size={16}/></button><button className="icon-action danger" title="Xóa" disabled={busy} onClick={() => deleteEvent(event)}><Trash2 size={16}/></button></div></div>)}</div> : <Empty text="Chưa có sự kiện"/>}
        </div>
      </div>}
    </>}
  </section>;
}
