import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import { saveAuth } from '../auth';
import { cleanEmail } from '../emailList';
import AuthShell from '../components/AuthShell';

// מסך אחד להתחברות ולהרשמה, עם לשוניות למעבר ביניהן
export default function LoginPage() {
  const navigate = useNavigate();
  // הודעה ממסך קודם, למשל אחרי מחיקת חשבון
  const notice = useLocation().state?.message;
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function switchTab(register) {
    setIsRegister(register);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const response = isRegister
        ? await api.post('/api/auth/register', { fullName, email, password })
        : await api.post('/api/auth/login', { email, password });
      saveAuth(response.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.status === 401 ? 'אימייל או סיסמה שגויים' : getErrorMessage(err));
    }
  }

  return (
    <AuthShell>
      <div className="auth-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={!isRegister}
          className={!isRegister ? 'active' : ''} onClick={() => switchTab(false)}>
          התחברות
        </button>
        <button type="button" role="tab" aria-selected={isRegister}
          className={isRegister ? 'active' : ''} onClick={() => switchTab(true)}>
          הרשמה
        </button>
      </div>
      <form className="card" onSubmit={handleSubmit}>
        {notice && !error && <div className="success">{notice}</div>}
        {error && <div className="error">{error}</div>}
        {isRegister && (
          <label>
            שם מלא
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
        )}
        <label>
          אימייל
          <input type="email" value={email} onChange={(e) => setEmail(cleanEmail(e.target.value))} required />
        </label>
        <label>
          סיסמה
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit">{isRegister ? 'הרשמה' : 'כניסה'}</button>
        {!isRegister && (
          <div className="auth-switch">
            <Link to="/forgot-password">שכחתי סיסמה</Link>
          </div>
        )}
      </form>
    </AuthShell>
  );
}
