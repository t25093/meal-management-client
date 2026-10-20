import { useSyncExternalStore } from 'react';

// ערכת נושא: כהה (ברירת מחדל) או בהירה. הבחירה נשמרת בדפדפן,
// וכל הרכיבים שמשתמשים ב-useTheme מתעדכנים יחד.
const KEY = 'theme';
const listeners = new Set();

export function getTheme() {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  }
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // אם הדפדפן חוסם שמירה, הבחירה פשוט לא תישמר לפעם הבאה
  }
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme);
  return [theme, applyTheme];
}

// ראשי תיבות לאווטאר: "רחל לוי" -> "רל"
export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
