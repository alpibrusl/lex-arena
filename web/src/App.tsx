import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Lobby } from './pages/Lobby'
import { TicTacToe } from './pages/TicTacToe'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/play/ttt" element={<TicTacToe />} />
      </Routes>
    </BrowserRouter>
  )
}
