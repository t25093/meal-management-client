import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <>
      <div className="hero">
        <span className="eyebrow">ברוכה הבאה ל-מנה-לי</span>
        <h1>כל אחת מביאה מנה, כולן נהנות</h1>
        <p>מתכננים ארוחה משותפת, מחלקים את המנות, ומתאמים הכול במקום אחד.</p>
      </div>
      <div className="home-buttons">
        <button className="primary-tile" onClick={() => navigate('/meals/new')}>
          <span className="icon">＋</span>
          הוספת ארוחה
        </button>
        <button onClick={() => navigate('/meals?role=owner')}>
          <span className="icon">📋</span>
          ארוחות שבבעלותי
        </button>
        <button onClick={() => navigate('/meals?role=participant')}>
          <span className="icon">🤝</span>
          ארוחות ששותפתי בהן
        </button>
      </div>
    </>
  );
}
