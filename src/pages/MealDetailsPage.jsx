import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { loadAllDishes } from '../api/dishes';
import { getErrorMessage, isConflict } from '../api/errors';
import { getUser } from '../auth';
import { extractEmails } from '../emailList';
import { fitsMeal, formatDate, mealTypes } from '../labels';
import DishRow from '../components/DishRow';
import MenuPicker from '../components/MenuPicker';
import NewDishForm from '../components/NewDishForm';
import ChatPanel from '../components/ChatPanel';
import RecipesPanel from '../components/RecipesPanel';

const REFRESH_MS = 10000;

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
  const [inviting, setInviting] = useState(false);
  const [editForm, setEditForm] = useState(null); // null: לא בעריכה

  // מספור הטעינות: תשובה של טעינה ישנה (למשל רענון ברקע) לא דורסת תשובה חדשה יותר
  const mealLoads = useRef(0);
  const dishLoads = useRef(0);

  // background: רענון אוטומטי, בלי סימן טעינה ובלי הודעת שגיאה
  const loadMeal = useCallback((background = false) => {
    const load = ++mealLoads.current;
    return api.get(`/api/meals/${mealId}`, { background })
      .then((response) => { if (load === mealLoads.current) setMeal(response.data); })
      .catch((err) => { if (!background) setError(getErrorMessage(err)); });
  }, [mealId]);

  const loadMealDishes = useCallback((background = false) => {
    const load = ++dishLoads.current;
    return api.get(`/api/meals/${mealId}/dishes`, { params: { status }, background })
      .then((response) => { if (load === dishLoads.current) setMealDishes(response.data); })
      .catch((err) => { if (!background) setError(getErrorMessage(err)); });
  }, [mealId, status]);

  useEffect(() => { loadMeal(); }, [loadMeal]);
  useEffect(() => { loadMealDishes(); }, [loadMealDishes]);
  useEffect(() => { loadAllDishes().then(setDishes).catch(() => {}); }, []);

  // שינויים של משתתפות אחרות מופיעים לבד, בלי ללחוץ "רענון"
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden) return;
      loadMeal(true);
      loadMealDishes(true);
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadMeal, loadMealDishes]);

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

  // עריכת פרטי הארוחה: בעלת הארוחה או משתתפת עם הרשאת עריכה
  function startEditing() {
    setEditForm({ name: meal.name, eventDate: toLocalInput(meal.eventDate), guestsCount: meal.guestsCount });
  }

  async function handleSaveDetails(e) {
    e.preventDefault();
    clearMessages();
    try {
      await api.patch(`/api/meals/${mealId}`, {
        name: editForm.name,
        eventDate: new Date(editForm.eventDate).toISOString(), // השרת עובד ב-UTC
        guestsCount: Number(editForm.guestsCount),
      });
      setEditForm(null);
      setSuccess('פרטי הארוחה עודכנו');
      await Promise.all([loadMeal(), loadMealDishes()]);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // בעלת הארוחה נותנת או מבטלת הרשאת עריכה למשתתפת
  async function handleToggleEditor(participant, canEdit) {
    clearMessages();
    // הסימון מתעדכן מיד במסך, ואחרי השמירה הנתונים נטענים מחדש מהשרת
    setMeal((current) => ({
      ...current,
      editorIds: canEdit
        ? [...current.editorIds, participant.id]
        : current.editorIds.filter((id) => id !== participant.id),
    }));
    try {
      if (canEdit) await api.put(`/api/meals/${mealId}/editors/${participant.id}`);
      else await api.delete(`/api/meals/${mealId}/editors/${participant.id}`);
      setSuccess(canEdit
        ? `${participant.fullName} יכולה עכשיו לערוך את הארוחה`
        : `ההרשאה של ${participant.fullName} לערוך את הארוחה בוטלה`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
    await loadMeal();
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

  async function handleAddParticipants(e) {
    e.preventDefault();
    clearMessages();
    const emails = extractEmails(participantEmail);
    if (emails.length === 0) {
      setError('לא נמצאה כתובת אימייל תקינה');
      return;
    }

    // אחת אחרי השנייה, כמו ביצירת ארוחה. שגיאה באחת לא עוצרת את האחרות.
    setInviting(true);
    const added = [];
    const invited = [];
    const failed = [];
    let lastMessage = '';
    for (const email of emails) {
      try {
        const response = await api.post(`/api/meals/${mealId}/participants`, { email });
        (response.data.isPending ? invited : added).push(email);
        lastMessage = response.data.message;
      } catch (err) {
        failed.push({ email, message: getErrorMessage(err) });
      }
    }
    setInviting(false);

    if (emails.length === 1) {
      if (failed.length) setError(failed[0].message);
      else setSuccess(lastMessage);
    } else {
      const lines = [];
      if (added.length) lines.push(`נוספו לארוחה: ${added.join(', ')}`);
      if (invited.length) lines.push(`עוד לא רשומות, ונשמרה להן הזמנה: ${invited.join(', ')}`);
      setSuccess(lines.join('. '));
      if (failed.length) setError(`לא נוספו: ${failed.map((f) => `${f.email} (${f.message})`).join(', ')}`);
    }

    if (added.length || invited.length) {
      setParticipantEmail('');
      await loadMeal();
    }
  }

  // Enter שולח, ו-Shift+Enter יורד שורה
  function handleInviteKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form.requestSubmit();
    }
  }

  if (!meal) {
    return error ? <div className="error">{error}</div> : <p className="muted">טוען...</p>;
  }

  // מאכל שמופיע כמה פעמים בתפריט מקבל מספר ליד השם: (1), (2)...
  const copyNumbers = new Map();
  for (const md of mealDishes) {
    if (md.dishId === null) continue;
    const copies = mealDishes.filter((other) => other.dishId === md.dishId);
    if (copies.length > 1) copyNumbers.set(md.id, copies.indexOf(md) + 1);
  }

  // הכתובות שיוזמנו. מוצגות מתחת לשדה כשהודבקה רשימה ולא כתובת אחת נקייה.
  const invitees = extractEmails(participantEmail);
  const showInvitees = invitees.length > 0 && participantEmail.trim().toLowerCase() !== invitees[0];

  return (
    <div className="layout">
      <main>
        <div className="card meal-header">
          <div className="meal-title">
            <h1>{meal.name}</h1>
            <div className="row" style={{ marginBottom: 0 }}>
              {meal.canEdit && !editForm && (
                <button className="small" onClick={startEditing}>✎ עריכת פרטים</button>
              )}
              {(meal.isOwner || currentUser?.role === 'Admin') && (
                <button className="small danger" onClick={handleDeleteMeal}>🗑 מחיקת הארוחה</button>
              )}
            </div>
          </div>
          {editForm && (
            <form className="edit-meal" onSubmit={handleSaveDetails}>
              <label>
                שם הארוחה
                <input value={editForm.name} maxLength={100} required
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </label>
              <label>
                תאריך ושעה
                <input type="datetime-local" value={editForm.eventDate} required
                  onChange={(e) => setEditForm({ ...editForm, eventDate: e.target.value })} />
              </label>
              <label>
                מספר אורחים
                <input type="number" min="1" max="1000" value={editForm.guestsCount} required
                  onChange={(e) => setEditForm({ ...editForm, guestsCount: e.target.value })} />
              </label>
              <div className="row">
                <button type="submit">שמירה</button>
                <button type="button" onClick={() => setEditForm(null)}>ביטול</button>
              </div>
            </form>
          )}
          <div className="meal-meta">
            <span className={`badge ${meal.mealType}`}>ארוחה {mealTypes[meal.mealType]}</span>
            <span>📅 <b>{formatDate(meal.eventDate)}</b></span>
            <span>👥 <b>{meal.guestsCount}</b> אורחים</span>
            <span>בעלת הארוחה: <b>{meal.ownerName}</b></span>
          </div>
          <div className="participants">
            <span className="muted">משתתפות:</span>
            {meal.participants.length === 0 && <span className="muted">אין עדיין</span>}
            <ul className="chips">
              {meal.participants.map((p) => {
                const isEditor = meal.editorIds.includes(p.id);
                return (
                  <li key={p.id} className={isEditor ? 'editor' : ''}>
                    {p.fullName}
                    {meal.isOwner ? (
                      <label className="edit-toggle" title="הרשאה לערוך את הארוחה">
                        <input type="checkbox" checked={isEditor} onChange={() => handleToggleEditor(p, !isEditor)} />
                        עורכת
                      </label>
                    ) : (
                      isEditor && <span className="editor-mark">✎ עורכת</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          {meal.isOwner && meal.participants.length > 0 && (
            <p className="muted hint">סמני "עורכת" כדי לתת למשתתפת הרשאה לערוך את הפרטים, המנות וההזמנות.</p>
          )}
          {meal.canEdit && !meal.isOwner && (
            <p className="editor-note">✎ יש לך הרשאת עריכה בארוחה הזו</p>
          )}
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
                  copyNumber={copyNumbers.get(md.id)}
                  mealType={meal.mealType}
                  dishes={dishes}
                  currentUserId={currentUserId}
                  canEdit={meal.canEdit}
                  onTake={handleTake}
                  onCancel={handleCancel}
                  onRemove={handleRemoveDish}
                />
              ))}
            </tbody>
          </table>
        </div>

        {meal.canEdit && (
          <>
            <div className="card">
              <h3>הוספת מאכלים</h3>
              <MenuPicker dishes={dishes} mealType={meal.mealType} onAdd={handleAddDish} />
            </div>
            <NewDishForm defaultKashrut={meal.mealType} onCreated={handleDishCreated} />
            <form className="card invite-form" onSubmit={handleAddParticipants}>
              <h3>הוספת משתתפות</h3>
              <div className="row">
                <textarea rows="2" placeholder="אימייל אחד או כמה. אפשר להדביק רשימת נמענים מהמייל"
                  value={participantEmail} onChange={(e) => setParticipantEmail(e.target.value)}
                  onKeyDown={handleInviteKeyDown} />
                <button type="submit" disabled={inviting}>
                  {inviting ? 'מוסיפים…' : invitees.length > 1 ? `הוספת ${invitees.length}` : 'הוספה'}
                </button>
              </div>
              {showInvitees && <p className="muted invite-preview">יתווספו: <span dir="ltr">{invitees.join(', ')}</span></p>}
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

// תאריך מהשרת (UTC) לערך של שדה datetime-local בשעון המקומי
function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
