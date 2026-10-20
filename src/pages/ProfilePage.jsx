import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import { getUser, logout } from '../auth';
import { initials, useTheme } from '../theme';
import Icon from '../components/Icon';

// פרופיל: פרטי החשבון, תצוגה, שינוי סיסמה דרך קישור במייל, ומחיקת החשבון
export default function ProfilePage() {
  const navigate = useNavigate();
  const [me, setMe] = useState(getUser());
  const [theme, setTheme] = useTheme();
  const [error, setError] = useState('');
  const [resetState, setResetState] = useState('idle'); // idle | sending | sent
  const [copied, setCopied] = useState(false);
  const isAdmin = me?.role === 'Admin';

  useEffect(() => {
    api.get('/api/users/me').then((r) => setMe(r.data)).catch((err) => setError(getErrorMessage(err)));
  }, []);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(me.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // הדפדפן לא איפשר העתקה
    }
  }

  async function sendResetLink() {
    setError('');
    setResetState('sending');
    try {
      await api.post('/api/auth/forgot-password', { email: me.email });
      setResetState('sent');
    } catch (err) {
      setResetState('idle');
      setError(getErrorMessage(err));
    }
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
      setError(getErrorMessage(err));
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>פרופיל</h1>
          <p>פרטי החשבון, התצוגה והסיסמה.</p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="profile-grid">
        <section className="card profile-card">
          <span className="avatar lg">{initials(me?.fullName)}</span>
          <h2>{me?.fullName}</h2>
          <span className="pill light">{isAdmin ? 'מנהלת מערכת' : 'משתמשת'}</span>
          <dl className="facts">
            <div>
              <dt>אימייל</dt>
              <dd>
                {me?.email}
                {me?.email && (
                  <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={copyEmail}
                    title={copied ? 'הועתק' : 'העתקה'} aria-label="העתקת האימייל">
                    <Icon name={copied ? 'check' : 'copy'} size={15} />
                  </button>
                )}
              </dd>
            </div>
            {me?.id && (
              <div>
                <dt>מספר משתמשת</dt>
                <dd>{me.id}</dd>
              </div>
            )}
          </dl>
        </section>

        <div>
          <section className="card">
            <h3>תצוגה</h3>
            <div className="setting-row">
              <p>ערכת צבעים לאתר. הבחירה נשמרת בדפדפן הזה.</p>
              <span className="theme-switch" role="group" aria-label="ערכת צבעים">
                <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>
                  <Icon name="moon" size={16} /> כהה
                </button>
                <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>
                  <Icon name="sun" size={16} /> בהירה
                </button>
              </span>
            </div>
          </section>

          <section className="card">
            <h3>סיסמה</h3>
            {resetState === 'sent' ? (
              <div className="success" style={{ marginBottom: 0 }}>
                נשלח קישור לבחירת סיסמה חדשה אל {me?.email}. הקישור תקף לשעה אחת.
              </div>
            ) : (
              <div className="setting-row">
                <p>נשלח אלייך מייל עם קישור מאובטח לבחירת סיסמה חדשה.</p>
                <button className={`primary ${resetState === 'sending' ? 'loading' : ''}`}
                  onClick={sendResetLink} disabled={!me?.email}>
                  <Icon name="key" size={17} /> שליחת קישור לשינוי סיסמה
                </button>
              </div>
            )}
          </section>

          {!isAdmin && (
            <section className="card danger-zone">
              <h3>מחיקת החשבון</h3>
              <div className="setting-row">
                <p>הארוחות שבבעלותך יימחקו, וההשתתפות שלך בארוחות אחרות תבוטל. אי אפשר לבטל את הפעולה.</p>
                <button className="danger" onClick={handleDeleteAccount}>
                  <Icon name="trash" size={17} /> מחיקת החשבון
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
