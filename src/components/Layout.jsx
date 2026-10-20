import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getToken, getUser, logout } from '../auth';
import { initials, useTheme } from '../theme';
import Icon from './Icon';
import Logo from './Logo';

// מסגרת לכל המסכים שדורשים התחברות: סרגל צד (במובייל: מגירה) ותוכן.
// בלי token מעבירה למסך ההתחברות.
export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const isAdmin = user?.role === 'Admin';
  const [theme, setTheme] = useTheme();
  const [navOpen, setNavOpen] = useState(false);

  // מעבר בין מסכים סוגר את המגירה במובייל
  useEffect(() => setNavOpen(false), [location.pathname, location.search]);

  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  // חזרה לדף הקודם. מי שנכנסה ישר לכתובת (אין דף קודם באתר) חוזרת ללוח הבקרה
  function handleBack() {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/');
  }

  // NavLink רגיל לא מבחין בין ?role=owner ל-?role=participant, אז בודקים לבד
  const role = new URLSearchParams(location.search).get('role');
  const onMeals = location.pathname === '/meals';
  const navClass = (active) => (active ? 'active' : '');

  const brand = (
    <Link to="/" className="sidebar-brand">
      <Logo size={40} />
      <span>
        <b>מנה-לי</b>
        <small>ארוחות משותפות</small>
      </span>
    </Link>
  );

  const isTopLevel = ['/', '/meals', '/profile', '/admin/users'].includes(location.pathname);

  return (
    <div className={`app-shell ${navOpen ? 'nav-open' : ''}`}>
      <aside className="sidebar" aria-label="ניווט ראשי">
        {brand}
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => navClass(isActive)}>
            <Icon name="home" /> לוח בקרה
          </NavLink>
          <span className="nav-label">ארוחות</span>
          <Link to="/meals?role=owner" className={navClass(onMeals && role !== 'participant' && role !== 'all')}>
            <Icon name="plate" /> ארוחות שבבעלותי
          </Link>
          <Link to="/meals?role=participant" className={navClass(onMeals && role === 'participant')}>
            <Icon name="users" /> ארוחות ששותפתי בהן
          </Link>
          <NavLink to="/meals/new" className={({ isActive }) => navClass(isActive)}>
            <Icon name="plus" /> ארוחה חדשה
          </NavLink>
          <span className="nav-label">חשבון</span>
          <NavLink to="/profile" className={({ isActive }) => navClass(isActive)}>
            <Icon name="user" /> פרופיל
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin/users" className={({ isActive }) => navClass(isActive)}>
              <Icon name="shield" /> ניהול משתמשות
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <span className="avatar">{initials(user?.fullName)}</span>
            <div className="who">
              <b>{user?.fullName}</b>
              <span className="pill light">{isAdmin ? 'מנהלת מערכת' : 'משתמשת'}</span>
            </div>
            <button className="icon-btn" onClick={toggleTheme}
              title={theme === 'dark' ? 'מעבר לתצוגה בהירה' : 'מעבר לתצוגה כהה'}
              aria-label={theme === 'dark' ? 'מעבר לתצוגה בהירה' : 'מעבר לתצוגה כהה'}>
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <Icon name="logout" size={18} /> התנתקות
          </button>
        </div>
      </aside>

      <div className="scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />

      <div className="main">
        <header className="mobile-bar">
          {brand}
          <button className="icon-btn" onClick={() => setNavOpen(true)} aria-label="פתיחת התפריט">
            <Icon name="menu" size={22} />
          </button>
        </header>
        <div className="page" key={location.pathname}>
          {!isTopLevel && (
            <button className="back-button" onClick={handleBack}>
              <Icon name="chevronRight" size={16} /> חזרה
            </button>
          )}
          <Outlet />
        </div>
      </div>
    </div>
  );
}
