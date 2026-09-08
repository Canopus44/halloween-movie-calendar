import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CalendarPage from './pages/CalendarPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/calendar" element={<CalendarPage />} />
    </Routes>
  );
}
