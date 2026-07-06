import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Lobby } from './pages/Lobby'
import { TicTacToe } from './pages/TicTacToe'
import { BazaarDraft } from './pages/BazaarDraft'
import { ConsentMatch } from './pages/ConsentMatch'
import { ChargerDuel } from './pages/ChargerDuel'
import { HeistCoop } from './pages/HeistCoop'
import { StrategyFootball } from './pages/StrategyFootball'
import { Notary } from './pages/Notary'
import { Wedding } from './pages/Wedding'
import { Arena } from './pages/Arena'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/play/ttt" element={<TicTacToe />} />
        <Route path="/play/shop" element={<BazaarDraft />} />
        <Route path="/play/love" element={<ConsentMatch />} />
        <Route path="/play/ev" element={<ChargerDuel />} />
        <Route path="/play/heist" element={<HeistCoop />} />
        <Route path="/play/football" element={<StrategyFootball />} />
        <Route path="/play/notary" element={<Notary />} />
        <Route path="/play/wedding" element={<Wedding />} />
        <Route path="/play/arena" element={<Arena />} />
      </Routes>
    </BrowserRouter>
  )
}
