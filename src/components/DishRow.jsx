import { useState } from 'react';
import { categories, fitsMeal, units } from '../labels';

const FREE_CHOICE = 'free';

// שורה בטבלת המנות: הנתונים, מי מכינה, וכפתור "אני מכינה" עם שדה כמות לפיצול
export default function DishRow({ mealDish, copyNumber, mealType, dishes, currentUserId, canEdit, onTake, onCancel, onRemove }) {
  const [quantity, setQuantity] = useState('');
  const [specifiedDishId, setSpecifiedDishId] = useState('');
  const [freeName, setFreeName] = useState('');
  const isUndefined = mealDish.dishId === null;
  const unit = mealDish.unit ? units[mealDish.unit] : '';

  function handleTake() {
    // בלי כמות: לוקחים את כל מה שנותר
    const q = quantity ? Number(quantity) : mealDish.remainingQuantity;
    if (specifiedDishId === FREE_CHOICE) {
      if (!freeName.trim()) return;
      onTake(mealDish, q, { freeName: freeName.trim() });
    } else {
      onTake(mealDish, q, { dishId: specifiedDishId ? Number(specifiedDishId) : null });
    }
    setQuantity('');
    setFreeName('');
  }

  return (
    <tr className={mealDish.isFullyAssigned ? 'full' : ''}>
      <td>{categories[mealDish.category]}</td>
      <td>
        {isUndefined ? <i className="muted">ללא בחירה</i> : <b>{mealDish.dishName}</b>}
        {copyNumber && <span className="muted"> ({copyNumber})</span>}
      </td>
      <td>{mealDish.requiredQuantity ?? '-'} {unit}</td>
      <td>{mealDish.assignedQuantity}</td>
      <td>{mealDish.remainingQuantity ?? '-'}</td>
      <td>
        {mealDish.assignments.map((a) => (
          <div key={a.id} className="assignee">
            {a.userName}: {a.quantity}
            {a.userId === currentUserId && (
              <button className="small danger" onClick={() => onCancel(a.id)}>ביטול</button>
            )}
          </div>
        ))}
      </td>
      <td>
        {mealDish.isFullyAssigned && <span className="badge Parve">✓ הושלם</span>}
        {!mealDish.isFullyAssigned && (
          <div className="row" style={{ marginBottom: 0 }}>
            {isUndefined && (
              <select value={specifiedDishId} onChange={(e) => setSpecifiedDishId(e.target.value)}>
                <option value="">בחירת מאכל...</option>
                <option value={FREE_CHOICE}>✎ מאכל אחר (הקלדה חופשית)</option>
                {dishes
                  .filter((d) => d.category === mealDish.category && fitsMeal(d, mealType))
                  .map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
              </select>
            )}
            {isUndefined && specifiedDishId === FREE_CHOICE && (
              <input placeholder="מה תכיני?" style={{ width: 130 }} maxLength={100}
                value={freeName} onChange={(e) => setFreeName(e.target.value)} />
            )}
            <input type="number" step="0.01" min="0.01" style={{ width: 70 }}
              placeholder={isUndefined ? 'כמות' : String(mealDish.remainingQuantity)}
              value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <button className="small primary" onClick={handleTake}>אני מכינה</button>
          </div>
        )}
        {canEdit && (
          <button className="small danger" style={{ marginTop: 6 }} onClick={() => onRemove(mealDish.id)}>הסרת המנה</button>
        )}
      </td>
    </tr>
  );
}
