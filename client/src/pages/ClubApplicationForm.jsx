import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { request } from '../api';
import { ErrorMessage, SuccessMessage } from '../components';

const blankFounder = () => ({ name: '', email: '', responsibility: '' });
const initialForm = {
  proposedName: '', category: 'Công nghệ', description: '', mission: '', targetMembers: '',
  activityPlan: '', semesterPlan: '', governancePlan: '', budgetPlan: '',
  foundingMembers: [blankFounder(), blankFounder(), blankFounder(), blankFounder(), blankFounder()],
  contactEmail: '', contactPhone: '', location: 'PTIT – Hà Nội', advisorName: '', advisorEmail: '', rulesAccepted: false
};

export default function ClubApplicationForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({ ...initialForm, contactEmail: user?.email || '', contactPhone: user?.phone || '', foundingMembers: [{ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', responsibility: 'Người đề xuất / Chủ nhiệm dự kiến' }, ...initialForm.foundingMembers.slice(1)] }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  if (!user) return <Navigate to="/auth?redirect=/club-applications/new" replace/>;

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  function updateFounder(index, key, value) {
    setForm((current) => ({ ...current, foundingMembers: current.foundingMembers.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  }
  function addFounder() { if (form.foundingMembers.length < 30) update('foundingMembers', [...form.foundingMembers, blankFounder()]); }
  function removeFounder(index) { if (form.foundingMembers.length > 5) update('foundingMembers', form.foundingMembers.filter((_, i) => i !== index)); }
  async function submit(event) {
    event.preventDefault(); setError(''); setMessage('');
    const founderEmails = form.foundingMembers.map((item) => item.email.trim().toLowerCase()).filter(Boolean);
    const founderPhones = form.foundingMembers.map((item) => item.phone.trim()).filter(Boolean);
    if (form.foundingMembers.some((item) => !item.name.trim() || !item.responsibility.trim() || (!item.email.trim() && !item.phone.trim()))) { setError('Mỗi người sáng lập cần có họ tên, nhiệm vụ và ít nhất email hoặc số điện thoại.'); return; }
    if (new Set(founderEmails).size !== founderEmails.length) { setError('Email của các thành viên sáng lập không được trùng nhau.'); return; }
    if (new Set(founderPhones).size !== founderPhones.length) { setError('Số điện thoại của các thành viên sáng lập không được trùng nhau.'); return; }
    const applicantEmail = user?.email && !user.email.endsWith('@phone.clubhub.invalid') ? user.email.toLowerCase() : '';
    const applicantPhone = user?.phone || '';
    if (!form.foundingMembers.some((item) => (applicantEmail && item.email.trim().toLowerCase() === applicantEmail) || (applicantPhone && item.phone.trim() === applicantPhone))) { setError('Người gửi hồ sơ phải được khai báo trong đội ngũ sáng lập bằng email hoặc số điện thoại gắn với tài khoản.'); return; }
    setBusy(true);
    try {
      const data = await request('/club-applications', { method: 'POST', body: JSON.stringify(form) });
      setMessage(data.message || 'Đã gửi hồ sơ thành lập CLB.');
      navigate('/my-club-applications', { state: { notice: data.message } });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <section className="container page application-page">
    <Link className="back-link" to="/clubs"><ArrowLeft size={15}/> Trở về danh sách CLB</Link>
    <div className="page-heading"><span className="eyebrow">START A COMMUNITY</span><h1>Đề xuất thành lập câu lạc bộ</h1><p>Hồ sơ sẽ được Ban quản trị toàn hệ thống xem xét. CLB chỉ xuất hiện công khai sau khi được phê duyệt.</p></div>
    <div className="application-notice"><strong>Quy trình xét duyệt</strong><p>Bạn là người đề xuất và sẽ được bổ nhiệm làm <b>Chủ nhiệm CLB</b> nếu hồ sơ được duyệt. Tài khoản của bạn không trở thành quản trị viên toàn website. Quyền quản trị toàn hệ thống chỉ thuộc tài khoản Admin do người sáng lập nền tảng quản lý.</p></div>
    <form className="form-panel application-form" onSubmit={submit}>
      <h2>1. Thông tin cơ bản</h2>
      <label>Tên câu lạc bộ dự kiến *<input required minLength="3" maxLength="100" value={form.proposedName} onChange={(e) => update('proposedName', e.target.value)} placeholder="Ví dụ: IU Club – Information Technology"/></label>
      <div className="form-two-col"><label>Nhóm lĩnh vực *<select required value={form.category} onChange={(e) => update('category', e.target.value)}>{['Công nghệ','Học thuật','Truyền thông','Ngoại ngữ','Văn hóa – Nghệ thuật','Thể thao','Tình nguyện','Khởi nghiệp','Khác'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Địa điểm hoạt động *<input required value={form.location} onChange={(e) => update('location', e.target.value)}/></label></div>
      <label>Giới thiệu câu lạc bộ * <small>Ít nhất 100 ký tự</small><textarea required minLength="100" maxLength="2000" rows="4" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="CLB được thành lập để giải quyết nhu cầu nào? Hoạt động trong lĩnh vực gì?"/></label>
      <label>Sứ mệnh và mục tiêu * <small>Ít nhất 50 ký tự</small><textarea required minLength="50" maxLength="1500" rows="3" value={form.mission} onChange={(e) => update('mission', e.target.value)} placeholder="Nêu sứ mệnh, mục tiêu ngắn hạn và dài hạn của CLB."/></label>
      <label>Đối tượng và quy mô thành viên * <small>Ít nhất 20 ký tự</small><textarea required minLength="20" maxLength="1000" rows="2" value={form.targetMembers} onChange={(e) => update('targetMembers', e.target.value)} placeholder="Đối tượng sinh viên, điều kiện tham gia, quy mô dự kiến..."/></label>

      <h2>2. Kế hoạch tổ chức và vận hành</h2>
      <label>Kế hoạch hoạt động định kỳ * <small>Ít nhất 120 ký tự</small><textarea required minLength="120" maxLength="3000" rows="4" value={form.activityPlan} onChange={(e) => update('activityPlan', e.target.value)} placeholder="Tần suất sinh hoạt, workshop, cuộc thi, truyền thông, hoạt động cộng đồng..."/></label>
      <label>Kế hoạch học kỳ đầu tiên * <small>Ít nhất 80 ký tự</small><textarea required minLength="80" maxLength="2500" rows="3" value={form.semesterPlan} onChange={(e) => update('semesterPlan', e.target.value)} placeholder="Các mốc triển khai, hoạt động dự kiến, kết quả cần đạt..."/></label>
      <label>Kế hoạch tổ chức nhân sự * <small>Ít nhất 80 ký tự – mô tả Ban chủ nhiệm, các ban chuyên môn, quy trình phân công và bàn giao</small><textarea required minLength="80" maxLength="2000" rows="3" value={form.governancePlan} onChange={(e) => update('governancePlan', e.target.value)} placeholder="Cơ cấu Ban chủ nhiệm, các ban, trách nhiệm, quy trình họp và ra quyết định..."/></label>
      <label>Kế hoạch tài chính và nguồn lực * <small>Ít nhất 80 ký tự – dự kiến chi phí, nguồn kinh phí và cách công khai thu chi</small><textarea required minLength="80" maxLength="2000" rows="3" value={form.budgetPlan} onChange={(e) => update('budgetPlan', e.target.value)} placeholder="Dự kiến ngân sách, nguồn tài trợ/đóng góp, quản lý và công khai chi tiêu..."/></label>

      <h2>3. Đội ngũ sáng lập</h2>
      <p className="form-help">Cần tối thiểu 5 người sáng lập. Mỗi người cần có họ tên, ít nhất một phương thức liên hệ (email hoặc số điện thoại) và nhiệm vụ dự kiến. Người gửi hồ sơ phải nằm trong danh sách bằng email/số điện thoại gắn với tài khoản và sẽ là Chủ nhiệm nếu CLB được duyệt.</p>
      {form.foundingMembers.map((member, index) => <div className="founder-row" key={index}><div className="founder-row-title"><b>Thành viên sáng lập {index + 1}</b>{form.foundingMembers.length > 5 && <button type="button" className="icon-action danger" onClick={() => removeFounder(index)} aria-label="Xóa thành viên"><Trash2 size={15}/></button>}</div><div className="form-four-col"><label>Họ tên *<input required value={member.name} onChange={(e) => updateFounder(index, 'name', e.target.value)} placeholder="Nguyễn Văn A"/></label><label>Email<input type="email" value={member.email} onChange={(e) => updateFounder(index, 'email', e.target.value)} placeholder="email@example.com"/></label><label>Số điện thoại<input type="tel" pattern="\+[1-9][0-9]{7,14}" value={member.phone || ''} onChange={(e) => updateFounder(index, 'phone', e.target.value)} placeholder="+84901234567"/></label><label>Nhiệm vụ *<input required value={member.responsibility} onChange={(e) => updateFounder(index, 'responsibility', e.target.value)} placeholder="Chủ nhiệm / Nội dung..."/></label><small className="founder-contact-hint">Mỗi người cần ít nhất một phương thức liên hệ: email hoặc số điện thoại.</small></div></div>)}
      <button type="button" className="btn btn-ghost" onClick={addFounder} disabled={form.foundingMembers.length >= 30}><Plus size={15}/> Thêm người sáng lập</button>

      <h2>4. Thông tin liên hệ và cố vấn</h2>
      <div className="form-two-col"><label>Email liên hệ chính thức *<input type="email" required value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} placeholder="club@example.com"/></label><label>Số điện thoại liên hệ *<input type="tel" required pattern="\+[1-9][0-9]{7,14}" value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} placeholder="+84901234567"/><small>Định dạng quốc tế, ví dụ +84901234567</small></label></div>
      <div className="form-two-col"><label>Giảng viên/cố vấn (nếu có)<input value={form.advisorName} onChange={(e) => update('advisorName', e.target.value)} placeholder="Họ tên cố vấn"/></label><label>Email cố vấn<input type="email" value={form.advisorEmail} onChange={(e) => update('advisorEmail', e.target.value)} placeholder="advisor@example.com"/></label></div>
      <label className="checkbox-label application-agreement"><input type="checkbox" required checked={form.rulesAccepted} onChange={(e) => update('rulesAccepted', e.target.checked)}/> Tôi cam kết thông tin cung cấp là chính xác; CLB hoạt động minh bạch, không vi phạm pháp luật và tuân thủ quy định của nhà trường/nền tảng. *</label>
      <ErrorMessage>{error}</ErrorMessage><SuccessMessage>{message}</SuccessMessage>
      <div className="form-actions"><button className="btn btn-primary" disabled={busy}>{busy ? 'Đang gửi hồ sơ...' : 'Gửi hồ sơ chờ phê duyệt'}</button><Link className="btn btn-ghost" to="/my-club-applications">Theo dõi hồ sơ của tôi</Link></div>
    </form>
  </section>;
}
