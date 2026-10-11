"use client";

import { useMemo } from "react";
import { getIsland, harbors, QUAY, WATER_LEVEL, type HarborDefinition } from "@/data/archipelago";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { HARBOR_CABIN } from "@/game/world/obstacles";
import { palette } from "@/lib/palette";
import { useGameStore } from "@/stores/gameStore";
import { SignPanel } from "./DistrictSigns";
import { getMaterials } from "./materials";
import { StaticBatch } from "./StaticBatch";

const PILE_BOTTOM = WATER_LEVEL - 2.6;

/** Which lateral side (local +X or −X) of the pier the boat moors on. */
function mooringSide(h: HarborDefinition): 1 | -1 {
  const rx = Math.cos(h.pierHeading);
  const rz = -Math.sin(h.pierHeading);
  const dx = h.mooring.position[0] - h.pierRoot[0];
  const dz = h.mooring.position[1] - h.pierRoot[1];
  return dx * rx + dz * rz >= 0 ? 1 : -1;
}

/**
 * A pier built from its harbor definition: composite deck on piles, bollards
 * and fenders on the mooring side, railing and lamps on the other, a beacon at
 * the tip and the harbor sign at the root. Local +Z runs out to sea.
 */
export function Pier({ harbor: h }: { harbor: HarborDefinition }) {
  const m = getMaterials();
  const profile = QUALITY_PROFILES[useGameStore((s) => s.quality)];
  const deckY = getIsland(h.island).landHeight + 0.22;
  const L = h.pierLength;
  const W = h.pierWidth;
  const side = mooringSide(h);
  const piles = useMemo(() => {
    const out: number[] = [];
    for (let z = 1.6; z < L - 0.6; z += 3.6) out.push(z);
    return out;
  }, [L]);
  const bollards = useMemo(() => {
    const out: number[] = [];
    for (let z = 2.4; z < L - 1; z += 3.6) out.push(z);
    return out;
  }, [L]);
  const lamps = [L * 0.3, L * 0.72];
  const pileHeight = deckY - PILE_BOTTOM;

  return (
    <group position={[h.pierRoot[0], 0, h.pierRoot[1]]} rotation={[0, h.pierHeading, 0]}>
      <StaticBatch>
        {/* Deck, edge beams, cyan guide strips */}
        <mesh material={m.deck} position={[0, deckY - 0.15, L / 2]} castShadow receiveShadow>
          <boxGeometry args={[W, 0.3, L]} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh material={m.deckEdge} position={[s * (W / 2 - 0.12), deckY - 0.1, L / 2]}>
              <boxGeometry args={[0.24, 0.44, L]} />
            </mesh>
            <mesh material={m.lightCyanSoft} position={[s * (W / 2 - 0.03), deckY + 0.015, L / 2]}>
              <boxGeometry args={[0.07, 0.03, L - 0.8]} />
            </mesh>
          </group>
        ))}
        {/* Step from the land onto the deck */}
        <mesh material={m.deckEdge} position={[0, deckY - 0.24, 0.3]}>
          <boxGeometry args={[W + 0.5, 0.16, 1.4]} />
        </mesh>
        {/* Piles and cross beams */}
        {piles.map((z) => (
          <group key={z}>
            {[-1, 1].map((s) => (
              <mesh key={s} material={m.pile} position={[s * (W / 2 - 0.36), deckY - pileHeight / 2 - 0.1, z]}>
                <cylinderGeometry args={[0.26, 0.3, pileHeight, 8]} />
              </mesh>
            ))}
            <mesh material={m.pile} position={[0, deckY - 0.5, z]}>
              <boxGeometry args={[W - 0.5, 0.22, 0.26]} />
            </mesh>
          </group>
        ))}
        {/* Mooring side: bollards and hanging fenders */}
        {bollards.map((z) => (
          <group key={z}>
            <mesh material={m.metalDark} position={[side * (W / 2 - 0.5), deckY + 0.28, z]} castShadow>
              <cylinderGeometry args={[0.13, 0.17, 0.56, 8]} />
            </mesh>
            <mesh material={m.lightAmber} position={[side * (W / 2 - 0.5), deckY + 0.58, z]}>
              <cylinderGeometry args={[0.15, 0.13, 0.06, 8]} />
            </mesh>
            <mesh material={m.fender} position={[side * (W / 2 + 0.2), deckY - 0.42, z + 1.6]}>
              <cylinderGeometry args={[0.2, 0.2, 0.95, 8]} />
            </mesh>
          </group>
        ))}
        {/* Railing on the open side */}
        {Array.from({ length: Math.floor(L / 2) }, (_, i) => 1 + i * 2).map((z) => (
          <mesh key={z} material={m.metalDark} position={[-side * (W / 2 - 0.16), deckY + 0.5, z]}>
            <boxGeometry args={[0.06, 1.0, 0.06]} />
          </mesh>
        ))}
        <mesh material={m.metal} position={[-side * (W / 2 - 0.16), deckY + 1.0, L / 2]}>
          <boxGeometry args={[0.05, 0.05, L - 0.6]} />
        </mesh>
        <mesh material={m.metal} position={[-side * (W / 2 - 0.16), deckY + 0.55, L / 2]}>
          <boxGeometry args={[0.03, 0.03, L - 0.6]} />
        </mesh>
        {/* Lamps on the railing side */}
        {lamps.map((z) => (
          <group key={z}>
            <mesh material={m.metalDark} position={[-side * (W / 2 - 0.4), deckY + 1.75, z]} castShadow>
              <boxGeometry args={[0.12, 3.5, 0.12]} />
            </mesh>
            <mesh material={m.metalDark} position={[-side * (W / 2 - 0.4) + side * 0.45, deckY + 3.42, z]}>
              <boxGeometry args={[0.9, 0.07, 0.07]} />
            </mesh>
            <mesh material={m.lightAmberSoft} position={[-side * (W / 2 - 0.4) + side * 0.9, deckY + 3.38, z]}>
              <boxGeometry args={[0.42, 0.12, 0.3]} />
            </mesh>
          </group>
        ))}
        {/* Tip platform and beacon */}
        <mesh material={m.deck} position={[0, deckY - 0.15, L + 0.9]} castShadow receiveShadow>
          <boxGeometry args={[W + 1.4, 0.3, 2.2]} />
        </mesh>
        <mesh material={m.metalDark} position={[0, deckY + 1.3, L + 1.5]}>
          <cylinderGeometry args={[0.09, 0.12, 2.6, 8]} />
        </mesh>
        <mesh material={m.lightCyan} position={[0, deckY + 2.75, L + 1.5]}>
          <boxGeometry args={[0.36, 0.36, 0.36]} />
        </mesh>
        <mesh material={m.navGreen} position={[-side * (W / 2 + 0.5), deckY + 0.15, L + 1.9]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
        </mesh>
        <mesh material={m.lightRed} position={[side * (W / 2 + 0.5), deckY + 0.15, L + 1.9]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
        </mesh>
        {/* Sign post at the root, read from the land */}
        <mesh material={m.metalDark} position={[-side * (W / 2 + 1.1), 1.5 + deckY - 0.22, -0.4]} castShadow>
          <boxGeometry args={[0.12, 3.0, 0.12]} />
        </mesh>
      </StaticBatch>
      <group position={[-side * (W / 2 + 1.1), deckY + 2.4, -0.4]} rotation={[0, Math.PI, 0]}>
        <SignPanel title={h.name} subtitle={h.tagline} accent={palette.amber} width={3.2} height={0.9} compact />
      </group>
      {profile.lampPools &&
        lamps.map((z) => (
          <mesh key={z} material={m.lampPool} position={[-side * (W / 2 - 0.4) + side * 0.9, deckY + 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[2.6, 16]} />
          </mesh>
        ))}
      {profile.lampPools && (
        <mesh material={m.cyanPool} position={[0, deckY + 0.02, L + 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.2, 16]} />
        </mesh>
      )}
    </group>
  );
}

/** The quay of PAU Harbor: a built extension of the platform's west edge with parking, coping, bollards, a cabin and the harbor sign. */
function Quay() {
  const m = getMaterials();
  const profile = QUALITY_PROFILES[useGameStore((s) => s.quality)];
  const width = QUAY.x1 - QUAY.x0;
  const depth = QUAY.z1 - QUAY.z0;
  const cx = (QUAY.x0 + QUAY.x1) / 2;
  const main = harbors.find((h) => h.id === "pau-harbor")!;
  const bollards = useMemo(() => {
    const out: number[] = [];
    for (let z = QUAY.z0 + 1.6; z <= QUAY.z1 - 1.6; z += 2.8) if (Math.abs(z) > main.pierWidth / 2 + 1) out.push(z);
    return out;
  }, [main.pierWidth]);
  const [cabX, cabZ] = HARBOR_CABIN.position;
  const [cabW, cabD] = HARBOR_CABIN.footprint;
  const lampZ = [QUAY.z0 + 1.5, QUAY.z1 - 1.5];

  return (
    <group>
      <StaticBatch>
        {/* Slab: top at 0 like the platform, going down below the waterline */}
        <mesh material={m.concrete} position={[cx, -1.7, 0]} receiveShadow>
          <boxGeometry args={[width, 3.4, depth]} />
        </mesh>
        {/* Technical paving */}
        <mesh material={m.sidewalk} position={[cx, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[width, depth]} />
        </mesh>
        {/* Coping along the water edge and the two short sides */}
        <mesh material={m.curb} position={[QUAY.x0 + 0.25, 0.08, 0]}>
          <boxGeometry args={[0.5, 0.16, depth]} />
        </mesh>
        <mesh material={m.curb} position={[cx, 0.08, QUAY.z0 + 0.25]}>
          <boxGeometry args={[width, 0.16, 0.5]} />
        </mesh>
        <mesh material={m.curb} position={[cx, 0.08, QUAY.z1 - 0.25]}>
          <boxGeometry args={[width, 0.16, 0.5]} />
        </mesh>
        {/* Hazard stripe on the coping facing the sea */}
        <mesh material={m.hazard} position={[QUAY.x0 + 0.02, 0.165, 0]}>
          <boxGeometry args={[0.1, 0.012, depth - 1]} />
        </mesh>
        {/* Bollards and fenders along the quay face */}
        {bollards.map((z) => (
          <group key={z}>
            <mesh material={m.metalDark} position={[QUAY.x0 + 0.75, 0.42, z]} castShadow>
              <cylinderGeometry args={[0.14, 0.18, 0.7, 8]} />
            </mesh>
            <mesh material={m.lightCyan} position={[QUAY.x0 + 0.75, 0.79, z]}>
              <cylinderGeometry args={[0.15, 0.14, 0.05, 8]} />
            </mesh>
          </group>
        ))}
        {[-8.5, -5.5, 5.5, 8.5].map((z) => (
          <mesh key={z} material={m.fender} position={[QUAY.x0 - 0.18, -0.55, z]}>
            <cylinderGeometry args={[0.22, 0.22, 1.1, 8]} />
          </mesh>
        ))}
        {/* Boarding point marker on the paving */}
        <mesh material={m.lightCyanSoft} position={[main.boardingZone.x, 0.03, main.boardingZone.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[main.boardingZone.radius - 0.55, main.boardingZone.radius - 0.35, 48]} />
        </mesh>
        {/* Harbor master's cabin */}
        <mesh material={m.facadeLight} position={[cabX, 1.4, cabZ]} castShadow receiveShadow>
          <boxGeometry args={[cabW, 2.8, cabD]} />
        </mesh>
        <mesh material={m.roof} position={[cabX, 2.9, cabZ]} castShadow>
          <boxGeometry args={[cabW + 0.5, 0.18, cabD + 0.5]} />
        </mesh>
        <mesh material={m.lightCyanSoft} position={[cabX, 2.62, cabZ + cabD / 2 + 0.02]}>
          <boxGeometry args={[cabW - 0.3, 0.06, 0.05]} />
        </mesh>
        <mesh material={m.doorCool} position={[cabX + 0.7, 0.98, cabZ + cabD / 2 + 0.02]}>
          <boxGeometry args={[0.8, 1.9, 0.04]} />
        </mesh>
        <mesh material={m.lightWindowWarm} position={[cabX - 0.6, 1.75, cabZ + cabD / 2 + 0.02]}>
          <boxGeometry args={[1.3, 0.8, 0.04]} />
        </mesh>
        <mesh material={m.lightWindowWarm} position={[cabX - cabW / 2 - 0.02, 1.75, cabZ]}>
          <boxGeometry args={[0.04, 0.8, 1.4]} />
        </mesh>
        <mesh material={m.metal} position={[cabX - 1.1, 3.8, cabZ - 0.8]}>
          <cylinderGeometry args={[0.03, 0.04, 1.6, 6]} />
        </mesh>
        <mesh material={m.beaconRed} position={[cabX - 1.1, 4.65, cabZ - 0.8]}>
          <boxGeometry args={[0.14, 0.14, 0.14]} />
        </mesh>
        {/* Quay lamps at both ends */}
        {lampZ.map((z) => (
          <group key={z}>
            <mesh material={m.metalDark} position={[QUAY.x0 + 1.6, 2.1, z]} castShadow>
              <boxGeometry args={[0.14, 4.2, 0.14]} />
            </mesh>
            <mesh material={m.metalDark} position={[QUAY.x0 + 2.1, 4.12, z]}>
              <boxGeometry args={[1.0, 0.08, 0.08]} />
            </mesh>
            <mesh material={m.lightAmberSoft} position={[QUAY.x0 + 2.6, 4.08, z]}>
              <boxGeometry args={[0.46, 0.12, 0.3]} />
            </mesh>
          </group>
        ))}
        {/* Harbor gate sign post, read by the car arriving from the east */}
        <mesh material={m.metalDark} position={[QUAY.x1 + 1.6, 1.9, -5.6]} castShadow>
          <boxGeometry args={[0.14, 3.8, 0.14]} />
        </mesh>
      </StaticBatch>
      <group position={[QUAY.x1 + 1.6, 3.2, -5.6]} rotation={[0, Math.PI / 2, 0]}>
        <SignPanel title="PAU HARBOR" subtitle={main.tagline} accent={palette.amber} width={4.2} height={1.2} />
      </group>
      {profile.lampPools &&
        lampZ.map((z) => (
          <mesh key={z} material={m.lampPool} position={[QUAY.x0 + 2.6, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[3.2, 16]} />
          </mesh>
        ))}
      {profile.lampPools && (
        <mesh material={m.cyanPool} position={[main.boardingZone.x, 0.028, main.boardingZone.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[main.boardingZone.radius - 0.4, 24]} />
        </mesh>
      )}
    </group>
  );
}

/** Every harbor of the archipelago: PAU Harbor's quay plus one pier per harbor definition. */
export function Harbor() {
  return (
    <group>
      <Quay />
      {harbors.map((h) => (
        <Pier key={h.id} harbor={h} />
      ))}
    </group>
  );
}
