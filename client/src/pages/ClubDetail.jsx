import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Check, Crown, Edit3, Mail, MapPin, Plus, ShieldCheck, Trash2, UserPlus, Users, X } from 'lucide-react';
import { request } from '../api';
import { useAuth } from '../context/AuthContext';
import { Empty, ErrorMessage, EventCard, Loading, SuccessMessage } from '../components';

export default function ClubDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [club, setClub] = useState(null);
  const [clubDraft, setClubDraft] = useState({ name: '', description: '', category: '', location: '', contactEmail: '', joinApprovalRequired: true });
  const [events, setEvents] = useState([]);
  const [membership, setMembership] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const makeDefaultEvent = () => { const date = new Date(Date.now() + 7 * 86400000); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return { title: '', description: '', category: 'Workshop', location: club?.location || 'PTIT', startAt: date.toISOString().slice(0, 16), capacity: 80, status: 'published', requiresClubMembership: false }; };
  const [eventForm, setEventForm] = useState(() => { const date = new Date(Date.now() + 7 * 86400000); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return { title: '', description: '', category: 'Workshop', location: 'PTIT', startAt: date.toISOString().slice(0, 16), capacity: 80, status: 'published', requiresClubMembership: false }; });
  const [editingEventId, setEditingEventId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const canManage = user?.role === 'admin' || ['owner', 'moderator'].includes(membership?.role) && membership?.status === 'approved';

  const loadMembers = useCallback(async () => {
    const data = await request(`/clubs/${id}/members`);
    const roster = data.memberships || [];
    setMembers(roster);
    setClub((current) => current ? { ...current, membersCount: roster.filter((item) => item.status === 'approved').length } : current);
  }, [id]);

  const loadPage = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const clubData = await request(`/clubs/${id}`);
      setClub(clubData.club);
      setClubDraft({ name: clubData.club.name || '', description: clubData.club.description || '', category: clubData.club.category || '', location: clubData.club.location || '', contactEmail: clubData.club.contactEmail || '', joinApprovalRequired: clubData.club.joinApprovalRequired !== false });
      if (user) {
        const membershipData = await request(`/clubs/${id}/membership/me`);
        setMembership(membershipData.membership);
        const current = membershipData.membership;
        if (user.role === 'admin' || (current?.status === 'approved' && ['owner', 'moderator'].includes(current.role))) {
          try { const [memberData, eventData] = await Promise.all([request(`/clubs/${id}/members`), request(`/events/club/${id}/manage`)]); const roster = memberData.memberships || []; setMembers(roster); setClub((currentClub) => currentClub ? { ...currentClub, membersCount: roster.filter((item) => item.status === 'approved').length } : currentClub); setEvents(eventData.events || []); }
          catch { setMembers([]); const eventData = await request(`/events?club=${id}`); setEvents(eventData.events || []); }
        } else { setMembers([]); const eventData = await request(`/events?club=${id}`); setEvents(eventData.events || []); }
      } else { setMembership(null); setMembers([]); const eventData = await request(`/events?club=${id}`); setEvents(eventData.events || []); }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [id, user?.id, user?.role]);

  useEffect(() => { loadPage(); }, [loadPage]);

  async function saveClubInfo(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { const data = await request(`/clubs/${id}`, { method: 'PUT', body: JSON.stringify(clubDraft) }); setClub(data.club); setMessage(data.message); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function joinClub() {
    if (!user) { navigate(`/auth?redirect=${encodeURIComponent(`/clubs/${id}`)}`); return; }
    setBusy(true); setError(''); setMessage('');
    try { const data = await request(`/clubs/${id}/join`, { method: 'POST' }); setMessage(data.message); await loadPage(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function leaveClub() {
    if (!window.confirm(membership?.status === 'pending' ? 'Rút yêu cầu tham gia câu lạc bộ?' : 'Bạn chắc chắn muốn rời câu lạc bộ?')) return;
    setBusy(true); setError(''); setMessage('');
    try { const data = await request(`/clubs/${id}/membership`, { method: 'DELETE' }); setMessage(data.message); await loadPage(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function addMember(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { const data = await request(`/clubs/${id}/members`, { method: 'POST', body: JSON.stringify({ identifier: email }) }); setMessage(data.message); setEmail(''); await loadMembers(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function updateMember(userId, payload, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true); setError(''); setMessage('');
    try { const data = await request(`/clubs/${id}/members/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) }); setMessage(data.message); await loadMembers(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function saveClubEvent(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const payload = { ...eventForm, club: id, capacity: Number(eventForm.capacity), startAt: new Date(eventForm.startAt).toISOString() };
      const data = await request(editingEventId ? `/events/${editingEventId}` : '/events', { method: editingEventId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      setMessage(data.message || 'Đã lưu sự kiện.'); setEditingEventId(null); setEventForm(makeDefaultEvent()); await loadPage();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  function editClubEvent(event) {
    const date = new Date(event.startAt); date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    setEditingEventId(event._id);
    setEventForm({ title: event.title || '', description: event.description || '', category: event.category || 'Workshop', location: event.location || '', startAt: date.toISOString().slice(0, 16), capacity: event.capacity || 80, status: event.status || 'published', requiresClubMembership: Boolean(event.requiresClubMembership) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteClubEvent(event) {
    if (!window.confirm(`Xóa sự kiện “${event.title}”?`)) return;
    setBusy(true); setError(''); setMessage('');
    try { const data = await request(`/events/${event._id}`, { method: 'DELETE' }); setMessage(data.message); await loadPage(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function transferOwnership(userId, name) {
    if (!window.confirm(`Chuyển quyền Chủ nhiệm câu lạc bộ cho ${name}? Bạn sẽ trở thành Điều phối viên.`)) return;
    setBusy(true); setError(''); setMessage('');
    try { const data = await request(`/clubs/${id}/transfer-ownership`, { method: 'POST', body: JSON.stringify({ userId }) }); setMessage(data.message); await loadPage(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function removeMember(userId, name) {
    if (!window.confirm(`Xóa ${name} khỏi câu lạc bộ?`)) return;
    setBusy(true); setError(''); setMessage('');
    try { const data = await request(`/clubs/${id}/members/${userId}`, { method: 'DELETE' }); setMessage(data.message); await loadMembers(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="container page"><Loading/></div>;
  if (!club) return <section className="container page"><ErrorMessage>{error || 'Không tìm thấy câu lạc bộ.'}</ErrorMessage><Link to="/clubs" className="back-link"><ArrowLeft size={16}/> Trở về câu lạc bộ</Link></section>;

  return <section className="container page">
    <Link to="/clubs" className="back-link"><ArrowLeft size={16}/> Tất cả CLB</Link>
    <div className="club-detail-hero">
      <div className="club-detail-head"><div className="club-icon big">{club.name?.[0]}</div><div><span className="eyebrow">{club.category || 'STUDENT COMMUNITY'}</span><h1>{club.name}</h1><p>{club.description}</p></div></div>
      <div className="club-detail-meta"><span><Users/> {club.membersCount || 0} thành viên chính thức</span><span><MapPin/> {club.location || 'PTIT'}</span><span><Mail/> {club.contactEmail || 'Chưa cập nhật email liên hệ'}</span></div>
      <div className="club-actions">
        {!user && <button className="btn btn-primary" onClick={() => navigate(`/auth?redirect=${encodeURIComponent(`/clubs/${id}`)}`)}>Đăng nhập để tham gia</button>}
        {user && !membership && <button className="btn btn-primary" disabled={busy} onClick={joinClub}><UserPlus size={16}/>{busy ? 'Đang xử lý...' : 'Đăng ký tham gia CLB'}</button>}
        {user && membership?.status === 'pending' && <><span className="status-pill pending">Yêu cầu đang chờ duyệt</span><button className="btn btn-ghost" disabled={busy} onClick={leaveClub}>Rút yêu cầu</button></>}
        {user && membership?.status === 'rejected' && <button className="btn btn-primary" disabled={busy} onClick={joinClub}>Gửi lại yêu cầu tham gia</button>}
        {user && membership?.status === 'approved' && <><span className="status-pill approved"><Check size={14}/> Thành viên{membership.role !== 'member' ? ` · ${membership.role === 'owner' ? 'Chủ nhiệm · Admin CLB' : 'Điều phối viên'}` : ''}</span>{membership.role !== 'owner' && <button className="btn btn-ghost" disabled={busy} onClick={leaveClub}>Rời CLB</button>}</>}
        {club.joinApprovalRequired && <span className="helper-text">Yêu cầu tham gia cần Ban chủ nhiệm phê duyệt.</span>}
      </div>
    </div>
    <ErrorMessage>{error}</ErrorMessage><SuccessMessage>{message}</SuccessMessage>

    {(club.mission || club.targetMembers || club.activityPlan || club.semesterPlan || club.foundingMembers?.length) && <section className="club-profile-details">
      <div className="club-profile-copy"><span className="eyebrow">ABOUT THIS COMMUNITY</span><h2>Sứ mệnh và định hướng</h2>{club.mission && <p>{club.mission}</p>}{club.targetMembers && <><h3>Đối tượng thành viên</h3><p>{club.targetMembers}</p></>}{club.activityPlan && <><h3>Kế hoạch hoạt động</h3><p>{club.activityPlan}</p></>}{club.semesterPlan && <><h3>Kế hoạch học kỳ đầu</h3><p>{club.semesterPlan}</p></>}{club.governancePlan && <><h3>Cơ cấu tổ chức</h3><p>{club.governancePlan}</p></>}{club.advisorName && <><h3>Cố vấn</h3><p>{club.advisorName}{club.advisorEmail ? ` · ${club.advisorEmail}` : ''}</p></>}</div>
      {club.foundingMembers?.length > 0 && <aside className="founding-team"><span className="eyebrow">FOUNDING TEAM</span><h3>Đội ngũ sáng lập</h3>{club.foundingMembers.map((person, index) => <div className="founding-person" key={`${person.email || person.phone}-${index}`}><b>{person.name}</b><span>{person.responsibility}</span><small>Đội ngũ sáng lập</small></div>)}</aside>}
    </section>}

    {canManage && <section className="management-panel">
      <div className="section-title"><div><span className="eyebrow">CLUB ADMINISTRATION</span><h2>Quản lý thành viên</h2><p>Duyệt yêu cầu tham gia, thêm tài khoản đã đăng ký và quản lý vai trò thành viên.</p></div><span className="status-pill approved"><ShieldCheck size={14}/> Có quyền quản lý</span></div>
      <form className="inline-form" onSubmit={addMember}><label className="field-grow">Thêm thành viên bằng email hoặc số điện thoại<input type="text" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sinhvien@example.com hoặc +84901234567"/></label><button className="btn btn-primary" disabled={busy}><Plus size={16}/> Thêm thành viên</button></form>
      {members.length ? <div className="member-list">{members.map((item) => <div className="member-row" key={item._id}><div className="member-avatar">{item.user?.name?.[0]?.toUpperCase() || '?'}</div><div className="member-info"><strong>{item.user?.name || 'Tài khoản'}</strong><span>{item.user?.email || item.user?.phone || 'Chưa có thông tin liên hệ'}</span></div><span className={`status-pill ${item.status}`}>{item.status === 'approved' ? (item.role === 'owner' ? 'Chủ nhiệm · Admin CLB' : item.role === 'moderator' ? 'Điều phối viên' : 'Thành viên') : item.status === 'pending' ? 'Chờ duyệt' : 'Đã từ chối'}</span><div className="member-actions">
        {item.status === 'pending' && <><button className="icon-action success" title="Duyệt" disabled={busy} onClick={() => updateMember(item.user?._id, { status: 'approved' })}><Check size={16}/></button><button className="icon-action danger" title="Từ chối" disabled={busy} onClick={() => updateMember(item.user?._id, { status: 'rejected' })}><X size={16}/></button></>}
        {item.status === 'approved' && item.role !== 'owner' && <><button className="icon-action" title={item.role === 'moderator' ? 'Hạ xuống thành viên' : 'Bổ nhiệm điều phối viên'} disabled={busy} onClick={() => updateMember(item.user?._id, { role: item.role === 'moderator' ? 'member' : 'moderator' })}><ShieldCheck size={16}/></button>{(user?.role === 'admin' || membership?.role === 'owner') && <button className="icon-action" title="Chuyển quyền Chủ nhiệm" disabled={busy} onClick={() => transferOwnership(item.user?._id, item.user?.name || 'thành viên')}><Crown size={16}/></button>}<button className="icon-action danger" title="Xóa khỏi CLB" disabled={busy} onClick={() => removeMember(item.user?._id, item.user?.name || 'thành viên')}><Trash2 size={16}/></button></>}
      </div></div>)}</div> : <Empty text="Chưa có thành viên hoặc yêu cầu tham gia" desc="Khi sinh viên gửi yêu cầu, danh sách sẽ xuất hiện tại đây."/>}
    </section>}

    {(user?.role === 'admin' || membership?.role === 'owner') && <section className="management-panel">
      <div className="section-title"><div><span className="eyebrow">CLUB PROFILE</span><h2>Thông tin câu lạc bộ</h2><p>Chủ nhiệm có thể cập nhật thông tin giới thiệu và quy trình tham gia.</p></div></div>
      <form className="event-admin-form" onSubmit={saveClubInfo}>
        <label>Tên câu lạc bộ<input required minLength="2" value={clubDraft.name} onChange={(e) => setClubDraft({ ...clubDraft, name: e.target.value })}/></label>
        <label>Mô tả<textarea required rows="3" value={clubDraft.description} onChange={(e) => setClubDraft({ ...clubDraft, description: e.target.value })}/></label>
        <div className="form-two-col"><label>Danh mục<input value={clubDraft.category} onChange={(e) => setClubDraft({ ...clubDraft, category: e.target.value })}/></label><label>Địa điểm<input value={clubDraft.location} onChange={(e) => setClubDraft({ ...clubDraft, location: e.target.value })}/></label></div>
        <label>Email liên hệ<input type="email" value={clubDraft.contactEmail} onChange={(e) => setClubDraft({ ...clubDraft, contactEmail: e.target.value })}/></label>
        <label className="checkbox-label"><input type="checkbox" checked={clubDraft.joinApprovalRequired} onChange={(e) => setClubDraft({ ...clubDraft, joinApprovalRequired: e.target.checked })}/> Yêu cầu Ban chủ nhiệm duyệt thành viên mới</label>
        <button className="btn btn-primary" disabled={busy}>Lưu thông tin CLB</button>
      </form>
    </section>}

    {canManage && <section className="management-panel club-event-management">
      <div className="section-title"><div><span className="eyebrow">EVENT ADMINISTRATION</span><h2>{editingEventId ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện cho câu lạc bộ'}</h2><p>Chủ nhiệm và Điều phối viên có thể quản lý sự kiện thuộc câu lạc bộ này.</p></div></div>
      <form className="event-admin-form" onSubmit={saveClubEvent}>
        <label>Tên sự kiện<input required minLength="3" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}/></label>
        <label>Mô tả<textarea required rows="2" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}/></label>
        <div className="form-two-col"><label>Danh mục<input value={eventForm.category} onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}/></label><label>Địa điểm<input required value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}/></label></div>
        <div className="form-two-col"><label>Thời gian bắt đầu<input type="datetime-local" required value={eventForm.startAt} onChange={(e) => setEventForm({ ...eventForm, startAt: e.target.value })}/></label><label>Sức chứa<input type="number" min="1" required value={eventForm.capacity} onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })}/></label></div>
        <label className="checkbox-label"><input type="checkbox" checked={Boolean(eventForm.requiresClubMembership)} onChange={(e) => setEventForm({ ...eventForm, requiresClubMembership: e.target.checked })}/> Chỉ thành viên CLB đã được duyệt mới được đăng ký</label>
        <div className="form-actions"><button className="btn btn-primary" disabled={busy}><Plus size={16}/>{busy ? 'Đang lưu...' : editingEventId ? 'Lưu thay đổi' : 'Tạo sự kiện'}</button>{editingEventId && <button type="button" className="btn btn-ghost" onClick={() => { setEditingEventId(null); setEventForm(makeDefaultEvent()); }}>Hủy chỉnh sửa</button>}</div>
      </form>
      {events.length > 0 && <div className="member-list club-event-list">{events.map((event) => <div className="member-row" key={event._id}><div className="activity-icon"><CalendarDays/></div><div className="member-info"><strong>{event.title}</strong><span>{new Date(event.startAt).toLocaleString('vi-VN')} · {event.registrationsCount || 0}/{event.capacity}</span></div><button className="icon-action" title="Sửa sự kiện" onClick={() => editClubEvent(event)}><Edit3 size={16}/></button><button className="icon-action danger" title="Xóa sự kiện" disabled={busy} onClick={() => deleteClubEvent(event)}><Trash2 size={16}/></button></div>)}</div>}
    </section>}

    <div className="section club-events-section"><div className="section-title"><div><span className="eyebrow">ACTIVITIES</span><h2>Sự kiện của câu lạc bộ</h2><p>Những hoạt động do câu lạc bộ tổ chức.</p></div></div>{events.length ? <div className="event-grid">{events.map((event) => <EventCard event={event} key={event._id}/>)}</div> : <Empty text="CLB chưa có sự kiện" desc="Các sự kiện mới sẽ được hiển thị tại đây."/>}</div>
  </section>;
}
