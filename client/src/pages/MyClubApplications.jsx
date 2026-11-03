import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { request } from '../api';
import { useAuth } from '../context/AuthContext';
import { Empty, ErrorMessage, Loading, SuccessMessage } from '../components';

const statusText = { pending: 'Đang chờ duyệt', approved: 'Đã phê duyệt', rejected: 'Bị từ chối' };
export default function MyClubApplications() {
  const { user } = useAuth(); const location = useLocation();
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { request('/club-applications/mine').then((data) => setItems(data.applications || [])).catch((err) => setError(err.message)).finally(() => setLoading(false)); }, []);
  if (!user) return <Navigate to="/auth?redirect=/my-club-applications" replace/>;
  return <section className="container page"><Link className="back-link" to="/clubs"><ArrowLeft size={15}/> Danh sách CLB</Link><div className="page-heading"><span className="eyebrow">APPLICATION TRACKER</span><h1>Hồ sơ thành lập của tôi</h1><p>Theo dõi tình trạng xét duyệt các đề xuất thành lập câu lạc bộ.</p></div><SuccessMessage>{location.state?.notice}</SuccessMessage><ErrorMessage>{error}</ErrorMessage>{loading?<Loading/>:items.length?<div className="application-list">{items.map((item)=><article className="application-card" key={item._id}><div className="application-card-head"><div><span className="eyebrow">{item.category}</span><h2>{item.proposedName}</h2></div><span className={`status-pill ${item.status}`}>{statusText[item.status]}</span></div><p>{item.description}</p><div className="application-card-meta"><span>Gửi ngày: {new Date(item.createdAt).toLocaleString('vi-VN')}</span><span>{item.foundingMembers?.length || 0} thành viên sáng lập</span></div>{item.reviewNote&&<div className="application-notice"><b>Phản hồi từ quản trị viên</b><p>{item.reviewNote}</p></div>}{item.status==='approved'&&item.createdClub&&<Link className="text-link" to={`/clubs/${item.createdClub._id}`}>Mở câu lạc bộ đã được tạo →</Link>}</article>)}</div>:<Empty text="Bạn chưa gửi hồ sơ thành lập CLB" desc="Khi gửi hồ sơ, trạng thái xét duyệt sẽ xuất hiện tại đây."/>}</section>;
}
