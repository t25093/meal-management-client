import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import AuthShell from '../components/AuthShell';
import Icon from '../components/Icon';
import PasswordInput from '../components/PasswordInput';

// בחירת סיסמה חדשה מהקישור שנשלח במייל (?token=...)
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const token = useSearchParams()[0].get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('הסיסמאות אינן זהות');
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/auth/reset-password', { token, newPassword: password });
      navigate('/login', { replace: true, state: { message: 'הסיסמה עודכנה. אפשר להתחבר עם הסיסמה החדשה.' } });
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <span className="auth-icon-head"><Icon name="lock" size={26} /></span>
      <h1 className="auth-title">בחירת סיסמה חדשה</h1>
      <p className="auth-sub">אחרי השמירה הכניסה הבאה תהיה עם הסיסמה החדשה.</p>
      <form className="card" onSubmit={handleSubmit}>
        {!token ? (
          <div className="error">הקישור חסר או לא תקין. אפשר לבקש קישור חדש.</div>
        ) : (
          <>
            {error && <div className="error" role="alert">{error}</div>}
            <label>
              סיסמה חדשה
              <PasswordInput minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password" required />
              <span className="field-hint">לפחות 6 תווים.</span>
            </label>
            <label>
              אימות הסיסמה
              <PasswordInput minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password" required />
            </label>
            <button type="submit" className={busy ? 'loading' : ''} disabled={busy}>שמירת הסיסמה</button>
          </>
        )}
        <div className="auth-switch">
          <Link to="/forgot-password">בקשת קישור חדש</Link>
          {' · '}
          <Link to="/login">חזרה להתחברות</Link>
        </div>
      </form>
    </AuthShell>
  );
}
