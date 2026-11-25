import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import { getUser, logout, saveAuth } from '../auth';
import { initials, useTheme } from '../theme';
import Icon from '../components/Icon';
import PasswordInput from '../components/PasswordInput';
import { saveShowTypingText, showsTypingText } from '../api/preferences';

// פרופיל: פרטי החשבון, תצוגה, שינוי סיסמה דרך קישור במייל, ומחיקת החשבון
export default function ProfilePage() {
  const navigate = useNavigate();
  const [me, setMe] = useState(getUser());
  const [theme, setTheme] = useTheme();
  const [error, setError] = useState('');
  const [resetState, setResetState] = useState('idle'); // idle | sending | sent
  const [copied, setCopied] = useState(false);
  const isAdmin = me?.role === 'Admin';
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', currentPassword: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editError, setEditError] = useState('');
  // כמו בשרת: בלי רווחים ובאותיות קטנות, כדי לדעת אם האימייל באמת השתנה
  const normalizeEmail = (email) => email.replace(/\s/g, '').toLowerCase();
  const emailChanged = editing && normalizeEmail(form.email) !== normalizeEmail(me?.email ?? '');

  useEffect(() => {
    api.get('/api/users/me').then((r) => setMe(r.data)).catch((err) => setError(getErrorMessage(err)));
  }, []);

  function startEdit() {
    setForm({ fullName: me?.fullName ?? '', email: me?.email ?? '', currentPassword: '' });
    setEditError('');
    setSaved(false);
    setEditing(true);
  }

  // שמירת שם ואימייל. שינוי אימייל דורש את הסיסמה הנוכחית, והשרת בודק שהאימייל לא תפוס.
  async function saveDetails(e) {
    e.preventDefault();
    if (!form.fullName.trim()) return setEditError('יש למלא שם מלא');
    if (!form.email.trim()) return setEditError('יש למלא אימייל');
    if (emailChanged && !form.currentPassword) return setEditError('כדי לשנות אימייל יש להזין את הסיסמה הנוכחית');
    setEditError('');
    setSaving(true);
    try {
      const { data } = await api.put('/api/users/me', {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        currentPassword: emailChanged ? form.currentPassword : null,
      });
      // השרת מחזיר token חדש עם הפרטים המעודכנים
      saveAuth(data);
      setMe(data.user);
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setEditError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // צ'אט: האם המשתתפות רואות את הטקסט שלי בזמן הקלדה
  async function changeShowText(show) {
    if (showsTypingText(me) === show) return;
    const previous = me;
    setMe({ ...me, showTypingText: show });
    try {
      setMe(await saveShowTypingText(show));
    } catch (err) {
      setMe(previous);
      setError(getErrorMessage(err));
    }
  }

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
            <div className="card-head">
              <h3>פרטים אישיים</h3>
              {!editing && (
                <button className="ghost" onClick={startEdit} disabled={!me?.email}>
                  <Icon name="edit" size={16} /> עריכה
                </button>
              )}
            </div>
            {!editing ? (
              <>
                {saved && <div className="success">הפרטים עודכנו.</div>}
                <div className="setting-row">
                  <p>השם והאימייל שלך, כפי שהם מופיעים למשתתפות בארוחות.</p>
                </div>
              </>
            ) : (
              <form onSubmit={saveDetails} className="profile-edit">
                {editError && <div className="error">{editError}</div>}
                <label>
                  שם מלא
                  <span className="field">
                    <Icon name="user" size={18} />
                    <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} maxLength={100} autoFocus />
                  </span>
                </label>
                <label>
                  אימייל
                  <span className="field">
                    <Icon name="mail" size={18} />
                    <input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </span>
                  {emailChanged && <span className="field-hint">ההתחברות מעכשיו תהיה עם האימייל החדש.</span>}
                </label>
                {emailChanged && (
                  <label>
                    סיסמה נוכחית
                    <PasswordInput value={form.currentPassword} autoComplete="current-password"
                      onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
                    <span className="field-hint">לאימות שזו את, לפני שינוי האימייל.</span>
                  </label>
                )}
                <div className="row form-actions">
                  <button type="submit" className={`primary ${saving ? 'loading' : ''}`} disabled={saving}>
                    <Icon name="check" size={17} /> שמירה
                  </button>
                  <button type="button" className="ghost" onClick={() => setEditing(false)} disabled={saving}>ביטול</button>
                </div>
              </form>
            )}
          </section>

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
            <h3>צ'אט</h3>
            <div className="setting-row">
              <p>בזמן שאת כותבת הודעה, המשתתפות בארוחה רואות את הטקסט עוד לפני השליחה. אפשר להסתיר אותו, ואז הן יראו רק שאת כותבת. ההגדרה חלה בכל המכשירים.</p>
              <span className="theme-switch" role="group" aria-label="הטקסט שלי בזמן הקלדה">
                <button className={showsTypingText(me) ? 'active' : ''} onClick={() => changeShowText(true)} disabled={!me?.id}>
                  <Icon name="eye" size={16} /> גלוי
                </button>
                <button className={!showsTypingText(me) ? 'active' : ''} onClick={() => changeShowText(false)} disabled={!me?.id}>
                  <Icon name="eyeOff" size={16} /> מוסתר
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
