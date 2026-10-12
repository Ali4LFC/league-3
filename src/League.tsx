import { useMemo, useState } from 'react'
import { useLocalStorage, uid } from './store'
import type { Team, Match } from './types'

const COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7',
  '#ec4899', '#06b6d4', '#f97316', '#8b5cf6', '#14b8a6'
]

interface Standing {
  team: Team
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

function computeStandings(teams: Team[], matches: Match[]): Standing[] {
  const map = new Map<string, Standing>()
  for (const t of teams) {
    map.set(t.id, {
      team: t, played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, points: 0
    })
  }
  for (const m of matches) {
    const h = map.get(m.homeId)
    const a = map.get(m.awayId)
    if (!h || !a) continue
    h.played++; a.played++
    h.goalsFor += m.homeScore; h.goalsAgainst += m.awayScore
    a.goalsFor += m.awayScore; a.goalsAgainst += m.homeScore
    if (m.homeScore > m.awayScore) { h.won++; a.lost++; h.points += 3 }
    else if (m.homeScore < m.awayScore) { a.won++; h.lost++; a.points += 3 }
    else { h.drawn++; a.drawn++; h.points++; a.points++ }
  }
  return [...map.values()].sort((a, b) =>
    b.points - a.points ||
    (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) ||
    b.goalsFor - a.goalsFor
  )
}

export default function League() {
  const [teams, setTeams] = useLocalStorage<Team[]>('league_teams', [])
  const [matches, setMatches] = useLocalStorage<Match[]>('league_matches', [])
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])

  const [homeId, setHomeId] = useState('')
  const [awayId, setAwayId] = useState('')
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)

  const standings = useMemo(() => computeStandings(teams, matches), [teams, matches])

  const addTeam = () => {
    const name = newName.trim()
    if (!name) return
    setTeams((prev) => [...prev, { id: uid(), name, color: newColor }])
    setNewName('')
  }

  const removeTeam = (id: string) => {
    if (!confirm('Удалить команду? Матчи с ней тоже удалятся.')) return
    setTeams((prev) => prev.filter((t) => t.id !== id))
    setMatches((prev) => prev.filter((m) => m.homeId !== id && m.awayId !== id))
  }

  const addMatch = () => {
    if (!homeId || !awayId || homeId === awayId) return
    setMatches((prev) => [
      ...prev,
      { id: uid(), homeId, awayId, homeScore, awayScore, createdAt: Date.now() }
    ])
    setHomeId(''); setAwayId('')
    setHomeScore(0); setAwayScore(0)
  }

  const removeMatch = (id: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== id))
  }

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? '?'
  const teamColor = (id: string) => teams.find((t) => t.id === id)?.color ?? '#666'

  return (
    <div className="p-4 space-y-8">
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display font-black text-xl text-ink tracking-tightest">Команды</h2>
          <span className="text-[10px] uppercase tracking-wider text-muted">{teams.length} шт</span>
        </div>
        <div className="flex gap-0 border-2 border-line">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTeam()}
            placeholder="Название команды"
            className="flex-1 px-3 py-3 bg-surface text-ink outline-none text-sm border-r-2 border-line focus:bg-charcoal transition-colors"
          />
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-12 h-12 cursor-pointer bg-surface border-r-2 border-line"
          />
          <button onClick={addTeam} className="px-5 bg-lime text-charcoal font-black text-2xl">
            +
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {teams.map((t) => (
            <div key={t.id} className="flex items-center gap-2 bento pl-3 pr-1 py-1.5 animate-slide-in-left">
              <span className="w-2.5 h-2.5" style={{ background: t.color }} />
              <span className="text-sm font-bold text-ink">{t.name}</span>
              <button onClick={() => removeTeam(t.id)} className="w-5 h-5 bg-charcoal hover:bg-crimson text-[10px] text-muted hover:text-white transition-colors">
                ✕
              </button>
            </div>
          ))}
          {teams.length === 0 && <p className="text-muted text-sm">Добавь хотя бы 2 команды</p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display font-black text-xl text-ink tracking-tightest">Новый матч</h2>
        {teams.length >= 2 ? (
          <div className="bento p-4 space-y-4">
            <div className="flex items-center gap-2">
              <select value={homeId} onChange={(e) => setHomeId(e.target.value)}
                className="flex-1 px-2 py-2.5 bg-charcoal text-ink outline-none text-sm border border-line focus:border-lime transition-colors">
                <option value="">Команда 1</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div className="flex items-center gap-1">
                <button onClick={() => setHomeScore((s) => Math.max(0, s - 1))}
                  className="w-8 h-8 border-2 border-line text-ink font-black text-lg hover:bg-line transition-colors">−</button>
                <span key={homeScore} className="w-7 text-center font-display font-black text-2xl animate-pop text-ink tabular-nums">{homeScore}</span>
                <button onClick={() => setHomeScore((s) => s + 1)}
                  className="w-8 h-8 border-2 border-line text-ink font-black text-lg hover:bg-line transition-colors">+</button>
              </div>
              <span className="font-display font-black text-xl text-muted">:</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setAwayScore((s) => Math.max(0, s - 1))}
                  className="w-8 h-8 border-2 border-line text-ink font-black text-lg hover:bg-line transition-colors">−</button>
                <span key={awayScore} className="w-7 text-center font-display font-black text-2xl animate-pop text-ink tabular-nums">{awayScore}</span>
                <button onClick={() => setAwayScore((s) => s + 1)}
                  className="w-8 h-8 border-2 border-line text-ink font-black text-lg hover:bg-line transition-colors">+</button>
              </div>
              <select value={awayId} onChange={(e) => setAwayId(e.target.value)}
                className="flex-1 px-2 py-2.5 bg-charcoal text-ink outline-none text-sm border border-line focus:border-lime transition-colors">
                <option value="">Команда 2</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <button onClick={addMatch}
              disabled={!homeId || !awayId || homeId === awayId}
              className="w-full py-3.5 bg-lime text-charcoal disabled:bg-surface disabled:text-muted font-black uppercase tracking-wide text-sm transition-all">
              Записать результат
            </button>
          </div>
        ) : (
          <p className="text-muted text-sm">Нужно минимум 2 команды</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display font-black text-xl text-ink tracking-tightest">Таблица</h2>
        {standings.length > 0 ? (
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
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, i) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-muted text-sm">Пока нет данных</p>
        )}
      </section>

      {matches.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display font-black text-xl text-ink tracking-tightest">Результаты</h2>
            <span className="text-[10px] uppercase tracking-wider text-muted">{matches.length} матчей</span>
          </div>
          <div className="space-y-1.5">
            {[...matches].reverse().map((m) => (
              <div key={m.id} className="flex items-center justify-between bento p-3.5 animate-slide-up">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="w-2.5 h-2.5 flex-shrink-0" style={{ background: teamColor(m.homeId) }} />
                  <span className="font-bold text-ink truncate text-sm">{teamName(m.homeId)}</span>
                </div>
                <span className="font-display font-black text-xl px-3 text-ink tabular-nums">{m.homeScore} : {m.awayScore}</span>
                <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                  <span className="font-bold text-ink truncate text-sm">{teamName(m.awayId)}</span>
                  <span className="w-2.5 h-2.5 flex-shrink-0" style={{ background: teamColor(m.awayId) }} />
                </div>
                <button onClick={() => removeMatch(m.id)}
                  className="ml-2 w-6 h-6 bg-charcoal hover:bg-crimson text-[10px] text-muted hover:text-white flex-shrink-0 transition-colors">✕</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
