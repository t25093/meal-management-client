import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { loadAllDishes } from '../api/dishes';
import { getErrorMessage } from '../api/errors';
import { extractEmails } from '../emailList';
import { categories, fitsMeal, mealTypes } from '../labels';
import MenuPicker from '../components/MenuPicker';
import NewDishForm from '../components/NewDishForm';

export default function NewMealPage() {
  const navigate = useNavigate();
  const [dishes, setDishes] = useState([]);
  const [mealType, setMealType] = useState('Dairy');
  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [guestsCount, setGuestsCount] = useState('10');
  const [menuItems, setMenuItems] = useState([]);
  const [emails, setEmails] = useState('');
  const [error, setError] = useState('');
  const [participantErrors, setParticipantErrors] = useState([]);
  const [createdMealId, setCreatedMealId] = useState(null);

  useEffect(() => {
    loadAllDishes().then(setDishes).catch((err) => setError(getErrorMessage(err)));
  }, []);

  // שינוי סוג הארוחה מסיר מהתפריט מאכלים שכבר לא מתאימים לה
  function changeMealType(newType) {
    setMealType(newType);
    setMenuItems(menuItems.filter((item) =>
      item.dishId === null || fitsMeal(dishes.find((d) => d.id === item.dishId), newType)));
  }

  // אותו מאכל אפשר להוסיף כמה פעמים: כל הוספה היא מנה נפרדת בתפריט
  function addMenuItem(item) {
    setError('');
    setMenuItems([...menuItems, item]);
  }

  function removeMenuItem(index) {
    setMenuItems(menuItems.filter((_, i) => i !== index));
  }

  // מאכל חדש נכנס למאגר, ואם הוא מתאים לסוג הארוחה הוא מתווסף מיד גם לתפריט
  function handleDishCreated(dish) {
    setDishes([...dishes, dish]);
    if (fitsMeal(dish, mealType)) {
      addMenuItem({ dishId: dish.id, category: dish.category, name: dish.name });
    } else {
      setError(`${dish.name} נוסף למאגר, אבל אינו מתאים לארוחה ${mealTypes[mealType]} ולכן לא נוסף לתפריט`);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setParticipantErrors([]);
    try {
      const response = await api.post('/api/meals', {
        name,
        mealType,
        eventDate: new Date(eventDate).toISOString(), // השרת עובד ב-UTC
        guestsCount: Number(guestsCount),
        menuItems: menuItems.map((m) => ({ dishId: m.dishId, category: m.category })),
      });
      const mealId = response.data.id;

      // הוספת המשתתפות אחת אחת. אימייל שלא רשום נשמר כהזמנה, ושגיאה לא מבטלת את הארוחה.
      const failed = [];
      for (const email of extractEmails(emails)) {
        try {
          await api.post(`/api/meals/${mealId}/participants`, { email });
        } catch (err) {
          failed.push(`${email}: ${getErrorMessage(err)}`);
        }
      }

      if (failed.length === 0) {
        navigate(`/meals/${mealId}`);
      } else {
        setCreatedMealId(mealId);
        setParticipantErrors(failed);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (createdMealId) {
    return (
      <>
        <div className="success">הארוחה נוצרה.</div>
        <div className="error">
          חלק מהמשתתפות לא נוספו:
          <ul>{participantErrors.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
        <button className="primary" onClick={() => navigate(`/meals/${createdMealId}`)}>מעבר לארוחה</button>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>ארוחה חדשה</h1>
          <p>פרטים, תפריט והזמנת משתתפות. אפשר לשנות הכול גם אחר כך.</p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="card">
          <h3>פרטי הארוחה</h3>
          <div className="row">
            <span className="segmented">
              <label>
                <input type="radio" checked={mealType === 'Dairy'} onChange={() => changeMealType('Dairy')} /> חלבית
              </label>
              <label>
                <input type="radio" checked={mealType === 'Meat'} onChange={() => changeMealType('Meat')} /> בשרית
              </label>
            </span>
          </div>
          <div className="form-grid">
            <label>
              שם הארוחה
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              תאריך ושעה
              <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
            </label>
            <label>
              מספר אורחים
              <input type="number" min="1" max="1000"
                value={guestsCount} onChange={(e) => setGuestsCount(e.target.value)} required />
            </label>
          </div>
        </div>

        <div className="card">
          <h3>תפריט</h3>
          <MenuPicker dishes={dishes} mealType={mealType} onAdd={addMenuItem} />
          {menuItems.length > 0 && (
            <ul className="chips">
              {menuItems.map((item, i) => (
                <li key={i}>
                  {categories[item.category]}: {item.name}
                  <button type="button" className="small danger" onClick={() => removeMenuItem(i)}>הסרה</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h3>משתתפות</h3>
          <label>
            אימיילים (אחד בכל שורה, או רשימת נמענים שהודבקה מהמייל)
            <textarea rows="3" value={emails} onChange={(e) => setEmails(e.target.value)} />
          </label>
          <button type="submit" className="lg">יצירת הארוחה</button>
        </div>
      </form>

      <NewDishForm defaultKashrut={mealType} onCreated={handleDishCreated} />
    </>
  );
}
