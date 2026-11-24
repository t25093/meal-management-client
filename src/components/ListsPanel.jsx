import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import Icon from './Icon';

// שתי הרשימות של הארוחה: מה לקנות, ומה להביא. לכל פריט הערה וסימון "נקנה" / "הובא".
const LISTS = {
  Shopping: { title: 'קניות', icon: 'cart', done: 'נקנו', doneOne: 'נקנה', placeholder: 'מה צריך לקנות?', empty: 'הרשימה ריקה. מוסיפים מוצר בשורה למטה.' },
  Bring: { title: 'להביא', icon: 'bag', done: 'הובאו', doneOne: 'הובא', placeholder: 'מה צריך להביא?', empty: 'עוד לא נוספו דברים להביא.' },
};

const REFRESH_MS = 10000;

export default function ListsPanel({ mealId }) {
  const [items, setItems] = useState([]);
  const [list, setList] = useState('Shopping');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [editing, setEditing] = useState(null); // { id, name, note }
  const [showDone, setShowDone] = useState(true);
  const [error, setError] = useState('');
  const loads = useRef(0);

  const loadItems = useCallback((background = false) => {
    const load = ++loads.current;
    return api.get(`/api/meals/${mealId}/list-items`, { background })
      .then((response) => { if (load === loads.current) setItems(response.data); })
      .catch((err) => { if (!background) setError(getErrorMessage(err)); });
  }, [mealId]);

  useEffect(() => { loadItems(); }, [loadItems]);

  // סימונים של משתתפות אחרות מופיעים לבד
  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden) loadItems(true); }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadItems]);

  const meta = LISTS[list];
  const listItems = items.filter((i) => i.listType === list);
  const open = listItems.filter((i) => !i.isDone);
  const done = listItems.filter((i) => i.isDone);
  const pct = listItems.length ? Math.round((done.length / listItems.length) * 100) : 0;
  const openCount = (type) => items.filter((i) => i.listType === type && !i.isDone).length;

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    try {
      await api.post(`/api/meals/${mealId}/list-items`, { listType: list, name: name.trim(), note: note.trim() || null });
      setName('');
      setNote('');
      setNoteOpen(false);
      await loadItems();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleToggle(item) {
    setError('');
    // הסימון מתעדכן מיד, ואחר כך נטען מהשרת
    setItems((current) => current.map((i) => (i.id === item.id ? { ...i, isDone: !item.isDone } : i)));
    try {
      await api.patch(`/api/meals/${mealId}/list-items/${item.id}`, { isDone: !item.isDone });
    } catch (err) {
      setError(getErrorMessage(err));
    }
    await loadItems();
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.patch(`/api/meals/${mealId}/list-items/${editing.id}`, { name: editing.name.trim(), note: editing.note.trim() });
      setEditing(null);
      await loadItems();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDelete(item) {
    setError('');
    try {
      await api.delete(`/api/meals/${mealId}/list-items/${item.id}`);
      await loadItems();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function renderItem(item) {
    if (editing?.id === item.id) {
      return (
        <li key={item.id} className="li-item editing">
          <form onSubmit={handleSaveEdit} className="li-edit">
            <input value={editing.name} maxLength={100} required autoFocus
              onChange={(e) => setEditing({ ...editing, name: e.target.value })} aria-label="שם" />
            <input value={editing.note} maxLength={200} placeholder="הערה (לא חובה)"
              onChange={(e) => setEditing({ ...editing, note: e.target.value })} aria-label="הערה" />
            <div className="li-edit-actions">
              <button type="submit" className="small"><Icon name="check" size={15} /> שמירה</button>
              <button type="button" className="small ghost" onClick={() => setEditing(null)}>ביטול</button>
            </div>
          </form>
        </li>
      );
    }
    return (
      <li key={item.id} className={`li-item ${item.isDone ? 'done' : ''}`}>
        <button className={`li-check ${item.isDone ? 'on' : ''}`} onClick={() => handleToggle(item)}
          role="checkbox" aria-checked={item.isDone} aria-label={`${item.name}: ${item.isDone ? meta.doneOne : 'לא ' + meta.doneOne}`}>
          {item.isDone && <Icon name="check" size={13} strokeWidth={2.8} />}
        </button>
        <div className="li-body">
          <span className="li-name">{item.name}</span>
          {item.note && <span className="li-note">{item.note}</span>}
          {item.isDone && item.doneByName && <span className="li-by">{meta.doneOne} · {item.doneByName}</span>}
        </div>
        <div className="li-actions">
          <button className="icon-btn" onClick={() => setEditing({ id: item.id, name: item.name, note: item.note ?? '' })}
            data-tip="עריכה" aria-label={`עריכת ${item.name}`}><Icon name="edit" size={15} /></button>
          <button className="icon-btn danger-hover" onClick={() => handleDelete(item)}
            data-tip="מחיקה" aria-label={`מחיקת ${item.name}`}><Icon name="trash" size={15} /></button>
        </div>
      </li>
    );
  }

  return (
    <div className="card lists-card">
      <div className="card-head">
        <h3>רשימות</h3>
        {listItems.length > 0 && <span className="muted li-summary">{done.length} מתוך {listItems.length} {meta.done}</span>}
      </div>

      <div className="li-switch" role="tablist">
        {Object.entries(LISTS).map(([key, l]) => (
          <button key={key} role="tab" aria-selected={list === key} className={list === key ? 'active' : ''}
            onClick={() => { setList(key); setEditing(null); }}>
            <Icon name={l.icon} size={16} /> {l.title}
            {openCount(key) > 0 && <span className="count">{openCount(key)}</span>}
          </button>
        ))}
      </div>

      {listItems.length > 0 && (
        <div className="progress li-progress"><div className="bar"><div className="fill" style={{ width: `${pct}%` }} /></div></div>
      )}

      {error && <div className="error">{error}</div>}

      {listItems.length === 0 ? (
        <div className="mini-empty"><Icon name={meta.icon} size={20} /><span>{meta.empty}</span></div>
      ) : (
        <>
          <ul className="li-list">{open.map(renderItem)}</ul>
          {open.length === 0 && <p className="li-all-done"><Icon name="check" size={15} /> הכול {meta.done}</p>}
          {done.length > 0 && (
            <>
              <button className="li-done-toggle" onClick={() => setShowDone(!showDone)} aria-expanded={showDone}>
                <Icon name="chevronLeft" size={14} className={showDone ? 'open' : ''} /> {meta.done} ({done.length})
              </button>
              {showDone && <ul className="li-list">{done.map(renderItem)}</ul>}
            </>
          )}
        </>
      )}

      <form className="li-add" onSubmit={handleAdd}>
        <div className="li-add-row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={meta.placeholder} maxLength={100} aria-label={meta.placeholder} />
          <button type="button" className={`icon-btn bordered ${noteOpen ? 'active' : ''}`} onClick={() => setNoteOpen(!noteOpen)}
            data-tip="הערה" aria-label="הוספת הערה" aria-pressed={noteOpen}><Icon name="note" size={17} /></button>
          <button type="submit" className="icon-btn li-add-btn" disabled={!name.trim()} data-tip="הוספה" aria-label="הוספה"><Icon name="plus" size={18} /></button>
        </div>
        {noteOpen && (
          <input className="li-add-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200}
            placeholder="הערה: כמות, מותג, איפה לקנות..." aria-label="הערה" />
        )}
      </form>
    </div>
  );
}
