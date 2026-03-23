// client/src/main.tsx - Entry point with conditional app loading
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './App.css';
import App from './App';
import { registerMapServiceWorker } from './lib/registerMapServiceWorker';

registerMapServiceWorker();
void import('./monitoring/sentry').then(({ initializeWebErrorTracking }) => {
  initializeWebErrorTracking();
});

const root = ReactDOM.createRoot(
  document.getElementById('root')!
);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
