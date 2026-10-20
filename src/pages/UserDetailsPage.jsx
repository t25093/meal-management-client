import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import { getUser } from '../auth';
import { formatDate, mealTypes } from '../labels';
import { initials } from '../theme';
import Icon from '../components/Icon';

const PAGE_SIZE = 8;
const roles = { Admin: 'מנהלת מערכת', User: 'משתמשת' };

const tabs = [
  { key: 'participant', label: 'משתתפת בהן' },
  { key: 'owner', label: 'בבעלותה' },
];

// פרטי משתמשת למנהלת המערכת: מי היא, ובאילו ארוחות היא משתתפת או מארחת
export default function UserDetailsPage() {
  const { userId } = useParams();
  const isAdmin = getUser()?.role === 'Admin';
  const [user, setUser] = useState(null);
  const [counts, setCounts] = useState(null);
  const [tab, setTab] = useState('participant');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // פרטי המשתמשת ומספר הארוחות בכל קבוצה
  useEffect(() => {
    if (!isAdmin) return;
    const count = (role) =>
      api.get(`/api/users/${userId}/meals`, { params: { role, page: 1, pageSize: 1 } }).then((r) => r.data.totalCount);
    Promise.all([api.get(`/api/users/${userId}`), count('participant'), count('owner')])
      .then(([u, participating, owned]) => {
        setUser(u.data);
        setCounts({ participating, owned });
        // אם היא לא משתתפת באף ארוחה אבל מארחת, פותחים ישר את "בבעלותה"
        if (participating === 0 && owned > 0) setTab('owner');
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [userId, isAdmin]);

  // חיפוש: מחכים שההקלדה תיעצר לרגע
  useEffect(() => {
    const t = setTimeout(() => { setSearch(query.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    api
      .get(`/api/users/${userId}/meals`, {
        params: { role: tab, page, pageSize: PAGE_SIZE, sortBy: 'date', search: search || undefined },
      })
      .then((r) => setResult(r.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [userId, tab, page, search, isAdmin]);

  if (!isAdmin) {
    return <div className="error">העמוד מיועד למנהלת המערכת בלבד.</div>;
  }

  function changeTab(key) {
    setTab(key);
    setPage(1);
  }

  const now = Date.now();

  return (
    <>
      {error && <div className="error">{error}</div>}

      <section className="card user-hero">
        <span className="avatar lg">{initials(user?.fullName)}</span>
        <div className="uh-text">
          <h1>{user?.fullName ?? '…'}</h1>
          <div className="uh-meta">
            {user && <span className={`pill ${user.role === 'Admin' ? 'primary' : 'light'}`}>{roles[user.role] ?? user.role}</span>}
            {user?.email && <span dir="ltr" className="uh-email"><Icon name="mail" size={15} /> {user.email}</span>}
            {user?.id && <span className="muted">מספר משתמשת {user.id}</span>}
          </div>
        </div>
        <div className="uh-stats">
          <div><b>{counts ? counts.participating : '–'}</b><span>משתתפת</span></div>
          <div><b>{counts ? counts.owned : '–'}</b><span>מארחת</span></div>
          <div><b>{counts ? counts.participating + counts.owned : '–'}</b><span>סך הכול</span></div>
        </div>
      </section>

      <div className="meal-tabs">
        <div className="tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key}
              className={tab === t.key ? 'active' : ''} onClick={() => changeTab(t.key)}>
              {t.label}
              {counts && <span className="count">{t.key === 'owner' ? counts.owned : counts.participating}</span>}
            </button>
          ))}
        </div>
        <span className="field" style={{ flex: '0 1 300px', margin: 0 }}>
          <Icon name="search" size={18} />
          <input type="search" placeholder="חיפוש לפי שם הארוחה" value={query}
            onChange={(e) => setQuery(e.target.value)} aria-label="חיפוש לפי שם הארוחה" />
        </span>
      </div>

      {loading && !result && <div className="skeleton" style={{ height: 260 }} />}

      {result && result.items.length === 0 && (
        <div className="empty">
          <span className="empty-icon"><Icon name={search ? 'search' : 'inbox'} size={26} /></span>
          <b>{search ? 'לא נמצאו ארוחות' : tab === 'owner' ? 'אין ארוחות בבעלותה' : 'היא לא משתתפת באף ארוחה'}</b>
          <span>{search ? `אין ארוחה ששמה מכיל "${search}".` : 'ארוחות שיתווספו יופיעו כאן.'}</span>
        </div>
      )}

      {result && result.items.length > 0 && (
        <div className="table-wrap" style={{ opacity: loading ? 0.6 : 1 }}>
          <table>
            <thead>
              <tr>
                <th>ארוחה</th>
                <th>תאריך</th>
                <th>סוג</th>
                <th>אורחים</th>
                {tab === 'participant' && <th>בעלת הארוחה</th>}
                <th>נלקח</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((meal) => {
                const pct = Math.min(100, Math.round(meal.coveragePercent));
                const past = new Date(meal.eventDate).getTime() < now;
                return (
                  <tr key={meal.id}>
                    <td><b>{meal.name}</b></td>
                    <td>{formatDate(meal.eventDate)} {past && <span className="past-tag">עברה</span>}</td>
                    <td><span className={`badge ${meal.mealType}`}>{mealTypes[meal.mealType]}</span></td>
                    <td>{meal.guestsCount}</td>
                    {tab === 'participant' && (
                      <td><span className="cell-user"><span className="avatar xs">{initials(meal.ownerName)}</span>{meal.ownerName}</span></td>
                    )}
                    <td>
                      <div className="progress">
                        <div className="bar"><div className="fill" style={{ width: `${pct}%` }} /></div>
                        <span>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {result && result.totalPages > 1 && (
        <div className="pager">
          <span>עמוד {result.page} מתוך {result.totalPages} · {result.totalCount} ארוחות</span>
          <div className="pager-btns">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}><Icon name="chevronRight" size={16} /> הקודם</button>
            <button disabled={page >= result.totalPages} onClick={() => setPage(page + 1)}>הבא <Icon name="chevronLeft" size={16} /></button>
          </div>
        </div>
      )}
    </>
  );
}
