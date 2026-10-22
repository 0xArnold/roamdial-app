import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// 首次进入显示开场（body.intro-on 隐藏 chrome）
if (!location.search.includes('s=')) {
  try {
    if (localStorage.getItem('rd.seen') === '1') document.body.classList.remove('intro-on');
  } catch (e) { /* ignore */ }
} else {
  document.body.classList.remove('intro-on');
}

createRoot(document.getElementById('root')).render(<App />);
