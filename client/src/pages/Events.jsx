import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { request } from '../api';
import { useEventStore } from '../store/useEventStore';
import { Empty, ErrorMessage, EventCard, Loading } from '../components';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { search, setSearch, category, setCategory } = useEventStore();
  useEffect(() => {
    let active = true;
    request('/events').then((data) => { if (active) setEvents(data.events || []); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const categories = useMemo(() => ['Tất cả', ...new Set(events.map((event) => event.category).filter(Boolean))], [events]);
  const filtered = events.filter((event) => `${event.title} ${event.description} ${event.location}`.toLowerCase().includes(search.toLowerCase()) && (category === 'Tất cả' || event.category === category));
  return <section className="page container">
    <div className="page-heading"><span className="eyebrow">DISCOVER & PARTICIPATE</span><h1>Lịch sự kiện</h1><p>Tìm hoạt động phù hợp, đăng ký tham gia và theo dõi lịch trình của bạn.</p></div>
    <div className="filter-bar"><div className="search-box"><Search size={18}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm sự kiện..." aria-label="Tìm kiếm sự kiện"/></div><div className="category-filter"><SlidersHorizontal size={17}/><select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Lọc loại sự kiện">{categories.map((item) => <option key={item}>{item}</option>)}</select></div></div>
    <ErrorMessage>{error}</ErrorMessage>
    {loading ? <Loading/> : filtered.length ? <div className="event-grid">{filtered.map((event) => <EventCard key={event._id} event={event}/>)}</div> : <Empty text="Không tìm thấy sự kiện"/>}
  </section>;
}
