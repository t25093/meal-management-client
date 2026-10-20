import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import { cleanEmail } from '../emailList';
import AuthShell from '../components/AuthShell';
import Icon from '../components/Icon';

// בקשת קישור לאיפוס סיסמה במייל
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <span className="auth-icon-head"><Icon name={sent ? 'mail' : 'key'} size={26} /></span>
      <h1 className="auth-title">{sent ? 'בדקי את תיבת המייל' : 'שכחתי סיסמה'}</h1>
      <p className="auth-sub">
        {sent
          ? 'אם האימייל רשום במערכת, נשלח אליו קישור לבחירת סיסמה חדשה. הקישור תקף לשעה אחת, וכדאי לבדוק גם בספאם.'
          : 'נשלח אלייך מייל עם קישור לבחירת סיסמה חדשה.'}
      </p>
      <form className="card" onSubmit={handleSubmit}>
        {error && <div className="error" role="alert">{error}</div>}
        {!sent && (
          <>
            <label>
              אימייל
              <span className="field">
                <Icon name="mail" size={18} />
                <input type="email" dir="ltr" value={email} onChange={(e) => setEmail(cleanEmail(e.target.value))}
                  autoComplete="email" placeholder="name@example.com" required />
              </span>
            </label>
            <button type="submit" className={busy ? 'loading' : ''} disabled={busy}>שליחת קישור</button>
          </>
        )}
        <div className="auth-switch">
          <Link to="/login">חזרה להתחברות</Link>
        </div>
      </form>
    </AuthShell>
  );
}
