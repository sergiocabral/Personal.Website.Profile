import { sectionById } from '../data';
import { pick } from '../i18n/locale';
import { t } from '../i18n/ui';
import { useGameStore, useLocale } from '../store/gameStore';

/** Convite para interagir, exibido enquanto o personagem está dentro de uma zona. */
export function InteractPrompt() {
  const activeZone = useGameStore((state) => state.activeZone);
  const openDialog = useGameStore((state) => state.openDialog);
  const open = useGameStore((state) => state.open);
  const touch = useGameStore((state) => state.touch);
  const locale = useLocale();

  if (!activeZone || openDialog) return null;

  const section = sectionById.get(activeZone);
  if (!section) return null;

  return (
    <button type="button" className="prompt frame" onClick={() => open(activeZone)}>
      <span className="prompt__key" aria-hidden="true">
        {touch ? '☝' : 'E'}
      </span>
      <span>
        {t(touch ? 'interactTouch' : 'interactKey', locale)} — {pick(section.label, locale)}
      </span>
    </button>
  );
}
