import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import { getToken, getUser, logout } from '../auth';
import Logo from './Logo';

// מסגרת לכל המסכים שדורשים התחברות. בלי token מעבירה למסך ההתחברות.
export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const isAdmin = user?.role === 'Admin';

  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  // חזרה לדף הקודם. מי שנכנסה ישר לכתובת (אין דף קודם באתר) חוזרת לדף הבית
  function handleBack() {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/');
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      'למחוק את החשבון שלך?\nהארוחות שבבעלותך יימחקו, וההשתתפות שלך בארוחות אחרות תבוטל. אי אפשר לבטל את הפעולה.'
    );
    if (!confirmed) return;
    try {
      await api.delete('/api/users/me');
      logout();
      navigate('/login', { replace: true, state: { message: 'החשבון נמחק.' } });
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  return (
    <>
      <div className="topbar">
        <Link to="/" className="brand"><Logo size={34} /><span>מנה-לי</span></Link>
        <span className="user">
          שלום, {user?.fullName}
          {isAdmin && <button className="small" onClick={() => navigate('/admin/users')}>ניהול משתמשות</button>}
          {!isAdmin && <button className="small" onClick={handleDeleteAccount}>מחיקת החשבון</button>}
          <button className="small" onClick={handleLogout}>יציאה</button>
        </span>
      </div>
      <div className="page">
        {location.pathname !== '/' && (
          <button className="back-button" onClick={handleBack}>→ חזרה</button>
        )}
        <Outlet />
      </div>
    </>
  );
}
