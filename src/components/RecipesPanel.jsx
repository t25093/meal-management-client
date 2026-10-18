import { useEffect, useState } from 'react';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';

// אזור המתכונים שמתחת לצ'אט
export default function RecipesPanel({ mealId, meal, currentUserId }) {
  const [recipes, setRecipes] = useState([]);
  const [dishId, setDishId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  function loadRecipes() {
    api.get(`/api/meals/${mealId}/recipes`)
      .then((response) => setRecipes(response.data))
      .catch((err) => setError(getErrorMessage(err)));
  }

  useEffect(loadRecipes, [mealId]);

  // רק מאכלים שכבר בתפריט (מנה בלתי מוגדרת עוד לא שייכת למאכל)
  const menuDishes = meal.menuItems.filter((md) => md.dishId !== null);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/api/meals/${mealId}/recipes`, {
        dishId: dishId ? Number(dishId) : null,
        title,
        content,
      });
      setTitle('');
      setContent('');
      setDishId('');
      loadRecipes();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDelete(recipeId) {
    setError('');
    try {
      await api.delete(`/api/meals/${mealId}/recipes/${recipeId}`);
      loadRecipes();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="card">
      <h3>📖 מתכונים</h3>
      {error && <div className="error">{error}</div>}
      {recipes.length === 0 && <p className="muted">אין מתכונים עדיין.</p>}
      {recipes.map((r) => (
        <div key={r.id} className="recipe">
          <div className="recipe-head">
            <div>
              <b>{r.title}</b>{r.dishName && ` (${r.dishName})`}
              <div className="muted">{r.authorName}</div>
            </div>
            {(r.authorId === currentUserId || meal.isOwner) && (
              <button className="small danger" onClick={() => handleDelete(r.id)}>מחיקה</button>
            )}
          </div>
          <div>{r.content}</div>
        </div>
      ))}
      <form className="recipe-form" onSubmit={handleAdd}>
        <select value={dishId} onChange={(e) => setDishId(e.target.value)}>
          <option value="">מתכון כללי</option>
          {menuDishes.map((md) => (
            <option key={md.id} value={md.dishId}>{md.dishName}</option>
          ))}
        </select>
        <input placeholder="כותרת" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea placeholder="המתכון" rows="4" value={content} onChange={(e) => setContent(e.target.value)} required />
        <button type="submit">הוספת מתכון</button>
      </form>
    </div>
  );
}
