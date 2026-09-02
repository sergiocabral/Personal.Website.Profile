import { Route, Routes } from 'react-router';
import { GamePage } from './pages/GamePage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * As rotas do site.
 *
 * A raiz é a página de informações, não o jogo: quem chega quer os contatos e
 * os links, e nem todo visitante tem paciência, banda ou dispositivo para um
 * mundo 3D. O jogo fica a um clique de distância, para quem quiser.
 *
 * Estas rotas estão espelhadas em `scripts/prerender.mjs`.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/game" element={<GamePage />} />
      {/* A rota antiga continua funcionando: pode haver links por aí. */}
      <Route path="/info" element={<HomePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
