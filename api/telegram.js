// Vercel Serverless Function — принимает webhook-обновления от Telegram
// URL: https://<your-domain>.vercel.app/api/telegram

import bot from '../bot/index.js'

export default async function handler(req, res) {
  // Подтверждение webhook: Telegram шлёт пустой GET при настройке
  if (req.method === 'GET') {
    res.status(200).send('League 3 bot is running')
    return
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed')
    return
  }

  if (!req.body) {
    res.status(400).send('No body')
    return
  }

  try {
    await bot.handleUpdate(req.body)
    res.status(200).end()
  } catch (err) {
    console.error('[bot] handleUpdate error:', err)
    // Возвращаем 200, чтобы Telegram не переотправлял апдейт бесконечно
    res.status(200).end()
  }
}
