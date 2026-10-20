import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import { getUser } from '../auth';
import { mealTypes } from '../labels';
import Icon from '../components/Icon';

const UPCOMING_SHOWN = 5;

// ברכה לפי שעה ביום
function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'לילה טוב';
  if (h < 12) return 'בוקר טוב';
  if (h < 17) return 'צהריים טובים';
  if (h < 21) return 'ערב טוב';
  return 'לילה טוב';
}

function DateTile({ iso }) {
  const d = new Date(iso);
  return (
    <span className="date-tile" aria-hidden="true">
      <b>{d.getDate()}</b>
      <small>{d.toLocaleString('he-IL', { month: 'short' })}</small>
    </span>
  );
}

// לוח בקרה: סיכום, הארוחות הקרובות ופעולות מהירות
export default function HomePage() {
  const navigate = useNavigate();
  const user = getUser();
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const count = (role) =>
      api.get('/api/meals', { params: { role, page: 1, pageSize: 1 } }).then((r) => r.data.totalCount);

    Promise.all([
      count('owner'),
      count('participant'),
      // השרת ממיין לפי תאריך מהמוקדם למאוחר; מסננים את מה שכבר עבר
      api.get('/api/meals', { params: { page: 1, pageSize: 50, sortBy: 'date' } }).then((r) => r.data.items),
    ])
      .then(([owned, participating, items]) => {
        const now = Date.now();
        const future = items.filter((m) => new Date(m.eventDate).getTime() >= now);
        setStats({ owned, participating, upcoming: future.length });
        setUpcoming(future.slice(0, UPCOMING_SHOWN));
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const firstName = user?.fullName?.split(' ')[0] ?? '';
  const next = upcoming?.[0];

  return (
    <>
      <section className="welcome">
        <div>
          <span className="eyebrow"><Icon name="sparkle" size={14} /> {greeting()}, {firstName}</span>
          <h1>מה מבשלים הפעם?</h1>
          <p>
            {next
              ? `הארוחה הבאה: ${next.name}, ${new Date(next.eventDate).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}.`
              : 'פותחים ארוחה, מזמינים את המשתתפות, וכל אחת בוחרת מה היא מביאה.'}
          </p>
        </div>
        <div className="actions">
          <button className="on-dark lg" onClick={() => navigate('/meals/new')}>
            <Icon name="plus" size={18} /> ארוחה חדשה
          </button>
          {next && (
            <button className="glass lg" onClick={() => navigate(`/meals/${next.id}`)}>
              לארוחה הבאה
            </button>
          )}
        </div>
      </section>

      {error && <div className="error">{error}</div>}

      <div className="stats">
        <button className="stat" onClick={() => navigate('/meals?role=owner')}>
          <span className="stat-icon"><Icon name="plate" size={22} /></span>
          <span>
            <span className="stat-value">{stats ? stats.owned : '–'}</span>
            <span className="stat-label">ארוחות שבבעלותי</span>
          </span>
        </button>
        <button className="stat accent" onClick={() => navigate('/meals?role=participant')}>
          <span className="stat-icon"><Icon name="users" size={22} /></span>
          <span>
            <span className="stat-value">{stats ? stats.participating : '–'}</span>
            <span className="stat-label">ארוחות ששותפתי בהן</span>
          </span>
        </button>
        <div className="stat warm">
          <span className="stat-icon"><Icon name="calendar" size={22} /></span>
          <span>
            <span className="stat-value">{stats ? stats.upcoming : '–'}</span>
            <span className="stat-label">ארוחות קרובות</span>
          </span>
        </div>
      </div>

      <div className="dash-grid">
        <section className="card">
          <div className="card-head">
            <h3>הארוחות הקרובות</h3>
            <button className="ghost small" onClick={() => navigate('/meals?role=all')}>
              לכל הארוחות <Icon name="chevronLeft" size={16} />
            </button>
          </div>
          {!upcoming && !error && (
            <div style={{ display: 'grid', gap: 8 }}>
              {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 80 }} />)}
            </div>
          )}
          {upcoming && upcoming.length === 0 && (
            <div className="empty">
              <span className="empty-icon"><Icon name="calendar" size={26} /></span>
              <b>אין ארוחות קרובות</b>
              <span>ארוחה שתיצרי או שיזמינו אותך אליה תופיע כאן.</span>
              <button className="primary" onClick={() => navigate('/meals/new')}>
                <Icon name="plus" size={16} /> יצירת ארוחה
              </button>
            </div>
          )}
          {upcoming && upcoming.length > 0 && (
            <ul className="upcoming">
              {upcoming.map((meal) => {
                const pct = Math.min(100, Math.round(meal.coveragePercent));
                return (
                  <li key={meal.id}>
                    <button onClick={() => navigate(`/meals/${meal.id}`)}>
                      <DateTile iso={meal.eventDate} />
                      <span className="meta">
                        <b>{meal.name}</b>
                        <span>
                          <span className={`badge ${meal.mealType}`}>{mealTypes[meal.mealType]}</span>
                          <Icon name="clock" size={14} />
                          {new Date(meal.eventDate).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                          <span aria-hidden="true">·</span>
                          {meal.guestsCount} אורחים
                        </span>
                      </span>
                      <span className="progress" title={`${pct}% מהמנות נלקחו`}>
                        <span className="bar"><span className="fill" style={{ width: `${pct}%`, display: 'block' }} /></span>
                        <span>{pct}%</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card">
          <h3>פעולות מהירות</h3>
          <div className="quick">
            <button onClick={() => navigate('/meals/new')}>
              <span className="q-icon"><Icon name="plus" /></span>
              <span className="q-text"><b>פתיחת ארוחה חדשה</b><small>תאריך, תפריט ומשתתפות</small></span>
              <Icon name="arrowRight" size={18} className="q-arrow" />
            </button>
            <button onClick={() => navigate('/meals?role=participant')}>
              <span className="q-icon"><Icon name="check" /></span>
              <span className="q-text"><b>לבחור מה להביא</b><small>בארוחות שהזמינו אותך אליהן</small></span>
              <Icon name="arrowRight" size={18} className="q-arrow" />
            </button>
            <button onClick={() => navigate('/profile')}>
              <span className="q-icon"><Icon name="user" /></span>
              <span className="q-text"><b>הפרופיל שלי</b><small>פרטי החשבון ותצוגה</small></span>
              <Icon name="arrowRight" size={18} className="q-arrow" />
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
