import { Navigate, Route, Routes } from 'react-router-dom'
import Create from './pages/Create'
import Join from './pages/Join'
import Landing from './pages/Landing'
import Table from './pages/Table'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/masa-kur" element={<Create />} />
      <Route path="/katil/:code?" element={<Join />} />
      <Route path="/masa/:code" element={<Table />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
