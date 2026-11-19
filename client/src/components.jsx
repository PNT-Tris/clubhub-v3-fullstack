import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, MapPin, Users } from 'lucide-react';
import { getEventAvailability } from './utils/eventHelpers';

export function EventCard({ event }) {
  const date = event.startAt ? new Date(event.startAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa xác định';
  const availability = getEventAvailability(event);
  return (
    <article className="event-card">
      <div className="event-cover" style={event.cover ? { backgroundImage: `linear-gradient(180deg,#10172a10,#10172a66),url(${event.cover})` } : undefined}>
        <span className="tag">{event.category || 'Community'}</span>
        {availability && <span className={`status-pill ${availability.tone} event-status-tag`}>{availability.label}</span>}
        <span className="cover-symbol">✦</span>
      </div>
      <div className="event-body">
        <div className="event-meta"><span><CalendarDays size={14}/>{date}</span><span><MapPin size={14}/>{event.location || 'Online'}</span></div>
        <h3>{event.title}</h3>
        <p>{(event.description || 'Một trải nghiệm đáng nhớ cùng cộng đồng ClubHub.').slice(0, 110)}{event.description?.length > 110 ? '…' : ''}</p>
        <div className="event-bottom"><span><Users size={15}/> {event.registrationsCount || 0}{event.capacity ? `/${event.capacity}` : ''} tham gia</span><Link to={`/events/${event._id}`} className="text-link">Chi tiết <ArrowUpRight size={15}/></Link></div>
      </div>
    </article>
  );
}

export function SectionTitle({ eyebrow, title, desc, action }) {
  return <div className="section-title"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{desc && <p>{desc}</p>}</div>{action}</div>;
}
export function Loading({ text = 'Đang tải dữ liệu...' }) { return <div className="loading"><span className="spinner"/>{text}</div>; }
export function Empty({ text = 'Chưa có dữ liệu phù hợp', desc = 'Hãy thử thay đổi bộ lọc hoặc quay lại sau nhé.' }) { return <div className="empty"><div>✦</div><h3>{text}</h3><p>{desc}</p></div>; }
export function ErrorMessage({ children }) { return children ? <div className="notice error" role="alert">{children}</div> : null; }
export function SuccessMessage({ children }) { return children ? <div className="notice" role="status">{children}</div> : null; }