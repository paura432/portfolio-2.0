"use client";

import { useMemo } from "react";
import { ExtrudeGeometry, Shape } from "three";
import { getDistrict } from "@/data/districts";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { palette } from "@/lib/palette";
import { useGameStore } from "@/stores/gameStore";
import { getMaterials } from "../materials";
import { WindowGrid } from "./WindowGrid";

/** Sawtooth roof module: right triangle profile extruded along the hall depth. */
function sawtooth(width: number, height: number, depth: number): ExtrudeGeometry {
  const s = new Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(width / 2, height);
  s.closePath();
  const g = new ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}

/**
 * DUPLEX — "Industrial Intelligence Lab".
 * A modular industrial hall (pilasters, clerestory band, sawtooth roof with
 * amber glazing, roof plant) joined to a tall lift tower with a lit shaft and
 * a machine room under an amber beacon. Catwalk along the front, loading dock
 * on the east side, technical entrance with canopy. Front face is +Z (south).
 */
export function Duplex() {
  const m = getMaterials();
  const d = getDistrict("duplex");
  const [w, depth] = d.footprint; // 14 × 12
  const [x, z] = d.position;
  const quality = useGameStore((s) => s.quality);
  const profile = QUALITY_PROFILES[quality];
  const hallH = 6.4;
  const front = depth / 2; // +6
  const towerX = 5.0;
  const towerW = 3.4;
  const roof = useMemo(() => sawtooth(4.4, 1.5, depth - 1.2), [depth]);

  return (
    <group position={[x, 0, z]}>
      {/* Hall */}
      <mesh position={[-1, hallH / 2, 0]} material={m.facade} castShadow receiveShadow>
        <boxGeometry args={[w - towerW + 0.4, hallH, depth]} />
      </mesh>
      {/* Front pilasters and horizontal band */}
      {[-6.6, -4.8, -3.0, -1.2, 0.6, 2.4].map((px) => (
        <mesh key={px} position={[px, hallH / 2, front + 0.12]} material={m.facadeDark} castShadow>
          <boxGeometry args={[0.36, hallH, 0.3]} />
        </mesh>
      ))}
      <mesh position={[-1.2, 3.75, front + 0.14]} material={m.concreteLight}>
        <boxGeometry args={[w - towerW + 0.2, 0.28, 0.26]} />
      </mesh>
      {/* Industrial windows between pilasters, clerestory band under the roof */}
      <WindowGrid position={[-3.0, 1.9, front + 0.02]} rotationY={0} cols={5} rows={1} size={[1.1, 1.6]} gap={[1.8, 1]} lit={palette.windowWarm} ratio={0.6} seed={11} />
      <WindowGrid position={[-2.1, 5.3, front + 0.02]} rotationY={0} cols={6} rows={1} size={[1.3, 0.55]} gap={[1.8, 1]} lit={palette.windowWarm} ratio={0.8} seed={12} />
      <WindowGrid position={[-w / 2 - 0.02, 3.0, 0]} rotationY={-Math.PI / 2} cols={6} rows={2} size={[0.7, 1.2]} gap={[1.7, 1.9]} lit={palette.windowWarm} ratio={0.4} seed={13} />

      {/* Sawtooth roof with amber glazing on the vertical faces */}
      {[-5.0, -0.6].map((rx) => (
        <group key={rx} position={[rx, hallH, 0]}>
          <mesh geometry={roof} material={m.facadeLight} castShadow />
          <mesh position={[2.19, 0.75, 0]} rotation={[0, Math.PI / 2, 0]} material={m.glassAmber}>
            <planeGeometry args={[depth - 1.4, 1.3]} />
          </mesh>
        </group>
      ))}
      {/* Roof plant: HVAC units with fan discs */}
      {[-6.0, -3.6].map((hx) => (
        <group key={hx} position={[hx, hallH + 0.5, -4.2]}>
          <mesh material={m.metalDark} castShadow>
            <boxGeometry args={[1.4, 1.0, 1.4]} />
          </mesh>
          <mesh position={[0, 0.53, 0]} material={m.metal}>
            <cylinderGeometry args={[0.5, 0.5, 0.08, 12]} />
          </mesh>
        </group>
      ))}

      {/* Lift tower with lit shaft, rails, machine room and beacon */}
      <mesh position={[towerX, 6.6, -0.8]} material={m.facadeLight} castShadow receiveShadow>
        <boxGeometry args={[towerW, 13.2, 3.8]} />
      </mesh>
      <mesh position={[towerX, 6.6, 1.12]} material={m.glassAmber}>
        <boxGeometry args={[1.1, 12.4, 0.08]} />
      </mesh>
      {[-0.75, 0.75].map((rx) => (
        <mesh key={rx} position={[towerX + rx, 6.6, 1.16]} material={m.metal}>
          <boxGeometry args={[0.1, 12.6, 0.1]} />
        </mesh>
      ))}
      <mesh position={[towerX, 13.85, -0.8]} material={m.metalDark} castShadow>
        <boxGeometry args={[2.6, 1.3, 3.0]} />
      </mesh>
      <mesh position={[towerX + 0.9, 15.1, -1.6]} material={m.metalDark}>
        <boxGeometry args={[0.08, 1.4, 0.08]} />
      </mesh>
      <mesh position={[towerX, 14.85, -0.8]} material={m.lightAmber}>
        <sphereGeometry args={[0.32, 10, 10]} />
      </mesh>
      {/* Amber beacons on the hall corners */}
      {[[-w / 2 + 0.3, front - 0.3], [-w / 2 + 0.3, -front + 0.3]].map(([bx, bz], i) => (
        <mesh key={i} position={[bx!, hallH + 0.25, bz!]} material={m.lightAmber}>
          <boxGeometry args={[0.2, 0.5, 0.2]} />
        </mesh>
      ))}

      {/* Catwalk along the front at mid height */}
      <mesh position={[-1.2, 4.25, front + 0.75]} material={m.metal} castShadow>
        <boxGeometry args={[w - towerW - 0.4, 0.1, 1.0]} />
      </mesh>
      <mesh position={[-1.2, 5.1, front + 1.2]} material={m.metal}>
        <boxGeometry args={[w - towerW - 0.4, 0.05, 0.05]} />
      </mesh>
      {[-6.0, -4.2, -2.4, -0.6, 1.2, 3.0].map((px) => (
        <mesh key={px} position={[px, 4.7, front + 1.2]} material={m.metal}>
          <boxGeometry args={[0.05, 0.85, 0.05]} />
        </mesh>
      ))}
      {[-5.4, -1.2, 3.0].map((px) => (
        <mesh key={px} position={[px, 2.1, front + 1.1]} material={m.metalDark}>
          <boxGeometry args={[0.14, 4.2, 0.14]} />
        </mesh>
      ))}

      {/* Pipes along the front and a vertical duct on the west wall */}
      {[5.65, 5.95].map((py) => (
        <mesh key={py} position={[-2.4, py, front + 0.45]} rotation={[0, 0, Math.PI / 2]} material={m.metal}>
          <cylinderGeometry args={[0.1, 0.1, 9.4, 8]} />
        </mesh>
      ))}
      <mesh position={[-w / 2 - 0.3, 3.3, -3.0]} material={m.metal} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 6.6, 8]} />
      </mesh>

      {/* Technical entrance: frame, lit door, canopy with amber light bar */}
      <mesh position={[-3.0, 1.6, front + 0.06]} material={m.metalDark}>
        <boxGeometry args={[3.0, 3.2, 0.12]} />
      </mesh>
      <mesh position={[-3.0, 1.45, front + 0.14]} material={m.doorWarm}>
        <planeGeometry args={[2.2, 2.7]} />
      </mesh>
      <mesh position={[-3.0, 3.35, front + 0.9]} material={m.concreteLight} castShadow>
        <boxGeometry args={[3.8, 0.2, 1.7]} />
      </mesh>
      <mesh position={[-3.0, 3.22, front + 1.5]} material={m.lightAmberSoft}>
        <boxGeometry args={[3.4, 0.05, 0.1]} />
      </mesh>

      {/* Loading dock on the east wall of the hall: shutter, canopy, hazard chevrons */}
      <group position={[w / 2 - towerW + 0.22, 0, -3.2]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 1.6, 0]} material={m.grille}>
          <boxGeometry args={[3.2, 3.2, 0.12]} />
        </mesh>
        {[0.6, 1.2, 1.8, 2.4].map((sy) => (
          <mesh key={sy} position={[0, sy, 0.07]} material={m.metal}>
            <boxGeometry args={[3.0, 0.08, 0.02]} />
          </mesh>
        ))}
        <mesh position={[0, 3.45, 0.6]} material={m.metalDark} castShadow>
          <boxGeometry args={[3.8, 0.16, 1.2]} />
        </mesh>
        {[-1.2, -0.4, 0.4, 1.2].map((hx, i) => (
          <mesh key={hx} position={[hx, 0.12, 0.3]} material={i % 2 === 0 ? m.hazard : m.metalDark}>
            <boxGeometry args={[0.8, 0.24, 0.1]} />
          </mesh>
        ))}
      </group>

      {/* Exterior equipment panels with LED strips on the west wall */}
      {[-2.5, 0.5].map((pz) => (
        <group key={pz} position={[-w / 2 - 0.08, 2.0, pz]}>
          <mesh material={m.metalDark}>
            <boxGeometry args={[0.14, 1.4, 2.0]} />
          </mesh>
          <mesh position={[-0.08, 0.5, 0]} material={m.lightAmber}>
            <boxGeometry args={[0.02, 0.06, 1.4]} />
          </mesh>
        </group>
      ))}

      {profile.headlight && <pointLight position={[-3, 4, front + 3]} color={palette.amber} intensity={16} distance={20} decay={2} />}
    </group>
  );
}
