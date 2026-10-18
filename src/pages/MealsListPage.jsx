import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import { formatDate, mealTypes } from '../labels';

const PAGE_SIZE = 5;

// רשימת ארוחות עם pagination אמיתי: כל מעבר עמוד שולח page לשרת
export default function MealsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = searchParams.get('role') === 'participant' ? 'participant' : 'owner';
  const page = Number(searchParams.get('page')) || 1;

  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    api
      .get('/api/meals', { params: { role, page, pageSize: PAGE_SIZE, sortBy: 'date' } })
      .then((response) => setResult(response.data))
      .catch((err) => setError(getErrorMessage(err)));
  }, [role, page]);

  function goToPage(newPage) {
    setSearchParams({ role, page: newPage });
  }

  return (
    <>
      <h1>{role === 'owner' ? 'ארוחות שבבעלותי' : 'ארוחות ששותפתי בהן'}</h1>
      {error && <div className="error">{error}</div>}
      {result && (
        <>
          {result.items.length === 0 ? (
            <div className="empty">אין ארוחות להצגה.</div>
          ) : (
            <div className="table-wrap">
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
                      <td>
                        <div className="progress">
                          <div className="bar">
                            <div className="fill" style={{ width: `${Math.min(100, Math.round(meal.coveragePercent))}%` }} />
                          </div>
                          <span>{Math.round(meal.coveragePercent)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="row pager">
            <button disabled={page <= 1} onClick={() => goToPage(page - 1)}>הקודם</button>
            <span>
              עמוד {result.page} מתוך {Math.max(result.totalPages, 1)} ({result.totalCount} ארוחות)
            </span>
            <button disabled={page >= result.totalPages} onClick={() => goToPage(page + 1)}>הבא</button>
          </div>
        </>
      )}
    </>
  );
}
