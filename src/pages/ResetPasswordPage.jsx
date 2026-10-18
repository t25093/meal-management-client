import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import Logo from '../components/Logo';

// בחירת סיסמה חדשה מהקישור שנשלח במייל (?token=...)
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const token = useSearchParams()[0].get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('הסיסמאות אינן זהות');
      return;
    }
    try {
      await api.post('/api/auth/reset-password', { token, newPassword: password });
      navigate('/login', { replace: true, state: { message: 'הסיסמה עודכנה. אפשר להתחבר עם הסיסמה החדשה.' } });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-box">
        <div className="auth-brand">
          <Logo size={72} />
          <h2>מנה-לי</h2>
        </div>
        <form className="card" onSubmit={handleSubmit}>
          <h1>בחירת סיסמה חדשה</h1>
          {!token ? (
            <div className="error">הקישור חסר או לא תקין. אפשר לבקש קישור חדש.</div>
          ) : (
            <>
              {error && <div className="error">{error}</div>}
              <label>
                סיסמה חדשה
                <input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>
              <label>
                אימות הסיסמה
                <input type="password" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </label>
              <button type="submit">שמירת הסיסמה</button>
            </>
          )}
          <div className="auth-switch">
            <Link to="/forgot-password">בקשת קישור חדש</Link>
            {' · '}
            <Link to="/login">חזרה להתחברות</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
