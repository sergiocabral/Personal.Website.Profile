import type { Locale, Localized } from './schema';
import { content } from './index';
import { pick } from '../i18n/locale';

/**
 * Valores que envelhecem sozinhos.
 *
 * A bio antiga trazia a idade escrita à mão, o que obrigava a lembrar de editar
 * o site todo aniversário — e de fato já estava desatualizada quando cheguei.
 * Tudo que depende do calendário passa por aqui: o dado guarda a data, e o
 * número é calculado na hora de exibir.
 */

/** Idade em anos completos. */
export function ageFrom(birthDate: string, today = new Date()): number {
  const born = new Date(birthDate);
  let age = today.getFullYear() - born.getFullYear();

  const hadBirthday =
    today.getMonth() > born.getMonth() ||
    (today.getMonth() === born.getMonth() && today.getDate() >= born.getDate());

  if (!hadBirthday) age -= 1;
  return age;
}

/** Anos completos desde um ano de início. */
export function yearsSince(year: number, today = new Date()): number {
  return today.getFullYear() - year;
}

/** Substitui os marcadores dinâmicos suportados no texto do conteúdo. */
export function interpolate(text: string): string {
  const { profile } = content;

  return text
    .replace('{age}', String(ageFrom(profile.birthDate)))
    .replace('{codingYears}', String(yearsSince(profile.codingSince)))
    .replace('{teachingYears}', String(yearsSince(profile.teachingSince)));
}

/** Localiza e interpola de uma vez — o caminho usado por toda a interface. */
export function text(value: Localized, locale: Locale): string {
  return interpolate(pick(value, locale));
}
