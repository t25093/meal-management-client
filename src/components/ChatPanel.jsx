import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import { getToken, getUser } from '../auth';
import { initials } from '../theme';
import { isChatSoundOn, playChatSound, setChatSoundOn, unlockChatSound } from '../chatSound';
import Icon from './Icon';

// שעה להודעה מהיום, ותאריך קצר להודעה ישנה יותר
function msgTime(iso) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function firstName(name = '') {
  return name.trim().split(/\s+/)[0] || name;
}

const POLL_MS = 3000;
const TYPING_POLL_MS = 1000; // כל כמה זמן בודקים מה אחרות כותבות
const TYPING_SEND_MS = 500; // לא שולחים את הטקסט שלי לשרת יותר מפעם בחצי שנייה
const NEAR_BOTTOM_PX = 80;

// צ'אט ב-REST: טעינה ראשונה, ואחריה משיכה כל 3 שניות של הודעות חדשות בלבד (afterId).
// בנוסף: צליל עדין כשמגיעה הודעה ממישהי אחרת, ותצוגה של מה שאחרות כותבות עוד לפני השליחה.
export default function ChatPanel({ mealId }) {
  const currentUserId = getUser()?.id;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [typing, setTyping] = useState([]);
  const [soundOn, setSoundOn] = useState(isChatSoundOn());
  const lastIdRef = useRef(null);
  const idsRef = useRef(new Set());
  const loadedRef = useRef(false);
  const soundRef = useRef(soundOn);
  const listRef = useRef(null);
  const nearBottomRef = useRef(true);
  const typersRef = useRef(0);
  // שליחת הטקסט שאני כותבת: בקשה אחת בכל פעם, והאחרונה תמיד נשלחת אחרונה
  const typingSyncRef = useRef({ pending: null, inFlight: false, timer: null });
  const hasTextRef = useRef(false); // האם אצל אחרות מוצג עכשיו טקסט שהתחלתי לכתוב

  soundRef.current = soundOn;

  // מוסיף הודעות בלי כפילויות (הודעה ששלחתי תחזור גם במשיכה הבאה)
  function addMessages(newMessages, initial = false) {
    const fresh = newMessages.filter((m) => !idsRef.current.has(m.id));
    if (fresh.length === 0) return;
    fresh.forEach((m) => idsRef.current.add(m.id));
    lastIdRef.current = Math.max(lastIdRef.current ?? 0, ...fresh.map((m) => m.id));

    // צליל רק להודעה חדשה של מישהי אחרת, ולא בטעינה הראשונה של הצ'אט
    if (!initial && soundRef.current && fresh.some((m) => m.senderId !== currentUserId)) {
      playChatSound();
    }

    setMessages((current) => [...current, ...fresh].sort((a, b) => a.id - b.id));
  }

  useEffect(() => {
    let stopped = false;
    lastIdRef.current = null;
    idsRef.current = new Set();
    loadedRef.current = false;
    typersRef.current = 0;
    setMessages([]);
    setTyping([]);

    async function poll() {
      const initial = !loadedRef.current;
      try {
        const params = lastIdRef.current ? { afterId: lastIdRef.current } : {};
        const response = await api.get(`/api/meals/${mealId}/messages`, { params, background: true });
        if (!stopped) {
          addMessages(response.data, initial);
          loadedRef.current = true;
          setError('');
        }
      } catch (err) {
        if (!stopped) setError(getErrorMessage(err));
      }
    }

    async function pollTyping() {
      try {
        const response = await api.get(`/api/meals/${mealId}/typing`, { background: true });
        if (stopped) return;
        const others = response.data.filter((t) => t.userId !== currentUserId);
        // מישהי הפסיקה לכתוב, כנראה כי שלחה: מושכים מיד את ההודעה החדשה
        if (others.length < typersRef.current) poll();
        typersRef.current = others.length;
        setTyping(others);
      } catch {
        // התצוגה של מה שכותבות היא תוספת: שגיאה בה לא מוצגת
      }
    }

    // סגירת הלשונית או רענון באמצע הקלדה: בקשה (keepalive) שממשיכה גם אחרי שהדף נסגר
    function clearOnPageHide() {
      if (!hasTextRef.current) return;
      fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/meals/${mealId}/typing`, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ text: '' }),
      }).catch(() => {});
    }

    poll();
    pollTyping();
    const timer = setInterval(poll, POLL_MS);
    const typingTimer = setInterval(pollTyping, TYPING_POLL_MS);
    window.addEventListener('pagehide', clearOnPageHide);

    // ביציאה מהדף מפסיקים את המשיכה, ומנקים את מה שהתחלתי לכתוב
    return () => {
      stopped = true;
      clearInterval(timer);
      clearInterval(typingTimer);
      window.removeEventListener('pagehide', clearOnPageHide);
      clearTimeout(typingSyncRef.current.timer);
      typingSyncRef.current = { pending: null, inFlight: false, timer: null };
      if (hasTextRef.current) {
        hasTextRef.current = false;
        api.post(`/api/meals/${mealId}/typing`, { text: '' }, { background: true }).catch(() => {});
      }
    };
  }, [mealId]);

  // צליל: דפדפנים מאפשרים להשמיע רק אחרי לחיצה או הקלדה בדף, אז "פותחים" אותו בפעולה הראשונה
  useEffect(() => {
    window.addEventListener('pointerdown', unlockChatSound, { once: true });
    window.addEventListener('keydown', unlockChatSound, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockChatSound);
      window.removeEventListener('keydown', unlockChatSound);
    };
  }, []);

  // גלילה אוטומטית להודעה האחרונה
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  // מה שאחרות כותבות: גוללים למטה רק אם הרשימה כבר בתחתית, כדי לא להפריע לקריאת הודעות ישנות
  useEffect(() => {
    if (listRef.current && nearBottomRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [typing]);

  function handleScroll() {
    const el = listRef.current;
    if (el) nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }

  async function flushTyping() {
    const sync = typingSyncRef.current;
    sync.timer = null;
    if (sync.pending === null || sync.inFlight) return;
    const value = sync.pending;
    sync.pending = null;
    sync.inFlight = true;
    try {
      await api.post(`/api/meals/${mealId}/typing`, { text: value }, { background: true });
    } catch {
      // לא נורא: העדכון הבא ישלח את הטקסט העדכני
    }
    sync.inFlight = false;
    if (sync.pending !== null && !sync.timer) sync.timer = setTimeout(flushTyping, TYPING_SEND_MS);
  }

  // שומר את הטקסט האחרון לשליחה. טקסט ריק (מחקתי הכל או שלחתי) נשלח מיד
  function queueTyping(value) {
    const sync = typingSyncRef.current;
    sync.pending = value.trim() ? value : '';
    hasTextRef.current = sync.pending !== '';
    if (sync.inFlight) return;
    if (!sync.pending) {
      clearTimeout(sync.timer);
      flushTyping();
    } else if (!sync.timer) {
      sync.timer = setTimeout(flushTyping, TYPING_SEND_MS);
    }
  }

  function handleChange(e) {
    setText(e.target.value);
    queueTyping(e.target.value);
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setChatSoundOn(next);
    if (next) playChatSound(); // השמעה לדוגמה, כדי לשמוע איך זה נשמע
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const response = await api.post(`/api/meals/${mealId}/messages`, { content: text });
      addMessages([response.data]);
      setText('');
      // השרת כבר ניקה את הטקסט בשליחה. ניקוי נוסף למקרה שעדכון ישן עוד היה בדרך
      queueTyping('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="card chat-card">
      <div className="card-head">
        <h3>צ'אט הארוחה</h3>
        <span className="chat-head-actions">
          <span className="live"><span className="dot" aria-hidden="true" /> מתעדכן</span>
          <button type="button" className={`icon-btn sound-btn ${soundOn ? 'on' : ''}`} onClick={toggleSound}
            title={soundOn ? 'צליל להודעות: מופעל' : 'צליל להודעות: מושתק'}
            aria-label={soundOn ? 'השתקת צליל ההודעות' : 'הפעלת צליל ההודעות'} aria-pressed={soundOn}>
            <Icon name={soundOn ? 'bell' : 'bellOff'} size={16} />
          </button>
        </span>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="chat-list" ref={listRef} onScroll={handleScroll}>
        {messages.length === 0 && typing.length === 0 && (
          <div className="chat-empty">
            <span className="empty-icon"><Icon name="chat" size={22} /></span>
            <span className="muted">עדיין אין הודעות. אפשר לפתוח את השיחה!</span>
          </div>
        )}
        {messages.map((m) => {
          // הודעות שלי בצד אחד, של אחרות בצד השני. השם והשעה מחוץ לבועה.
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`chat-item ${mine ? 'mine' : 'theirs'}`}>
              {!mine && <span className="avatar xs" title={m.senderName}>{initials(m.senderName)}</span>}
              <div>
                <div className="chat-meta">
                  <b>{mine ? 'אני' : m.senderName}</b> · {msgTime(m.sentAt)}
                </div>
                <div className="chat-bubble">{m.content}</div>
              </div>
            </div>
          );
        })}
        {/* מה שאחרות כותבות עכשיו, עוד לפני השליחה: בועה מקווקוות עם סמן מהבהב */}
        {typing.map((t) => (
          <div key={`typing-${t.userId}`} className="chat-item theirs typing-item">
            <span className="avatar xs" title={t.name}>{initials(t.name)}</span>
            <div>
              <div className="chat-meta"><b>{firstName(t.name)} כותבת</b></div>
              <div className="chat-bubble typing-preview">{t.text}<span className="caret" aria-hidden="true" /></div>
            </div>
          </div>
        ))}
      </div>
      <form className="row chat-form" onSubmit={handleSend}>
        <input style={{ flex: 1 }} value={text} onChange={handleChange} placeholder="כתבי הודעה..." aria-label="הודעה" maxLength={1000} />
        <button type="submit" className="send-btn" disabled={!text.trim()} aria-label="שליחה" title="שליחה">
          <Icon name="send" size={18} />
        </button>
      </form>
    </div>
  );
}
