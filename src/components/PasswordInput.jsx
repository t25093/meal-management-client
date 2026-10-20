import { useState } from 'react';
import Icon from './Icon';

// שדה סיסמה עם אייקון מנעול וכפתור עין להצגה/הסתרה
export default function PasswordInput({ value, onChange, ...rest }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="field has-action">
      <Icon name="lock" size={18} />
      <input type={visible ? 'text' : 'password'} value={value} onChange={onChange} {...rest} />
      <button
        type="button"
        className="field-action"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? 'הסתרת הסיסמה' : 'הצגת הסיסמה'}
        title={visible ? 'הסתרת הסיסמה' : 'הצגת הסיסמה'}
      >
        <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
      </button>
    </span>
  );
}
