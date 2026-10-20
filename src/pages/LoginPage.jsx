import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import { saveAuth } from '../auth';
import { cleanEmail } from '../emailList';
import AuthShell from '../components/AuthShell';
import Icon from '../components/Icon';
import PasswordInput from '../components/PasswordInput';

// חוזק סיסמה פשוט, רק להמחשה בזמן הרשמה (השרת קובע את הכללים)
function strength(pw) {
  if (!pw) return 0;
  let s = pw.length >= 6 ? 1 : 0;
  if (pw.length >= 8 && /\d/.test(pw)) s++;
  if (pw.length >= 10 && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.max(1, s);
}

// מסך אחד להתחברות ולהרשמה, עם לשוניות למעבר ביניהן
export default function LoginPage() {
  const navigate = useNavigate();
  // הודעה ממסך קודם, למשל אחרי מחיקת חשבון או איפוס סיסמה
  const notice = useLocation().state?.message;
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function switchTab(register) {
    setIsRegister(register);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = isRegister
        ? await api.post('/api/auth/register', { fullName, email, password })
        : await api.post('/api/auth/login', { email, password });
      saveAuth(response.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.status === 401 ? 'אימייל או סיסמה שגויים' : getErrorMessage(err));
      setBusy(false);
    }
  }

  const level = strength(password);

  return (
    <AuthShell>
      <h1 className="auth-title">{isRegister ? 'יוצרים חשבון' : 'ברוכה השבה'}</h1>
      <p className="auth-sub">
        {isRegister ? 'כמה פרטים ואפשר להתחיל לתכנן.' : 'נכנסים כדי לראות את הארוחות שלך.'}
      </p>

      <div className={`auth-tabs ${isRegister ? 'second' : ''}`} role="tablist">
        <span className="slider" aria-hidden="true" />
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
        {error && <div className="error" role="alert">{error}</div>}
        {isRegister && (
          <label>
            שם מלא
            <span className="field">
              <Icon name="user" size={18} />
              <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                autoComplete="name" placeholder="איך לקרוא לך?" required />
            </span>
          </label>
        )}
        <label>
          אימייל
          <span className="field">
            <Icon name="mail" size={18} />
            <input type="email" dir="ltr" value={email} onChange={(e) => setEmail(cleanEmail(e.target.value))}
              autoComplete="email" placeholder="name@example.com" required />
          </span>
        </label>
        <label>
          סיסמה
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            minLength={isRegister ? 6 : undefined} required />
          {isRegister && (
            <>
              <span className={`strength s${level}`} aria-hidden="true"><i /><i /><i /></span>
              <span className="field-hint">לפחות 6 תווים. ארוכה יותר, עם ספרות וסימנים, בטוחה יותר.</span>
            </>
          )}
        </label>

        {!isRegister && (
          <div className="auth-row">
            <span />
            <Link to="/forgot-password">שכחתי סיסמה</Link>
          </div>
        )}

        <button type="submit" className={busy ? 'loading' : ''} disabled={busy}>
          {isRegister ? 'יצירת חשבון' : 'כניסה'}
        </button>

        <div className="auth-switch">
          {isRegister ? 'כבר יש לך חשבון? ' : 'עוד אין לך חשבון? '}
          <button type="button" className="link" onClick={() => switchTab(!isRegister)}>
            {isRegister ? 'להתחברות' : 'להרשמה'}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
