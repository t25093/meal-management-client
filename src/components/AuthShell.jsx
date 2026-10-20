import Logo from './Logo';

// מסגרת משותפת למסכי ההתחברות: צד מותג עם רקע צבעוני, וצד טופס כהה
export default function AuthShell({ children }) {
  return (
    <div className="auth-screen">
      <section className="auth-side">
        <div className="auth-side-inner">
          <div className="auth-brand">
            <span className="brand-mark"><Logo size={40} /></span>
            <h2>מנה-לי</h2>
          </div>
          <h1 className="auth-headline">ארוחה משותפת, בלי בלגן.</h1>
          <p className="auth-tagline">
            פותחים ארוחה, מזמינים את המשתתפות, וכל אחת בוחרת מה היא מביאה - כולן רואות מה כבר נלקח.
          </p>
        </div>
      </section>
      <main className="auth-main">
        <div className="auth-box">{children}</div>
      </main>
    </div>
  );
}
