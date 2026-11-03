import { useState } from 'react';
import { Routes, Route, NavLink, Link, useNavigate } from 'react-router-dom';
import { CalendarDays, LayoutDashboard, LogIn, LogOut, Menu, Users, UserRound, ClipboardList } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Clubs from './pages/Clubs';
import ClubDetail from './pages/ClubDetail';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import MyActivities from './pages/MyActivities';
import ClubApplicationForm from './pages/ClubApplicationForm';
import MyClubApplications from './pages/MyClubApplications';
import NotFound from './pages/NotFound';
import { Loading } from './components';

function ProtectedHint() { return <div className="container page"><div className="empty"><h2>Bạn cần đăng nhập</h2><p>Đăng nhập để xem nội dung cá nhân.</p><Link className="btn btn-primary" to="/auth">Đăng nhập</Link></div></div>; }

export default function App() {
  const { user, logout, isReady } = useAuth();
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  function signOut() { logout(); setMenu(false); navigate('/'); }
  const closeMenu = () => setMenu(false);

  if (!isReady) return <main className="container page"><Loading text="Đang khôi phục phiên đăng nhập..."/></main>;

  return <>
    <header className="topbar">
      <Link to="/" className="brand" onClick={closeMenu}><span className="brand-mark">C</span>Club<span>Hub</span></Link>
      <button className="mobile-menu" aria-label="Mở menu" onClick={() => setMenu(!menu)}><Menu/></button>
      <nav className={menu ? 'nav open' : 'nav'}>
        <NavLink to="/events" onClick={closeMenu}><CalendarDays size={17}/> Sự kiện</NavLink>
        <NavLink to="/clubs" onClick={closeMenu}><Users size={17}/> Câu lạc bộ</NavLink>
        {user && <NavLink to="/my-activities" onClick={closeMenu}><ClipboardList size={17}/> Hoạt động của tôi</NavLink>}
        {user && <NavLink to="/my-club-applications" onClick={closeMenu}>Hồ sơ CLB</NavLink>}
        {user && <NavLink to="/profile" onClick={closeMenu}><UserRound size={17}/> Cá nhân</NavLink>}
        {user?.role === 'admin' && <NavLink to="/dashboard" onClick={closeMenu}><LayoutDashboard size={17}/> Quản trị</NavLink>}
      </nav>
      <div className="top-actions">{user ? <><span className="user-chip">Xin chào, {user.name}</span><button className="icon-btn" title="Đăng xuất" onClick={signOut}><LogOut size={18}/></button></> : <Link className="btn btn-small" to="/auth"><LogIn size={16}/> Đăng nhập</Link>}</div>
    </header>
    <main><Routes>
      <Route path="/" element={<Home/>}/><Route path="/events" element={<Events/>}/><Route path="/events/:id" element={<EventDetail/>}/>
      <Route path="/clubs" element={<Clubs/>}/><Route path="/clubs/:id" element={<ClubDetail/>}/>
      <Route path="/club-applications/new" element={<ClubApplicationForm/>}/><Route path="/my-club-applications" element={<MyClubApplications/>}/>
      <Route path="/dashboard" element={<Dashboard/>}/><Route path="/auth" element={<Auth/>}/>
      <Route path="/profile" element={user ? <Profile/> : <ProtectedHint/>}/><Route path="/my-activities" element={user ? <MyActivities/> : <ProtectedHint/>}/>
      <Route path="*" element={<NotFound/>}/>
    </Routes></main>
    <footer><div className="footer-inner"><Link to="/" className="brand">Club<span>Hub</span></Link><p>Nơi cộng đồng gặp gỡ, ý tưởng bắt đầu.</p><small>© 2026 ClubHub · Student community platform</small></div></footer>
  </>;
}
