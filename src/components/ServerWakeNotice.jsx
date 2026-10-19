import { useEffect, useState, useSyncExternalStore } from 'react';
import { isServerSlow, subscribeServerSlow } from '../api/client';

// אחרי כמה זמן של טעינה מוסיפים הסבר, כי כנראה השרת ב-Render מתעורר
const LONG_WAIT_MS = 4000;

// סימן "בטעינה…" בתחתית המסך כשבקשה לשרת מתעכבת יותר משנייה
export default function ServerWakeNotice() {
  const slow = useSyncExternalStore(subscribeServerSlow, isServerSlow);
  const [longWait, setLongWait] = useState(false);

  useEffect(() => {
    if (!slow) {
      setLongWait(false);
      return undefined;
    }
    const timer = setTimeout(() => setLongWait(true), LONG_WAIT_MS);
    return () => clearTimeout(timer);
  }, [slow]);

  if (!slow) return null;

  return (
    <div className="server-wake" role="status">
      <span className="server-wake-spinner" aria-hidden="true" />
      <div>
        <strong>בטעינה…</strong>
        {longWait && <div>זה יכול לקחת עד דקה. אין צורך לרענן את הדף.</div>}
      </div>
    </div>
  );
}
