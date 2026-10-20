import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import { formatDate, mealTypes } from '../labels';
import Icon from '../components/Icon';

const PAGE_SIZE = 9;
const VIEW_KEY = 'mealsView';

const tabs = [
  { key: 'owner', label: 'בבעלותי', title: 'ארוחות שבבעלותי', sub: 'ארוחות שפתחת ואת מנהלת.' },
  { key: 'participant', label: 'שותפתי', title: 'ארוחות ששותפתי בהן', sub: 'ארוחות שהזמינו אותך אליהן. אפשר לבחור שם מה להביא.' },
  { key: 'all', label: 'הכול', title: 'כל הארוחות', sub: 'כל הארוחות שלך, גם שבבעלותך וגם שהוזמנת אליהן.' },
];

function readView() {
  try { return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'grid'; } catch { return 'grid'; }
}

function Progress({ value }) {
  const pct = Math.min(100, Math.round(value));
  return (
    <div className="progress" title={`${pct}% מהמנות נלקחו`}>
      <div className="bar"><div className="fill" style={{ width: `${pct}%` }} /></div>
      <span>{pct}%</span>
    </div>
  );
}

// רשימת ארוחות: לשוניות, חיפוש ומיון בצד השרת, ותצוגת כרטיסים או טבלה
export default function MealsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const role = tabs.some((t) => t.key === roleParam) ? roleParam : 'owner';
  const page = Number(searchParams.get('page')) || 1;
  const sortBy = searchParams.get('sort') === 'name' ? 'name' : 'date';
  const search = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(search);
  const [view, setView] = useState(readView);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // עדכון פרמטר בכתובת; כל שינוי חוץ ממעבר עמוד מחזיר לעמוד 1
  function update(changes) {
    const next = { role, sort: sortBy, q: search, page: 1, ...changes };
    if (!next.q) delete next.q;
    if (next.sort === 'date') delete next.sort;
    if (Number(next.page) === 1) delete next.page;
    setSearchParams(next);
  }

  // חיפוש: מחכים שהקלדה תיעצר לרגע לפני שפונים לשרת
  useEffect(() => {
    if (query === search) return undefined;
    const t = setTimeout(() => update({ q: query.trim() ? query : '' }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => { setQuery(search); }, [search]);

  useEffect(() => {
    setError('');
    setLoading(true);
    api
      .get('/api/meals', {
        params: { role: role === 'all' ? undefined : role, page, pageSize: PAGE_SIZE, sortBy, search: search.trim() || undefined },
      })
      .then((response) => setResult(response.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [role, page, sortBy, search]);

  function changeView(v) {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* לא נשמר, לא נורא */ }
  }

  const tab = tabs.find((t) => t.key === role);
  const now = Date.now();

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{tab.title}</h1>
          <p>{tab.sub}</p>
        </div>
        <button className="primary lg" onClick={() => navigate('/meals/new')}>
          <Icon name="plus" size={18} /> ארוחה חדשה
        </button>
      </div>

      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} role="tab" aria-selected={t.key === role}
            className={t.key === role ? 'active' : ''} onClick={() => update({ role: t.key })}>
            {t.label}
            {t.key === role && result && <span className="count">{result.totalCount}</span>}
          </button>
        ))}
      </div>

      <div className="filters">
        <span className="field">
          <Icon name="search" size={18} />
          <input type="search" placeholder="חיפוש לפי שם הארוחה" value={query}
            onChange={(e) => setQuery(e.target.value)} aria-label="חיפוש לפי שם הארוחה" />
        </span>
        <select value={sortBy} onChange={(e) => update({ sort: e.target.value })} aria-label="מיון">
          <option value="date">מיון לפי תאריך</option>
          <option value="name">מיון לפי שם</option>
        </select>
        <span className="view-toggle" role="group" aria-label="תצוגה">
          <button className={view === 'grid' ? 'active' : ''} onClick={() => changeView('grid')} title="כרטיסים" aria-label="תצוגת כרטיסים">
            <Icon name="grid" size={18} />
          </button>
          <button className={view === 'table' ? 'active' : ''} onClick={() => changeView('table')} title="טבלה" aria-label="תצוגת טבלה">
            <Icon name="list" size={18} />
          </button>
        </span>
      </div>

      {error && <div className="error">{error}</div>}

      {loading && !result && (
        <div className="meal-grid">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton" style={{ height: 200 }} />)}
        </div>
      )}

      {result && result.items.length === 0 && (
        <div className="empty">
          <span className="empty-icon"><Icon name={search ? 'search' : 'inbox'} size={26} /></span>
          <b>{search ? 'לא נמצאו ארוחות' : 'אין ארוחות'}</b>
          <span>{search ? `אין ארוחה ששמה מכיל "${search}".` : 'ארוחות שיתווספו יופיעו כאן.'}</span>
          {search
            ? <button onClick={() => update({ q: '' })}>ניקוי החיפוש</button>
            : role !== 'participant' && (
              <button className="primary" onClick={() => navigate('/meals/new')}><Icon name="plus" size={16} /> יצירת ארוחה</button>
            )}
        </div>
      )}

      {result && result.items.length > 0 && view === 'grid' && (
        <div className="meal-grid" style={{ opacity: loading ? 0.6 : 1 }}>
          {result.items.map((meal) => {
            const past = new Date(meal.eventDate).getTime() < now;
            return (
              <button key={meal.id} className="meal-card" onClick={() => navigate(`/meals/${meal.id}`)}>
                <div className="mc-top">
                  <h4>{meal.name}</h4>
                  <span className={`badge ${meal.mealType}`}>{mealTypes[meal.mealType]}</span>
                </div>
                <div className="mc-meta">
                  <span><Icon name="calendar" size={16} /> {formatDate(meal.eventDate)} {past && <span className="past-tag">עברה</span>}</span>
                  <span><Icon name="guests" size={16} /> {meal.guestsCount} אורחים</span>
                  <span><Icon name="user" size={16} /> {meal.ownerName}</span>
                </div>
                <div className="mc-foot">
                  <Progress value={meal.coveragePercent} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {result && result.items.length > 0 && view === 'table' && (
        <div className="table-wrap" style={{ opacity: loading ? 0.6 : 1 }}>
          <table>
            <thead>
              <tr>
                <th>שם</th>
                <th>תאריך</th>
                <th>סוג</th>
                <th>אורחים</th>
                <th>בעלת הארוחה</th>
                <th>נלקח</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((meal) => (
                <tr key={meal.id} className="clickable" onClick={() => navigate(`/meals/${meal.id}`)}>
                  <td><b>{meal.name}</b></td>
                  <td>{formatDate(meal.eventDate)}</td>
                  <td><span className={`badge ${meal.mealType}`}>{mealTypes[meal.mealType]}</span></td>
                  <td>{meal.guestsCount}</td>
                  <td>{meal.ownerName}</td>
                  <td><Progress value={meal.coveragePercent} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && result.totalPages > 1 && (
        <div className="pager">
          <span>עמוד {result.page} מתוך {result.totalPages} · {result.totalCount} ארוחות</span>
          <div className="pager-btns">
            <button disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
              <Icon name="chevronRight" size={16} /> הקודם
            </button>
            <button disabled={page >= result.totalPages} onClick={() => update({ page: page + 1 })}>
              הבא <Icon name="chevronLeft" size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
