import api from './client';
import { updateUser } from '../auth';

// האם המשתתפות רואות את הטקסט שלי בצ'אט עוד לפני השליחה.
// נשמר בשרת, ולכן חל בכל המכשירים. מחזיר את פרטי המשתמשת המעודכנים.
export async function saveShowTypingText(show) {
  const { data } = await api.put('/api/users/me/preferences', { showTypingText: show });
  updateUser(data);
  return data;
}

// ברירת המחדל: גלוי (גם למשתמשת שנשמרה בדפדפן לפני שההגדרה נוספה)
export function showsTypingText(user) {
  return user?.showTypingText !== false;
}
