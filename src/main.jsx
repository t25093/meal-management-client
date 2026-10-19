import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { wakeServer } from './api/client';
import './index.css';

// השרת ב-Render אולי ישן: מעירים אותו מיד, בזמן שהמסך הראשון נטען
wakeServer();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
