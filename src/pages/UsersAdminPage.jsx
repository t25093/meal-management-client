import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import { getUser } from '../auth';
import { initials } from '../theme';
import Icon from '../components/Icon';

const PAGE_SIZE = 10;
const roles = { Admin: 'מנהלת', User: 'משתמשת' };

// ניהול משתמשות: למנהלת המערכת בלבד (השרת בודק זאת גם הוא)
export default function UsersAdminPage() {
  const navigate = useNavigate();
  const isAdmin = getUser()?.role === 'Admin';
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = useCallback(() => {
    return api
      .get('/api/users', { params: { page, pageSize: PAGE_SIZE } })
      .then((response) => setResult(response.data))
      .catch((err) => setError(getErrorMessage(err)));
  }, [page]);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin, loadUsers]);

  async function handleDelete(user) {
    const confirmed = window.confirm(
      `למחוק את ${user.fullName}?\nהארוחות שבבעלותה יימחקו, וההשתתפות שלה בארוחות אחרות תבוטל. אי אפשר לבטל את הפעולה.`
    );
    if (!confirmed) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/api/users/${user.id}`);
      setSuccess(`${user.fullName} נמחקה מהמערכת`);
      // אם מחקנו את השורה האחרונה בעמוד, חוזרים עמוד אחד אחורה
      if (result.items.length === 1 && page > 1) setPage(page - 1);
      else await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (!isAdmin) {
    return <div className="error">העמוד מיועד למנהלת המערכת בלבד.</div>;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>ניהול משתמשות</h1>
          <p>כל המשתמשות הרשומות במערכת{result ? ` · ${result.totalCount} בסך הכול` : ''}. לחיצה על משתמשת מציגה את הארוחות שלה.</p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      {result && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>שם</th>
                  <th>אימייל</th>
                  <th>תפקיד</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((user) => (
                  <tr key={user.id} className="clickable" onClick={() => navigate(`/admin/users/${user.id}`)}>
                    <td><span className="cell-user"><span className="avatar sm">{initials(user.fullName)}</span><b>{user.fullName}</b></span></td>
                    <td>{user.email}</td>
                    <td><span className={`pill ${user.role === 'Admin' ? 'primary' : ''}`}>{roles[user.role] ?? user.role}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="small" onClick={(e) => { e.stopPropagation(); navigate(`/admin/users/${user.id}`); }}>
                          פרטים <Icon name="chevronLeft" size={15} />
                        </button>
                        {user.role !== 'Admin' && (
                          <button className="small danger" onClick={(e) => { e.stopPropagation(); handleDelete(user); }}>
                            <Icon name="trash" size={15} /> מחיקה
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.totalPages > 1 && (
            <div className="pager">
              <span>עמוד {result.page} מתוך {result.totalPages}</span>
              <div className="pager-btns">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}><Icon name="chevronRight" size={16} /> הקודם</button>
                <button disabled={page >= result.totalPages} onClick={() => setPage(page + 1)}>הבא <Icon name="chevronLeft" size={16} /></button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
