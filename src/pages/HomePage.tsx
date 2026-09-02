import { faHandHoldingHeart } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link as RouterLink } from 'react-router';
import { content } from '../data';
import { text } from '../data/derive';
import type { Locale } from '../data/schema';
import { pick } from '../i18n/locale';
import { t } from '../i18n/ui';
import { useGameStore, useLocale } from '../store/gameStore';
import { getIcon } from '../ui/icons';
import { LinkList } from '../ui/LinkList';
import { Markdown } from '../ui/markdown';
import { RotatingAvatar } from '../ui/RotatingAvatar';
import { Seo } from '../ui/Seo';

/**
 * A página inicial: todo o conteúdo em HTML semântico.
 *
 * É a raiz do site, e não o jogo, porque é isto que a maioria dos visitantes
 * veio buscar — um contato, um link, saber quem é a pessoa. É também o que os
 * buscadores indexam e o que um leitor de tela percorre, sem depender de WebGL.
 *
 * O mundo 3D fica a um clique, em destaque, para quem tiver vontade.
 */
export function HomePage() {
  const locale = useLocale();
  const setLocale = useGameStore((state) => state.setLocale);
  const { profile } = content;

  return (
    <main className="info">
      <Seo
        title={pick(profile.seo.title, locale)}
        description={pick(profile.seo.description, locale)}
        path="/"
      />

      <div className="info__inner frame">
        <header className="info__header">
          <RotatingAvatar size="5.5rem" />
          <div className="info__identity">
            <h1>{profile.name}</h1>
            <p>{pick(profile.role, locale)}</p>
          </div>
          <div className="info__lang">
            <button
              type="button"
              className="hud__button"
              aria-pressed={locale === 'pt-BR'}
              onClick={() => setLocale('pt-BR')}
            >
              PT
            </button>
            <button
              type="button"
              className="hud__button"
              aria-pressed={locale === 'en'}
              onClick={() => setLocale('en')}
            >
              EN
            </button>
          </div>
        </header>

        {/* Convite para o jogo, logo abaixo da identidade: quem quiser explorar
            encontra sem procurar, e quem só quer os links segue rolando. */}
        <RouterLink className="play" to="/game">
          <span className="play__badge" aria-hidden="true">
            ▶
          </span>
          <span className="play__text">
            <strong>{t('play', locale)}</strong>
            <span>{t('playSubtitle', locale)}</span>
          </span>
        </RouterLink>

        <Donate locale={locale} />

        {content.sections.map((section) => {
          const icon = getIcon(section.iconStyle, section.icon);

          return (
            <section className="info__section" key={section.id}>
              <h2>
                {icon ? <FontAwesomeIcon icon={icon} aria-hidden="true" /> : null}
                {pick(section.label, locale)}
              </h2>

              {section.dialog.body ? (
                <Markdown className="dialog__prose" text={text(section.dialog.body, locale)} />
              ) : null}

              <LinkList links={section.links} locale={locale} />
            </section>
          );
        })}

        <footer className="info__footer">
          <span>{pick(profile.seo.description, locale)}</span>
          <RouterLink className="info__cta" to="/game">
            {t('play', locale)}
          </RouterLink>
        </footer>
      </div>
    </main>
  );
}

/**
 * Destaque de apoio financeiro.
 *
 * Fica ao lado do convite para o jogo, com estilo próprio para não competir com
 * ele: o jogo é a ação principal, a doação é um convite. Os selos de Pix e
 * cartão respondem de imediato à pergunta "como eu pago?", que é o que costuma
 * travar quem quer contribuir.
 */
function Donate({ locale }: { locale: Locale }) {
  const { donate } = content.profile;
  const pix = getIcon('brands', 'pix');
  const card = getIcon('solid', 'credit-card');

  return (
    <a className="donate" href={donate.url} target="_blank" rel="noopener noreferrer">
      <span className="donate__icon" aria-hidden="true">
        <FontAwesomeIcon icon={faHandHoldingHeart} />
      </span>
      <span className="donate__text">
        <strong>{pick(donate.title, locale)}</strong>
        <span>{pick(donate.subtitle, locale)}</span>
      </span>
      <span className="donate__methods" aria-label={pick(donate.methods, locale)}>
        {pix ? (
          <span className="donate__method">
            <FontAwesomeIcon icon={pix} aria-hidden="true" /> Pix
          </span>
        ) : null}
        {card ? (
          <span className="donate__method">
            <FontAwesomeIcon icon={card} aria-hidden="true" />
          </span>
        ) : null}
      </span>
    </a>
  );
}
