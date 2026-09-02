import { Link } from 'react-router';
import { content } from '../data';
import { pick } from '../i18n/locale';
import { t } from '../i18n/ui';
import { useLocale } from '../store/gameStore';
import { Seo } from '../ui/Seo';

export function NotFoundPage() {
  const locale = useLocale();

  return (
    <main className="notfound">
      <Seo
        title={`404 — ${content.profile.name}`}
        description={pick(content.profile.seo.description, locale)}
        path="/404.html"
      />
      <div className="notfound__panel frame">
        <h1>404</h1>
        <p>{t('notFound', locale)}</p>
        <p>{t('notFoundBody', locale)}</p>
        <Link className="info__cta" to="/">
          {t('goHome', locale)}
        </Link>
      </div>
    </main>
  );
}
