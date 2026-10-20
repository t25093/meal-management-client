import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import { cleanEmail } from '../emailList';
import AuthShell from '../components/AuthShell';

// בקשת קישור לאיפוס סיסמה במייל
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <AuthShell>
        <form className="card" onSubmit={handleSubmit}>
          <h1>שכחתי סיסמה</h1>
          {error && <div className="error">{error}</div>}
          {sent ? (
            <div className="success">
              אם האימייל רשום במערכת, נשלח אליו קישור לבחירת סיסמה חדשה. הקישור תקף לשעה אחת. כדאי לבדוק גם בתיבת הספאם.
            </div>
          ) : (
            <>
              <p className="muted">נשלח אלייך מייל עם קישור לבחירת סיסמה חדשה.</p>
              <label>
                אימייל
                <input type="email" value={email} onChange={(e) => setEmail(cleanEmail(e.target.value))} required />
              </label>
              <button type="submit">שליחת קישור</button>
            </>
          )}
          <div className="auth-switch">
            <Link to="/login">חזרה להתחברות</Link>
          </div>
        </form>
    </AuthShell>
  );
}
