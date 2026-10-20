import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { loadAllDishes } from '../api/dishes';
import { getErrorMessage, isConflict } from '../api/errors';
import { getUser } from '../auth';
import { extractEmails } from '../emailList';
import { categories, fitsMeal, mealTypes } from '../labels';
import { initials } from '../theme';
import Icon from '../components/Icon';
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
  const [tab, setTab] = useState('dishes'); // dishes | people | add

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
    return error ? <div className="error">{error}</div> : (
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="skeleton" style={{ height: 210 }} />
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    );
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

  // סיכום התפריט כולו (גם כשמסננים ל"פתוחות בלבד")
  const allItems = meal.menuItems ?? [];
  const doneCount = allItems.filter((m) => m.isFullyAssigned).length;
  const openCount = allItems.length - doneCount;
  const donePct = allItems.length ? Math.round((doneCount / allItems.length) * 100) : 0;
  const myCount = allItems.filter((m) => m.assignments?.some((a) => a.userId === currentUserId)).length;

  // כמה ימים נותרו לארוחה
  const days = Math.ceil((new Date(meal.eventDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  const when = days < 0 ? 'הארוחה עברה' : days === 0 ? 'היום!' : days === 1 ? 'מחר' : `בעוד ${days} ימים`;

  // המנות מקובצות לפי סוג, בסדר הקבוע של הסוגים
  const groups = Object.keys(categories)
    .map((cat) => ({ cat, items: mealDishes.filter((md) => md.category === cat) }))
    .filter((g) => g.items.length > 0);

  const eventDate = new Date(meal.eventDate);
  const peopleCount = meal.participants.length + (meal.pendingEmails?.length ?? 0);

  return (
    <>
      <section className="meal-hero">
        <div className="mh-top">
          <div className="mh-tags">
            <span className={`badge on-hero ${meal.mealType}`}>ארוחה {mealTypes[meal.mealType]}</span>
            <span className={`when ${days < 0 ? 'past' : ''}`}><Icon name="clock" size={14} /> {when}</span>
          </div>
          <div className="mh-actions">
            {meal.canEdit && !editForm && (
              <button className="glass small" onClick={startEditing}><Icon name="edit" size={15} /> עריכת פרטים</button>
            )}
            {(meal.isOwner || currentUser?.role === 'Admin') && (
              <button className="glass small danger-glass" onClick={handleDeleteMeal}><Icon name="trash" size={15} /> מחיקה</button>
            )}
          </div>
        </div>

        <h1>{meal.name}</h1>
        <div className="mh-meta">
          <span><Icon name="calendar" size={17} /> {eventDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <span><Icon name="clock" size={17} /> {eventDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
          <span><Icon name="guests" size={17} /> {meal.guestsCount} אורחים</span>
          <span><Icon name="user" size={17} /> {meal.isOwner ? 'בבעלותך' : `בעלת הארוחה: ${meal.ownerName}`}</span>
        </div>

        <div className="mh-stats">
          <div className="mh-progress">
            <div className="mh-progress-head">
              <span>התקדמות התפריט</span>
              <b>{donePct}%</b>
            </div>
            <div className="progress"><div className="bar"><div className="fill" style={{ width: `${donePct}%` }} /></div></div>
          </div>
          <div className="mh-num"><b>{allItems.length}</b><span>מנות</span></div>
          <div className="mh-num"><b>{doneCount}</b><span>הושלמו</span></div>
          <div className="mh-num"><b>{openCount}</b><span>פתוחות</span></div>
          <div className="mh-num"><b>{myCount}</b><span>שלי</span></div>
        </div>
      </section>

      {editForm && (
        <form className="card edit-card" onSubmit={handleSaveDetails}>
          <h3>עריכת פרטי הארוחה</h3>
          <div className="form-grid">
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
          </div>
          <div className="row" style={{ marginBottom: 0 }}>
            <button type="submit"><Icon name="check" size={16} /> שמירה</button>
            <button type="button" className="ghost" onClick={() => setEditForm(null)}>ביטול</button>
          </div>
        </form>
      )}

      {conflict && <div className="conflict">{conflict}</div>}
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="layout">
        <main>
          <div className="meal-tabs">
            <div className="tabs" role="tablist">
              <button role="tab" aria-selected={tab === 'dishes'} className={tab === 'dishes' ? 'active' : ''} onClick={() => setTab('dishes')}>
                <Icon name="plate" size={17} /> המנות <span className="count">{allItems.length}</span>
              </button>
              <button role="tab" aria-selected={tab === 'people'} className={tab === 'people' ? 'active' : ''} onClick={() => setTab('people')}>
                <Icon name="users" size={17} /> משתתפות <span className="count">{peopleCount}</span>
              </button>
              {meal.canEdit && (
                <button role="tab" aria-selected={tab === 'add'} className={tab === 'add' ? 'active' : ''} onClick={() => setTab('add')}>
                  <Icon name="plus" size={17} /> הוספת מאכלים
                </button>
              )}
            </div>
            {tab === 'dishes' && (
              <div className="row" style={{ marginBottom: 0 }}>
                <span className="segmented">
                  <label>
                    <input type="radio" checked={status === 'all'} onChange={() => setStatus('all')} /> הכול
                  </label>
                  <label>
                    <input type="radio" checked={status === 'open'} onChange={() => setStatus('open')} /> פתוחות בלבד
                  </label>
                </span>
                <button className="icon-btn bordered" onClick={() => { clearMessages(); loadMealDishes(); }} title="רענון" aria-label="רענון">
                  <Icon name="refresh" size={17} />
                </button>
              </div>
            )}
          </div>

          {tab === 'dishes' && (
            <>
              {groups.length === 0 && (
                <div className="empty">
                  <span className="empty-icon"><Icon name={status === 'open' ? 'check' : 'plate'} size={26} /></span>
                  <b>{status === 'open' ? 'כל המנות נלקחו' : 'אין עדיין מנות בתפריט'}</b>
                  <span>{status === 'open' ? 'אין מנות פתוחות. כל הכבוד!' : 'מנות שיתווספו לארוחה יופיעו כאן.'}</span>
                  {meal.canEdit && status !== 'open' && (
                    <button className="primary" onClick={() => setTab('add')}><Icon name="plus" size={16} /> הוספת מאכלים</button>
                  )}
                </div>
              )}
              {groups.map((g) => {
                const done = g.items.filter((m) => m.isFullyAssigned).length;
                return (
                  <section key={g.cat} className="dish-group">
                    <header>
                      <h4>{categories[g.cat]}</h4>
                      <span className="muted">{done} מתוך {g.items.length} הושלמו</span>
                    </header>
                    <div className="dish-list">
                      {g.items.map((md) => (
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
                    </div>
                  </section>
                );
              })}
            </>
          )}

          {tab === 'people' && (
            <div className="card">
              <div className="card-head">
                <h3>המשתתפות בארוחה</h3>
                {meal.isOwner && meal.participants.length > 0 && <span className="muted">סמני "עורכת" כדי לתת הרשאת עריכה</span>}
              </div>
              {meal.canEdit && !meal.isOwner && (
                <p className="editor-note"><Icon name="check" size={14} /> יש לך הרשאת עריכה בארוחה הזו</p>
              )}
              <ul className="people">
                <li>
                  <span className="avatar">{initials(meal.ownerName)}</span>
                  <span className="p-name"><b>{meal.ownerName}</b><small>בעלת הארוחה</small></span>
                  <span className="pill primary">בעלים</span>
                </li>
                {meal.participants.map((p) => {
                  const isEditor = meal.editorIds.includes(p.id);
                  return (
                    <li key={p.id}>
                      <span className="avatar">{initials(p.fullName)}</span>
                      <span className="p-name"><b>{p.fullName}</b><small dir="ltr">{p.email}</small></span>
                      {meal.isOwner ? (
                        <label className="switch" title="הרשאה לערוך את הארוחה">
                          <input type="checkbox" checked={isEditor} onChange={() => handleToggleEditor(p, !isEditor)} />
                          <span className="track" aria-hidden="true" />
                          עורכת
                        </label>
                      ) : (
                        isEditor && <span className="pill accent">עורכת</span>
                      )}
                    </li>
                  );
                })}
                {meal.pendingEmails?.map((email) => (
                  <li key={email} className="pending">
                    <span className="avatar ghost"><Icon name="mail" size={18} /></span>
                    <span className="p-name"><b dir="ltr">{email}</b><small>הוזמנה, עוד לא נרשמה</small></span>
                    <span className="pill">ממתינה</span>
                  </li>
                ))}
              </ul>
              {meal.participants.length === 0 && !meal.pendingEmails?.length && (
                <p className="muted" style={{ margin: '12px 0 0' }}>עוד לא הוזמנו משתתפות.</p>
              )}

              {meal.canEdit && (
                <form className="invite-form" onSubmit={handleAddParticipants}>
                  <h4>הזמנת משתתפות</h4>
                  <div className="row">
                    <textarea rows="2" placeholder="אימייל אחד או כמה. אפשר להדביק רשימת נמענים מהמייל"
                      value={participantEmail} onChange={(e) => setParticipantEmail(e.target.value)}
                      onKeyDown={handleInviteKeyDown} />
                    <button type="submit" className={inviting ? 'loading' : ''} disabled={inviting}>
                      <Icon name="mail" size={16} /> {invitees.length > 1 ? `הזמנת ${invitees.length}` : 'הזמנה'}
                    </button>
                  </div>
                  {showInvitees && <p className="muted invite-preview">יוזמנו: <span dir="ltr">{invitees.join(', ')}</span></p>}
                </form>
              )}
            </div>
          )}

          {tab === 'add' && meal.canEdit && (
            <>
              <div className="card">
                <h3>מאכלים מהמאגר</h3>
                <p className="card-sub">בוחרים מאכל לכל סוג, או "ללא בחירה" כדי שהמשתתפות יחליטו.</p>
                <MenuPicker dishes={dishes} mealType={meal.mealType} onAdd={handleAddDish} />
              </div>
              <NewDishForm defaultKashrut={meal.mealType} onCreated={handleDishCreated} />
            </>
          )}
        </main>

        {/* ב-RTL הרכיב השני ב-flex מוצג משמאל */}
        <aside>
          <ChatPanel mealId={mealId} />
          <RecipesPanel mealId={mealId} meal={meal} currentUserId={currentUserId} />
        </aside>
      </div>
    </>
  );
}

// תאריך מהשרת (UTC) לערך של שדה datetime-local בשעון המקומי
function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
