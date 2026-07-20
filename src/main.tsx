import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global sandbox safety polyfill for iOS Safari, private mode, and iframe environments
(() => {
  // 1. Safe window.confirm fallback inside iframe sandbox
  const originalConfirm = window.confirm;
  window.confirm = (message?: string): boolean => {
    try {
      return originalConfirm.call(window, message);
    } catch (e) {
      console.warn('window.confirm is blocked by sandbox, automatically confirming action:', message);
      return true; // Safe fallback confirmation
    }
  };

  // 2. Safe window.alert fallback inside iframe sandbox
  const originalAlert = window.alert;
  window.alert = (message?: any): void => {
    try {
      originalAlert.call(window, message);
    } catch (e) {
      console.warn('window.alert is blocked by sandbox:', message);
    }
  };
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
