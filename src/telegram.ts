// Telegram Mini App (WebApp) integration
// Docs: https://core.telegram.org/bots/webapps

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  close: () => void
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  enableClosingConfirmation: () => void
  disableClosingConfirmation: () => void
  themeParams: Record<string, string>
  colorScheme: 'light' | 'dark'
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
  onEvent: (event: string, cb: () => void) => void
  offEvent: (event: string, cb: () => void) => void
  initData: string
  initDataUnsafe: {
    user?: { id: number; first_name: string; last_name?: string; username?: string }
  }
}

/** Returns the Telegram WebApp instance, or null if not running inside Telegram. */
export function getTelegram(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null
  return window.Telegram?.WebApp ?? null
}

export const isTelegram = (): boolean => !!getTelegram()

/**
 * Initialise the Telegram Mini App environment.
 * Call once at app startup.
 */
export function initTelegram() {
  const tg = getTelegram()
  if (!tg) return

  try {
    tg.ready()
    tg.expand()
    // Match the app's dark charcoal theme so it blends with Telegram chrome
    tg.setHeaderColor('#161616')
    tg.setBackgroundColor('#161616')
  } catch (e) {
    console.warn('[telegram] init error', e)
  }
}

/** Current Telegram user (if launched from a bot). */
export function getTelegramUser() {
  return getTelegram()?.initDataUnsafe?.user ?? null
}

/**
 * Haptic feedback helpers — fire only inside Telegram.
 * Safe to call everywhere; no-op outside Telegram.
 */
export const haptic = {
  /** A physical impact (e.g. button press, goal). */
  impact(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') {
    getTelegram()?.HapticFeedback?.impactOccurred?.(style)
  },
  /** A notification-style buzz (success / warning / error). */
  notification(type: 'error' | 'success' | 'warning' = 'success') {
    getTelegram()?.HapticFeedback?.notificationOccurred?.(type)
  },
  /** A light tick for selection changes. */
  selection() {
    getTelegram()?.HapticFeedback?.selectionChanged?.()
  },
}
