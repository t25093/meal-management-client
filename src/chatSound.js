// צליל עדין להודעה חדשה בצ'אט, נוצר בדפדפן (Web Audio) בלי קובץ שמע.
// ההעדפה (מופעל / מושתק) נשמרת בדפדפן.
const KEY = 'chatSound';
let ctx = null;

export function isChatSoundOn() {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setChatSoundOn(on) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // אם הדפדפן חוסם שמירה, הבחירה פשוט לא תישמר לפעם הבאה
  }
}

function getContext() {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// דפדפנים מאפשרים להשמיע צליל רק אחרי שהמשתמשת לחצה או הקלידה בדף.
// קוראים לזה בלחיצה הראשונה, וכך הצליל יעבוד גם כשההודעה מגיעה אחר כך.
export function unlockChatSound() {
  try {
    getContext();
  } catch {
    // דפדפן בלי תמיכה בשמע
  }
}

// שני צלילים רכים ועולים, כחצי שנייה, בעוצמה נמוכה
export function playChatSound() {
  try {
    const audio = getContext();
    const now = audio.currentTime;
    [[880, 0], [1320, 0.12]].forEach(([freq, delay]) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.08, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.35);
      osc.connect(gain).connect(audio.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.4);
    });
  } catch {
    // דפדפן בלי תמיכה בשמע: פשוט בלי צליל
  }
}
