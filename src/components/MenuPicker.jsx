import { useState } from 'react';
import { categories, fitsMeal } from '../labels';

const UNDEFINED = 'undefined';

// שורה לכל קטגוריה: בחירת מאכל מהמאגר, או "ללא בחירה" (מנה בלתי מוגדרת שהמשתתפות יבחרו)
export default function MenuPicker({ dishes, mealType, onAdd }) {
  const [selected, setSelected] = useState({});

  function handleAdd(category) {
    const value = selected[category];
    if (!value) return;
    if (value === UNDEFINED) {
      onAdd({ dishId: null, category, name: 'ללא בחירה' });
    } else {
      const dish = dishes.find((d) => d.id === Number(value));
      onAdd({ dishId: dish.id, category, name: dish.name });
    }
    setSelected({ ...selected, [category]: '' });
  }

  return (
    <div className="table-wrap menu-picker">
      <table>
        <tbody>
          {Object.entries(categories).map(([category, text]) => (
            <tr key={category}>
              <th style={{ width: 120 }}>{text}</th>
              <td>
                <div className="row" style={{ marginBottom: 0 }}>
                  <select
                    value={selected[category] || ''}
                    onChange={(e) => setSelected({ ...selected, [category]: e.target.value })}
                  >
                    <option value="">בחירה...</option>
                    <option value={UNDEFINED}>ללא בחירה (המשתתפות יבחרו)</option>
                    {dishes
                      .filter((d) => d.category === category && fitsMeal(d, mealType))
                      .map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                  </select>
                  <button type="button" className="small" onClick={() => handleAdd(category)}>הוספה</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
