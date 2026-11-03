import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Sparkles, Users } from 'lucide-react';
import { request } from '../api';
import { EventCard, Loading, SectionTitle, Empty, ErrorMessage } from '../components';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([request('/events?limit=3'), request('/clubs?limit=4')])
      .then(([eventData, clubData]) => { setEvents(eventData.events || []); setClubs(clubData.clubs || []); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  return <>
    <section className="hero"><div className="hero-orb orb1"/><div className="hero-orb orb2"/><div className="hero-content">
      <span className="eyebrow"><Sparkles size={15}/> YOUR CAMPUS. YOUR COMMUNITY.</span><h1>Nơi đam mê<br/><em>kết nối</em> cộng đồng.</h1>
      <p>Khám phá câu lạc bộ, gửi yêu cầu tham gia, đăng ký sự kiện và tạo nên những dấu ấn đáng nhớ trong hành trình sinh viên của bạn.</p>
      <div className="hero-buttons"><Link className="btn btn-primary" to="/events">Khám phá sự kiện <ArrowRight size={17}/></Link><Link className="btn btn-ghost" to="/clubs">Tìm câu lạc bộ</Link></div>
      <div className="hero-stats"><div><strong>CLUBS</strong><span>Cộng đồng đa dạng</span></div><div><strong>EVENTS</strong><span>Hoạt động mỗi tuần</span></div><div><strong>YOU</strong><span>Là một phần kết nối</span></div></div>
    </div><div className="hero-art"><div className="art-card art-main"><div className="art-top"><span className="dot dot-purple"/><span className="dot dot-green"/><span className="dot dot-yellow"/></div><div className="art-shape">✦</div><div className="art-label">CREATE · CONNECT · GROW</div></div><div className="floating-note note-one">🎤 Workshop sáng tạo</div><div className="floating-note note-two">🤝 Kết nối hôm nay</div></div></section>
    <section className="section container"><SectionTitle eyebrow="UPCOMING EXPERIENCES" title="Sự kiện nổi bật" desc="Những hoạt động đang chờ bạn khám phá." action={<Link className="text-link" to="/events">Tất cả sự kiện <ArrowRight size={16}/></Link>}/><ErrorMessage>{error}</ErrorMessage>{loading ? <Loading/> : events.length ? <div className="event-grid">{events.map((event) => <EventCard key={event._id} event={event}/>)}</div> : <Empty text="Chưa có sự kiện được công bố" desc="Các sự kiện mới sẽ xuất hiện tại đây."/>}</section>
    <section className="section container clubs-preview"><SectionTitle eyebrow="FIND YOUR PEOPLE" title="Cộng đồng dành cho bạn" desc="Mỗi sở thích đều có một nơi để bắt đầu." action={<Link className="text-link" to="/clubs">Tất cả câu lạc bộ <ArrowRight size={16}/></Link>}/>{loading ? <Loading/> : clubs.length ? <div className="club-grid">{clubs.map((club, index) => <Link className="club-card" to={`/clubs/${club._id}`} key={club._id}><div className={`club-icon icon-${index % 4}`}>{club.name?.[0]}</div><span className="eyebrow">{club.category}</span><h3>{club.name}</h3><p>{club.description}</p><div className="club-bottom"><span><Users size={15}/> {club.membersCount || 0} thành viên</span><ArrowUpRight size={18}/></div></Link>)}</div> : <Empty text="Chưa có câu lạc bộ"/>}</section>
    <section className="join-band container"><div><span className="eyebrow">YOUR JOURNEY STARTS HERE</span><h2>Không chỉ tham gia.<br/>Hãy cùng kiến tạo.</h2><p>Chủ động tìm cộng đồng, đăng ký hoạt động và đóng góp dấu ấn của bạn vào những trải nghiệm sinh viên.</p><Link className="btn btn-primary" to="/clubs">Khám phá CLB <ArrowRight size={16}/></Link></div><div className="join-visual"><div className="join-circle">C<span>H</span></div><div className="join-caption">COMMUNITY<br/>IS EVERYTHING</div></div></section>
  </>;
}
