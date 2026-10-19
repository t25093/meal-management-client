import axios from 'axios';
import { getToken, logout } from '../auth';

// שכבת ה-API היחידה של הלקוח: כל הקריאות לשרת עוברות דרך המופע הזה
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// ===== שרת שמתעורר =====
// ב-Render השרת החינמי נרדם אחרי 15 דקות בלי בקשות, וההתעוררות לוקחת כדקה.
// בקשה שמתעכבת יותר מכמה שניות מציגה הודעה (ServerWakeNotice) עד שהשרת עונה.
const SLOW_REQUEST_MS = 3000;
let slowRequests = 0;
const slowListeners = new Set();

function changeSlowRequests(delta) {
  slowRequests += delta;
  slowListeners.forEach((listener) => listener());
}

// מפעיל טיימר לבקשה ומחזיר פונקציה שקוראים לה כשהבקשה הסתיימה
function startSlowTimer() {
  let slow = false;
  const timer = setTimeout(() => {
    slow = true;
    changeSlowRequests(1);
  }, SLOW_REQUEST_MS);
  return () => {
    clearTimeout(timer);
    if (slow) changeSlowRequests(-1);
  };
}

export function subscribeServerSlow(listener) {
  slowListeners.add(listener);
  return () => {
    slowListeners.delete(listener);
  };
}

export function isServerSlow() {
  return slowRequests > 0;
}

// בפתיחת האתר: בקשה קלה שמעירה את השרת כבר עכשיו, עוד לפני ההתחברות
export function wakeServer() {
  const finish = startSlowTimer();
  fetch(`${import.meta.env.VITE_API_URL ?? ''}/health`)
    .catch(() => {})
    .finally(finish);
}

// לפני כל בקשה: מוסיפים את ה-token השמור
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.finishSlowTimer = startSlowTimer();
  return config;
});

// אחרי כל תשובה: 401 (token חסר או שפג תוקפו) מעביר למסך ההתחברות.
// בקשות ההתחברות וההרשמה עצמן לא מעבירות, כדי שתוצג שם הודעת השגיאה.
api.interceptors.response.use(
  (response) => {
    response.config.finishSlowTimer?.();
    return response;
  },
  (error) => {
    error.config?.finishSlowTimer?.();
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    if (status === 401 && !url.includes('/api/auth/')) {
      logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
