import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {syncRepoContent} from './lib/syncRepoContent';

// Bring this browser's cached content up to date with content.json before the
// app reads it. Without this, returning visitors keep seeing stale content.
syncRepoContent();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
