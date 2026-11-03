import { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import { request } from '../api';
import { Empty, ErrorMessage, Loading, SuccessMessage } from '../components';

const statusText = { pending: 'Chờ duyệt', processing: 'Đang xử lý', approved: 'Đã duyệt', rejected: 'Từ chối' };
export default function AdminClubApplications() {
  const [items, setItems] = useState([]); const [status, setStatus] = useState('pending');
  const [expanded, setExpanded] = useState(''); const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true); const [busyId, setBusyId] = useState('');
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  async function load() { setLoading(true); setError(''); try { const data = await request(`/club-applications/admin?status=${status}`); setItems(data.applications || []); } catch (err) { setError(err.message); } finally { setLoading(false); } }
  useEffect(() => { load(); }, [status]);
  async function review(item, decision) {
    const prompt = decision === 'rejected' && !notes[item._id]?.trim() ? window.prompt('Nhập lý do từ chối hồ sơ:') : notes[item._id] || '';
    if (decision === 'rejected' && !prompt?.trim()) return;
    if (decision === 'approved' && !window.confirm(`Phê duyệt hồ sơ “${item.proposedName}” và bổ nhiệm ${item.applicant?.name} làm Chủ nhiệm CLB?`)) return;
    setBusyId(item._id); setError(''); setMessage('');
    try { const data = await request(`/club-applications/${item._id}/review`, { method: 'PATCH', body: JSON.stringify({ decision, reviewNote: prompt || '' }) }); setMessage(data.message); await load(); }
    catch (err) { setError(err.message); }
    finally { setBusyId(''); }
  }
  return <div className="admin-applications">
    <div className="application-filter"><div><span className="eyebrow">CLUB FORMATION REVIEW</span><h2>Hồ sơ xin thành lập CLB</h2><p>Chỉ Admin toàn hệ thống mới có quyền phê duyệt và tạo CLB chính thức.</p></div><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="pending">Đang chờ duyệt</option><option value="processing">Đang xử lý</option><option value="approved">Đã duyệt</option><option value="rejected">Đã từ chối</option></select></div>
    <ErrorMessage>{error}</ErrorMessage><SuccessMessage>{message}</SuccessMessage>
    {loading ? <Loading/> : items.length ? <div className="application-list">{items.map((item) => <article className="application-card" key={item._id}>
      <div className="application-card-head"><div><span className="eyebrow">{item.category}</span><h2>{item.proposedName}</h2><p>Người đề xuất: <b>{item.applicant?.name}</b> · {item.applicant?.email && !item.applicant.email.endsWith('@phone.clubhub.invalid') ? item.applicant.email : item.applicant?.phone}</p></div><span className={`status-pill ${item.status}`}>{statusText[item.status]}</span></div>
      <div className="application-card-meta"><span>Gửi: {new Date(item.createdAt).toLocaleString('vi-VN')}</span><span>{item.foundingMembers?.length || 0} người sáng lập</span></div>
      <button className="text-link application-expand" onClick={() => setExpanded(expanded === item._id ? '' : item._id)}>{expanded === item._id ? 'Thu gọn hồ sơ' : 'Xem đầy đủ hồ sơ'} {expanded === item._id ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}</button>
      {expanded === item._id && <div className="application-detail-grid">
        <div><h4>Giới thiệu</h4><p>{item.description}</p><h4>Sứ mệnh</h4><p>{item.mission}</p><h4>Đối tượng thành viên</h4><p>{item.targetMembers}</p></div>
        <div><h4>Kế hoạch hoạt động</h4><p>{item.activityPlan}</p><h4>Kế hoạch học kỳ đầu</h4><p>{item.semesterPlan}</p><h4>Kế hoạch tổ chức nhân sự</h4><p>{item.governancePlan}</p><h4>Kế hoạch tài chính</h4><p>{item.budgetPlan}</p></div>
        <div><h4>Liên hệ</h4><p>{item.contactEmail} · {item.contactPhone}<br/>{item.location}</p><h4>Cố vấn</h4><p>{item.advisorName || 'Chưa khai báo'} {item.advisorEmail ? `· ${item.advisorEmail}` : ''}</p></div>
        <div className="founder-full"><h4>Đội ngũ sáng lập</h4>{item.foundingMembers?.map((person, index) => <p key={`${person.email || person.phone}-${index}`}><b>{person.name}</b> · {[person.email, person.phone].filter(Boolean).join(' · ')} · {person.responsibility}</p>)}</div>
      </div>}
      {item.status === 'pending' ? <><label className="review-note-label">Ghi chú xét duyệt<textarea rows="2" value={notes[item._id] || ''} onChange={(e) => setNotes((old) => ({ ...old, [item._id]: e.target.value }))} placeholder="Yêu cầu bổ sung, nhận xét hoặc lý do từ chối..."/></label><div className="form-actions"><button className="btn btn-primary" disabled={busyId === item._id} onClick={() => review(item, 'approved')}><Check size={15}/> {busyId === item._id ? 'Đang xử lý...' : 'Phê duyệt & tạo CLB'}</button><button className="btn btn-danger" disabled={busyId === item._id} onClick={() => review(item, 'rejected')}><X size={15}/> Từ chối hồ sơ</button></div></> : <div className="application-notice"><b>Phản hồi xét duyệt</b><p>{item.reviewNote || 'Không có ghi chú.'}</p>{item.createdClub&&<p>CLB đã được tạo: {item.createdClub.name}</p>}</div>}
    </article>)}</div> : <Empty text="Không có hồ sơ trong trạng thái này"/>}
  </div>;
}
