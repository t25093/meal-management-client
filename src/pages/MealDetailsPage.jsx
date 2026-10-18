import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { loadAllDishes } from '../api/dishes';
import { getErrorMessage, isConflict } from '../api/errors';
import { getUser } from '../auth';
import { fitsMeal, formatDate, mealTypes } from '../labels';
import DishRow from '../components/DishRow';
import MenuPicker from '../components/MenuPicker';
import NewDishForm from '../components/NewDishForm';
import ChatPanel from '../components/ChatPanel';
import RecipesPanel from '../components/RecipesPanel';

export default function MealDetailsPage() {
  const { mealId } = useParams();
  const navigate = useNavigate();
  const currentUser = getUser();
  const currentUserId = currentUser?.id;

  const [meal, setMeal] = useState(null);
  const [mealDishes, setMealDishes] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState('');
  const [success, setSuccess] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');

  const loadMeal = useCallback(() => {
    return api.get(`/api/meals/${mealId}`)
      .then((response) => setMeal(response.data))
      .catch((err) => setError(getErrorMessage(err)));
  }, [mealId]);

  const loadMealDishes = useCallback(() => {
    return api.get(`/api/meals/${mealId}/dishes`, { params: { status } })
      .then((response) => setMealDishes(response.data))
      .catch((err) => setError(getErrorMessage(err)));
  }, [mealId, status]);

  useEffect(() => { loadMeal(); }, [loadMeal]);
  useEffect(() => { loadMealDishes(); }, [loadMealDishes]);
  useEffect(() => { loadAllDishes().then(setDishes).catch(() => {}); }, []);

  function clearMessages() {
    setError('');
    setConflict('');
    setSuccess('');
  }

  // הטיפול ב-409: הודעה בולטת, ואחריה רענון הנתונים כדי להציג את הכמות העדכנית
  async function handleError(err) {
    if (isConflict(err)) {
      setConflict(`המנה נלקחה או עודכנה על ידי משתתפת אחרת. הנתונים רועננו. (${getErrorMessage(err)})`);
      await loadMealDishes();
    } else {
      setError(getErrorMessage(err));
    }
  }

  // choice: מזהה של מאכל מהמאגר, או שם שהמשתתפת הקלידה בעצמה (בחירה חופשית)
  async function handleTake(mealDish, quantity, choice = {}) {
    clearMessages();
    const body = { quantity };
    if (choice.dishId) body.specifiedDishId = choice.dishId;
    if (choice.freeName) {
      // השרת מוסיף את המאכל החדש למאגר ומשבץ אותו במנה, בבקשה אחת
      body.newDish = {
        name: choice.freeName,
        category: mealDish.category,
        kosherType: meal.mealType,
        quantityPerPerson: 1,
        unit: 'Portion',
      };
    }
    try {
      await api.post(`/api/meals/${mealId}/dishes/${mealDish.id}/assignments`, body);
      setSuccess(`נרשמת להכין ${quantity}`);
      await Promise.all([loadMealDishes(), loadMeal()]);
    } catch (err) {
      // מאכל שהוקלד וכבר קיים במאגר: מציגים את הודעת השרת ("יש לבחור אותו מהרשימה")
      if (choice.freeName && isConflict(err)) setError(getErrorMessage(err));
      else await handleError(err);
    }
  }

  async function handleCancel(assignmentId) {
    clearMessages();
    try {
      await api.delete(`/api/meals/${mealId}/assignments/${assignmentId}`);
      await loadMealDishes();
    } catch (err) {
      await handleError(err);
    }
  }

  async function handleRemoveDish(mealDishId) {
    clearMessages();
    try {
      await api.delete(`/api/meals/${mealId}/dishes/${mealDishId}`);
      await loadMealDishes();
    } catch (err) {
      await handleError(err);
    }
  }

  async function handleAddDish(item) {
    clearMessages();
    try {
      await api.post(`/api/meals/${mealId}/dishes`, { dishId: item.dishId, category: item.category });
      await Promise.all([loadMealDishes(), loadMeal()]);
      return true;
    } catch (err) {
      await handleError(err);
      return false;
    }
  }

  // מאכל חדש נכנס למאגר, ואם הוא מתאים לארוחה הוא מתווסף אליה אוטומטית
  async function handleDishCreated(dish) {
    setDishes((current) => [...current, dish]);
    if (!fitsMeal(dish, meal.mealType)) {
      clearMessages();
      setError(`${dish.name} נוסף למאגר, אבל אינו מתאים לארוחה ${mealTypes[meal.mealType]} ולכן לא נוסף אליה`);
      return;
    }
    if (await handleAddDish({ dishId: dish.id, category: dish.category })) {
      setSuccess(`${dish.name} נוסף למאגר ולארוחה`);
    }
  }

  // מחיקת הארוחה כולה: בעלת הארוחה או מנהלת המערכת
  async function handleDeleteMeal() {
    const confirmed = window.confirm(
      `למחוק את הארוחה "${meal.name}"?\nכל המנות, ההודעות והמתכונים שלה יימחקו. אי אפשר לבטל את הפעולה.`
    );
    if (!confirmed) return;
    clearMessages();
    try {
      await api.delete(`/api/meals/${mealId}`);
      navigate('/meals?role=owner', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleAddParticipant(e) {
    e.preventDefault();
    clearMessages();
    try {
      const response = await api.post(`/api/meals/${mealId}/participants`, { email: participantEmail });
      setParticipantEmail('');
      setSuccess(response.data.message);
      await loadMeal();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (!meal) {
    return error ? <div className="error">{error}</div> : <p className="muted">טוען...</p>;
  }

  return (
    <div className="layout">
      <main>
        <div className="card meal-header">
          <div className="meal-title">
            <h1>{meal.name}</h1>
            {(meal.isOwner || currentUser?.role === 'Admin') && (
              <button className="small danger" onClick={handleDeleteMeal}>🗑 מחיקת הארוחה</button>
            )}
          </div>
          <div className="meal-meta">
            <span className={`badge ${meal.mealType}`}>ארוחה {mealTypes[meal.mealType]}</span>
            <span>📅 <b>{formatDate(meal.eventDate)}</b></span>
            <span>👥 <b>{meal.guestsCount}</b> אורחים</span>
            <span>בעלת הארוחה: <b>{meal.ownerName}</b></span>
          </div>
          <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>
            משתתפות: {meal.participants.map((p) => p.fullName).join(', ') || 'אין עדיין'}
          </p>
          {meal.pendingEmails?.length > 0 && (
            <p className="muted" style={{ marginBottom: 0 }}>
              הוזמנו וממתינות להרשמה: {meal.pendingEmails.join(', ')}
            </p>
          )}
        </div>

        {conflict && <div className="conflict">{conflict}</div>}
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div className="toolbar">
          <h3 style={{ margin: 0 }}>המנות בארוחה</h3>
          <div className="row" style={{ marginBottom: 0 }}>
            <span className="segmented">
              <label>
                <input type="radio" checked={status === 'all'} onChange={() => setStatus('all')} /> הכול
              </label>
              <label>
                <input type="radio" checked={status === 'open'} onChange={() => setStatus('open')} /> פתוחות בלבד
              </label>
            </span>
            <button className="small" onClick={() => { clearMessages(); loadMealDishes(); }}>⟳ רענון</button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="dishes-table">
            <thead>
              <tr>
                <th>סוג</th>
                <th>מאכל</th>
                <th>נדרש</th>
                <th>נלקח</th>
                <th>נותר</th>
                <th>מי מכינה</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {mealDishes.map((md) => (
                <DishRow
                  key={md.id}
                  mealDish={md}
                  mealType={meal.mealType}
                  dishes={dishes}
                  currentUserId={currentUserId}
                  isOwner={meal.isOwner}
                  onTake={handleTake}
                  onCancel={handleCancel}
                  onRemove={handleRemoveDish}
                />
              ))}
            </tbody>
          </table>
        </div>

        {meal.isOwner && (
          <>
            <div className="card">
              <h3>הוספת מאכלים</h3>
              <MenuPicker dishes={dishes} mealType={meal.mealType} onAdd={handleAddDish} />
            </div>
            <NewDishForm defaultKashrut={meal.mealType} onCreated={handleDishCreated} />
            <form className="card row" onSubmit={handleAddParticipant}>
              <h3 style={{ margin: 0 }}>הוספת משתתפת</h3>
              <input type="email" placeholder="אימייל" style={{ flex: 1, minWidth: 200 }} value={participantEmail}
                onChange={(e) => setParticipantEmail(e.target.value)} required />
              <button type="submit">הוספה</button>
            </form>
          </>
        )}
      </main>

      {/* ב-RTL הרכיב השני ב-flex מוצג משמאל */}
      <aside>
        <ChatPanel mealId={mealId} />
        <RecipesPanel mealId={mealId} meal={meal} currentUserId={currentUserId} />
      </aside>
    </div>
  );
}
