import { Route, Routes } from 'react-router';
import { GamePage } from './pages/GamePage';
import { InfoPage } from './pages/InfoPage';
import { NotFoundPage } from './pages/NotFoundPage';

/** As rotas que o pré-render percorre estão espelhadas em `scripts/prerender.mjs`. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<GamePage />} />
      <Route path="/info" element={<InfoPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
