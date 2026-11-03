import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Users, Clock3 } from 'lucide-react';
import { request } from '../api';
import { Empty, ErrorMessage, Loading } from '../components';

export default function MyActivities() {
  const [memberships, setMemberships] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([request('/clubs/mine/memberships'), request('/events/mine/registrations')])
      .then(([clubData, eventData]) => { setMemberships(clubData.memberships || []); setEvents(eventData.events || []); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="container page"><Loading/></div>;
  return <section className="container page"><div className="page-heading"><span className="eyebrow">MY COMMUNITY</span><h1>Hoạt động của tôi</h1><p>Quản lý các câu lạc bộ đã tham gia và sự kiện đã đăng ký.</p></div><ErrorMessage>{error}</ErrorMessage>
    <div className="section-title"><div><span className="eyebrow">MY CLUBS</span><h2>Câu lạc bộ của tôi</h2></div><Link className="text-link" to="/clubs">Khám phá CLB</Link></div>
    {memberships.length ? <div className="activity-list">{memberships.map((item) => <div className="activity-row" key={item._id}><div className="club-icon">{item.club?.name?.[0] || 'C'}</div><div className="activity-info"><Link to={`/clubs/${item.club?._id}`}><strong>{item.club?.name || 'CLB đã bị xóa'}</strong></Link><span>{item.club?.category}</span></div><span className={`status-pill ${item.status}`}>{item.status === 'approved' ? 'Thành viên' : item.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}</span></div>)}</div> : <Empty text="Bạn chưa tham gia câu lạc bộ nào" desc="Khám phá danh sách CLB và gửi yêu cầu tham gia."/>}
    <div className="section-title activity-heading"><div><span className="eyebrow">MY EVENTS</span><h2>Sự kiện đã đăng ký</h2></div><Link className="text-link" to="/events">Khám phá sự kiện</Link></div>
    {events.length ? <div className="activity-list">{events.map((event) => <div className="activity-row" key={event._id}><div className="activity-icon"><CalendarDays/></div><div className="activity-info"><Link to={`/events/${event._id}`}><strong>{event.title}</strong></Link><span><Clock3 size={13}/> {new Date(event.startAt).toLocaleString('vi-VN')} · {event.club?.name || event.location}</span></div><span className={`status-pill ${event.myRegistration?.attended ? 'approved' : 'pending'}`}>{event.myRegistration?.attended ? 'Đã tham dự' : 'Đã đăng ký'}</span></div>)}</div> : <Empty text="Bạn chưa đăng ký sự kiện" desc="Chọn một sự kiện phù hợp và đăng ký tham gia."/>}
  </section>;
}
