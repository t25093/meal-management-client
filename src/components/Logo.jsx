// הלוגו של "מנה-לי": צלחת עם לב באמצע, מזלג וכף בצדדים (כל אחת מביאה מנה)
export default function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="מנה-לי">
      <rect width="64" height="64" rx="16" fill="#1d5c4d" />
      {/* צלחת */}
      <circle cx="32" cy="33" r="18" fill="#fbf7ee" />
      <circle cx="32" cy="33" r="13" fill="none" stroke="#c9a24a" strokeWidth="1.6" />
      {/* לב */}
      <path d="M32 40c-5.2-3.6-7.8-6.3-7.8-9.3a4 4 0 0 1 7.8-1.4 4 4 0 0 1 7.8 1.4c0 3-2.6 5.7-7.8 9.3z" fill="#1d5c4d" />
      {/* מזלג */}
      <path d="M6.5 14v6.5a2.5 2.5 0 0 0 5 0V14M9 14v7" fill="none" stroke="#c9a24a" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="8" y="22" width="2" height="28" rx="1" fill="#c9a24a" />
      {/* כף */}
      <ellipse cx="55" cy="18.5" rx="3.2" ry="4.6" fill="#c9a24a" />
      <rect x="54" y="22" width="2" height="28" rx="1" fill="#c9a24a" />
    </svg>
  );
}
