import type { ContentData, WorldData } from './schema';
import contentJson from './content.json';
import worldJson from './world.json';

/**
 * Os JSON são importados como dados literais e reafirmados nos tipos do schema.
 * O `tsc --noEmit` do build valida o formato dos campos escalares; o que ele não
 * cobre (id de zona sem seção correspondente, por exemplo) é checado pelo
 * `scripts/verify-content.mjs` no CI.
 */
export const content = contentJson as ContentData;
export const world = worldJson as WorldData;

export const sectionById = new Map(content.sections.map((section) => [section.id, section]));
