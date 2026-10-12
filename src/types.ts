export interface Team {
  id: string
  name: string
  color: string
}

export interface Match {
  id: string
  homeId: string
  awayId: string
  homeScore: number
  awayScore: number
  createdAt: number
}

export interface QuickTeam {
  id: string
  name: string
  color: string
}

export interface GoalEvent {
  teamId: string
  minute: number
  timestamp: number
}

export interface QuickGameRecord {
  id: string
  teamAId: string
  teamBId: string
  scoreA: number
  scoreB: number
  winnerId: string | null
  loserId: string | null
  isDraw: boolean
  oldTeamLeft: boolean
  forcedRest: boolean
  duration: number
  goals: GoalEvent[]
  createdAt: number
}

export interface QuickState {
  teams: QuickTeam[]
  playingIds: [string, string]
  waitingId: string
  oldTeamId: string
  goals: GoalEvent[]
  timerSeconds: number
  isRunning: boolean
  history: QuickGameRecord[]
  streaks: Record<string, number>
}
