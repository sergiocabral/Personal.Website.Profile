import { Suspense, lazy, useState } from 'react';
import { Link } from 'react-router';
import { content } from '../data';
import { pick } from '../i18n/locale';
import { t } from '../i18n/ui';
import type { Locale } from '../data/schema';
import { useLocale } from '../store/gameStore';
import { Dialog } from '../ui/Dialog';
import { Hud } from '../ui/Hud';
import { InteractPrompt } from '../ui/InteractPrompt';
import { Joystick } from '../ui/Joystick';
import { Seo } from '../ui/Seo';

/**
 * A cena 3D entra por importação dinâmica.
 *
 * Além de manter o three.js fora do carregamento inicial, isso garante que ela
 * nunca seja avaliada durante o pré-render, onde não existe `window`.
 */
const Game = lazy(() => import('../game/Game').then((module) => ({ default: module.Game })));

/**
 * O navegador consegue rodar WebGL?
 *
 * O contexto de teste é descartado explicitamente. Navegadores permitem um
 * número pequeno de contextos WebGL simultâneos e, ao estourar o limite,
 * derrubam o mais antigo — que seria justamente o do jogo. Sem este descarte, o
 * mundo aparecia e sumia depois de alguns recarregamentos.
 */
function hasWebgl(): boolean {
  try {
    if (!window.WebGLRenderingContext) return false;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!context) return false;

    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

export function GamePage() {
  const locale = useLocale();

  // Avaliado uma vez, no primeiro render do cliente. Um efeito com setState
  // provocaria um render extra sem ganho nenhum: o suporte a WebGL não muda.
  const [degraded] = useState(() => !hasWebgl());
  const [touch] = useState(isTouchDevice);

  return (
    <div className="game">
      <Seo
        title={pick(content.profile.seo.title, locale)}
        description={pick(content.profile.seo.description, locale)}
        path="/"
      />

      {/* Conteúdo mínimo para quem chega sem executar o canvas. */}
      <h1 className="visually-hidden">
        {content.profile.name} — {pick(content.profile.role, locale)}
      </h1>

      {degraded ? (
        <div className="notfound">
          <div className="notfound__panel frame">
            <h1>{content.profile.name}</h1>
            <p>{t('noWebgl', locale)}</p>
            <Link className="info__cta" to="/info">
              {t('skipGame', locale)}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <Suspense fallback={<Loading locale={locale} />}>
            <Game />
          </Suspense>

          <Hud />
          <InteractPrompt />
          {touch ? <Joystick /> : null}
          <Dialog />
        </>
      )}
    </div>
  );
}

function Loading({ locale }: { locale: Locale }) {
  return (
    <div className="loading">
      <span className="loading__label">{t('loading', locale)}</span>
      <div className="loading__bar">
        <div className="loading__fill" style={{ width: '45%' }} />
      </div>
    </div>
  );
}
