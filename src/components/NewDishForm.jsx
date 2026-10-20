import { useState } from 'react';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import { categories, mealTypes, units } from '../labels';
import Icon from './Icon';

// הוספת מאכל חדש למאגר. אחרי הצלחה מחזירה את המאכל דרך onCreated,
// והדף שמשתמש בטופס מוסיף אותו גם לארוחה.
export default function NewDishForm({ defaultKashrut, onCreated }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Main');
  const [kashrut, setKashrut] = useState(defaultKashrut || 'Parve');
  const [quantityPerPerson, setQuantityPerPerson] = useState('1');
  const [unit, setUnit] = useState('Portion');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post('/api/dishes', {
        name,
        category,
        // שני השמות נשלחים, השרת מתעלם מזה שלא מוכר לו
        kashrutType: kashrut,
        kosherType: kashrut,
        quantityPerPerson: Number(quantityPerPerson),
        unit,
      });
      setName('');
      onCreated(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3>מאכל חדש למאגר</h3>
      <p className="card-sub">לא מצאת ברשימה? המאכל יישמר במאגר ויתווסף מיד גם לארוחה הזו.</p>
      {error && <div className="error">{error}</div>}
      <div className="form-grid">
        <label className="span-2">
          שם המאכל
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: פשטידת ירקות" required />
        </label>
        <label>
          סוג
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.entries(categories).map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </label>
        <label>
          כשרות
          <select value={kashrut} onChange={(e) => setKashrut(e.target.value)}>
            {Object.entries(mealTypes).map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </label>
        <label>
          כמות לאדם
          <input type="number" step="0.01" min="0.01"
            value={quantityPerPerson} onChange={(e) => setQuantityPerPerson(e.target.value)} required />
        </label>
        <label>
          יחידה
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {Object.entries(units).map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </label>
      </div>
      <button type="submit"><Icon name="plus" size={16} /> הוספה למאגר ולארוחה</button>
    </form>
  );
}
