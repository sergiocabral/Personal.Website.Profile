import { Link } from 'react-router';
import { content } from '../data';
import { pick } from '../i18n/locale';
import { t } from '../i18n/ui';
import { useGameStore, useLocale } from '../store/gameStore';

/** Camada de interface sobre o canvas: identidade, idioma, progresso e dicas. */
export function Hud() {
  const locale = useLocale();
  const setLocale = useGameStore((state) => state.setLocale);
  const visited = useGameStore((state) => state.visited);
  const touch = useGameStore((state) => state.touch);
  const auto = useGameStore((state) => state.auto);
  const dialogOpen = useGameStore((state) => state.openDialog) !== null;

  return (
    <div className="hud">
      <div className="hud__row">
        <div className="hud__identity frame">
          <h1>{content.profile.name}</h1>
          <p>{pick(content.profile.role, locale)}</p>
        </div>

        <div className="hud__controls">
          <button
            type="button"
            className="hud__button"
            aria-pressed={locale === 'pt-BR'}
            aria-label={`${t('language', locale)}: Português`}
            onClick={() => setLocale('pt-BR')}
          >
            PT
          </button>
          <button
            type="button"
            className="hud__button"
            aria-pressed={locale === 'en'}
            aria-label={`${t('language', locale)}: English`}
            onClick={() => setLocale('en')}
          >
            EN
          </button>
          {/* Link real, não botão: o crawler precisa atravessar até o conteúdo. */}
          <Link className="hud__button" to="/info">
            {t('skipGame', locale)}
          </Link>
        </div>
      </div>

      <div className="hud__row" style={{ alignItems: 'center' }}>
        <div className="hud__progress frame" aria-hidden="true">
          {content.sections.map((section) => (
            <span
              key={section.id}
              className={`hud__pip${visited.has(section.id) ? ' hud__pip--done' : ''}`}
            />
          ))}
        </div>

        {dialogOpen ? null : (
          <p className={`hud__hint frame${auto ? ' hud__hint--auto' : ''}`}>
            {auto
              ? t(touch ? 'autoPlayingTouch' : 'autoPlaying', locale)
              : t(touch ? 'moveHintTouch' : 'moveHint', locale)}
          </p>
        )}

        <span style={{ width: '4rem' }} />
      </div>
    </div>
  );
}
