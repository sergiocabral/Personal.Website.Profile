import type { Locale, Localized } from '../data/schema';
import { LOCALES } from '../data/schema';

const STORAGE_KEY = 'sc.locale';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Idioma inicial: preferência salva, senão o do navegador, senão pt-BR.
 * Roda também durante o pré-render (sem `window`), daí as guardas.
 */
export function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'pt-BR';

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    // localStorage bloqueado (janela anônima, cookies desativados): segue no fluxo.
  }

  const preferred = window.navigator.languages ?? [window.navigator.language];
  return preferred.some((tag) => tag.toLowerCase().startsWith('pt')) ? 'pt-BR' : 'en';
}

export function persistLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Sem persistência é aceitável: o idioma volta a ser detectado na próxima visita.
  }
}

/** Resolve um texto localizado, caindo para pt-BR se a tradução faltar. */
export function pick(text: Localized, locale: Locale): string {
  return text[locale] || text['pt-BR'];
}
