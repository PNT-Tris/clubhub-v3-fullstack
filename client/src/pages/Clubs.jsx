import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowUpRight, Search, SlidersHorizontal, Users, Plus, ClipboardList } from 'lucide-react';
import { request, toQuery } from '../api';
import { Empty, ErrorMessage, Loading, Pagination } from '../components';

export default function Clubs() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    let active = true;
    request('/clubs/categories').then((data) => { if (active) setCategories(data.categories || []); })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    request(`/clubs${toQuery({ page, limit: 12, search: debouncedSearch, category: category === 'all' ? undefined : category })}`)
      .then((data) => {
        if (active) {
          setClubs(data.clubs || []);
          setPagination(data.pagination || { page: 1, pages: 1 });
        }
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, debouncedSearch, category]);

  return <section className="container page">
    <div className="page-heading club-page-heading"><div><span className="eyebrow">COMMUNITIES</span><h1>Câu lạc bộ</h1><p>Tìm cộng đồng phù hợp, gửi yêu cầu tham gia và kết nối với những người có cùng đam mê.</p></div><div className="form-actions">{user && <Link className="btn btn-primary" to="/club-applications/new"><Plus size={15}/> Đề xuất thành lập CLB</Link>}{user && <Link className="btn btn-ghost" to="/my-club-applications"><ClipboardList size={15}/> Hồ sơ của tôi</Link>}</div></div>
    <div className="filter-bar"><div className="search-box"><Search size={18}/><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm tên hoặc mô tả câu lạc bộ..." aria-label="Tìm câu lạc bộ"/></div><div className="category-filter"><SlidersHorizontal size={17}/><select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Lọc danh mục"><option value="all">Tất cả danh mục</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></div>
    <ErrorMessage>{error}</ErrorMessage>
    {loading ? <Loading/> : clubs.length ? <div className="club-grid">{clubs.map((club, index) => <Link className="club-card" to={`/clubs/${club._id}`} key={club._id}><div className={`club-icon icon-${index % 4}`}>{club.name?.[0] || 'C'}</div><span className="eyebrow">{club.category || 'STUDENT CLUB'}</span><h3>{club.name}</h3><p>{club.description}</p><div className="club-bottom"><span><Users size={15}/> {club.membersCount || 0} thành viên</span><ArrowUpRight size={18}/></div></Link>)}</div> : <Empty text="Không tìm thấy câu lạc bộ"/>}
    {!loading && <Pagination page={pagination.page} pages={pagination.pages} onPageChange={setPage}/>}
  </section>;
}
