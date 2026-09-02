import { content } from '../data';

/**
 * Meta tags da rota atual.
 *
 * O React 19 iça `<title>` e `<meta>` para o `<head>` sozinho, então não há
 * necessidade de react-helmet. No HTML pré-renderizado essas mesmas tags são
 * escritas por `scripts/prerender.mjs`, que lê o mesmo `content.json` — quem
 * chega pelo crawler e quem navega pelo SPA veem os mesmos valores.
 */
export function Seo({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  const { profile } = content;
  const canonical = new URL(path, profile.url).toString();
  const ogImage = new URL(profile.seo.ogImage, profile.url).toString();

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={profile.siteName} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </>
  );
}
