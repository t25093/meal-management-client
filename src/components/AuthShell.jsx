import { useTheme } from '../theme';
import Icon from './Icon';
import Logo from './Logo';

const features = [
  { icon: 'calendar', text: 'פותחים ארוחה עם תאריך, סוג ותפריט בתוך דקה' },
  { icon: 'check', text: 'כל משתתפת בוחרת מה היא מביאה, בלי כפילויות' },
  { icon: 'chat', text: "צ'אט ומתכונים משותפים לכל ארוחה" },
];

// תצוגה מקדימה צפה: איך נראית ארוחה במערכת
function Preview() {
  return (
    <div className="preview" aria-hidden="true">
      <div className="preview-head">
        <div>
          <b>סעודת שבת משפחתית</b>
          <small>יום שישי · 19:30 · 24 אורחים</small>
        </div>
        <span className="preview-tag">בשרית</span>
      </div>
      <ul>
        <li><span className="dot">רכ</span><span>עוף בתנור</span><em>נלקח</em></li>
        <li><span className="dot">של</span><span>סלט ירקות</span><em>נלקח</em></li>
        <li><span className="dot free">+</span><span>קינוח</span><em>פנוי</em></li>
      </ul>
      <div className="progress">
        <div className="bar"><div className="fill" style={{ width: '68%' }} /></div>
        <span>68%</span>
      </div>
    </div>
  );
}

// מסגרת משותפת למסכי ההתחברות: צד מותג צבעוני, וצד טופס
export default function AuthShell({ children }) {
  const [theme, setTheme] = useTheme();

  return (
    <div className="auth-screen">
      <section className="auth-side">
        <span className="orb a" />
        <span className="orb b" />
        <span className="grid-lines" />

        <div className="auth-brand">
          <span className="brand-mark"><Logo size={36} /></span>
          <span>
            <b>מנה-לי</b>
            <small>ארוחות משותפות</small>
          </span>
        </div>

        <div className="auth-copy">
          <h1 className="auth-headline">ארוחה משותפת,<br /><em>בלי בלגן.</em></h1>
          <p className="auth-tagline">
            מזמינים את המשתתפות, וכל אחת רואה מה כבר נלקח ומה עוד חסר. הכול במקום אחד.
          </p>
          <ul className="auth-features">
            {features.map((f) => (
              <li key={f.icon}>
                <span className="f-icon"><Icon name={f.icon} size={18} /></span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <Preview />
        <span className="auth-foot">© {new Date().getFullYear()} מנה-לי</span>
      </section>

      <main className="auth-main">
        <button className="icon-btn theme-corner" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'מעבר לתצוגה בהירה' : 'מעבר לתצוגה כהה'}
          title={theme === 'dark' ? 'מעבר לתצוגה בהירה' : 'מעבר לתצוגה כהה'}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        <div className="auth-box">{children}</div>
      </main>
    </div>
  );
}
