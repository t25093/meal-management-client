import { useEffect, useState } from 'react';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import Icon from './Icon';

// אזור המתכונים שמתחת לצ'אט
export default function RecipesPanel({ mealId, meal, currentUserId }) {
  const [recipes, setRecipes] = useState([]);
  const [dishId, setDishId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);

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
      setFormOpen(false);
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
      <div className="card-head">
        <h3>מתכונים</h3>
        {!formOpen && (
          <button className="small" onClick={() => setFormOpen(true)}><Icon name="plus" size={15} /> מתכון</button>
        )}
      </div>
      {error && <div className="error">{error}</div>}
      {recipes.length === 0 && !formOpen && (
        <div className="mini-empty">
          <Icon name="book" size={20} />
          <span>אין מתכונים עדיין. אפשר לשתף מתכון למנה שמכינים.</span>
        </div>
      )}
      <div className="recipes">
        {recipes.map((r) => {
          const open = expanded === r.id;
          return (
            <article key={r.id} className={`recipe ${open ? 'open' : ''}`}>
              <div className="recipe-head">
                <button className="recipe-toggle" onClick={() => setExpanded(open ? null : r.id)} aria-expanded={open}>
                  <span className="r-icon"><Icon name="book" size={16} /></span>
                  <span>
                    <b>{r.title}</b>
                    <small>{r.dishName ? `${r.dishName} · ` : ''}{r.authorName}</small>
                  </span>
                  <Icon name="chevronLeft" size={16} className="r-chev" />
                </button>
                {(r.authorId === currentUserId || meal.isOwner) && (
                  <button className="icon-btn danger-hover" onClick={() => handleDelete(r.id)} title="מחיקה" aria-label={`מחיקת ${r.title}`}>
                    <Icon name="trash" size={16} />
                  </button>
                )}
              </div>
              {open && <div className="recipe-body">{r.content}</div>}
            </article>
          );
        })}
      </div>
      {formOpen && (
        <form className="recipe-form" onSubmit={handleAdd}>
          <select value={dishId} onChange={(e) => setDishId(e.target.value)} aria-label="למנה">
            <option value="">מתכון כללי</option>
            {menuDishes.map((md) => (
              <option key={md.id} value={md.dishId}>{md.dishName}</option>
            ))}
          </select>
          <input placeholder="שם המתכון" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <textarea placeholder="מצרכים ואופן ההכנה" rows="5" value={content} onChange={(e) => setContent(e.target.value)} required />
          <div className="row" style={{ marginBottom: 0 }}>
            <button type="submit"><Icon name="check" size={16} /> שמירת המתכון</button>
            <button type="button" className="ghost" onClick={() => setFormOpen(false)}>ביטול</button>
          </div>
        </form>
      )}
    </div>
  );
}
