import type { Locale } from '../data/schema';

/**
 * Strings da interface — as que não vêm de `content.json` porque descrevem o jogo,
 * não o Sergio.
 */
export const UI = {
  loading: { 'pt-BR': 'Carregando o mundo…', en: 'Loading the world…' },
  enterWorld: { 'pt-BR': 'Entrar no mundo', en: 'Enter the world' },
  skipGame: { 'pt-BR': 'Pular o jogo', en: 'Skip the game' },
  backToGame: { 'pt-BR': 'Voltar para o jogo', en: 'Back to the game' },
  interactKey: { 'pt-BR': 'Pressione E para conversar', en: 'Press E to talk' },
  interactTouch: { 'pt-BR': 'Toque para conversar', en: 'Tap to talk' },
  close: { 'pt-BR': 'Fechar', en: 'Close' },
  moveHint: {
    'pt-BR': 'Use WASD ou as setas para andar',
    en: 'Use WASD or the arrow keys to walk',
  },
  moveHintTouch: {
    'pt-BR': 'Arraste o controle para andar',
    en: 'Drag the stick to walk',
  },
  language: { 'pt-BR': 'Idioma', en: 'Language' },
  openLink: { 'pt-BR': 'abrir em nova aba', en: 'open in a new tab' },
  noWebgl: {
    'pt-BR': 'Seu navegador não conseguiu iniciar o 3D. Veja a versão em texto.',
    en: 'Your browser could not start 3D. Here is the text version.',
  },
  infoTitle: { 'pt-BR': 'Todas as informações', en: 'Everything in one page' },
  infoIntro: {
    'pt-BR': 'Esta é a versão em texto do site, com o mesmo conteúdo do mundo 3D.',
    en: 'This is the text version of the site, with the same content as the 3D world.',
  },
  notFound: { 'pt-BR': 'Página não encontrada', en: 'Page not found' },
  notFoundBody: {
    'pt-BR': 'Você saiu do mapa. Não tem nada por aqui.',
    en: 'You wandered off the map. There is nothing here.',
  },
  goHome: { 'pt-BR': 'Voltar ao início', en: 'Go home' },
  credits: { 'pt-BR': 'Créditos', en: 'Credits' },
} as const;

export type UiKey = keyof typeof UI;

export function t(key: UiKey, locale: Locale): string {
  const entry = UI[key];
  return entry[locale] || entry['pt-BR'];
}
