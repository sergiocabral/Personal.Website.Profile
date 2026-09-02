/**
 * Pré-renderização estática, executada depois do `vite build`.
 *
 * A raiz sai com todo o conteúdo em HTML — os 21 links, a bio, o JSON-LD — e
 * `/game/` sai com a casca do mundo 3D. Assim nenhum visitante, nem o Googlebot,
 * recebe um `<div id="root">` vazio, e o conteúdo nunca depende de WebGL.
 *
 * A abordagem é deliberadamente simples: montar as strings a partir do mesmo
 * `content.json` que a aplicação usa, sem renderizar React em Node. Um segundo
 * build SSR traria o risco de alguém importar a cena 3D por engano, e
 * `@react-three/fiber` toca `window` já no import.
 */

import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dist = resolve(root, 'dist');

const content = JSON.parse(readFileSync(resolve(root, 'src/data/content.json'), 'utf8'));
const template = readFileSync(resolve(dist, 'index.html'), 'utf8');

const { profile } = content;

/*
 * O retrato no HTML estático.
 *
 * Apenas o ícone, que é o primeiro quadro do efeito — a foto entra por cima
 * quando o React assume. Quem vê só o HTML, como um crawler, recebe um retrato
 * parado, que é o suficiente.
 *
 * As imagens são importadas pelo JavaScript e não aparecem no HTML, então o
 * caminho com hash vem da pasta de assets que o Vite acabou de gerar.
 */
const avatarUrl = (() => {
  const file = readdirSync(resolve(dist, 'assets')).find((name) =>
    name.startsWith('profile-secondary-'),
  );

  if (!file) {
    console.warn('  aviso: ícone do retrato não encontrado em dist/assets');
    return profile.seo.ogImage;
  }

  return `/assets/${file}`;
})();

/** Idioma do HTML gerado. O seletor da página troca em tempo de execução. */
const LOCALE = 'pt-BR';

const escape = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Mesmo cálculo de `src/data/derive.ts`, para o HTML estático não divergir da app. */
function age(birthDate, today = new Date()) {
  const born = new Date(birthDate);
  const years = today.getFullYear() - born.getFullYear();
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
    jobTitle: profile.role[LOCALE],
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
        ? `<span class="links__desc">${escape(link.description[LOCALE])}</span>`
        : '';

      return `<li class="links__item"><a href="${escape(link.url)}"${rel}><span class="links__text"><span class="links__name">${escape(link.name)}</span>${description}</span></a></li>`;
    })
    .join('\n');

  return `<ul class="links">\n${items}\n</ul>`;
}

/** A raiz: identidade, convite para o jogo e todo o conteúdo. */
function homeBody() {
  const sections = content.sections
    .map((section) => {
      const body = section.dialog.body
        ? `<div class="dialog__prose">${markdown(interpolate(section.dialog.body[LOCALE]))}</div>`
        : '';

      return `<section class="info__section">
  <h2>${escape(section.label[LOCALE])}</h2>
  ${body}
  ${linkList(section.links)}
</section>`;
    })
    .join('\n');

  return `<main class="info"><div class="info__inner frame">
  <header class="info__header">
    <div class="avatar" style="width:5.5rem;height:5.5rem">
      <img class="avatar__face avatar__face--icon" src="${avatarUrl}" alt="" />
    </div>
    <div class="info__identity">
      <h1>${escape(profile.name)}</h1>
      <p>${escape(profile.role[LOCALE])}</p>
    </div>
  </header>
  <a class="play" href="/game">
    <span class="play__badge" aria-hidden="true">&#9654;</span>
    <span class="play__text"><strong>Jogar</strong><span>Explore tudo isto num mundo 3D</span></span>
  </a>
  ${sections}
  <footer class="info__footer">
    <span>${escape(profile.seo.description[LOCALE])}</span>
    <a class="info__cta" href="/game">Jogar</a>
  </footer>
</div></main>`;
}

/**
 * Casca do jogo. O React a substitui assim que hidrata; até lá, quem chegar já
 * tem o nome e — o que mais importa — o link para a página com o conteúdo.
 */
function gameBody() {
  return `<div class="game"><div class="loading">
  <h1 class="visually-hidden">${escape(profile.name)} — ${escape(profile.role[LOCALE])}</h1>
  <span class="loading__label">Carregando o mundo…</span>
  <div class="loading__bar"><div class="loading__fill"></div></div>
  <noscript><a href="/">Ver todo o conteúdo em texto</a></noscript>
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
  title: profile.seo.title[LOCALE],
  description: profile.seo.description[LOCALE],
  canonicalPath: '/',
  body: homeBody(),
});

write(resolve(dist, 'game/index.html'), {
  title: `${profile.seo.title[LOCALE]} — Mundo 3D`,
  description: profile.seo.description[LOCALE],
  canonicalPath: '/game/',
  body: gameBody(),
});

// A rota antiga continua respondendo: pode haver links para ela por aí.
write(resolve(dist, 'info/index.html'), {
  title: profile.seo.title[LOCALE],
  description: profile.seo.description[LOCALE],
  canonicalPath: '/',
  body: homeBody(),
});

// O Pages serve 404.html para qualquer caminho desconhecido. Servindo a raiz
// ali, uma URL errada ainda entrega o conteúdo em vez de uma página vazia.
copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'));
console.log('  ./dist/404.html');

const urls = ['/', '/game/']
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
