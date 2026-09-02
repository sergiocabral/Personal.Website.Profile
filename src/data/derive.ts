import type { Locale, Localized } from './schema';
import { content } from './index';
import { pick } from '../i18n/locale';

/**
 * Valores que envelhecem sozinhos.
 *
 * A bio antiga trazia a idade escrita à mão, o que obrigava a lembrar de editar
 * o site todo ano — e de fato já estava desatualizada quando cheguei. Tudo que
 * depende do calendário passa por aqui: o dado guarda um ano, e o número é
 * calculado na hora de exibir.
 *
 * Guardamos o ano de nascimento, e não a data completa, de propósito: só a
 * idade deve ser pública. A data exata nunca entra no conteúdo, então não há
 * como ela vazar para o HTML nem para o bundle.
 */

/** Idade a partir do ano de nascimento. */
export function ageFromYear(birthYear: number, today = new Date()): number {
  return today.getFullYear() - birthYear;
}

/** Anos completos desde um ano de início. */
export function yearsSince(year: number, today = new Date()): number {
  return today.getFullYear() - year;
}

/** Substitui os marcadores dinâmicos suportados no texto do conteúdo. */
export function interpolate(text: string): string {
  const { profile } = content;

  return text
    .replace('{age}', String(ageFromYear(profile.birthYear)))
    .replace('{codingYears}', String(yearsSince(profile.codingSince)))
    .replace('{teachingYears}', String(yearsSince(profile.teachingSince)));
}

/** URL de doação com o idioma atual no caminho. */
export function donateUrl(baseUrl: string, locale: Locale): string {
  const suffix = locale === 'pt-BR' ? 'pt' : 'en';
  return new URL(suffix, baseUrl).toString();
}

/** Localiza e interpola de uma vez — o caminho usado por toda a interface. */
export function text(value: Localized, locale: Locale): string {
  return interpolate(pick(value, locale));
}
