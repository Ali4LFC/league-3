import { useState } from 'react'
import League from './League'
import QuickGame from './QuickGame'

type Tab = 'quick' | 'league'

export default function App() {
  const [tab, setTab] = useState<Tab>('quick')

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      {/* Header — editorial brutalist */}
      <header className="sticky top-0 z-20 bg-charcoal/90 backdrop-blur border-b-2 border-line">
        <div className="flex items-end justify-between px-4 pt-4 pb-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted font-semibold">Season 25/26</div>
            <h1 className="font-display font-black text-3xl leading-none text-ink/30 tracking-tightest">
              OZMZ Football
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-lime animate-pulse" />
            <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">Live</span>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-28">
        <div key={tab} className="animate-fade-in">
          {tab === 'quick' ? <QuickGame /> : <League />}
        </div>
      </main>

      {/* Bottom nav — brutalist segmented */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-charcoal/95 backdrop-blur border-t-2 border-line px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5">
        <div className="flex gap-1.5 bg-surface border border-line p-1 rounded-none">
          <button
            onClick={() => setTab('quick')}
            className={`flex-1 py-2.5 text-sm font-bold transition-all ${
              tab === 'quick' ? 'bg-lime text-charcoal' : 'text-muted hover:text-ink'
            }`}
          >
            ⚡ Быстрая
          </button>
          <button
            onClick={() => setTab('league')}
            className={`flex-1 py-2.5 text-sm font-bold transition-all ${
              tab === 'league' ? 'bg-lime text-charcoal' : 'text-muted hover:text-ink'
            }`}
          >
            🏆 Лига
          </button>
        </div>
      </nav>
    </div>
  )
}
