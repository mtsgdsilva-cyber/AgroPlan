// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Importação do Service Worker gerado pelo Vite PWA
import { registerSW } from 'virtual:pwa-register';

// Registra a atualização automática
const updateSW = registerSW({
  onNeedRefresh() {
    // Aqui você poderia colocar um aviso visual pedindo para o usuário recarregar a página
    console.log("Nova atualização disponível!");
  },
  onOfflineReady() {
    console.log("Aplicativo pronto para funcionar offline.");
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);