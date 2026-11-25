import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { request, toQuery } from '../api';
import { useEventStore } from '../store/useEventStore';
import { Empty, ErrorMessage, EventCard, Loading, Pagination } from '../components';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { search, setSearch, category, setCategory } = useEventStore();
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    let active = true;
    request('/events/categories').then((data) => { if (active) setCategories(data.categories || []); })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    request(`/events${toQuery({ page, limit: 12, search: debouncedSearch, category: category === 'Tất cả' ? undefined : category })}`)
      .then((data) => {
        if (active) {
          setEvents(data.events || []);
          setPagination(data.pagination || { page: 1, pages: 1 });
        }
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, debouncedSearch, category]);
  const categoryOptions = useMemo(() => ['Tất cả', ...categories], [categories]);
  return <section className="page container">
    <div className="page-heading"><span className="eyebrow">DISCOVER & PARTICIPATE</span><h1>Lịch sự kiện</h1><p>Tìm hoạt động phù hợp, đăng ký tham gia và theo dõi lịch trình của bạn.</p></div>
    <div className="filter-bar"><div className="search-box"><Search size={18}/><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm kiếm sự kiện..." aria-label="Tìm kiếm sự kiện"/></div><div className="category-filter"><SlidersHorizontal size={17}/><select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Lọc loại sự kiện">{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select></div></div>
    <ErrorMessage>{error}</ErrorMessage>
    {loading ? <Loading/> : events.length ? <div className="event-grid">{events.map((event) => <EventCard key={event._id} event={event}/>)}</div> : <Empty text="Không tìm thấy sự kiện"/>}
    {!loading && <Pagination page={pagination.page} pages={pagination.pages} onPageChange={setPage}/>}
  </section>;
}
