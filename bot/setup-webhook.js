// Скрипт регистрации webhook URL в Telegram API
// Использование: node bot/setup-webhook.js
//
// Требует BOT_TOKEN и WEBHOOK_URL в переменных окружения
// (или в файле .env).
//
// Пример:
//   BOT_TOKEN=123456:ABC... node bot/setup-webhook.js

import { readFileSync, existsSync } from 'node:fs'

// Загружаем .env вручную (без dotenv-зависимости)
if (existsSync('.env')) {
  const lines = readFileSync('.env', 'utf-8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const { BOT_TOKEN, WEBHOOK_URL } = process.env

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN не найден. Создай файл .env с BOT_TOKEN=...')
  process.exit(1)
}

if (!WEBHOOK_URL) {
  console.error('❌ WEBHOOK_URL не найден. Добавь в .env: WEBHOOK_URL=https://<домен>.vercel.app/api/telegram')
  process.exit(1)
}

const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`

try {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      drop_pending_updates: true,
    }),
  })
  const data = await res.json()
  if (data.ok) {
    console.log('✅ Webhook установлен успешно!')
    console.log(`   URL: ${WEBHOOK_URL}`)
    console.log(`   Проверь: https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`)
  } else {
    console.error('❌ Ошибка:', data.description || data)
    process.exit(1)
  }
} catch (e) {
  console.error('❌ Сетевая ошибка:', e.message)
  process.exit(1)
}
