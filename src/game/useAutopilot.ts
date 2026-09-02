import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { world } from '../data';
import { useGameStore } from '../store/gameStore';
import {
  ARRIVING_TIME,
  type AutopilotState,
  LEAVING_TIME,
  READING_TIME,
  STUCK_TIMEOUT,
  initialState,
  nextTarget,
  reachedWaypoint,
  routeTo,
  steer,
} from './autopilot';
import { SCREEN_FORWARD, SCREEN_RIGHT } from './constants';
import type { InputState } from './input/useInput';
import type { PlayerRef } from './Player';

/**
 * Liga o piloto automático ao loop de animação.
 *
 * O piloto escreve no mesmo objeto de input que o teclado e o joystick usam.
 * Isso mantém o personagem sem saber quem o está controlando: para ele, é tudo
 * a mesma coisa, e a física, a colisão e as animações continuam iguais.
 */
export function useAutopilot(
  position: React.RefObject<PlayerRef>,
  input: React.RefObject<InputState>,
) {
  const state = useRef<AutopilotState>(initialState());

  // Para detectar quando o personagem trava contra um obstáculo.
  const lastProgress = useRef({ x: 0, z: 0, at: 0 });

  useFrame((frame, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const store = useGameStore.getState();

    if (!store.auto) {
      state.current = initialState();
      return;
    }

    const current = state.current;
    current.elapsed += delta;

    switch (current.phase) {
      case 'leaving': {
        // Enquanto espera, fica parado.
        input.current.x = 0;
        input.current.y = 0;

        if (current.elapsed < LEAVING_TIME) return;

        const zone = nextTarget(current, world);
        if (!zone) return;

        current.targetId = zone.sectionId;
        current.route = routeTo(position.current, zone, world);
        current.phase = 'travelling';
        current.elapsed = 0;
        lastProgress.current = {
          x: position.current.x,
          z: position.current.z,
          at: frame.clock.elapsedTime,
        };
        return;
      }

      case 'travelling': {
        const waypoint = current.route[0];
        if (!waypoint) {
          current.phase = 'arriving';
          current.elapsed = 0;
          return;
        }

        if (reachedWaypoint(position.current, waypoint)) {
          current.route.shift();
          if (current.route.length === 0) {
            current.phase = 'arriving';
            current.elapsed = 0;
            input.current.x = 0;
            input.current.y = 0;
          }
          return;
        }

        const direction = steer(position.current, waypoint, SCREEN_RIGHT, SCREEN_FORWARD);
        input.current.x = direction.x;
        input.current.y = direction.y;

        // Preso contra alguma coisa: abandona este destino em vez de empurrar a
        // parede indefinidamente.
        const moved = Math.hypot(
          position.current.x - lastProgress.current.x,
          position.current.z - lastProgress.current.z,
        );
        if (moved > 0.5) {
          lastProgress.current = {
            x: position.current.x,
            z: position.current.z,
            at: frame.clock.elapsedTime,
          };
        } else if (frame.clock.elapsedTime - lastProgress.current.at > STUCK_TIMEOUT) {
          giveUp(current);
        }
        return;
      }

      case 'arriving': {
        input.current.x = 0;
        input.current.y = 0;

        if (current.elapsed < ARRIVING_TIME) return;

        // Só abre se o gatilho da zona realmente disparou: se o piloto parou
        // fora do alcance, prefere desistir a abrir um diálogo do nada.
        if (store.activeZone && store.activeZone === current.targetId) {
          store.open(store.activeZone);
          current.phase = 'reading';
          current.elapsed = 0;
        } else {
          giveUp(current);
        }
        return;
      }

      case 'reading': {
        input.current.x = 0;
        input.current.y = 0;

        // Se o diálogo sumiu (o visitante fechou), retoma o passeio.
        if (!store.openDialog) {
          giveUp(current);
          return;
        }

        if (current.elapsed < READING_TIME) return;

        store.close();
        if (current.targetId && !current.seen.includes(current.targetId)) {
          current.seen.push(current.targetId);
        }
        // Ciclo completo: recomeça a lista para o passeio continuar indefinidamente.
        if (current.seen.length >= world.zones.length) current.seen = [];

        current.phase = 'leaving';
        current.elapsed = 0;
        return;
      }
    }
  });
}

function giveUp(state: AutopilotState) {
  if (state.targetId && !state.seen.includes(state.targetId)) {
    state.seen.push(state.targetId);
  }
  state.phase = 'leaving';
  state.elapsed = 0;
  state.route = [];
}
