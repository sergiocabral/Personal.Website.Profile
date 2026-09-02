import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link as RouterLink } from 'react-router';
import { content } from '../data';
import { text } from '../data/derive';
import { pick } from '../i18n/locale';
import { t } from '../i18n/ui';
import { useGameStore, useLocale } from '../store/gameStore';
import { getIcon } from '../ui/icons';
import { LinkList } from '../ui/LinkList';
import { Markdown } from '../ui/markdown';
import { Seo } from '../ui/Seo';
import avatar from '../assets/profile-primary.jpg';

/**
 * Versão em texto do site: o mesmo conteúdo do mundo 3D, em HTML semântico.
 *
 * É pré-renderizada em `dist/info/index.html`, então é o que os buscadores e os
 * leitores de tela consomem — o mundo 3D nunca é pré-requisito para ler nada.
 */
export function InfoPage() {
  const locale = useLocale();
  const setLocale = useGameStore((state) => state.setLocale);
  const { profile } = content;

  return (
    <main className="info">
      <Seo
        title={pick(profile.seo.title, locale)}
        description={pick(profile.seo.description, locale)}
        path="/info/"
      />

      <div className="info__inner frame">
        <header className="info__header">
          <img className="info__avatar" src={avatar} alt="" width={88} height={88} />
          <div>
            <h1>{profile.name}</h1>
            <p>{pick(profile.role, locale)}</p>
          </div>
          <div className="hud__controls" style={{ marginInlineStart: 'auto' }}>
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
          <RouterLink className="info__cta" to="/">
            {t('backToGame', locale)}
          </RouterLink>
        </footer>
      </div>
    </main>
  );
}
