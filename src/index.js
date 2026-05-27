import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/theme.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
document.documentElement.classList.add('dark-mode');
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
