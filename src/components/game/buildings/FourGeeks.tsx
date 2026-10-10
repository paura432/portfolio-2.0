"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { getDistrict } from "@/data/districts";
import { PAVED_AREAS } from "@/data/world";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { palette } from "@/lib/palette";
import { useGameStore } from "@/stores/gameStore";
import { SignPanel } from "../DistrictSigns";
import { getMaterials } from "../materials";
import { StaticBatch } from "../StaticBatch";

import { WindowGrid } from "./WindowGrid";

/**
 * 4GEEKS — AI Engineering Campus (V5).
 * A three-storey hall (glazed ground floor, window band, cantilevered top
 * floor, data mast with violet rings) on a paved research plaza, with four
 * laboratory pavilions taken from the district's plots. Violet is the campus
 * accent and appears only on emitters. Front faces +Z (south, toward the spur).
 */
const PLAZA = PAVED_AREAS.find((a) => a.id === "fourgeeks-plaza")!;

const HALL = { front: 5, g1: 3.6, f2: 3.3, f3: 3.0 };

/** Static geometry of the hall (merged into the campus batch). */
function Hall({ x, z }: { x: number; z: number }) {
  const m = getMaterials();
  const { front, g1, f2, f3 } = HALL;
  return (
    <group position={[x, 0, z]}>
        {/* Plinth and steps */}
        <mesh position={[0, 0.12, 0.3]} material={m.concrete} receiveShadow>
          <boxGeometry args={[12.4, 0.24, 10.6]} />
        </mesh>
        <mesh position={[0, 0.1, front + 0.9]} material={m.concreteLight} receiveShadow>
          <boxGeometry args={[5.2, 0.2, 1.4]} />
        </mesh>
        {/* Ground floor: glazed atrium behind slim pillars */}
        <mesh position={[0, 0.24 + g1 / 2, 0]} material={m.glassViolet} castShadow receiveShadow>
          <boxGeometry args={[11.2, g1, 9.2]} />
        </mesh>
        {[-5.2, -3.1, 3.1, 5.2].map((px) => (
          <mesh key={px} position={[px, 0.24 + g1 / 2, front - 0.25]} material={m.concreteLight} castShadow>
            <boxGeometry args={[0.36, g1, 0.5]} />
          </mesh>
        ))}
        {/* Entrance: lit door, violet light bar over it, lanterns on the pylons */}
        <mesh position={[0, 0.24 + 1.4, front - 0.33]} material={m.doorViolet}>
          <planeGeometry args={[2.2, 2.7]} />
        </mesh>
        <mesh position={[0, 0.24 + 3.15, front - 0.3]} material={m.lightViolet}>
          <boxGeometry args={[3.0, 0.08, 0.1]} />
        </mesh>
        {[-2.6, 2.6].map((px) => (
          <group key={px}>
            <mesh position={[px, 1.4, front + 1.2]} material={m.metalDark} castShadow>
              <boxGeometry args={[0.18, 2.8, 0.18]} />
            </mesh>
            <mesh position={[px, 2.9, front + 1.2]} material={m.lightWarm}>
              <boxGeometry args={[0.3, 0.16, 0.3]} />
            </mesh>
          </group>
        ))}
        {/* Floor slab with overhang */}
        <mesh position={[0, 0.24 + g1 + 0.15, 0.2]} material={m.concrete} castShadow receiveShadow>
          <boxGeometry args={[12.4, 0.3, 10.4]} />
        </mesh>
        {/* Second floor: solid band with cool windows */}
        <mesh position={[0, 0.54 + g1 + f2 / 2, 0]} material={m.facadeLight} castShadow receiveShadow>
          <boxGeometry args={[11.6, f2, 9.6]} />
        </mesh>
        <WindowGrid position={[0, 0.54 + g1 + f2 / 2, front - 0.18]} rotationY={0} cols={7} rows={1} size={[1.1, 1.4]} gap={[1.55, 1]} lit={palette.windowCool} ratio={0.75} seed={51} />
        <WindowGrid position={[-5.82, 0.54 + g1 + f2 / 2, 0]} rotationY={-Math.PI / 2} cols={5} rows={1} size={[1.0, 1.3]} gap={[1.7, 1]} lit={palette.windowCool} ratio={0.6} seed={52} />
        <WindowGrid position={[5.82, 0.54 + g1 + f2 / 2, 0]} rotationY={Math.PI / 2} cols={5} rows={1} size={[1.0, 1.3]} gap={[1.7, 1]} lit={palette.windowCool} ratio={0.6} seed={53} />
        {/* Third floor: cantilevered toward the plaza, violet underside strip, sign plate face */}
        <mesh position={[0, 0.54 + g1 + f2 + 0.15, 0.5]} material={m.concreteLight} castShadow>
          <boxGeometry args={[12.0, 0.3, 10.8]} />
        </mesh>
        <mesh position={[0, 0.84 + g1 + f2 + f3 / 2, 0.5]} material={m.facade} castShadow receiveShadow>
          <boxGeometry args={[11.0, f3, 10.0]} />
        </mesh>
        <mesh position={[0, 0.54 + g1 + f2 + 0.02, front + 0.85]} material={m.lightVioletSoft}>
          <boxGeometry args={[10.0, 0.06, 0.12]} />
        </mesh>
        <WindowGrid position={[0, 0.84 + g1 + f2 + f3 / 2 + 0.55, front + 0.52]} rotationY={0} cols={6} rows={1} size={[1.2, 0.9]} gap={[1.7, 1]} lit={palette.windowWarm} ratio={0.8} seed={56} />
        <WindowGrid position={[-5.52, 0.84 + g1 + f2 + f3 / 2, 0.5]} rotationY={-Math.PI / 2} cols={4} rows={1} size={[1.2, 1.2]} gap={[2.0, 1]} lit={palette.windowWarm} ratio={0.7} seed={54} />
        <WindowGrid position={[5.52, 0.84 + g1 + f2 + f3 / 2, 0.5]} rotationY={Math.PI / 2} cols={4} rows={1} size={[1.2, 1.2]} gap={[2.0, 1]} lit={palette.windowWarm} ratio={0.7} seed={55} />
        {/* Roof: parapet, plant box and the data mast base */}
        <mesh position={[0, 0.84 + g1 + f2 + f3 + 0.2, 0.5]} material={m.concrete}>
          <boxGeometry args={[11.4, 0.4, 10.4]} />
        </mesh>
        <mesh position={[3.2, 0.84 + g1 + f2 + f3 + 0.9, -2.0]} material={m.metalDark} castShadow>
          <boxGeometry args={[2.2, 1.0, 1.6]} />
        </mesh>
        <mesh position={[-3.4, 0.84 + g1 + f2 + f3 + 2.4, -2.5]} material={m.metalDark} castShadow>
          <cylinderGeometry args={[0.12, 0.16, 4.8, 8]} />
        </mesh>
        {/* Atrium core: a lit column visible through the glass */}
        <mesh position={[0, 0.24 + g1 / 2, -1.5]} material={m.lightVioletSoft}>
          <cylinderGeometry args={[0.4, 0.4, g1 - 0.1, 8]} />
        </mesh>
    </group>
  );
}

/** Data mast rings on the hall roof (animated, outside the batch). */
function HallMast({ x, z }: { x: number; z: number }) {
  const m = getMaterials();
  const mast = useRef<Group>(null);
  const ambientMotion = QUALITY_PROFILES[useGameStore((s) => s.quality)].ambientMotion;
  useFrame(({ clock }, delta) => {
    if (!ambientMotion || !mast.current) return;
    mast.current.rotation.y += delta * 0.35;
    mast.current.position.y = 11.6 + Math.sin(clock.elapsedTime * 0.8) * 0.08;
  });
  return (
    <group position={[x, 0, z]}>
      <group ref={mast} position={[-3.4, 11.6, -2.5]}>
        {[0, 0.7, 1.4].map((ry, i) => (
          <mesh key={ry} position={[0, ry, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.lightViolet}>
            <torusGeometry args={[0.9 - i * 0.25, 0.05, 6, 20]} />
          </mesh>
        ))}
        <mesh position={[0, 2.0, 0]} material={m.lightViolet}>
          <sphereGeometry args={[0.18, 8, 8]} />
        </mesh>
      </group>
    </group>
  );
}

/** Paved research plaza across the whole campus front, with light paths, bollards, planters and benches. */
function Plaza() {
  const m = getMaterials();
  const w = PLAZA.x1 - PLAZA.x0;
  const d = PLAZA.z1 - PLAZA.z0;
  const cx = (PLAZA.x0 + PLAZA.x1) / 2;
  const cz = (PLAZA.z0 + PLAZA.z1) / 2;
  const campus = getDistrict("fourgeeks");
  return (
    <group>
        <mesh position={[cx, 0.05, cz]} material={m.sidewalk} receiveShadow>
          <boxGeometry args={[w, 0.1, d]} />
        </mesh>
        {/* Violet guide line along the plaza and light paths to each lab entrance */}
        <mesh position={[cx, 0.105, PLAZA.z1 - 0.8]} material={m.lightVioletSoft}>
          <boxGeometry args={[w - 2, 0.02, 0.12]} />
        </mesh>
        {(campus.plots ?? []).map((p) => {
          if (!p.entrance) return null;
          const [ex, ez] = p.entrance;
          const lineZ = PLAZA.z1 - 0.8;
          // Corner labs face west: their path runs along X to the plaza line's end; the row labs run along Z.
          const horizontal = Math.abs(ez - lineZ) > 2.5;
          return horizontal ? (
            <mesh key={p.id} position={[(ex + PLAZA.x1 - 1) / 2, 0.105, ez]} material={m.lightVioletSoft}>
              <boxGeometry args={[Math.abs(PLAZA.x1 - 1 - ex), 0.02, 0.12]} />
            </mesh>
          ) : (
            <mesh key={p.id} position={[ex, 0.105, (ez + lineZ) / 2]} material={m.lightVioletSoft}>
              <boxGeometry args={[0.12, 0.02, Math.abs(ez - lineZ)]} />
            </mesh>
          );
        })}
        {/* Bollards with violet caps along the ring-road edge, planters and benches between the labs */}
        {[16, 24, 36, 44, 52].map((bx) => (
          <group key={bx} position={[bx, 0, PLAZA.z1 - 0.4]}>
            <mesh position={[0, 0.45, 0]} material={m.metalDark} castShadow>
              <cylinderGeometry args={[0.1, 0.12, 0.9, 8]} />
            </mesh>
            <mesh position={[0, 0.93, 0]} material={m.lightViolet}>
              <cylinderGeometry args={[0.1, 0.1, 0.06, 8]} />
            </mesh>
          </group>
        ))}
        {[21.5, 38.5].map((px) => (
          <group key={px} position={[px, 0, PLAZA.z0 + 1.6]}>
            <mesh position={[0, 0.38, 0]} material={m.planter} castShadow receiveShadow>
              <boxGeometry args={[2.4, 0.56, 1.4]} />
            </mesh>
            <mesh position={[-0.5, 0.95, 0]} material={m.bush} castShadow>
              <dodecahedronGeometry args={[0.6, 0]} />
            </mesh>
            <mesh position={[0.6, 0.9, 0.1]} material={m.bush} castShadow>
              <dodecahedronGeometry args={[0.5, 0]} />
            </mesh>
          </group>
        ))}
        {[21.5, 38.5].map((px) => (
          <group key={px} position={[px, 0, PLAZA.z0 + 3.4]}>
            <mesh position={[0, 0.46, 0]} material={m.metal} castShadow>
              <boxGeometry args={[1.7, 0.08, 0.5]} />
            </mesh>
            <mesh position={[0, 0.72, -0.22]} material={m.metal}>
              <boxGeometry args={[1.7, 0.42, 0.06]} />
            </mesh>
            <mesh position={[0, 0.2, 0]} material={m.metalDark}>
              <boxGeometry args={[1.4, 0.4, 0.36]} />
            </mesh>
          </group>
        ))}
    </group>
  );
}

/** Lab 01 — TrackFlow: a logistics shed with a dock, containers, a parked van and an inventory screen. */
function LabTrackFlow({ x, z }: { x: number; z: number }) {
  const m = getMaterials();
  // Plot 8 × 10 (z −62…−52): shed at the back, dock + yard at the front, entrance on the plaza.
  const shedD = 6.6;
  const shedZ = -5 + shedD / 2; // −1.7 (back of the plot)
  const shedH = 4.2;
  const dockZ = shedZ + shedD / 2 + 0.8;
  return (
    <group position={[x, 0, z]}>
        <mesh position={[0, 0.06, 0]} material={m.concrete} receiveShadow>
          <boxGeometry args={[8.4, 0.12, 10.4]} />
        </mesh>
        {/* Shed with ribbed facade, flat roof, two ridge ventilators and a corner beacon */}
        <mesh position={[0, 0.12 + shedH / 2, shedZ]} material={m.facade} castShadow receiveShadow>
          <boxGeometry args={[7.6, shedH, shedD]} />
        </mesh>
        {[-3.0, -1.5, 1.5, 3.0].map((px) => (
          <mesh key={px} position={[px, 0.12 + shedH / 2, shedZ + shedD / 2 + 0.05]} material={m.facadeDark}>
            <boxGeometry args={[0.24, shedH, 0.1]} />
          </mesh>
        ))}
        <mesh position={[0, 0.12 + shedH + 0.15, shedZ]} material={m.concreteLight} castShadow>
          <boxGeometry args={[7.9, 0.3, shedD + 0.3]} />
        </mesh>
        {[-1.6, 1.6].map((vx) => (
          <mesh key={vx} position={[vx, 0.12 + shedH + 0.7, shedZ - 0.5]} material={m.metalDark} castShadow>
            <boxGeometry args={[1.2, 0.8, 1.2]} />
          </mesh>
        ))}
        <mesh position={[3.4, 0.12 + shedH + 1.2, shedZ - 2.6]} material={m.metalDark}>
          <boxGeometry args={[0.1, 2.0, 0.1]} />
        </mesh>
        <mesh position={[3.4, 0.12 + shedH + 2.3, shedZ - 2.6]} material={m.lightAmber}>
          <sphereGeometry args={[0.18, 8, 8]} />
        </mesh>
        {/* Clerestory band and the conceptual inventory screen on the front */}
        <WindowGrid position={[0, 0.12 + shedH - 0.7, shedZ + shedD / 2 + 0.02]} rotationY={0} cols={5} rows={1} size={[1.0, 0.5]} gap={[1.45, 1]} lit={palette.windowWarm} ratio={0.8} seed={61} />
        <mesh position={[-2.3, 1.9, shedZ + shedD / 2 + 0.06]} material={m.metalDark}>
          <boxGeometry args={[1.9, 1.15, 0.1]} />
        </mesh>
        <mesh position={[-2.3, 1.9, shedZ + shedD / 2 + 0.12]} material={m.lightVioletSoft}>
          <planeGeometry args={[1.7, 0.95]} />
        </mesh>
        {/* Dock: raised platform, roller shutter, canopy, hazard edge, flow chevrons on the yard */}
        <mesh position={[1.4, 0.55, dockZ]} material={m.concrete} castShadow receiveShadow>
          <boxGeometry args={[4.4, 1.1, 1.6]} />
        </mesh>
        <mesh position={[1.4, 2.5, shedZ + shedD / 2 - 0.04]} material={m.shutter}>
          <boxGeometry args={[2.6, 2.8, 0.1]} />
        </mesh>
        {[1.6, 2.2, 2.8, 3.4].map((sy) => (
          <mesh key={sy} position={[1.4, sy, shedZ + shedD / 2 + 0.02]} material={m.metal}>
            <boxGeometry args={[2.4, 0.06, 0.02]} />
          </mesh>
        ))}
        <mesh position={[1.4, 3.95, dockZ]} material={m.metalDark} castShadow>
          <boxGeometry args={[3.2, 0.14, 1.8]} />
        </mesh>
        <mesh position={[1.4, 3.86, dockZ + 0.85]} material={m.lightAmberSoft}>
          <boxGeometry args={[2.8, 0.04, 0.08]} />
        </mesh>
        <mesh position={[1.4, 1.12, dockZ + 0.82]} material={m.hazard}>
          <boxGeometry args={[4.4, 0.1, 0.06]} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[1.4, 0.13, dockZ + 1.6 + i * 0.9]} rotation={[-Math.PI / 2, 0, 0]} material={m.hazard}>
            <planeGeometry args={[0.9, 0.18]} />
          </mesh>
        ))}
        {/* Containers (one stacked pair) at the west of the yard */}
        <mesh position={[-2.6, 1.1, dockZ + 1.5]} material={m.carBodyDark} castShadow receiveShadow>
          <boxGeometry args={[2.2, 2.2, 2.6]} />
        </mesh>
        <mesh position={[-2.6, 3.2, dockZ + 1.3]} material={m.metalDark} castShadow>
          <boxGeometry args={[2.2, 1.9, 2.2]} />
        </mesh>
        {/* Stylised delivery van parked at the east end of the yard */}
        <group position={[2.6, 0, dockZ + 2.4]}>
          <mesh position={[0, 0.95, 0]} material={m.concreteLight} castShadow>
            <boxGeometry args={[1.5, 1.4, 2.6]} />
          </mesh>
          <mesh position={[0, 0.8, 1.6]} material={m.carBody} castShadow>
            <boxGeometry args={[1.5, 1.1, 0.7]} />
          </mesh>
          <mesh position={[0, 1.2, 1.3]} material={m.carGlass}>
            <boxGeometry args={[1.3, 0.5, 0.1]} />
          </mesh>
          {[-0.65, 0.65].flatMap((wx) =>
            [0.9, -0.9].map((wz) => (
              <mesh key={`${wx}${wz}`} position={[wx, 0.32, wz]} rotation={[0, 0, Math.PI / 2]} material={m.tire}>
                <cylinderGeometry args={[0.3, 0.3, 0.26, 10]} />
              </mesh>
            )),
          )}
        </group>
    </group>
  );
}

/** Small facade plaque for a lab (single-sided, on a plate). */
function LabPlaque({ code, title, position, rotationY = 0 }: { code: string; title: string; position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <SignPanel title={title} subtitle={code} accent={palette.violet} width={2.4} height={0.62} compact />
    </group>
  );
}

/** Lab 02 — Financial Dashboard: a glazed analytics box with a 3D bar-chart crown and a data screen. */
function LabFinancial({ x, z }: { x: number; z: number }) {
  const m = getMaterials();
  const h = 5.2;
  const front = 3.5; // volume 7 × 7 inside the 8 × 10 plot, set back from the plaza
  const bars = [1.0, 1.6, 1.3, 2.2, 1.8, 2.6];
  return (
    <group position={[x, 0, z]}>
        <mesh position={[0, 0.06, 0]} material={m.concrete} receiveShadow>
          <boxGeometry args={[8.4, 0.12, 10.4]} />
        </mesh>
        {/* Glass volume with a concrete frame */}
        <mesh position={[0, 0.12 + h / 2, -1.0]} material={m.glass} castShadow receiveShadow>
          <boxGeometry args={[6.6, h, 6.6]} />
        </mesh>
        {[[-3.4, -4.4], [3.4, -4.4], [-3.4, 2.4], [3.4, 2.4]].map(([cx, cz], i) => (
          <mesh key={i} position={[cx!, 0.12 + h / 2, cz!]} material={m.concreteLight} castShadow>
            <boxGeometry args={[0.4, h, 0.4]} />
          </mesh>
        ))}
        <mesh position={[0, 0.12 + h + 0.2, -1.0]} material={m.concrete} castShadow>
          <boxGeometry args={[7.4, 0.4, 7.4]} />
        </mesh>
        <mesh position={[0, 0.12 + h + 0.42, front - 1.3]} material={m.lightVioletSoft}>
          <boxGeometry args={[6.6, 0.05, 0.1]} />
        </mesh>
        {/* Floor slab seen through the glass and a lit core */}
        <mesh position={[0, 0.12 + h / 2, -1.0]} material={m.concreteLight}>
          <boxGeometry args={[6.4, 0.2, 6.4]} />
        </mesh>
        <mesh position={[-1.4, 0.12 + h / 2, -2.0]} material={m.lightCyanSoft}>
          <boxGeometry args={[0.5, h - 0.4, 0.5]} />
        </mesh>
        {/* Bar-chart crown on the roof */}
        {bars.map((bh, i) => (
          <mesh key={i} position={[-2.5 + i * 1.0, 0.12 + h + 0.4 + bh / 2, -2.2]} material={i % 2 ? m.lightVioletSoft : m.lightCyanSoft} castShadow>
            <boxGeometry args={[0.6, bh, 0.6]} />
          </mesh>
        ))}
        {/* Front screen panel and entrance */}
        <mesh position={[1.9, 2.3, front - 1.3 + 0.06]} material={m.metalDark}>
          <boxGeometry args={[2.4, 1.4, 0.1]} />
        </mesh>
        <mesh position={[1.9, 2.3, front - 1.3 + 0.12]} material={m.lightVioletSoft}>
          <planeGeometry args={[2.2, 1.2]} />
        </mesh>
        {[-0.8, -0.3, 0.2, 0.7].map((bx, i) => (
          <mesh key={bx} position={[1.9 + bx, 1.95 + (0.25 + i * 0.12), front - 1.3 + 0.14]} material={m.metalDark}>
            <boxGeometry args={[0.3, 0.5 + i * 0.24, 0.02]} />
          </mesh>
        ))}
        <mesh position={[-1.6, 1.35, front - 1.3 + 0.08]} material={m.doorCool}>
          <planeGeometry args={[1.6, 2.5]} />
        </mesh>
        <mesh position={[-1.6, 2.85, front - 0.7]} material={m.concreteLight} castShadow>
          <boxGeometry args={[2.6, 0.16, 1.4]} />
        </mesh>
        <mesh position={[0, 0.1, front - 0.2]} material={m.concreteLight} receiveShadow>
          <boxGeometry args={[6.0, 0.2, 2.2]} />
        </mesh>
    </group>
  );
}

/** Lab 03 — Back-office: an operations block with a server core, pipe rack, stack and status LEDs. Entrance faces west. */
function LabBackOffice({ x, z }: { x: number; z: number }) {
  const m = getMaterials();
  const h = 4.6;
  const west = -4; // plot 8 × 8; entrance side x = −4
  return (
    <group position={[x, 0, z]}>
        <mesh position={[0, 0.06, 0]} material={m.concrete} receiveShadow>
          <boxGeometry args={[8.4, 0.12, 8.4]} />
        </mesh>
        {/* Main block, dark, with a lighter service annex at the back; the west face holds a recessed server bay */}
        <mesh position={[1.2, 0.12 + h / 2, 0]} material={m.facadeDark} castShadow receiveShadow>
          <boxGeometry args={[5.6, h, 7.0]} />
        </mesh>
        <mesh position={[2.6, 0.12 + 1.6, -1.0]} material={m.facadeLight} castShadow receiveShadow>
          <boxGeometry args={[2.4, 3.2, 4.6]} />
        </mesh>
        {/* Server core: fins in front of the block, behind a glass band, with status LEDs */}
        <mesh position={[west + 1.0, 0.12 + 2.3, 0.6]} material={m.facadeDark} castShadow>
          <boxGeometry args={[0.3, h - 0.4, 0.3]} />
        </mesh>
        <mesh position={[west + 1.0, 0.12 + 2.3, 3.0]} material={m.facadeDark} castShadow>
          <boxGeometry args={[0.3, h - 0.4, 0.3]} />
        </mesh>
        <mesh position={[west + 1.0, 0.12 + 4.15, 1.8]} material={m.concreteLight} castShadow>
          <boxGeometry args={[0.5, 0.3, 2.9]} />
        </mesh>
        <mesh position={[west + 1.02, 0.12 + 2.0, 1.8]} material={m.glass}>
          <boxGeometry args={[0.08, 3.6, 2.4]} />
        </mesh>
        {[-0.8, -0.4, 0, 0.4, 0.8].map((fz) => (
          <mesh key={fz} position={[west + 1.7, 0.12 + 1.9, 1.8 + fz]} material={m.metal} castShadow>
            <boxGeometry args={[1.0, 3.2, 0.22]} />
          </mesh>
        ))}
        {[-0.8, -0.4, 0, 0.4, 0.8].map((fz, i) => (
          <mesh key={fz} position={[west + 1.18, 0.12 + 3.3, 1.8 + fz]} material={i === 3 ? m.lightAmber : m.lightCyan}>
            <boxGeometry args={[0.04, 0.08, 0.12]} />
          </mesh>
        ))}
        {/* Entrance on the west face, canopy and a systems panel */}
        <mesh position={[west + 2.38, 1.35, -2.0]} rotation={[0, -Math.PI / 2, 0]} material={m.doorWarm}>
          <planeGeometry args={[1.4, 2.5]} />
        </mesh>
        <mesh position={[west + 1.8, 2.85, -2.0]} material={m.metalDark} castShadow>
          <boxGeometry args={[1.4, 0.14, 2.2]} />
        </mesh>
        <mesh position={[west + 2.42, 3.6, -0.3]} material={m.metalDark}>
          <boxGeometry args={[0.1, 0.8, 1.6]} />
        </mesh>
        <mesh position={[west + 2.36, 3.6, -0.3]} material={m.lightVioletSoft}>
          <boxGeometry args={[0.02, 0.12, 1.3]} />
        </mesh>
        {/* Pipe rack and exhaust stack on the roof */}
        {[-0.5, 0.0].map((py) => (
          <mesh key={py} position={[0.6, 0.12 + h + 0.45 + py * 0.6, 2.2]} rotation={[0, 0, Math.PI / 2]} material={m.metal}>
            <cylinderGeometry args={[0.12, 0.12, 6.0, 8]} />
          </mesh>
        ))}
        <mesh position={[2.2, 0.12 + h + 1.4, -2.2]} material={m.metalDark} castShadow>
          <cylinderGeometry args={[0.35, 0.4, 2.8, 10]} />
        </mesh>
        <mesh position={[-1.4, 0.12 + h + 0.5, -1.6]} material={m.metalDark} castShadow>
          <boxGeometry args={[1.6, 1.0, 1.6]} />
        </mesh>
        <mesh position={[-1.4, 0.12 + h + 1.03, -1.6]} material={m.metal}>
          <cylinderGeometry args={[0.55, 0.55, 0.08, 12]} />
        </mesh>
        {/* Apron toward the plaza */}
        <mesh position={[west + 1.0, 0.1, -2.0]} material={m.concreteLight} receiveShadow>
          <boxGeometry args={[2.4, 0.2, 3.0]} />
        </mesh>
    </group>
  );
}

/** Lab 04 — AI Workflow: a glass automation pavilion with five nodes linked by a travelling light pulse. Entrance faces west. */
function LabWorkflow({ x, z }: { x: number; z: number }) {
  const m = getMaterials();
  const west = -4; // plot 8 × 6
  const nodes = [-2.2, -1.1, 0, 1.1, 2.2];
  return (
    <group position={[x, 0, z]}>
        <mesh position={[0, 0.06, 0]} material={m.concrete} receiveShadow>
          <boxGeometry args={[8.4, 0.12, 6.4]} />
        </mesh>
        {/* Glass pavilion with a concrete roof and a violet eave strip */}
        <mesh position={[1.0, 0.12 + 1.6, 0]} material={m.glassViolet} castShadow receiveShadow>
          <boxGeometry args={[5.6, 3.2, 5.2]} />
        </mesh>
        {[[-1.7, -2.5], [3.7, -2.5], [-1.7, 2.5], [3.7, 2.5]].map(([cx, cz], i) => (
          <mesh key={i} position={[cx!, 0.12 + 1.6, cz!]} material={m.metalDark} castShadow>
            <boxGeometry args={[0.24, 3.2, 0.24]} />
          </mesh>
        ))}
        <mesh position={[1.0, 0.12 + 3.35, 0]} material={m.concreteLight} castShadow>
          <boxGeometry args={[6.4, 0.3, 6.0]} />
        </mesh>
        <mesh position={[west + 1.9, 0.12 + 3.18, 0]} material={m.lightVioletSoft}>
          <boxGeometry args={[0.1, 0.05, 5.6]} />
        </mesh>
        {/* Node pylons along the west apron, linked by a light rail */}
        {nodes.map((nz) => (
          <group key={nz} position={[west + 0.9, 0, nz]}>
            <mesh position={[0, 0.7, 0]} material={m.metalDark} castShadow>
              <boxGeometry args={[0.16, 1.4, 0.16]} />
            </mesh>
            <mesh position={[0, 1.5, 0]} material={m.lightViolet}>
              <octahedronGeometry args={[0.18, 0]} />
            </mesh>
          </group>
        ))}
        <mesh position={[west + 0.9, 1.5, 0]} material={m.lightVioletSoft}>
          <boxGeometry args={[0.04, 0.04, 4.4]} />
        </mesh>
        {/* Consoles inside the pavilion (angled screens) */}
        {[-1.2, 1.2].map((cz) => (
          <group key={cz} position={[0.4, 0, cz]}>
            <mesh position={[0, 0.5, 0]} material={m.metalDark} castShadow>
              <boxGeometry args={[0.9, 1.0, 0.6]} />
            </mesh>
            <mesh position={[-0.2, 1.1, 0]} rotation={[0, 0, 0.5]} material={m.lightCyanSoft}>
              <boxGeometry args={[0.6, 0.04, 0.5]} />
            </mesh>
          </group>
        ))}
        {/* Entrance on the west face */}
        <mesh position={[west + 2.19, 1.3, 1.4]} rotation={[0, -Math.PI / 2, 0]} material={m.doorViolet}>
          <planeGeometry args={[1.0, 2.4]} />
        </mesh>
    </group>
  );
}

/** Pulse travelling along the Lab 04 node rail (animated, outside the batch). */
function WorkflowPulse({ x, z }: { x: number; z: number }) {
  const m = getMaterials();
  const pulse = useRef<Group>(null);
  const ambientMotion = QUALITY_PROFILES[useGameStore((s) => s.quality)].ambientMotion;
  useFrame(({ clock }) => {
    if (!ambientMotion || !pulse.current) return;
    const p = (clock.elapsedTime * 0.35) % 1;
    pulse.current.position.z = -2.2 + p * 4.4;
    pulse.current.scale.setScalar(0.8 + 0.4 * Math.sin(p * Math.PI));
  });
  return (
    <group position={[x, 0, z]}>
      <group ref={pulse} position={[-4 + 0.9, 1.5, -2.2]}>
        <mesh material={m.lightViolet}>
          <sphereGeometry args={[0.12, 8, 8]} />
        </mesh>
      </group>
    </group>
  );
}

export function FourGeeks() {
  const d = getDistrict("fourgeeks");
  const plot = (id: string) => (d.plots ?? []).find((p) => p.id === id)!;
  const trackflow = plot("trackflow");
  const financial = plot("financial-dashboard");
  const backoffice = plot("back-office");
  const workflow = plot("ai-workflow");
  return (
    <group>
      {/* One batch for the whole campus: ~25 materials → ~25 draw calls instead of one batch per building */}
      <StaticBatch>
        <Plaza />
        <Hall x={d.position[0]} z={d.position[1]} />
        <LabTrackFlow x={trackflow.position[0]} z={trackflow.position[1]} />
        <LabFinancial x={financial.position[0]} z={financial.position[1]} />
        <LabBackOffice x={backoffice.position[0]} z={backoffice.position[1]} />
        <LabWorkflow x={workflow.position[0]} z={workflow.position[1]} />
      </StaticBatch>
      {/* Animated parts and label plaques stay outside the batch */}
      <HallMast x={d.position[0]} z={d.position[1]} />
      <WorkflowPulse x={workflow.position[0]} z={workflow.position[1]} />
      <group position={[trackflow.position[0], 0, trackflow.position[1]]}>
        <LabPlaque code="Lab 01" title="TrackFlow" position={[-2.3, 2.95, -1.7 + 3.3 + 0.08]} />
      </group>
      <group position={[financial.position[0], 0, financial.position[1]]}>
        <LabPlaque code="Lab 02" title="Financial Dashboard" position={[1.9, 3.6, 3.5 - 1.3 + 0.08]} />
      </group>
      <group position={[backoffice.position[0], 0, backoffice.position[1]]}>
        <LabPlaque code="Lab 03" title="Back-office" position={[-4 + 2.34, 4.0, -2.0]} rotationY={-Math.PI / 2} />
      </group>
      <group position={[workflow.position[0], 0, workflow.position[1]]}>
        <LabPlaque code="Lab 04" title="AI Workflow" position={[-4 + 2.14, 2.6, -1.0]} rotationY={-Math.PI / 2} />
      </group>
    </group>
  );
}
