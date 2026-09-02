import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { Link, Locale } from '../data/schema';
import { getIcon } from './icons';
import { pick } from '../i18n/locale';

/**
 * Lista de links compartilhada entre o diálogo do jogo e a página /info.
 * Manter uma implementação só garante que as duas versões nunca divirjam.
 */
export function LinkList({ links, locale }: { links: Link[]; locale: Locale }) {
  if (links.length === 0) return null;

  return (
    <ul className="links">
      {links.map((link) => {
        const icon = getIcon(link.iconStyle, link.icon);
        const external = !link.url.startsWith('mailto:');

        return (
          <li className="links__item" key={link.url}>
            <a
              href={link.url}
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              <span className="links__icon" aria-hidden="true">
                {icon ? <FontAwesomeIcon icon={icon} /> : null}
              </span>
              <span className="links__text">
                <span className="links__name">{link.name}</span>
                {link.description ? (
                  <span className="links__desc">{pick(link.description, locale)}</span>
                ) : null}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
