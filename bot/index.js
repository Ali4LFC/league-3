// Общая логика Telegram-бота League 3
// Используется как serverless function на Vercel (webhook)
// так и для локального запуска (long polling) через bot/run-local.js

import { Telegraf, Markup } from 'telegraf'

// URL задеплоенного веб-приложения (Telegram Mini App)
const WEB_APP_URL = 'https://football-results-one.vercel.app'

const BOT_TOKEN = process.env.BOT_TOKEN
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is not set. Add it to environment variables.')
}

const bot = new Telegraf(BOT_TOKEN)

// Приветствие при /start
bot.start((ctx) => {
  const name = ctx.from?.first_name || 'друг'
  ctx.replyWithHTML(
    `👋 Привет, <b>${name}</b>!\n\n` +
    `Это <b>League 3</b> — счётчик голов и таймер для дворового футбола.\n\n` +
    `Нажми кнопку ниже, чтобы открыть приложение 👇`,
    Markup.inlineKeyboard([
      Markup.button.webApp('⚽ Открыть League 3', WEB_APP_URL),
    ])
  )
})

// Помощь
bot.help((ctx) => {
  ctx.replyWithHTML(
    `<b>League 3 Bot</b>\n\n` +
    `⚡ <b>Быстрая игра</b> — таймер 7 мин, до 2 голов, очередь команд\n` +
    `🏆 <b>Лига</b> — таблица, голы, архив матчей\n\n` +
    `Открой приложение кнопкой ниже 👇`,
    Markup.inlineKeyboard([
      Markup.button.webApp('⚽ Открыть League 3', WEB_APP_URL),
    ])
  )
})

// Любой текст — предлагаем открыть приложение
bot.on('text', (ctx) => {
  ctx.reply(
    'Открой приложение, чтобы начать игру ⚽',
    Markup.inlineKeyboard([
      Markup.button.webApp('⚽ Открыть League 3', WEB_APP_URL),
    ])
  )
})

export default bot
