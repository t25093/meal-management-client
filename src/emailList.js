// כתובות מייל: ניקוי של שדה עם כתובת אחת, וחילוץ כתובות מתוך רשימה
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// סימני כיווניות נסתרים שנדבקים כשמעתיקים כתובות מהמייל
const INVISIBLE_MARKS = /[​-‏‪-‮⁦-⁩﻿]/g;

// שדה של כתובת אחת: מסירים רווחים וסימנים נסתרים כבר בזמן ההקלדה או ההדבקה
export function cleanEmail(value) {
  return value.replace(INVISIBLE_MARKS, '').replace(/\s+/g, '');
}

// מוציא כתובות מייל מכל טקסט: אחת בכל שורה, מופרדות בפסיקים,
// או רשימת נמענים שהועתקה מהמייל ("מלי לוי <mili@gmail.com>, ...").
// שמות, סוגריים ורווחים לא נכנסים. כל כתובת מופיעה פעם אחת.
export function extractEmails(text) {
  const cleaned = text
    .replace(/&(rlm|lrm);/gi, ' ')
    .replace(INVISIBLE_MARKS, ' ')
    .replace(/\s*@\s*/g, '@');
  const found = cleaned.match(EMAIL_PATTERN) ?? [];
  return [...new Set(found.map((email) => email.toLowerCase()))];
}
