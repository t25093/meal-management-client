import { useSyncExternalStore } from 'react';
import { isServerSlow, subscribeServerSlow } from '../api/client';

// הודעה בתחתית המסך כשבקשה לשרת מתעכבת, בדרך כלל כי השרת ב-Render מתעורר
export default function ServerWakeNotice() {
  const slow = useSyncExternalStore(subscribeServerSlow, isServerSlow);
  if (!slow) return null;

  return (
    <div className="server-wake" role="status">
      <span className="server-wake-spinner" aria-hidden="true" />
      <div>
        <strong>בטעינה…</strong>
        <div>זה יכול לקחת עד דקה. אין צורך לרענן את הדף.</div>
      </div>
    </div>
  );
}
