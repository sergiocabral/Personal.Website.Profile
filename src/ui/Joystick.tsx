import { useEffect, useRef } from 'react';
import { emitStick } from '../game/input/useInput';
import { useGameStore } from '../store/gameStore';

const MAX_OFFSET = 46;

/**
 * Joystick virtual para toque.
 *
 * É um elemento DOM, não parte da cena 3D: o navegador já sabe rastrear
 * ponteiros, e manter isso fora do canvas evita disputar eventos com ele.
 * O knob é movido por `transform` direto no nó, sem passar pelo estado do React,
 * porque isso roda a cada movimento do dedo.
 */
export function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const setTouch = useGameStore((state) => state.setTouch);

  useEffect(() => {
    const node = base.current;
    if (!node) return;

    const reset = () => {
      pointerId.current = null;
      if (knob.current) knob.current.style.transform = 'translate(0px, 0px)';
      emitStick(0, 0);
    };

    const update = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = event.clientX - centerX;
      let dy = event.clientY - centerY;

      const distance = Math.hypot(dx, dy);
      if (distance > MAX_OFFSET) {
        dx = (dx / distance) * MAX_OFFSET;
        dy = (dy / distance) * MAX_OFFSET;
      }

      if (knob.current) {
        knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
      }

      // Zona morta: sem ela o personagem treme com o dedo parado.
      const magnitude = Math.hypot(dx, dy) / MAX_OFFSET;
      if (magnitude < 0.12) {
        emitStick(0, 0);
        return;
      }

      emitStick(dx / MAX_OFFSET, dy / MAX_OFFSET);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (pointerId.current !== null) return;
      pointerId.current = event.pointerId;
      node.setPointerCapture(event.pointerId);
      setTouch(true);
      update(event);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId.current) return;
      event.preventDefault();
      update(event);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId.current) return;
      reset();
    };

    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('pointermove', onPointerMove);
    node.addEventListener('pointerup', onPointerUp);
    node.addEventListener('pointercancel', onPointerUp);
    node.addEventListener('lostpointercapture', reset);

    return () => {
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerUp);
      node.removeEventListener('pointercancel', onPointerUp);
      node.removeEventListener('lostpointercapture', reset);
      emitStick(0, 0);
    };
  }, [setTouch]);

  return (
    <div className="joystick" ref={base} aria-hidden="true">
      <div className="joystick__knob" ref={knob} />
    </div>
  );
}
