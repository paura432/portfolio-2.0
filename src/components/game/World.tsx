"use client";

import { useCallback, useMemo } from "react";
import { InstancedMesh, Object3D } from "three";
import { PLATFORM, PLAZA, ROADS } from "@/data/world";
import { CURB_HEIGHT, CURB_WIDTH, generateCrosswalks, generateCurbs, generateForecourts, generateLaneDashes, generateSidewalks, PARKING_PADS, SIDEWALK_WIDTH, type Run } from "@/game/world/urban";
import { Buildings } from "./Buildings";
import { DistrictSigns } from "./DistrictSigns";
import { getMaterials } from "./materials";
import { Props } from "./Props";

/** Instanced runs: a unit-length piece along local Z, scaled to the run length. */
function useRuns(runs: Run[], y: number) {
  return useCallback(
    (mesh: InstancedMesh | null) => {
      if (!mesh) return;
      const o = new Object3D();
      runs.forEach((r, i) => {
        o.position.set(r.x, y, r.z);
        o.rotation.set(0, r.rotation, 0);
        o.scale.set(1, 1, r.length);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
    [runs, y],
  );
}

function useFlat(items: { x: number; z: number; rotation: number; length?: number; width?: number }[], y: number) {
  return useCallback(
    (mesh: InstancedMesh | null) => {
      if (!mesh) return;
      const o = new Object3D();
      items.forEach((it, i) => {
        o.position.set(it.x, y, it.z);
        o.rotation.set(-Math.PI / 2, 0, -it.rotation);
        o.scale.set(it.width ?? 1, it.length ?? 1, 1);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
    [items, y],
  );
}

const SIDEWALK_Y = 0.1;

/** Plaza sidewalk ring split into four arcs so the exits stay open. */
function PlazaRing() {
  const m = getMaterials();
  const inner = PLAZA.outerRadius + CURB_WIDTH;
  const outer = inner + SIDEWALK_WIDTH;
  const gap = Math.asin((ROADS[0]!.width / 2 + CURB_WIDTH + 0.4) / inner);
  return (
    <group>
      {/* Curb wall and cap around the roundabout's outer edge */}
      <mesh position={[0, CURB_HEIGHT / 2, 0]} material={m.curb}>
        <cylinderGeometry args={[inner, inner, CURB_HEIGHT, 64, 1, true]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const start = (i * Math.PI) / 2 + gap;
        const length = Math.PI / 2 - gap * 2;
        return (
          <group key={i}>
            <mesh position={[0, SIDEWALK_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.sidewalk} receiveShadow>
              <ringGeometry args={[inner, outer, 24, 1, start, length]} />
            </mesh>
            <mesh position={[0, CURB_HEIGHT + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.curb}>
              <ringGeometry args={[PLAZA.outerRadius, inner, 24, 1, start, length]} />
            </mesh>
          </group>
        );
      })}
      {/* Inner island: stepped concrete base around the hub */}
      <mesh position={[0, 0.12, 0]} material={m.concrete} receiveShadow>
        <cylinderGeometry args={[PLAZA.innerRadius, PLAZA.innerRadius + 0.3, 0.24, 48]} />
      </mesh>
      <mesh position={[0, 0.32, 0]} material={m.concreteLight} receiveShadow>
        <cylinderGeometry args={[PLAZA.innerRadius - 0.9, PLAZA.innerRadius - 0.6, 0.18, 48]} />
      </mesh>
      <mesh position={[0, 0.42, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.lightCyanSoft}>
        <ringGeometry args={[PLAZA.innerRadius - 1.25, PLAZA.innerRadius - 1.05, 64]} />
      </mesh>
    </group>
  );
}

export function World() {
  const m = getMaterials();
  const half = PLATFORM.halfSize;
  const curbs = useMemo(() => generateCurbs(), []);
  const sidewalks = useMemo(() => generateSidewalks(), []);
  const crossings = useMemo(() => generateCrosswalks(), []);
  const dashes = useMemo(() => generateLaneDashes(), []);
  const forecourts = useMemo(() => generateForecourts(), []);
  const bays = useMemo(
    () =>
      PARKING_PADS.flatMap((p) =>
        Array.from({ length: p.bays + 1 }, (_, i) => ({
          x: p.x - p.width / 2 + (i * p.width) / p.bays,
          z: p.z,
          rotation: p.rotation,
          length: p.depth - 0.4,
          width: 0.12,
        })),
      ),
    [],
  );
  const refCurbs = useRuns(curbs, CURB_HEIGHT / 2);
  const refSidewalks = useRuns(sidewalks, SIDEWALK_Y / 2);
  const refCrossings = useFlat(crossings, 0.04);
  const refDashes = useFlat(dashes, 0.035);
  const refBays = useFlat(bays, 0.04);

  return (
    <group>
      {/* Floating island: textured top slab, lighter rim, dark stepped underside with a cyan seam */}
      <mesh position={[0, -PLATFORM.thickness / 2, 0]} material={m.ground} receiveShadow>
        <boxGeometry args={[half * 2, PLATFORM.thickness, half * 2]} />
      </mesh>
      {[
        [0, half - 0.4, half * 2, 0.8],
        [0, -half + 0.4, half * 2, 0.8],
        [half - 0.4, 0, 0.8, half * 2],
        [-half + 0.4, 0, 0.8, half * 2],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x!, 0.06, z!]} material={m.concrete}>
          <boxGeometry args={[w!, 0.12, d!]} />
        </mesh>
      ))}
      <mesh position={[0, -PLATFORM.thickness - 0.6, 0]} material={m.lightCyanSoft}>
        <boxGeometry args={[half * 2 - 2, 0.12, half * 2 - 2]} />
      </mesh>
      <mesh position={[0, -PLATFORM.thickness - 3.6, 0]} material={m.groundDeep}>
        <boxGeometry args={[half * 2 - 10, 6, half * 2 - 10]} />
      </mesh>
      <mesh position={[0, -PLATFORM.thickness - 9.5, 0]} material={m.groundDeep}>
        <boxGeometry args={[half * 2 - 36, 6, half * 2 - 36]} />
      </mesh>

      {/* Asphalt */}
      {ROADS.map((r, i) => {
        const [ax, az] = r.from;
        const [bx, bz] = r.to;
        const len = Math.hypot(bx - ax, bz - az) + r.width;
        const rotation = Math.atan2(bx - ax, bz - az);
        return (
          <mesh key={i} position={[(ax + bx) / 2, 0.02, (az + bz) / 2]} rotation={[-Math.PI / 2, 0, -rotation]} material={m.asphalt} receiveShadow>
            <planeGeometry args={[r.width, len]} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.asphalt} receiveShadow>
        <ringGeometry args={[PLAZA.innerRadius, PLAZA.outerRadius, 64]} />
      </mesh>
      {PARKING_PADS.map((p, i) => (
        <mesh key={i} position={[p.x, 0.025, p.z]} rotation={[-Math.PI / 2, 0, 0]} material={m.asphalt} receiveShadow>
          <planeGeometry args={[p.width, p.depth]} />
        </mesh>
      ))}

      {/* Curbs, sidewalks, crossings, lane dashes, parking bays */}
      <instancedMesh ref={refCurbs} args={[undefined, undefined, curbs.length]} material={m.curb} receiveShadow>
        <boxGeometry args={[CURB_WIDTH, CURB_HEIGHT, 1]} />
      </instancedMesh>
      <instancedMesh ref={refSidewalks} args={[undefined, undefined, sidewalks.length]} material={m.sidewalk} receiveShadow>
        <boxGeometry args={[SIDEWALK_WIDTH, SIDEWALK_Y, 1]} />
      </instancedMesh>
      <instancedMesh ref={refCrossings} args={[undefined, undefined, crossings.length]} material={m.crosswalk}>
        <planeGeometry args={[1, 1]} />
      </instancedMesh>
      <instancedMesh ref={refDashes} args={[undefined, undefined, dashes.length]} material={m.roadLine}>
        <planeGeometry args={[0.16, 1]} />
      </instancedMesh>
      <instancedMesh ref={refBays} args={[undefined, undefined, bays.length]} material={m.roadLineDim}>
        <planeGeometry args={[1, 1]} />
      </instancedMesh>

      {/* Forecourts: paved plots between sidewalk and facade */}
      {forecourts.map((f) => (
        <mesh key={f.id} position={[f.x, SIDEWALK_Y / 2, f.z]} material={m.sidewalk} receiveShadow>
          <boxGeometry args={[f.width, SIDEWALK_Y, f.depth]} />
        </mesh>
      ))}

      <PlazaRing />
      <Buildings />
      <DistrictSigns />
      <Props />
    </group>
  );
}
