import { useEffect, useRef, useState } from 'react'
import { useLocalStorage, uid } from './store'
import type { QuickState, QuickTeam, QuickGameRecord, GoalEvent } from './types'

const GAME_DURATION = 7 * 60
const WIN_GOALS = 2
const REST_STREAK = 3 // команда идёт на отдых после стольких побед подряд

const DEFAULT_TEAMS: QuickTeam[] = [
  { id: 'blue', name: 'Синие', color: '#3b82f6' },
  { id: 'red', name: 'Красные', color: '#ef4444' },
  { id: 'green', name: 'Зелёные', color: '#22c55e' }
]

const DEFAULT_STATE: QuickState = {
  teams: DEFAULT_TEAMS,
  playingIds: ['blue', 'red'],
  waitingId: 'green',
  oldTeamId: 'blue',
  goals: [],
  timerSeconds: GAME_DURATION,
  isRunning: false,
  history: [],
  streaks: { blue: 0, red: 0, green: 0 }
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

interface QuickStanding {
  team: QuickTeam
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
  streak: number
}

function computeQuickStandings(
  teams: QuickTeam[],
  history: QuickGameRecord[],
  streaks: Record<string, number>,
  liveGame?: { teamAId: string; teamBId: string; scoreA: number; scoreB: number } | null
): QuickStanding[] {
  const map = new Map<string, QuickStanding>()
  for (const t of teams) {
    map.set(t.id, {
      team: t, played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, points: 0, streak: streaks[t.id] || 0
    })
  }
  const allGames: QuickGameRecord[] = [...history]
  if (liveGame) {
    allGames.push({
      id: '__live__',
      teamAId: liveGame.teamAId,
      teamBId: liveGame.teamBId,
      scoreA: liveGame.scoreA,
      scoreB: liveGame.scoreB,
      winnerId: null,
      loserId: null,
      isDraw: liveGame.scoreA === liveGame.scoreB,
      oldTeamLeft: false,
      forcedRest: false,
      duration: 0,
      goals: [],
      createdAt: Date.now()
    })
  }
  for (const g of allGames) {
    const a = map.get(g.teamAId)
    const b = map.get(g.teamBId)
    if (!a || !b) continue
    a.played++; b.played++
    a.goalsFor += g.scoreA; a.goalsAgainst += g.scoreB
    b.goalsFor += g.scoreB; b.goalsAgainst += g.scoreA
    if (g.isDraw) {
      a.drawn++; b.drawn++; a.points++; b.points++
    } else if (g.scoreA > g.scoreB) {
      a.won++; b.lost++; a.points += 3
    } else {
      b.won++; a.lost++; b.points += 3
    }
  }
  return [...map.values()].sort((a, b) =>
    b.points - a.points ||
    (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) ||
    b.goalsFor - a.goalsFor
  )
}

export default function QuickGame() {
  const [state, setState] = useLocalStorage<QuickState>('quick_game', DEFAULT_STATE)
  const [editing, setEditing] = useState(false)
  const [teamNames, setTeamNames] = useState<Record<string, string>>({})
  const [shakeRemove, setShakeRemove] = useState(0)
  const [banner, setBanner] = useState<{ text: string; tone: 'warning' | 'danger' } | null>(null)
  const intervalRef = useRef<number | null>(null)
  const endTimeRef = useRef<number | null>(null)
  const notifiedMinuteRef = useRef(false)
  const notifiedFinalRef = useRef(false)
  const bannerTimerRef = useRef<number | null>(null)
  const stickyNotifyRef = useRef<number | null>(null)

  const { teams, playingIds, waitingId, oldTeamId, goals, timerSeconds, isRunning, history } = state

  const teamById = (id: string) => teams.find((t) => t.id === id)!
  const [teamA, teamB] = playingIds.map(teamById)
  const waiting = teamById(waitingId)

  const scoreA = goals.filter((g) => g.teamId === teamA.id).length
  const scoreB = goals.filter((g) => g.teamId === teamB.id).length

  // Звуковой сигнал через Web Audio API (без внешних файлов)
  const beep = (freq: number, duration: number, count = 1) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioCtx()
      const playOne = (delay: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        const start = ctx.currentTime + delay
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration / 1000)
        osc.start(start)
        osc.stop(start + duration / 1000 + 0.05)
      }
      for (let i = 0; i < count; i++) playOne((i * (duration + 120)) / 1000)
      setTimeout(() => ctx.close(), count * (duration + 120) + 200)
    } catch (e) { /* audio unavailable */ }
  }

  // Показать уведомление через Service Worker (работает и когда вкладка в фоне)
  const showNotification = async (title: string, body: string, tag: string, silent = false) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      if (reg) {
        await reg.showNotification(title, { body, tag, silent, requireInteraction: !silent })
      } else {
        new Notification(title, { body, tag, silent })
      }
    } catch (e) { /* ignore */ }
  }

  const fireAlert = (text: string, tone: 'warning' | 'danger', beepCount: number) => {
    showNotification(tone === 'danger' ? '🚨 League 3' : '⏱ League 3', text, text)
    // Звук
    beep(tone === 'danger' ? 880 : 660, 250, beepCount)
    // Визуальный баннер
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
    setBanner({ text, tone })
    bannerTimerRef.current = window.setTimeout(() => setBanner(null), 4000)
  }

  // Сброс флагов уведомлений при старте новой игры
  const resetAlertFlags = () => {
    notifiedMinuteRef.current = false
    notifiedFinalRef.current = false
  }

  // Отслеживание порогов таймера
  useEffect(() => {
    if (!isRunning) return
    if (timerSeconds === 60 && !notifiedMinuteRef.current) {
      notifiedMinuteRef.current = true
      fireAlert('Осталась минута!', 'warning', 2)
    }
    if (timerSeconds === 15 && !notifiedFinalRef.current) {
      notifiedFinalRef.current = true
      fireAlert('Последняя атака!', 'danger', 3)
    }
  }, [timerSeconds, isRunning])

  // Очистка баннера при размонтировании
  useEffect(() => {
    return () => { if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current) }
  }, [])

  // Запрос разрешения на уведомления при первом нажатии Старт
  const requestNotifyPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }

  // Timer tick — по реальному времени (Date.now), чтобы не отставать в фоне
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      endTimeRef.current = null
      return
    }
    if (endTimeRef.current == null) {
      endTimeRef.current = Date.now() + timerSeconds * 1000
    }
    const tick = () => {
      setState((prev) => {
        if (!prev.isRunning || endTimeRef.current == null) return prev
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
        if (remaining <= 0) {
          return endGame({ ...prev, timerSeconds: 0, isRunning: false })
        }
        if (remaining === prev.timerSeconds) return prev // пропускаем, если секунда не изменилась
        return { ...prev, timerSeconds: remaining }
      })
    }
    tick()
    intervalRef.current = window.setInterval(tick, 250) // 250мс — чаще, чтобы при возврате сразу пересчитать
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning, setState])

  // Пересчитать таймер при возврате вкладки в фокус (на случай троттлинга в фоне)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && isRunning && endTimeRef.current != null) {
        setState((prev) => {
          if (!prev.isRunning) return prev
          const remaining = Math.max(0, Math.ceil((endTimeRef.current! - Date.now()) / 1000))
          if (remaining <= 0) return endGame({ ...prev, timerSeconds: 0, isRunning: false })
          return { ...prev, timerSeconds: remaining }
        })
      }
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onVis)
    }
  }, [isRunning, setState])

  // Sticky-уведомление с оставшимся временем (обновляется каждые ~10 сек)
  useEffect(() => {
    if (!isRunning) {
      if (stickyNotifyRef.current) { clearInterval(stickyNotifyRef.current); stickyNotifyRef.current = null }
      // закрываем sticky-уведомление при остановке
      if ('Notification' in window && Notification.permission === 'granted') {
        navigator.serviceWorker?.getRegistration().then((reg) => {
          reg?.getNotifications({ tag: 'timer-sticky' }).then((ns) => ns.forEach((n) => n.close()))
        })
      }
      return
    }
    const update = () => {
      showNotification('⏱ League 3', `Осталось: ${fmtTime(timerSeconds)}`, 'timer-sticky', true)
    }
    update()
    stickyNotifyRef.current = window.setInterval(update, 10000)
    return () => { if (stickyNotifyRef.current) clearInterval(stickyNotifyRef.current) }
  }, [isRunning, timerSeconds])

  const addGoal = (teamId: string) => {
    setState((prev) => {
      if (!prev.isRunning) return prev
      const goal: GoalEvent = { teamId, minute: Math.floor((GAME_DURATION - prev.timerSeconds) / 60) + 1, timestamp: Date.now() }
      const newGoals = [...prev.goals, goal]
      const aGoals = newGoals.filter((g) => g.teamId === prev.playingIds[0]).length
      const bGoals = newGoals.filter((g) => g.teamId === prev.playingIds[1]).length
      if (aGoals >= WIN_GOALS || bGoals >= WIN_GOALS) {
        return endGame({ ...prev, goals: newGoals, isRunning: false })
      }
      return { ...prev, goals: newGoals }
    })
  }

  const removeLastGoal = () => {
    setShakeRemove((n) => n + 1)
    setState((prev) => ({ ...prev, goals: prev.goals.slice(0, -1) }))
  }

  const toggleTimer = () => {
    setState((prev) => {
      if (!prev.isRunning) {
        requestNotifyPermission()
        resetAlertFlags()
        endTimeRef.current = Date.now() + prev.timerSeconds * 1000
      } else {
        // на паузе сбрасываем endTime, чтобы при старте пересчитать по текущему timerSeconds
        endTimeRef.current = null
      }
      return { ...prev, isRunning: !prev.isRunning }
    })
  }

  const resetTimer = () => {
    resetAlertFlags()
    endTimeRef.current = null
    setState((prev) => ({ ...prev, timerSeconds: GAME_DURATION, isRunning: false, goals: [] }))
  }

  const endGameManual = () => {
    resetAlertFlags()
    endTimeRef.current = null
    setState((prev) => endGame({ ...prev, isRunning: false }))
  }

  const startEditNames = () => {
    setTeamNames(Object.fromEntries(teams.map((t) => [t.id, t.name])))
    setEditing(true)
  }

  const saveNames = () => {
    setState((prev) => ({
      ...prev,
      teams: prev.teams.map((t) => ({ ...t, name: teamNames[t.id]?.trim() || t.name }))
    }))
    setEditing(false)
  }

  const switchTeams = (id1: string, id2: string) => {
    resetAlertFlags()
    endTimeRef.current = null
    setState((prev) => {
      const newPlaying: [string, string] = [id1, id2]
      const waitId = prev.teams.find((t) => t.id !== id1 && t.id !== id2)!.id
      const resetStreaks = Object.fromEntries(prev.teams.map((t) => [t.id, 0]))
      return { ...prev, playingIds: newPlaying, waitingId: waitId, oldTeamId: id1, timerSeconds: GAME_DURATION, goals: [], isRunning: false, streaks: resetStreaks }
    })
  }

  const clearHistory = () => {
    if (!confirm('Очистить историю игр? Таблица и серии сбросятся.')) return
    setState((prev) => ({
      ...prev,
      history: [],
      streaks: Object.fromEntries(prev.teams.map((t) => [t.id, 0]))
    }))
  }

  return (
    <div className="p-4 space-y-6">
      {/* Alert banner */}
      {banner && (
        <div key={banner.text} className={`fixed top-16 left-4 right-4 z-50 px-5 py-4 font-display font-black text-xl animate-slide-in-left border-2 ${
          banner.tone === 'danger' ? 'bg-crimson text-white border-crimson' : 'bg-lime text-charcoal border-lime'
        }`}>
          {banner.tone === 'danger' ? '🚨 ' : '⏱ '}{banner.text}
        </div>
      )}

      {/* Timer — editorial scoreboard */}
      <div className="relative bento overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lime via-lime to-transparent" />
        <div className="p-6 text-center">
          <div className="text-[10px] uppercase tracking-[0.35em] text-muted font-semibold mb-2">
            {isRunning ? 'Время' : timerSeconds < GAME_DURATION ? 'Пауза' : 'До старта'}
          </div>
          <div className="flex items-center justify-center gap-3">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" stroke="#2E2E2A" strokeWidth="2" />
              <circle
                cx="50" cy="50" r="46" fill="none"
                stroke={timerSeconds <= 15 ? '#FF4D3D' : timerSeconds <= 30 ? '#D4FF00' : '#F5F2EA'}
                strokeWidth="2.5"
                strokeLinecap="square"
                strokeDasharray={2 * Math.PI * 46}
                strokeDashoffset={2 * Math.PI * 46 * (1 - timerSeconds / GAME_DURATION)}
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
              />
            </svg>
            <div className={`font-display font-black text-6xl leading-none tabular-nums tracking-tightest transition-colors duration-300 ${
              timerSeconds <= 15 ? 'text-crimson animate-pulse' :
              timerSeconds <= 30 ? 'text-lime animate-pulse' : 'text-ink'
            }`}>
              {fmtTime(timerSeconds)}
            </div>
          </div>
        </div>
      </div>

      {/* Controls — brutalist segmented */}
      <div className="flex gap-0 border-2 border-line">
        <button onClick={toggleTimer}
          className={`flex-1 py-4 font-bold text-base border-r-2 border-line transition-colors ${
            isRunning ? 'bg-surface text-ink' : 'bg-lime text-charcoal'
          }`}>
          {isRunning ? '⏸ Пауза' : '▶ Старт'}
        </button>
        <button onClick={resetTimer} className="px-5 py-4 bg-surface text-ink font-bold border-r-2 border-line hover:bg-line">↺</button>
        <button onClick={endGameManual} className="px-5 py-4 bg-crimson text-white font-bold">Стоп</button>
      </div>

      {/* Playing teams — asymmetric bento */}
      <div className="relative">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
          {[teamA, teamB].map((team, idx) => {
            const score = idx === 0 ? scoreA : scoreB
            const isOld = team.id === oldTeamId
            const streak = state.streaks[team.id] || 0
            const slideAnim = idx === 0 ? 'animate-slide-in-left' : 'animate-slide-in-right'
            return (
              <div key={team.id} className={`bento p-4 text-center ${slideAnim} relative overflow-hidden`}
                style={{ borderColor: `${team.color}40` }}>
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: team.color }} />
                <div className="flex items-center justify-center gap-1.5 mb-3 flex-wrap">
                  <span className="w-2.5 h-2.5" style={{ background: team.color }} />
                  <span className="font-bold text-sm text-ink">{team.name}</span>
                  {isOld && <span className="text-[9px] bg-lime text-charcoal px-1.5 py-0.5 font-black uppercase">чемп</span>}
                  {streak > 0 && (
                    <span key={streak} className="text-[9px] bg-crimson text-white px-1.5 py-0.5 font-black animate-pop">
                      🔥 {streak}
                    </span>
                  )}
                </div>
                <div key={score} className="font-display font-black text-7xl my-2 tabular-nums animate-goal-bounce leading-none" style={{ color: team.color }}>{score}</div>
                <button onClick={() => addGoal(team.id)} disabled={!isRunning}
                  className={`w-full py-3 font-bold text-sm border-2 transition-all disabled:opacity-30 ${isRunning ? 'animate-pulse-ring' : ''}`}
                  style={{ borderColor: team.color, color: team.color, background: 'transparent' }}>
                  + ГОЛ
                </button>
              </div>
            )
          })}
          {/* VS divider */}
          <div className="flex flex-col items-center justify-center">
            <span className="font-display font-black text-2xl text-muted">vs</span>
          </div>
        </div>
      </div>

      {/* Waiting team */}
      <div key={waitingId} className="bento p-4 animate-slide-up flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">Ждёт</span>
          <span className="w-3 h-3" style={{ background: waiting.color }} />
          <span className="font-bold text-ink">{waiting.name}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => switchTeams(waitingId, playingIds[0])}
            className="text-[11px] px-2.5 py-1.5 border border-line text-muted hover:bg-line hover:text-ink font-semibold">↔ {teamA.name}</button>
          <button onClick={() => switchTeams(waitingId, playingIds[1])}
            className="text-[11px] px-2.5 py-1.5 border border-line text-muted hover:bg-line hover:text-ink font-semibold">↔ {teamB.name}</button>
        </div>
      </div>

      {/* Goals log */}
      {goals.length > 0 && (
        <div className="bento p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-black text-sm text-ink uppercase tracking-wide">Голы · {goals.length}</span>
            <button key={shakeRemove} onClick={removeLastGoal} className="text-xs text-crimson font-bold animate-shake hover:underline">↶ Отменить</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {goals.map((g, i) => {
              const t = teamById(g.teamId)
              return (
                <span key={i} className="text-[11px] px-2.5 py-1 font-semibold animate-slide-in-left border"
                  style={{ borderColor: `${t.color}55`, color: t.color }}>
                  {t.name} {g.minute}'
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Manual score entry */}
      <details className="bento p-4 group">
        <summary className="cursor-pointer text-sm font-bold text-ink uppercase tracking-wide list-none flex items-center justify-between">
          <span>Счёт вручную</span>
          <span className="text-muted group-open:rotate-45 transition-transform">+</span>
        </summary>
        <div className="mt-4 flex items-center justify-center gap-6">
          <ManualScore team={teamA} value={scoreA} onChange={(n) => setScoreManual(0, n)} disabled={isRunning} />
          <span className="font-display font-black text-3xl text-muted">:</span>
          <ManualScore team={teamB} value={scoreB} onChange={(n) => setScoreManual(1, n)} disabled={isRunning} />
        </div>
      </details>

      {/* Edit names */}
      <div>
        {!editing ? (
          <button onClick={startEditNames} className="w-full py-3 bento text-sm font-bold text-muted hover:text-ink uppercase tracking-wide">✎ Переименовать команды</button>
        ) : (
          <div className="bento p-4 space-y-3">
            {teams.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <span className="w-3 h-3" style={{ background: t.color }} />
                <input value={teamNames[t.id] ?? ''}
                  onChange={(e) => setTeamNames((p) => ({ ...p, [t.id]: e.target.value }))}
                  className="flex-1 px-3 py-2.5 bg-charcoal text-ink outline-none text-sm border border-line focus:border-lime transition-colors" />
              </div>
            ))}
            <button onClick={saveNames} className="w-full py-3 bg-lime text-charcoal font-black uppercase tracking-wide">Сохранить</button>
          </div>
        )}
      </div>

      {/* Live standings */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display font-black text-xl text-ink tracking-tightest">Таблица</h2>
          <span className="text-[10px] uppercase tracking-wider text-muted">Live</span>
        </div>
        <div className="bento overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-[10px] uppercase tracking-wider bg-surface">
                  <th className="text-left py-3 px-2 font-bold">#</th>
                  <th className="text-left py-3 px-2 font-bold">Команда</th>
                  <th className="py-3 px-1 font-bold">И</th>
                  <th className="py-3 px-1 font-bold">В</th>
                  <th className="py-3 px-1 font-bold">Н</th>
                  <th className="py-3 px-1 font-bold">П</th>
                  <th className="py-3 px-1 font-bold">Г+</th>
                  <th className="py-3 px-1 font-bold">Г−</th>
                  <th className="py-3 px-1 font-bold">РМ</th>
                  <th className="py-3 px-1 font-bold">О</th>
                  <th className="py-3 px-1 font-bold">🔥</th>
                </tr>
              </thead>
              <tbody>
                {computeQuickStandings(teams, history, state.streaks, {
                  teamAId: playingIds[0],
                  teamBId: playingIds[1],
                  scoreA,
                  scoreB
                }).map((s, i) => (
                  <tr key={`${s.team.id}-${s.played}-${s.points}-${s.goalsFor}-${s.goalsAgainst}`} className={`border-t border-line animate-row-flash ${i === 0 ? 'bg-lime/5' : ''}`}>
                    <td className="py-3 px-2 text-muted font-black">{i + 1}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5" style={{ background: s.team.color }} />
                        <span className="font-bold text-ink text-sm">{s.team.name}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-1 text-ink">{s.played}</td>
                    <td className="text-center py-3 px-1 text-lime font-bold">{s.won}</td>
                    <td className="text-center py-3 px-1 text-muted">{s.drawn}</td>
                    <td className="text-center py-3 px-1 text-crimson">{s.lost}</td>
                    <td className="text-center py-3 px-1 text-ink">{s.goalsFor}</td>
                    <td className="text-center py-3 px-1 text-muted">{s.goalsAgainst}</td>
                    <td className={`text-center py-3 px-1 font-bold ${s.goalsFor - s.goalsAgainst > 0 ? 'text-lime' : s.goalsFor - s.goalsAgainst < 0 ? 'text-crimson' : 'text-muted'}`}>
                      {s.goalsFor - s.goalsAgainst > 0 ? '+' : ''}{s.goalsFor - s.goalsAgainst}
                    </td>
                    <td className="text-center py-3 px-1 font-black text-ink text-base">{s.points}</td>
                    <td className="text-center py-3 px-1">
                      {s.streak > 0 ? <span className="text-crimson font-black">{s.streak}</span> : <span className="text-line">0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {goals.length > 0 && (
          <p className="text-[10px] text-lime uppercase tracking-wider font-bold">● Учитывает текущий матч</p>
        )}
      </section>

      {/* History */}
      {history.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display font-black text-xl text-ink tracking-tightest">Архив</h2>
            <button onClick={clearHistory} className="text-[10px] text-muted hover:text-crimson font-bold uppercase tracking-wider">Очистить</button>
          </div>
          <div className="space-y-2">
            {[...history].reverse().map((g) => (
              <div key={g.id} className="bento p-3.5 animate-slide-up">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2.5 h-2.5" style={{ background: teamById(g.teamAId).color }} />
                    <span className="font-semibold text-ink text-sm">{teamById(g.teamAId).name}</span>
                    <span className="font-black text-ink text-lg px-1 tabular-nums">{g.scoreA} : {g.scoreB}</span>
                    <span className="font-semibold text-ink text-sm">{teamById(g.teamBId).name}</span>
                    <span className="w-2.5 h-2.5" style={{ background: teamById(g.teamBId).color }} />
                  </div>
                  <span className="text-[10px] text-muted font-mono tabular-nums">{fmtTime(g.duration)}</span>
                </div>
                <div className="mt-1 text-[11px] text-muted">
                  {g.isDraw ? `🤝 Ничья — ушла ${teamById(g.loserId || '').name}` :
                    g.forcedRest ? `🏖 ${teamById(g.winnerId || '').name} — отдых после ${REST_STREAK} побед` :
                    `✓ ${teamById(g.winnerId || '').name}`}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )

  function setScoreManual(idx: number, n: number) {
    setState((prev) => {
      const teamId = prev.playingIds[idx]
      const currentCount = prev.goals.filter((g) => g.teamId === teamId).length
      let newGoals = [...prev.goals]
      if (n > currentCount) {
        for (let i = 0; i < n - currentCount; i++) {
          newGoals.push({ teamId, minute: Math.floor((GAME_DURATION - prev.timerSeconds) / 60) + 1, timestamp: Date.now() })
        }
      } else if (n < currentCount) {
        const teamGoals = newGoals.filter((g) => g.teamId === teamId)
        const removeCount = currentCount - n
        const toRemove = new Set(teamGoals.slice(-removeCount).map((g) => g.timestamp))
        newGoals = newGoals.filter((g) => !toRemove.has(g.timestamp))
      }
      const aGoals = newGoals.filter((g) => g.teamId === prev.playingIds[0]).length
      const bGoals = newGoals.filter((g) => g.teamId === prev.playingIds[1]).length
      if (aGoals >= WIN_GOALS || bGoals >= WIN_GOALS) {
        return endGame({ ...prev, goals: newGoals, isRunning: false })
      }
      return { ...prev, goals: newGoals }
    })
  }
}

function ManualScore({ team, value, onChange, disabled }: {
  team: QuickTeam; value: number; onChange: (n: number) => void; disabled: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: team.color }}>{team.name}</span>
      <div className="flex items-center gap-2">
        <button disabled={disabled || value <= 0} onClick={() => onChange(Math.max(0, value - 1))}
          className="w-9 h-9 border-2 border-line text-ink disabled:opacity-30 font-black text-lg hover:bg-line transition-colors">−</button>
        <span key={value} className="font-display font-black text-3xl w-9 text-center tabular-nums animate-pop" style={{ color: team.color }}>{value}</span>
        <button disabled={disabled} onClick={() => onChange(value + 1)}
          className="w-9 h-9 border-2 border-line text-ink disabled:opacity-30 font-black text-lg hover:bg-line transition-colors">+</button>
      </div>
    </div>
  )
}

function endGame(prev: QuickState): QuickState {
  const [aId, bId] = prev.playingIds
  const scoreA = prev.goals.filter((g) => g.teamId === aId).length
  const scoreB = prev.goals.filter((g) => g.teamId === bId).length
  const isDraw = scoreA === scoreB

  let winnerId: string | null = null
  let loserId: string | null = null
  let oldTeamLeft = false
  let forcedRest = false

  const newStreaks = { ...prev.streaks }

  if (isDraw) {
    oldTeamLeft = true
    loserId = prev.oldTeamId
    newStreaks[prev.oldTeamId] = 0
    const stayingId = prev.playingIds.find((id) => id !== prev.oldTeamId)!
    newStreaks[stayingId] = 0
  } else if (scoreA > scoreB) {
    winnerId = aId
    loserId = bId
  } else {
    winnerId = bId
    loserId = aId
  }

  if (!isDraw && winnerId) {
    newStreaks[winnerId] = (newStreaks[winnerId] || 0) + 1
    newStreaks[loserId] = 0
  }

  const winStreak = winnerId ? (newStreaks[winnerId] || 0) : 0

  let stayingId: string
  let newWaitingId: string
  let newPlaying: [string, string]
  let newOldTeamId: string

  if (winStreak >= REST_STREAK && winnerId && loserId) {
    forcedRest = true
    newWaitingId = winnerId
    newStreaks[winnerId] = 0
    stayingId = loserId
    newPlaying = [loserId, prev.waitingId]
    newOldTeamId = loserId
  } else {
    stayingId = winnerId ?? prev.playingIds.find((id) => id !== prev.oldTeamId)!
    newWaitingId = loserId ?? prev.oldTeamId
    newPlaying = [stayingId, prev.waitingId]
    newOldTeamId = stayingId
  }

  const record: QuickGameRecord = {
    id: uid(),
    teamAId: aId,
    teamBId: bId,
    scoreA,
    scoreB,
    winnerId,
    loserId,
    isDraw,
    oldTeamLeft,
    forcedRest,
    duration: GAME_DURATION - prev.timerSeconds,
    goals: prev.goals,
    createdAt: Date.now()
  }

  return {
    ...prev,
    playingIds: newPlaying,
    waitingId: newWaitingId,
    oldTeamId: newOldTeamId,
    goals: [],
    timerSeconds: GAME_DURATION,
    isRunning: false,
    history: [...prev.history, record],
    streaks: newStreaks
  }
}
