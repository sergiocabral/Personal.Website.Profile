/**
 * Verifica se os links do site ainda respondem.
 *
 * Existe porque três deles ficaram fora do ar sem ninguém perceber — dois
 * projetos e o primeiro item da lista de contatos. Um link quebrado num cartão
 * de visita é pior que um link ausente: quem clica e cai em erro passa a
 * duvidar do resto da página.
 *
 * Fica fora do CI de propósito. Depende da internet, de serviços de terceiros e
 * de quem não gosta de robô, então falharia por motivos que nada têm a ver com
 * o código. Rode de vez em quando, à mão: npm run check:links
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const content = JSON.parse(
  readFileSync(resolve(here, '..', 'src', 'data', 'content.json'), 'utf8'),
);

/**
 * Códigos que significam "o endereço existe", ainda que a resposta não seja 200.
 *
 * 403 e 999 são recusas a robôs — o LinkedIn e o Stack Exchange respondem assim
 * para qualquer coisa que não pareça um navegador, e o link funciona para uma
 * pessoa. 429 é limite de requisições.
 */
const ALIVE = new Set([200, 201, 202, 204, 301, 302, 303, 307, 308, 403, 405, 429, 999]);

const TIMEOUT = 15_000;

async function check(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // Sem isto, boa parte dos serviços devolve 403 para qualquer requisição.
        'User-Agent':
          'Mozilla/5.0 (compatible; sergiocabral.dev link checker; +https://sergiocabral.dev/)',
      },
    });
    return { status: response.status, alive: ALIVE.has(response.status) };
  } catch (error) {
    return {
      status: error.name === 'AbortError' ? 'tempo esgotado' : 'sem resposta',
      alive: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

const targets = [];
for (const section of content.sections) {
  for (const link of section.links) {
    // mailto: não tem o que verificar por rede.
    if (link.url.startsWith('https://')) {
      targets.push({ section: section.id, name: link.name, url: link.url });
    }
  }
}

console.log(`verificando ${targets.length} links…\n`);

const results = await Promise.all(
  targets.map(async (target) => ({ ...target, ...(await check(target.url)) })),
);

const broken = results.filter((result) => !result.alive);

for (const result of results) {
  const mark = result.alive ? '  ok  ' : '  ??  ';
  console.log(`${mark} ${String(result.status).padEnd(14)} ${result.section}/${result.name}`);
}

if (broken.length > 0) {
  console.log(`\n${broken.length} link(s) sem resposta:\n`);
  for (const result of broken) {
    console.log(`  ${result.section} → "${result.name}"`);
    console.log(`    ${result.url}  (${result.status})`);
  }
  console.log('\nUm serviço fora do ar momentaneamente também cai aqui: confira antes de remover.');
  process.exit(1);
}

console.log('\ntodos os links responderam.');
