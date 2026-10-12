import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initTelegram } from './telegram'
import './index.css'

// Инициализируем Telegram Mini App (разворот на весь экран, тема)
initTelegram()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
