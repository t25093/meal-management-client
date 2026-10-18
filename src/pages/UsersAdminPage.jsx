import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import { getUser } from '../auth';

const PAGE_SIZE = 10;
const roles = { Admin: 'מנהלת', User: 'משתמשת' };

// ניהול משתמשות: למנהלת המערכת בלבד (השרת בודק זאת גם הוא)
export default function UsersAdminPage() {
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
      <h1>ניהול משתמשות</h1>
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
                  <tr key={user.id}>
                    <td><b>{user.fullName}</b></td>
                    <td>{user.email}</td>
                    <td>{roles[user.role] ?? user.role}</td>
                    <td>
                      {user.role !== 'Admin' && (
                        <button className="small danger" onClick={() => handleDelete(user)}>מחיקה</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row pager">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>הקודם</button>
            <span>
              עמוד {result.page} מתוך {Math.max(result.totalPages, 1)} ({result.totalCount} משתמשות)
            </span>
            <button disabled={page >= result.totalPages} onClick={() => setPage(page + 1)}>הבא</button>
          </div>
        </>
      )}
    </>
  );
}
