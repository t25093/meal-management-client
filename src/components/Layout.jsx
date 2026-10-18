import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { getToken, getUser, logout } from '../auth';
import Logo from './Logo';

// מסגרת לכל המסכים שדורשים התחברות. בלי token מעבירה למסך ההתחברות.
export default function Layout() {
  const navigate = useNavigate();
  const user = getUser();

  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      <div className="topbar">
        <Link to="/" className="brand"><Logo size={34} /><span>מנה-לי</span></Link>
        <span className="user">
          שלום, {user?.fullName}
          <button className="small" onClick={handleLogout}>יציאה</button>
        </span>
      </div>
      <div className="page">
        <Outlet />
      </div>
    </>
  );
}
