import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import { getUser } from '../auth';
import { formatDate } from '../labels';

const POLL_MS = 3000;

// צ'אט ב-REST: טעינה ראשונה, ואחריה משיכה כל 3 שניות של הודעות חדשות בלבד (afterId)
export default function ChatPanel({ mealId }) {
  const currentUserId = getUser()?.id;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const lastIdRef = useRef(null);
  const listRef = useRef(null);

  // מוסיף הודעות בלי כפילויות (הודעה ששלחתי תחזור גם במשיכה הבאה)
  function addMessages(newMessages) {
    if (newMessages.length === 0) return;
    setMessages((current) => {
      const ids = new Set(current.map((m) => m.id));
      const merged = [...current, ...newMessages.filter((m) => !ids.has(m.id))];
      merged.sort((a, b) => a.id - b.id);
      lastIdRef.current = merged[merged.length - 1].id;
      return merged;
    });
  }

  useEffect(() => {
    let stopped = false;
    lastIdRef.current = null;
    setMessages([]);

    async function poll() {
      try {
        const params = lastIdRef.current ? { afterId: lastIdRef.current } : {};
        const response = await api.get(`/api/meals/${mealId}/messages`, { params });
        if (!stopped) {
          addMessages(response.data);
          setError('');
        }
      } catch (err) {
        if (!stopped) setError(getErrorMessage(err));
      }
    }

    poll();
    const timer = setInterval(poll, POLL_MS);
    // ביציאה מהדף מפסיקים את המשיכה
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [mealId]);

  // גלילה אוטומטית להודעה האחרונה
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const response = await api.post(`/api/meals/${mealId}/messages`, { content: text });
      addMessages([response.data]);
      setText('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="card">
      <h3>💬 צ'אט</h3>
      {error && <div className="error">{error}</div>}
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && <p className="muted chat-empty">עדיין אין הודעות. אפשר לפתוח את השיחה!</p>}
        {messages.map((m) => {
          // הודעות שלי בצד אחד, של אחרות בצד השני. השם והשעה מחוץ לבועה.
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`chat-item ${mine ? 'mine' : 'theirs'}`}>
              <div className="chat-meta">
                <b>{mine ? 'אני' : m.senderName}</b> · {formatDate(m.sentAt)}
              </div>
              <div className="chat-bubble">{m.content}</div>
            </div>
          );
        })}
      </div>
      <form className="row chat-form" onSubmit={handleSend}>
        <input style={{ flex: 1 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="הודעה..." />
        <button type="submit">שליחה</button>
      </form>
    </div>
  );
}
