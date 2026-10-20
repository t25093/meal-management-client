import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { wakeServer } from './api/client';
import { applyTheme, getTheme } from './theme';
import './index.css';

// ערכת הנושא נקבעת לפני הציור הראשון, כדי שלא יהבהב מסך בהיר
applyTheme(getTheme());

// השרת ב-Render אולי ישן: מעירים אותו מיד, בזמן שהמסך הראשון נטען
wakeServer();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
