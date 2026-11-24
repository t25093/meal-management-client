import { useState } from 'react';
import { fitsMeal, units } from '../labels';
import { initials } from '../theme';
import Icon from './Icon';

const FREE_CHOICE = 'free';

// מספר בלי אפסים מיותרים: 2.50 -> 2.5
const fmt = (n) => (n === null || n === undefined ? '–' : Number(n.toFixed(2)).toString());

// מנה אחת בארוחה: הכמויות, מי מכינה, וכפתור "אני מכינה" עם שדה כמות לפיצול
export default function DishRow({ mealDish, copyNumber, mealType, dishes, currentUserId, canEdit, canAssign, onTake, onCancel, onRemove, onError }) {
  const [quantity, setQuantity] = useState('');
  const [specifiedDishId, setSpecifiedDishId] = useState('');
  const [freeName, setFreeName] = useState('');
  const [assignEmail, setAssignEmail] = useState('');
  const isUndefined = mealDish.dishId === null;
  const unit = mealDish.unit ? units[mealDish.unit] : '';
  const required = mealDish.requiredQuantity;
  const pct = mealDish.isFullyAssigned
    ? 100
    : required ? Math.min(100, Math.round((mealDish.assignedQuantity / required) * 100)) : 0;

  // email: בעלת הארוחה משבצת משתמשת אחרת לפי האימייל שלה
  async function handleTake(email) {
    // בלי כמות: לוקחים את כל מה שנותר
    const q = quantity ? Number(quantity) : mealDish.remainingQuantity;
    // מנה שעוד לא נבחר לה מאכל אין לה כמות שנותרה, ולכן חייבים למלא כמות
    if (!q || q <= 0) {
      onError?.('יש למלא כמות');
      return;
    }
    let ok;
    if (specifiedDishId === FREE_CHOICE) {
      if (!freeName.trim()) return;
      ok = await onTake(mealDish, q, { freeName: freeName.trim(), email });
    } else {
      ok = await onTake(mealDish, q, { dishId: specifiedDishId ? Number(specifiedDishId) : null, email });
    }
    setQuantity('');
    setFreeName('');
    if (ok && email) setAssignEmail('');
  }

  function handleAssign(e) {
    e.preventDefault();
    if (assignEmail.trim()) handleTake(assignEmail.trim());
  }

  return (
    <div className={`dish ${mealDish.isFullyAssigned ? 'done' : ''}`}>
      <div className="dish-main">
        <div className="dish-title">
          <span className={`dish-check ${mealDish.isFullyAssigned ? 'on' : ''}`} aria-hidden="true">
            {mealDish.isFullyAssigned && <Icon name="check" size={14} strokeWidth={2.6} />}
          </span>
          <span>
            {isUndefined ? <i className="muted-name">ללא בחירה · המשתתפות יבחרו</i> : <b>{mealDish.dishName}</b>}
            {copyNumber && <span className="copy-no">{copyNumber}</span>}
          </span>
        </div>

        <div className="dish-qty">
          <div className="progress">
            <div className="bar"><div className="fill" style={{ width: `${pct}%` }} /></div>
          </div>
          <span className="qty-text">
            {required !== null && required !== undefined
              ? <><b>{fmt(mealDish.assignedQuantity)}</b> מתוך {fmt(required)} {unit}</>
              : <><b>{fmt(mealDish.assignedQuantity)}</b> {unit} נלקחו</>}
            {!mealDish.isFullyAssigned && mealDish.remainingQuantity > 0 && (
              <span className="remain"> · נותרו {fmt(mealDish.remainingQuantity)}</span>
            )}
          </span>
        </div>

        {mealDish.assignments.length > 0 && (
          <ul className="assignees">
            {mealDish.assignments.map((a) => {
              const mine = a.userId === currentUserId;
              return (
                <li key={a.id} className={mine ? 'mine' : ''}>
                  <span className="avatar xs">{initials(a.userName)}</span>
                  {mine ? 'אני' : a.userName}
                  <span className="q">{fmt(a.quantity)}</span>
                  {(mine || canAssign) && (
                    <button className="chip-x" onClick={() => onCancel(a.id)} title="ביטול" aria-label={mine ? 'ביטול ההרשמה שלי' : `ביטול השיבוץ של ${a.userName}`}>
                      <Icon name="close" size={13} strokeWidth={2.4} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="dish-actions">
        {mealDish.isFullyAssigned ? (
          <span className="done-tag"><Icon name="check" size={15} strokeWidth={2.4} /> הושלם</span>
        ) : (
          <div className="take">
            {isUndefined && (
              <select value={specifiedDishId} onChange={(e) => setSpecifiedDishId(e.target.value)} aria-label="בחירת מאכל">
                <option value="">בחירת מאכל...</option>
                <option value={FREE_CHOICE}>מאכל אחר (הקלדה חופשית)</option>
                {dishes
                  .filter((d) => d.category === mealDish.category && fitsMeal(d, mealType))
                  .map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
              </select>
            )}
            {isUndefined && specifiedDishId === FREE_CHOICE && (
              <input className="free-name" placeholder="מה תכיני?" maxLength={100}
                value={freeName} onChange={(e) => setFreeName(e.target.value)} />
            )}
            <input className="qty-input" type="number" step="0.01" min="0.01" aria-label="כמות"
              placeholder={isUndefined ? 'כמות' : fmt(mealDish.remainingQuantity)}
              value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <button className="primary small" onClick={() => handleTake()}>
              <Icon name="plus" size={15} /> אני מכינה
            </button>
            {canAssign && (
              <form className="assign-email" onSubmit={handleAssign}>
                <input type="email" dir="ltr" list="user-emails" placeholder="אימייל של המכינה" aria-label="שיבוץ לפי אימייל"
                  value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} />
                <button type="button" className="small" onClick={handleAssign} disabled={!assignEmail.trim()}>
                  <Icon name="mail" size={15} /> שיבוץ
                </button>
              </form>
            )}
          </div>
        )}
        {canEdit && (
          <button className="icon-btn danger-hover" onClick={() => onRemove(mealDish.id)} title="הסרת המנה" aria-label="הסרת המנה">
            <Icon name="trash" size={17} />
          </button>
        )}
      </div>
    </div>
  );
}
