# sergiocabral.dev

Site pessoal em forma de mundo isométrico jogável. O visitante controla um
personagem que anda por um pequeno mapa; ao chegar em uma das construções, um
diálogo abre com o conteúdo daquela seção — contatos, redes sociais, projetos e
a bio.

Quem prefere só ler tem [`/info`](https://sergiocabral.dev/info): a mesma
informação em HTML semântico, pré-renderizada, sem WebGL.

## Rodando

```bash
npm install
npm run dev       # http://localhost:5173
```

| script                   | o que faz                                            |
| ------------------------ | ---------------------------------------------------- |
| `npm run dev`            | servidor de desenvolvimento                          |
| `npm run build`          | checa tipos, compila e pré-renderiza o HTML estático |
| `npm run preview`        | serve o `dist/` como em produção                     |
| `npm run verify:content` | valida `content.json` e `world.json`                 |
| `npm run typecheck`      | `tsc --noEmit`                                       |
| `npm run lint`           | ESLint                                               |
| `npm run format`         | Prettier                                             |

## Onde mexer

Quase tudo que se quer mudar no dia a dia está em dois arquivos, e nenhum deles
é código:

**`src/data/content.json`** — o que o site diz. Seções, links, textos da bio e
as traduções pt-BR/en. Adicionar um link é adicionar um objeto aqui.

**`src/data/world.json`** — onde as coisas ficam no mapa. Posição e formato dos
prédios, raios das zonas de gatilho, decoração e colisores.

Eles são separados porque mudam por motivos diferentes: um link novo não mexe no
mapa. A ligação entre os dois é `Section.id` ↔ `Zone.sectionId`, e
`npm run verify:content` reclama se um lado ficar órfão.

A idade citada na bio é calculada a partir de `profile.birthDate` — não escreva
o número à mão.

### Ícones

`src/ui/icons.ts` mantém um registro explícito dos ícones do FontAwesome em uso.
Um ícone novo em `content.json` precisa ser importado ali, senão não aparece.
O registro é explícito de propósito: importar os pacotes inteiros impede o
tree-shaking e custa cerca de 1 MB de bundle.

## Estrutura

```
src/
  data/       content.json, world.json, schema.ts — a fonte da verdade
  game/       cena 3D: câmera, personagem, colisão, prédios, decoração
  ui/         sobreposição HTML: diálogo, HUD, joystick, lista de links
  pages/      GamePage (a home), InfoPage (versão em texto), 404
  i18n/       detecção de idioma e strings da interface
  store/      estado do jogo (zustand)
scripts/
  prerender.mjs        gera o HTML estático depois do build
  verify-content.mjs   valida os dados; roda no CI
```

## Decisões que valem saber

**Sem motor de física.** Rapier somaria cerca de 1 MB de WASM para resolver, num
chão plano sem rampas nem gravidade, o que aqui é um círculo testado contra
algumas caixas. Ver `src/game/collision.ts`.

**Geometria procedural, não modelos baixados.** O estilo fica coeso sem
depender de um artista, o mapa é editável por JSON e nenhum byte de asset 3D
entra no bundle.

**O diálogo é HTML sobre o canvas.** Foco, leitor de tela, seleção de texto e
"abrir em nova aba" nos links não existem dentro de um canvas WebGL.

**A versão em texto não é um plano B.** É o que os buscadores indexam e o que
um leitor de tela percorre. O jogo nunca é pré-requisito para acessar nada.

## Deploy

Push na `main` publica no GitHub Pages via `.github/workflows/deploy.yml`. O
`CNAME` e o `.nojekyll` ficam em `public/`, então o build local produz o mesmo
`dist/` que o CI.
