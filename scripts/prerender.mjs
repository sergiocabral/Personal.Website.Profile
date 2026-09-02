/**
 * Pré-renderização estática, executada depois do `vite build`.
 *
 * O objetivo é que um crawler ou um leitor de tela nunca receba um `<div id="root">`
 * vazio: `/` sai com o cabeçalho e o link para o conteúdo, e `/info/` sai com os
 * 21 links em HTML de verdade.
 *
 * A abordagem é deliberadamente simples — montar as strings a partir do mesmo
 * `content.json` que a aplicação usa, sem renderizar React em Node. Renderizar a
 * árvore exigiria um segundo build SSR e traria o risco de alguém importar a
 * cena 3D por engano, e `@react-three/fiber` toca `window` já no import.
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dist = resolve(root, 'dist');

const content = JSON.parse(readFileSync(resolve(root, 'src/data/content.json'), 'utf8'));
const template = readFileSync(resolve(dist, 'index.html'), 'utf8');

const { profile } = content;

const escape = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Mesmo cálculo de `src/data/derive.ts`, para o HTML estático não divergir da app. */
function age(birthDate, today = new Date()) {
  const born = new Date(birthDate);
  let years = today.getFullYear() - born.getFullYear();
  const hadBirthday =
    today.getMonth() > born.getMonth() ||
    (today.getMonth() === born.getMonth() && today.getDate() >= born.getDate());
  return hadBirthday ? years : years - 1;
}

const interpolate = (text) => text.replace('{age}', String(age(profile.birthDate)));

/** Micro-markdown, espelhando `src/ui/markdown.tsx`. */
function markdown(text) {
  return text
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.trim())
    .map((paragraph) => {
      const html = escape(paragraph.trim())
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>');
      return `<p>${html}</p>`;
    })
    .join('\n');
}

function head({ title, description, path }) {
  const canonical = new URL(path, profile.url).toString();
  const ogImage = new URL(profile.seo.ogImage, profile.url).toString();

  // JSON-LD com `sameAs`: é como o Google liga este site aos perfis externos.
  const sameAs = content.sections
    .flatMap((section) => section.links)
    .map((link) => link.url)
    .filter((url) => url.startsWith('https://'));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.role['pt-BR'],
    url: profile.url,
    image: ogImage,
    sameAs,
  };

  return `
    <title>${escape(title)}</title>
    <meta name="description" content="${escape(description)}" />
    <link rel="canonical" href="${escape(canonical)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escape(profile.siteName)}" />
    <meta property="og:title" content="${escape(title)}" />
    <meta property="og:description" content="${escape(description)}" />
    <meta property="og:url" content="${escape(canonical)}" />
    <meta property="og:image" content="${escape(ogImage)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escape(title)}" />
    <meta name="twitter:description" content="${escape(description)}" />
    <meta name="twitter:image" content="${escape(ogImage)}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
}

function linkList(links) {
  if (links.length === 0) return '';

  const items = links
    .map((link) => {
      const external = !link.url.startsWith('mailto:');
      const rel = external ? ' target="_blank" rel="noopener noreferrer"' : '';
      const description = link.description
        ? `<span class="links__desc">${escape(link.description['pt-BR'])}</span>`
        : '';

      return `<li class="links__item"><a href="${escape(link.url)}"${rel}><span class="links__text"><span class="links__name">${escape(link.name)}</span>${description}</span></a></li>`;
    })
    .join('\n');

  return `<ul class="links">\n${items}\n</ul>`;
}

function infoBody() {
  const sections = content.sections
    .map((section) => {
      const body = section.dialog.body
        ? `<div class="dialog__prose">${markdown(interpolate(section.dialog.body['pt-BR']))}</div>`
        : '';

      return `<section class="info__section">
  <h2>${escape(section.label['pt-BR'])}</h2>
  ${body}
  ${linkList(section.links)}
</section>`;
    })
    .join('\n');

  return `<main class="info"><div class="info__inner frame">
  <header class="info__header">
    <div>
      <h1>${escape(profile.name)}</h1>
      <p>${escape(profile.role['pt-BR'])}</p>
    </div>
  </header>
  ${sections}
  <footer class="info__footer">
    <span>${escape(profile.seo.description['pt-BR'])}</span>
    <a class="info__cta" href="/">Voltar para o jogo</a>
  </footer>
</div></main>`;
}

/**
 * Casca da home. O React substitui isto assim que hidrata; até lá, o crawler já
 * tem o nome, o cargo e — o que mais importa — o link para a página completa.
 */
function gameBody() {
  return `<div class="game"><div class="loading">
  <h1 class="visually-hidden">${escape(profile.name)} — ${escape(profile.role['pt-BR'])}</h1>
  <span class="loading__label">Carregando o mundo…</span>
  <div class="loading__bar"><div class="loading__fill"></div></div>
  <noscript><a href="/info/">Ver todo o conteúdo em texto</a></noscript>
</div></div>`;
}

function write(path, { title, description, canonicalPath, body }) {
  const html = template
    .replace('<!--app-head-->', head({ title, description, path: canonicalPath }))
    .replace('<!--app-html-->', body);

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, html);
  console.log(`  ${path.replace(root, '.')}`);
}

console.log('pré-renderizando:');

write(resolve(dist, 'index.html'), {
  title: profile.seo.title['pt-BR'],
  description: profile.seo.description['pt-BR'],
  canonicalPath: '/',
  body: gameBody(),
});

write(resolve(dist, 'info/index.html'), {
  title: `${profile.seo.title['pt-BR']} — Todas as informações`,
  description: profile.seo.description['pt-BR'],
  canonicalPath: '/info/',
  body: infoBody(),
});

// O Pages serve 404.html para qualquer caminho desconhecido. Servindo o /info ali,
// uma URL errada ainda entrega o conteúdo em vez de uma página vazia.
copyFileSync(resolve(dist, 'info/index.html'), resolve(dist, '404.html'));
console.log('  ./dist/404.html');

const urls = ['/', '/info/']
  .map(
    (path) =>
      `  <url><loc>${new URL(path, profile.url).toString()}</loc><changefreq>monthly</changefreq></url>`,
  )
  .join('\n');

writeFileSync(
  resolve(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);
console.log('  ./dist/sitemap.xml');
