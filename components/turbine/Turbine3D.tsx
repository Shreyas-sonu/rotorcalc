"use client";

import { useLayoutEffect, useMemo, useRef, type ComponentRef, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export type TurbineLive = {
  /** 0..1 steam flow: particle density and speed. */
  flow: number;
  /** 0..1 inlet temperature: inlet colour. */
  heat: number;
  /** 0..1 load: rotor speed. */
  load: number;
  /** 0..1 how far the top casing is lifted off. */
  open: number;
};

type LiveRef = RefObject<TurbineLive>;
type V3 = [number, number, number];

/* Layout. The shaft runs along X at y = 0; the plant floor is at FLOOR. */
const FLOOR = -1.95;
const SLAB_TOP = -1.55;
const STAGE_X = [-1.5, -0.95, -0.4, 0.15, 0.7];
const stageRadius = (i: number) => 0.62 + i * 0.13;
const HUB = 0.3;
/** The upper casing is sectioned like a training model: it stops just past the top, so the rotor shows from the front. */
const CUT = Math.PI * 1.55;
const CUT_A = 0.157;
const BOILER: V3 = [-4.6, 0, -1.9];
const STACK: V3 = [BOILER[0] + 1.7, 0, BOILER[2] - 2.25];

const BLUE = "#2f6f9e";
const STRUCT = "#4f6a85";
const YELLOW = "#f2b705";
const SIGNAL = "#f26a1b";
const COOL = new THREE.Color("#9ad6ff");

/* Materials */
const Paint = ({ color, rough = 0.42 }: { color: string; rough?: number }) => <meshStandardMaterial color={color} metalness={0.25} roughness={rough} />;
const Steel = ({ color = "#c9d0d9", rough = 0.26 }: { color?: string; rough?: number }) => <meshStandardMaterial color={color} metalness={1} roughness={rough} />;
const Clad = () => <meshStandardMaterial color="#dfe4ea" metalness={0.8} roughness={0.36} />;
const Cast = () => <meshStandardMaterial color="#56606c" metalness={0.55} roughness={0.6} />;
const Concrete = () => <meshStandardMaterial color="#c6cacf" metalness={0} roughness={0.95} />;

/* Small building blocks */
function Box({ at, size, rot, children }: { at: V3; size: V3; rot?: V3; children: ReactNode }) {
  return (
    <mesh position={at} rotation={rot}>
      <boxGeometry args={size} />
      {children}
    </mesh>
  );
}

const AXIS: Record<"x" | "y" | "z", V3> = { x: [0, 0, Math.PI / 2], y: [0, 0, 0], z: [Math.PI / 2, 0, 0] };

/** A cylinder lying along the given axis. `r2` is the radius at the far (+) end when it tapers. */
function Cyl({ at, r, len, axis = "y", r2, seg = 32, open = false, children }: { at: V3; r: number; len: number; axis?: "x" | "y" | "z"; r2?: number; seg?: number; open?: boolean; children: ReactNode }) {
  return (
    <mesh position={at} rotation={AXIS[axis]}>
      <cylinderGeometry args={[r2 ?? r, r, len, seg, 1, open]} />
      {children}
    </mesh>
  );
}

/** Many copies of one shape as a single instanced mesh. */
function Repeat({ count, place, children }: { count: number; place: (i: number, o: THREE.Object3D) => void; children: ReactNode }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      o.position.set(0, 0, 0);
      o.rotation.set(0, 0, 0);
      o.scale.set(1, 1, 1);
      place(i, o);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [count, place]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      {children}
    </instancedMesh>
  );
}

/** Square-cornered pipe run with rounded bends, like real pipework. */
function route(points: V3[], bend = 0.34) {
  const pts = points.map((p) => new THREE.Vector3(...p));
  const path = new THREE.CurvePath<THREE.Vector3>();
  let from = pts[0];
  for (let i = 1; i < pts.length - 1; i++) {
    const corner = pts[i];
    const a = corner.clone().add(pts[i - 1].clone().sub(corner).setLength(bend));
    const b = corner.clone().add(pts[i + 1].clone().sub(corner).setLength(bend));
    path.add(new THREE.LineCurve3(from, a));
    path.add(new THREE.QuadraticBezierCurve3(a, corner, b));
    from = b;
  }
  path.add(new THREE.LineCurve3(from, pts[pts.length - 1]));
  return path;
}

const UP = new THREE.Vector3(0, 1, 0);

/** Insulated pipe with sheet-metal cladding and a band at every cladding joint. */
function Pipe({ path, r, every = 0.62 }: { path: THREE.CurvePath<THREE.Vector3>; r: number; every?: number }) {
  const bands = Math.max(2, Math.round(path.getLength() / every));
  return (
    <group>
      <mesh>
        <tubeGeometry args={[path, 140, r, 20, false]} />
        <Clad />
      </mesh>
      <Repeat
        count={bands}
        place={(i, o) => {
          const u = (i + 0.5) / bands;
          o.position.copy(path.getPointAt(u));
          o.quaternion.setFromUnitVectors(UP, path.getTangentAt(u));
        }}
      >
        <cylinderGeometry args={[r + 0.012, r + 0.012, 0.035, 20]} />
        <Steel color="#aeb7c2" rough={0.35} />
      </Repeat>
    </group>
  );
}

let dot: THREE.Texture | null = null;
/** Soft round sprite for steam. */
function softDot() {
  if (dot) return dot;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.45, "rgba(255,255,255,.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  dot = new THREE.CanvasTexture(c);
  return dot;
}

/** Deterministic pseudo-random number in 0..1, so renders stay pure. */
const rand = (i: number) => Math.abs((Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1);

/* Turbine */

/** A cambered blade section, extruded along the blade's length. */
function bladeGeometry(chord: number, length: number, camber: number, thick: number) {
  const s = new THREE.Shape();
  s.moveTo(-chord / 2, 0);
  s.quadraticCurveTo(0, 2 * (camber + thick / 2), chord / 2, 0);
  s.quadraticCurveTo(0, 2 * (camber - thick / 2), -chord / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false, curveSegments: 5, steps: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -length / 2, 0);
  return g;
}

/** A ring (or an arc) of blades as one instanced mesh. Angle 0 is straight up, a quarter turn is towards the viewer. */
function BladeRing({ x, inner, outer, count, twist, from = 0, to = Math.PI * 2, chord = 0.12, children }: { x: number; inner: number; outer: number; count: number; twist: number; from?: number; to?: number; chord?: number; children: ReactNode }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => bladeGeometry(chord, outer - inner, chord * 0.3, chord * 0.16), [chord, inner, outer]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const qTwist = new THREE.Quaternion().setFromAxisAngle(UP, twist);
    const r = (inner + outer) / 2;
    const one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < count; i++) {
      const a = from + ((i + 0.5) / count) * (to - from);
      q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), a).multiply(qTwist);
      m.compose(new THREE.Vector3(x, Math.cos(a) * r, Math.sin(a) * r), q, one);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [x, inner, outer, count, twist, from, to]);
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, count]}>
      {children}
    </instancedMesh>
  );
}

function Rotor({ live }: { live: LiveRef }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.x += dt * (0.7 + live.current.load * 6.5);
  });
  return (
    <group ref={ref}>
      <Cyl at={[-0.15, 0, 0]} r={0.13} len={5.6} axis="x">
        <Steel rough={0.2} />
      </Cyl>
      {/* Rotor drum: thicker where the stages sit */}
      <Cyl at={[-0.3, 0, 0]} r={HUB - 0.04} len={2.7} axis="x" seg={48}>
        <Steel color="#b4bdc8" rough={0.32} />
      </Cyl>
      {STAGE_X.map((x, i) => {
        const tip = stageRadius(i) - 0.04;
        return (
          <group key={x}>
            <Cyl at={[x + 0.16, 0, 0]} r={HUB + 0.03} len={0.16} axis="x" seg={48}>
              <Steel color="#9aa5b2" rough={0.3} />
            </Cyl>
            <BladeRing x={x + 0.16} inner={HUB} outer={tip} count={38 + i * 7} twist={0.62}>
              <Steel color="#dfe5ec" rough={0.22} />
            </BladeRing>
            {/* Shroud band tying the blade tips together */}
            <Cyl at={[x + 0.16, 0, 0]} r={tip + 0.008} len={0.13} axis="x" seg={64} open>
              <meshStandardMaterial color="#c2cad4" metalness={1} roughness={0.28} side={THREE.DoubleSide} />
            </Cyl>
          </group>
        );
      })}
      {/* Thrust collar and coupling halves */}
      <Cyl at={[-2.05, 0, 0]} r={0.2} len={0.1} axis="x">
        <Steel rough={0.3} />
      </Cyl>
      {[2.29, 2.41].map((x) => (
        <Cyl key={x} at={[x, 0, 0]} r={0.3} len={0.1} axis="x">
          <Steel color="#8f9aa7" rough={0.35} />
        </Cyl>
      ))}
    </group>
  );
}

/** Wall of the casing as (radius, position along the shaft): outside going one way, inside coming back. */
function casingSection() {
  const outer = [new THREE.Vector2(0.36, -1.8), new THREE.Vector2(0.74, -1.78)];
  const inner = [new THREE.Vector2(0.36, -1.72), new THREE.Vector2(0.66, -1.7)];
  STAGE_X.forEach((x, i) => {
    outer.push(new THREE.Vector2(stageRadius(i) + 0.12, x - 0.1));
    inner.push(new THREE.Vector2(stageRadius(i) + 0.04, x - 0.1));
  });
  outer.push(new THREE.Vector2(1.3, 1.05), new THREE.Vector2(1.3, 1.38), new THREE.Vector2(0.36, 1.42));
  inner.push(new THREE.Vector2(1.22, 1.05), new THREE.Vector2(1.22, 1.3), new THREE.Vector2(0.36, 1.34));
  const loop = [...outer, ...[...inner].reverse(), outer[0]];
  const face = new THREE.Shape(loop.map((p) => new THREE.Vector2(p.y, p.x)));
  const rim = outer.slice(1, -1);
  const flange = new THREE.Shape([...rim.map((p) => new THREE.Vector2(p.y, p.x - 0.02)), ...[...rim].reverse().map((p) => new THREE.Vector2(p.y, p.x + 0.16))]);
  /** Outside radius of the casing at a position along the shaft. */
  const radiusAt = (x: number) => {
    for (let i = 1; i < rim.length; i++) {
      if (x <= rim[i].y) {
        const k = (x - rim[i - 1].y) / (rim[i].y - rim[i - 1].y || 1);
        return rim[i - 1].x + (rim[i].x - rim[i - 1].x) * Math.max(0, k);
      }
    }
    return rim[rim.length - 1].x;
  };
  return { loop, face, flange, radiusAt };
}

const STUDS = 13;
const studX = (i: number) => -1.66 + i * 0.245;

function Casing({ live }: { live: LiveRef }) {
  const top = useRef<THREE.Group>(null);
  const { loop, face, flange, radiusAt } = useMemo(() => casingSection(), []);
  useFrame((state) => {
    const open = live.current.open;
    if (top.current) top.current.position.y = open * 1.05 + (open > 0.02 ? Math.sin(state.clock.elapsedTime * 0.8) * 0.012 : 0);
  });
  /** Flat face where the casing wall has been cut, at an angle around the shaft. */
  const cut = (phi: number, color: string, lift = 0) => (
    <mesh rotation={[phi + Math.PI / 2, 0, 0]} position={[0, lift, 0]}>
      <shapeGeometry args={[face]} />
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
  return (
    <group>
      {/* Lower half stays on the foundation */}
      <mesh rotation={[0, 0, -Math.PI / 2]}>
        <latheGeometry args={[loop, 72, 0, Math.PI]} />
        <meshStandardMaterial color={BLUE} metalness={0.25} roughness={0.42} side={THREE.DoubleSide} />
      </mesh>
      {cut(0, "#b9c2cc")}
      {cut(Math.PI, "#b9c2cc")}
      {/* Horizontal joint flange, with the studs that hold the two halves together */}
      {[1, -1].map((side) => (
        <mesh key={side} rotation={[Math.PI / 2, 0, 0]} scale={[1, side, 1]}>
          <extrudeGeometry args={[flange, { depth: 0.07, bevelEnabled: false }]} />
          <Paint color={BLUE} />
        </mesh>
      ))}
      <Repeat
        count={STUDS * 2}
        place={(i, o) => {
          const x = studX(i % STUDS);
          o.position.set(x, 0.05, (i < STUDS ? 1 : -1) * (radiusAt(x) + 0.085));
        }}
      >
        <cylinderGeometry args={[0.026, 0.026, 0.2, 10]} />
        <Steel color="#8d97a3" rough={0.4} />
      </Repeat>
      {/* Fixed nozzle rings in the lower half */}
      {STAGE_X.map((x, i) => (
        <BladeRing key={x} x={x - 0.1} inner={HUB + 0.02} outer={stageRadius(i) + 0.03} count={12 + i * 2} twist={-0.7} from={Math.PI / 2} to={Math.PI * 1.5} chord={0.11}>
          <Steel color="#7f8b99" rough={0.4} />
        </BladeRing>
      ))}

      {/* Upper half lifts off as you scroll */}
      <group ref={top}>
        <mesh rotation={[0, 0, -Math.PI / 2]}>
          <latheGeometry args={[loop, 48, Math.PI, CUT - Math.PI]} />
          <meshStandardMaterial color={BLUE} metalness={0.25} roughness={0.42} side={THREE.DoubleSide} />
        </mesh>
        {cut(CUT, SIGNAL)}
        {cut(Math.PI, "#b9c2cc", 0.003)}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
          <extrudeGeometry args={[flange, { depth: 0.07, bevelEnabled: false }]} />
          <Paint color={BLUE} />
        </mesh>
        <Repeat
          count={STUDS}
          place={(i, o) => {
            const x = studX(i);
            o.position.set(x, 0.1, -(radiusAt(x) + 0.085));
          }}
        >
          <cylinderGeometry args={[0.05, 0.05, 0.06, 6]} />
          <Steel color="#8d97a3" rough={0.4} />
        </Repeat>
        {STAGE_X.map((x, i) => (
          <BladeRing key={x} x={x - 0.1} inner={HUB + 0.02} outer={stageRadius(i) + 0.03} count={7 + i} twist={-0.7} from={Math.PI * 1.5} to={Math.PI * 2 + CUT_A} chord={0.11}>
            <Steel color="#7f8b99" rough={0.4} />
          </BladeRing>
        ))}
        {/* Lifting lug */}
        <mesh position={[0.2, 1.16, -0.2]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.1, 0.028, 10, 24]} />
          <Steel color="#8d97a3" rough={0.4} />
        </mesh>
      </group>

      {/* Saddles carrying the lower casing */}
      <Box at={[-1.25, -1.0, 0]} size={[0.14, 1.1, 1.7]}>
        <Cast />
      </Box>
      <Box at={[0.3, -1.0, 0]} size={[0.14, 1.1, 2.3]}>
        <Cast />
      </Box>
    </group>
  );
}

/** Steam chest, governor valves, glands and bearing pedestals: everything bolted down around the casing. */
function Fixed() {
  return (
    <group>
      {/* Gland housings where the shaft leaves the casing */}
      <Cyl at={[-2.05, 0, 0]} r={0.4} len={0.5} axis="x">
        <Paint color={BLUE} />
      </Cyl>
      <Cyl at={[1.5, 0, 0]} r={0.4} len={0.18} axis="x">
        <Paint color={BLUE} />
      </Cyl>
      {/* Steam chest with governor valves */}
      <Box at={[-2.05, 0.46, 0]} size={[0.42, 0.3, 0.9]}>
        <Paint color={BLUE} />
      </Box>
      <Cyl at={[-2.05, 0.68, 0]} r={0.3} len={1.44} axis="z">
        <Paint color={BLUE} />
      </Cyl>
      {[-0.5, 0.5].map((z) => (
        <group key={z} position={[-2.05, 0.95, z]}>
          <Cyl at={[0, 0.08, 0]} r={0.12} len={0.22}>
            <Cast />
          </Cyl>
          <Cyl at={[0, 0.32, 0]} r={0.035} len={0.3} seg={12}>
            <Steel />
          </Cyl>
          <Cyl at={[0, 0.5, 0]} r={0.1} len={0.12}>
            <Paint color="#39424e" />
          </Cyl>
        </group>
      ))}
      <Cyl at={[-2.05, 0.99, 0]} r={0.22} len={0.07}>
        <Steel color="#aeb7c2" rough={0.35} />
      </Cyl>
      {/* Bearing pedestals */}
      {[-2.7, 1.85].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <Box at={[0, -0.9, 0]} size={[0.5, 1.3, 0.84]}>
            <Cast />
          </Box>
          <Cyl at={[0, 0, 0]} r={0.38} len={0.46} axis="x">
            <Paint color={BLUE} />
          </Cyl>
          <Box at={[0, -0.02, 0]} size={[0.5, 0.07, 0.96]}>
            <Paint color={BLUE} />
          </Box>
          <Cyl at={[0, 0.42, 0]} r={0.05} len={0.14} seg={12}>
            <Steel color="#8d97a3" rough={0.4} />
          </Cyl>
        </group>
      ))}
      <Cyl at={[-2.98, 0, 0]} r={0.22} len={0.08} axis="x">
        <Paint color="#39424e" />
      </Cyl>
      {/* Coupling guard */}
      <mesh position={[2.35, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.42, 0.42, 0.44, 28, 1, true, 0, Math.PI]} />
        <meshStandardMaterial color={YELLOW} metalness={0.2} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {[1, -1].map((s) => (
        <Box key={s} at={[2.35, -0.775, s * 0.42]} size={[0.44, 1.55, 0.02]}>
          <Paint color={YELLOW} rough={0.5} />
        </Box>
      ))}
    </group>
  );
}

const EXHAUST = route(
  [
    [1.05, -0.55, 0.8],
    [1.05, -0.55, 2.1],
    [1.05, FLOOR, 2.1],
  ],
  0.5,
);

/** Exhaust branch: out of the lower casing towards the viewer, then down to the process header. */
function Exhaust() {
  return (
    <group>
      <Pipe path={EXHAUST} r={0.34} every={0.5} />
      <Cyl at={[1.05, -0.55, 1.27]} r={0.44} len={0.09} axis="z">
        <Steel color="#aeb7c2" rough={0.35} />
      </Cyl>
      <Cyl at={[1.05, -1.32, 2.1]} r={0.355} len={0.2}>
        <Paint color="#2a8fd0" />
      </Cyl>
      <Cyl at={[1.05, FLOOR + 0.04, 2.1]} r={0.46} len={0.08}>
        <Cast />
      </Cyl>
    </group>
  );
}

function Generator({ live }: { live: LiveRef }) {
  const lamp = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    if (lamp.current) lamp.current.emissiveIntensity = 0.6 + live.current.load * (2.2 + Math.sin(state.clock.elapsedTime * 5) * 0.5);
  });
  return (
    <group position={[3.55, 0, 0]}>
      <Cyl at={[0, 0, 0]} r={0.8} len={1.6} axis="x" seg={56}>
        <Paint color="#d3d9e0" />
      </Cyl>
      {[-0.6, -0.2, 0.2, 0.6].map((x) => (
        <Cyl key={x} at={[x, 0, 0]} r={0.818} len={0.05} axis="x" seg={56}>
          <Paint color="#bcc5cf" />
        </Cyl>
      ))}
      {/* End shields and bearing housings */}
      {[-0.86, 0.86].map((x) => (
        <group key={x}>
          <Cyl at={[x, 0, 0]} r={0.86} len={0.12} axis="x" seg={56}>
            <Paint color={BLUE} />
          </Cyl>
          <Cyl at={[x * 1.16, 0, 0]} r={0.3} len={0.16} axis="x">
            <Paint color="#39424e" />
          </Cyl>
        </group>
      ))}
      {/* Top-mounted air cooler */}
      <Box at={[0, 0.74, 0]} size={[1.3, 0.2, 0.9]}>
        <Paint color="#bcc5cf" />
      </Box>
      <Box at={[0, 1.0, 0]} size={[1.5, 0.42, 1.2]}>
        <Paint color="#d3d9e0" />
      </Box>
      <Repeat
        count={6}
        place={(i, o) => {
          o.position.set(0, 0.86 + i * 0.055, 0.605);
        }}
      >
        <boxGeometry args={[1.2, 0.022, 0.03]} />
        <Paint color="#8f9aa7" />
      </Repeat>
      {/* Terminal box with a running lamp */}
      <Box at={[0.1, -0.05, 0.86]} size={[0.52, 0.44, 0.24]}>
        <Paint color="#aab3be" />
      </Box>
      <mesh position={[0.26, 0.08, 0.99]}>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshStandardMaterial ref={lamp} color="#19c37d" emissive="#19c37d" emissiveIntensity={1} />
      </mesh>
      <Cyl at={[0.1, -0.6, 0.9]} r={0.04} len={0.68} seg={12}>
        <Steel color="#aeb7c2" rough={0.4} />
      </Cyl>
      {/* Exciter */}
      <Cyl at={[1.25, 0, 0]} r={0.42} len={0.5} axis="x">
        <Paint color="#51606f" />
      </Cyl>
      <Cyl at={[1.53, 0, 0]} r={0.3} len={0.07} axis="x">
        <Paint color="#39424e" />
      </Cyl>
      {/* Feet and plinth */}
      {[0.6, -0.6].map((z) => (
        <Box key={z} at={[0.1, -0.86, z]} size={[1.9, 0.16, 0.24]}>
          <Cast />
        </Box>
      ))}
      <Box at={[0.4, -1.245, 0]} size={[2.7, 0.61, 1.6]}>
        <Concrete />
      </Box>
      <Box at={[1.25, -0.66, 0]} size={[0.4, 0.56, 0.5]}>
        <Cast />
      </Box>
    </group>
  );
}

/* Steam */

const COUNT = 900;

/** Steam spiralling through the blade stages while it expands and cools. */
function Steam({ live }: { live: LiveRef }) {
  const ref = useRef<THREE.Points>(null);
  const { geometry, seeds } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(COUNT * 4), 4));
    const s = new Float32Array(COUNT * 4);
    for (let i = 0; i < s.length; i++) s[i] = rand(i);
    return { geometry: g, seeds: s };
  }, []);
  const map = useMemo(() => softDot(), []);
  const hot = useMemo(() => new THREE.Color(), []);
  const c = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    const { flow, heat } = live.current;
    // Buffers are reached through the mesh ref: they are scratch space rewritten every frame.
    const attrs = pts.geometry.attributes;
    const pos = attrs.position.array as Float32Array;
    const col = attrs.color.array as Float32Array;
    const time = state.clock.elapsedTime;
    const shown = Math.floor(COUNT * (0.25 + flow * 0.75));
    hot.setHSL((36 - heat * 26) / 360, 1, 0.56);
    for (let i = 0; i < COUNT; i++) {
      const o = i * 3;
      const q = i * 4;
      if (i >= shown) {
        col[q + 3] = 0;
        continue;
      }
      const speed = (0.1 + seeds[q] * 0.08) * (0.6 + flow * 1.6);
      const k = (seeds[q + 1] + time * speed) % 1;
      const ring = seeds[q + 2];
      const a = seeds[q + 3] * Math.PI * 2 + k * 5.5;
      const r = HUB + 0.04 + (0.2 + k * 0.66) * (0.2 + ring * 0.8);
      pos[o] = -1.68 + k * 2.85;
      pos[o + 1] = Math.cos(a) * r;
      pos[o + 2] = Math.sin(a) * r;
      c.copy(hot).lerp(COOL, Math.min(1, Math.max(0, (k - 0.25) / 0.65)));
      col[q] = c.r;
      col[q + 1] = c.g;
      col[q + 2] = c.b;
      col[q + 3] = Math.min(1, k * 12) * Math.min(1, (1 - k) * 6) * 0.9;
    }
    attrs.position.needsUpdate = true;
    attrs.color.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false} renderOrder={2}>
      <pointsMaterial map={map} size={0.42} vertexColors transparent depthWrite={false} sizeAttenuation />
    </points>
  );
}

/** Soft vapour drifting away from a point: flue gas from the stack, a wisp of steam at a gland. */
function Plume({ origin, rise, spread = 0.5, drift = 0.5, color, count = 110, size = 2.6, strength = 0.4, live }: { origin: V3; rise: number; spread?: number; drift?: number; color: string; count?: number; size?: number; strength?: number; live: LiveRef }) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(count * 4), 4));
    return g;
  }, [count]);
  const map = useMemo(() => softDot(), []);
  const base = useMemo(() => new THREE.Color(color), [color]);
  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    const attrs = pts.geometry.attributes;
    const pos = attrs.position.array as Float32Array;
    const col = attrs.color.array as Float32Array;
    const time = state.clock.elapsedTime;
    const level = 0.55 + live.current.flow * 0.45;
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      const q = i * 4;
      const seed = rand(i * 3 + 7);
      const t = (seed + time * (0.08 + seed * 0.06)) % 1;
      const a = seed * Math.PI * 12 + time * 0.4;
      pos[o] = origin[0] + Math.cos(a) * spread * t + t * t * drift;
      pos[o + 1] = origin[1] + t * rise;
      pos[o + 2] = origin[2] + Math.sin(a) * spread * t;
      col[q] = base.r;
      col[q + 1] = base.g;
      col[q + 2] = base.b;
      // In fast, out slowly.
      col[q + 3] = Math.min(1, t * 8) * (1 - t) * strength * level;
    }
    attrs.position.needsUpdate = true;
    attrs.color.needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geometry} frustumCulled={false} renderOrder={2}>
      <pointsMaterial map={map} size={size} vertexColors transparent depthWrite={false} sizeAttenuation />
    </points>
  );
}

/* Boiler house */

const STEAM_MAIN = route([
  [BOILER[0], 2.5, BOILER[2]],
  [BOILER[0], 3.3, BOILER[2]],
  [-2.05, 3.3, BOILER[2]],
  [-2.05, 3.3, 0],
  [-2.05, 0.95, 0],
]);

/** Main steam line: boiler drum to the turbine's steam chest, with the stop valve on the last drop. */
function SteamMain({ live }: { live: LiveRef }) {
  const band = useRef<THREE.MeshStandardMaterial>(null);
  const warm = useMemo(() => new THREE.Color("#f6a41c"), []);
  const hot = useMemo(() => new THREE.Color("#e2350d"), []);
  useFrame(() => {
    if (band.current) band.current.color.copy(warm).lerp(hot, live.current.heat);
  });
  return (
    <group>
      <Pipe path={STEAM_MAIN} r={0.15} />
      {/* Line marker: goes from amber to red as the inlet temperature rises */}
      <Cyl at={[-2.05, 1.32, 0]} r={0.164} len={0.26}>
        <meshStandardMaterial ref={band} color="#f6a41c" metalness={0.2} roughness={0.45} />
      </Cyl>
      {/* Stop valve */}
      <group position={[-2.05, 2.05, 0]}>
        <mesh scale={[1, 0.95, 1]}>
          <sphereGeometry args={[0.27, 28, 20]} />
          <Cast />
        </mesh>
        {[0.26, -0.26].map((y) => (
          <Cyl key={y} at={[0, y, 0]} r={0.25} len={0.07}>
            <Steel color="#aeb7c2" rough={0.35} />
          </Cyl>
        ))}
        <Cyl at={[0, 0, 0.36]} r={0.1} len={0.5} axis="z">
          <Cast />
        </Cyl>
        <Cyl at={[0, 0, 0.66]} r={0.03} len={0.2} axis="z" seg={12}>
          <Steel />
        </Cyl>
        <mesh position={[0, 0, 0.74]}>
          <torusGeometry args={[0.2, 0.024, 10, 32]} />
          <Paint color="#d23c2a" />
        </mesh>
        {[0, Math.PI / 2].map((a) => (
          <Box key={a} at={[0, 0, 0.74]} size={[0.4, 0.03, 0.03]} rot={[0, 0, a]}>
            <Paint color="#d23c2a" />
          </Box>
        ))}
      </group>
      {/* Pipe support */}
      <Box at={[-3.0, (FLOOR + 3.1) / 2, BOILER[2]]} size={[0.1, 3.1 - FLOOR, 0.1]}>
        <Paint color={STRUCT} />
      </Box>
      <Box at={[-3.0, 3.1, BOILER[2]]} size={[0.14, 0.06, 0.5]}>
        <Paint color={STRUCT} />
      </Box>
      <Box at={[-3.0, FLOOR + 0.03, BOILER[2]]} size={[0.36, 0.06, 0.36]}>
        <Cast />
      </Box>
    </group>
  );
}

const stackRadius = (y: number) => 0.32 - 0.1 * ((y - FLOOR) / 7);

function Boiler({ live }: { live: LiveRef }) {
  const fire = useRef<THREE.MeshStandardMaterial>(null);
  const ports = useRef<THREE.MeshStandardMaterial>(null);
  const glow = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const flicker = 0.78 + Math.sin(t * 9) * 0.12 + Math.sin(t * 23) * 0.08;
    const level = 0.6 + live.current.flow * 0.9;
    if (fire.current) fire.current.emissiveIntensity = 2.6 * flicker * level;
    if (ports.current) ports.current.emissiveIntensity = 2 * flicker * level;
    if (glow.current) glow.current.intensity = 5 * flicker * level;
  });
  return (
    <group position={BOILER}>
      <Box at={[0, FLOOR + 0.075, -0.65]} size={[2.9, 0.15, 4.4]}>
        <Concrete />
      </Box>
      {/* Furnace, clad in ribbed sheet */}
      <Box at={[0, -0.1, 0]} size={[1.9, 3.4, 1.9]}>
        <Clad />
      </Box>
      <Repeat
        count={32}
        place={(i, o) => {
          const offset = -0.83 + (i % 8) * (1.66 / 7);
          const f = i >> 3;
          if (f < 2) o.position.set(offset, -0.1, f ? -0.957 : 0.957);
          else {
            o.position.set(f === 2 ? 0.957 : -0.957, -0.1, offset);
            o.rotation.y = Math.PI / 2;
          }
        }}
      >
        <boxGeometry args={[0.04, 3.4, 0.022]} />
        <meshStandardMaterial color="#cfd5dc" metalness={0.8} roughness={0.4} />
      </Repeat>
      {/* Buckstays, columns and roof steel */}
      {[-0.95, 0, 1.0].map((y) => (
        <Box key={y} at={[0, y, 0]} size={[2.06, 0.13, 2.06]}>
          <Paint color={STRUCT} />
        </Box>
      ))}
      {[
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} at={[x * 1.02, -0.075, z * 1.02]} size={[0.14, 3.75, 0.14]}>
          <Paint color={STRUCT} />
        </Box>
      ))}
      <Box at={[0, 1.66, 0]} size={[2.18, 0.1, 2.18]}>
        <Paint color={STRUCT} />
      </Box>
      {/* Steam drum on its saddles, with safety valves */}
      {[-0.6, 0.6].map((x) => (
        <Box key={x} at={[x, 1.82, 0]} size={[0.12, 0.26, 0.7]}>
          <Paint color={STRUCT} />
        </Box>
      ))}
      <Cyl at={[0, 2.15, 0]} r={0.42} len={2.0} axis="x" seg={40}>
        <Clad />
      </Cyl>
      {[-1, 1].map((x) => (
        <mesh key={x} position={[x, 2.15, 0]} scale={[0.42, 1, 1]}>
          <sphereGeometry args={[0.42, 28, 20]} />
          <Clad />
        </mesh>
      ))}
      {[-0.6, -0.2, 0.2, 0.6].map((x) => (
        <Cyl key={x} at={[x, 2.15, 0]} r={0.428} len={0.035} axis="x" seg={40}>
          <Steel color="#aeb7c2" rough={0.35} />
        </Cyl>
      ))}
      {[-0.62, 0.62].map((x) => (
        <group key={x} position={[x, 2.57, 0]}>
          <Cyl at={[0, 0.12, 0]} r={0.06} len={0.28} seg={16}>
            <Steel />
          </Cyl>
          <Cyl at={[0, 0.29, 0]} r={0.08} len={0.1} seg={16}>
            <Paint color="#d23c2a" />
          </Cyl>
        </group>
      ))}
      <Cyl at={[0, 2.58, 0]} r={0.21} len={0.07}>
        <Steel color="#aeb7c2" rough={0.35} />
      </Cyl>
      {/* Downcomers */}
      {[-1.15, 1.15].map((x) => (
        <group key={x}>
          <Cyl at={[x, 0.2, 0.45]} r={0.085} len={3.6} seg={16}>
            <Clad />
          </Cyl>
          <Cyl at={[x * 0.93, 2.0, 0.45]} r={0.085} len={0.36} axis="x" seg={16}>
            <Clad />
          </Cyl>
        </group>
      ))}
      {/* Fire door and sight ports */}
      <Box at={[-0.1, -1.22, 0.985]} size={[0.96, 0.66, 0.09]}>
        <Cast />
      </Box>
      <Box at={[-0.1, -1.22, 1.035]} size={[0.66, 0.36, 0.02]}>
        <meshStandardMaterial ref={fire} color="#ff8a2a" emissive="#ff5a10" emissiveIntensity={2.4} />
      </Box>
      {[-0.55, 0.45].map((x) => (
        <group key={x}>
          <Cyl at={[x, -0.45, 0.975]} r={0.1} len={0.06} axis="z">
            <Cast />
          </Cyl>
          <mesh position={[x, -0.45, 1.01]} rotation={AXIS.z}>
            <cylinderGeometry args={[0.06, 0.06, 0.012, 20]} />
            <meshStandardMaterial ref={x < 0 ? ports : undefined} color="#ff8a2a" emissive="#ff5a10" emissiveIntensity={2} />
          </mesh>
        </group>
      ))}
      <pointLight ref={glow} position={[-0.1, -1.2, 1.7]} color="#ff7a2f" intensity={5} distance={4.5} />
      {/* Operating platform, handrail and ladder */}
      <Box at={[0, 0.085, 1.3]} size={[2.5, 0.05, 0.64]}>
        <meshStandardMaterial color="#7b8794" metalness={0.7} roughness={0.55} />
      </Box>
      {[-1.1, 0, 1.1].map((x) => (
        <Box key={x} at={[x, -0.13, 1.25]} size={[0.06, 0.06, 0.82]} rot={[0.62, 0, 0]}>
          <Paint color={STRUCT} />
        </Box>
      ))}
      <Repeat
        count={5}
        place={(i, o) => {
          o.position.set(-1.2 + i * 0.6, 0.385, 1.58);
        }}
      >
        <cylinderGeometry args={[0.02, 0.02, 0.55, 8]} />
        <Paint color={YELLOW} rough={0.5} />
      </Repeat>
      {[0.66, 0.4].map((y) => (
        <group key={y}>
          <Box at={[0, y, 1.58]} size={[2.44, 0.035, 0.035]}>
            <Paint color={YELLOW} rough={0.5} />
          </Box>
          <Box at={[1.22, y, 1.29]} size={[0.035, 0.035, 0.6]}>
            <Paint color={YELLOW} rough={0.5} />
          </Box>
        </group>
      ))}
      {[1.12, 1.46].map((z) => (
        <Box key={z} at={[-1.36, -0.55, z]} size={[0.035, 2.8, 0.035]}>
          <Paint color={YELLOW} rough={0.5} />
        </Box>
      ))}
      <Repeat
        count={10}
        place={(i, o) => {
          o.position.set(-1.36, -1.75 + i * 0.25, 1.29);
        }}
      >
        <boxGeometry args={[0.026, 0.026, 0.34]} />
        <Paint color={YELLOW} rough={0.5} />
      </Repeat>
      {/* Flue gas path: duct, economiser, stack */}
      <Box at={[0, 1.3, -1.35]} size={[1.0, 0.5, 0.82]}>
        <Clad />
      </Box>
      <Box at={[0, -0.125, -2.25]} size={[1.5, 3.35, 1.0]}>
        <Clad />
      </Box>
      {[-0.9, 0.35].map((y) => (
        <Box key={y} at={[0, y, -2.25]} size={[1.57, 0.09, 1.07]}>
          <Paint color={STRUCT} />
        </Box>
      ))}
      <Box at={[1.15, -1.45, -2.25]} size={[0.9, 0.46, 0.5]}>
        <Clad />
      </Box>
    </group>
  );
}

function Stack() {
  const height = 7;
  const top = FLOOR + height;
  return (
    <group position={STACK}>
      <Cyl at={[0, FLOOR + 0.15, 0]} r={0.46} len={0.3}>
        <Concrete />
      </Cyl>
      <Cyl at={[0, FLOOR + height / 2, 0]} r={stackRadius(FLOOR)} r2={stackRadius(top)} len={height} seg={36}>
        <Paint color="#dfe3e8" rough={0.5} />
      </Cyl>
      {[0.2, 2.2].map((y) => (
        <Cyl key={y} at={[0, y, 0]} r={stackRadius(y) + 0.02} len={0.06} seg={36}>
          <Steel color="#aeb7c2" rough={0.4} />
        </Cyl>
      ))}
      {/* Red aviation bands near the top */}
      {[top - 0.5, top - 1.5].map((y) => (
        <Cyl key={y} at={[0, y + 0.25, 0]} r={stackRadius(y) + 0.004} r2={stackRadius(y + 0.5) + 0.004} len={0.5} seg={36}>
          <Paint color="#d23c2a" rough={0.5} />
        </Cyl>
      ))}
      <Cyl at={[0, top, 0]} r={stackRadius(top) + 0.02} len={0.05} seg={36}>
        <Cast />
      </Cyl>
    </group>
  );
}

/* Scene */

let fade: THREE.Texture | null = null;
/** Lets the plant floor melt into the page instead of ending at an edge. */
function floorFade() {
  if (fade) return fade;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(0.3, "#fff");
  grad.addColorStop(0.9, "#000");
  grad.addColorStop(1, "#000");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  fade = new THREE.CanvasTexture(c);
  return fade;
}

function Floor() {
  const alpha = useMemo(() => floorFade(), []);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR, 0]} renderOrder={-1}>
        <circleGeometry args={[7.6, 72]} />
        <meshStandardMaterial color="#e6ebf0" metalness={0} roughness={1} alphaMap={alpha} transparent />
      </mesh>
      {/* Turbine and generator foundation */}
      <Box at={[1.0, (FLOOR + SLAB_TOP) / 2, 0]} size={[8.7, SLAB_TOP - FLOOR, 2.5]}>
        <Concrete />
      </Box>
    </>
  );
}

function Plant({ live }: { live: LiveRef }) {
  const root = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    root.current?.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }, []);
  return (
    <group ref={root} position={[-0.25, -0.15, 0.6]}>
      <Floor />
      <Boiler live={live} />
      <Stack />
      <SteamMain live={live} />
      <Rotor live={live} />
      <Casing live={live} />
      <Fixed />
      <Exhaust />
      <Generator live={live} />
      <Steam live={live} />
      <Plume origin={[STACK[0], FLOOR + 7.05, STACK[2]]} rise={2.3} spread={0.5} drift={1.0} color="#f3f6f9" strength={0.6} live={live} />
      <Plume origin={[-1.84, 0.4, 0]} rise={0.75} spread={0.14} drift={0.1} color="#ffffff" count={26} size={0.9} strength={0.5} live={live} />
      <Plume origin={[1.62, 0.4, 0]} rise={0.75} spread={0.14} drift={0.1} color="#ffffff" count={26} size={0.9} strength={0.5} live={live} />
    </group>
  );
}

/** Gentle swing limits for the camera, in radians around the plant. */
const SWING: [number, number] = [0.2, 0.8];

function Camera() {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    // Turn back at each end instead of circling round to the back of the plant.
    const a = c.getAzimuthalAngle();
    if (a > SWING[1] - 0.02) c.autoRotateSpeed = Math.abs(c.autoRotateSpeed);
    else if (a < SWING[0] + 0.02) c.autoRotateSpeed = -Math.abs(c.autoRotateSpeed);
  });
  return <OrbitControls ref={controls} enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.35} minAzimuthAngle={SWING[0]} maxAzimuthAngle={SWING[1]} minPolarAngle={1.05} maxPolarAngle={1.5} target={[0, 1.1, 0]} />;
}

function Scene({ live }: { live: LiveRef }) {
  return (
    <>
      {/* A bright plant hall to reflect in the metal: overhead bays, side windows, a warm fill from the front */}
      <Environment resolution={256} frames={1}>
        <mesh scale={60}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color="#93a6ba" side={THREE.BackSide} />
        </mesh>
        <mesh position={[0, -6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[60, 32]} />
          <meshBasicMaterial color="#6f7a86" />
        </mesh>
        <Lightformer form="rect" intensity={3.2} position={[0, 9, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[16, 10, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[-11, 3, 3]} rotation={[0, Math.PI / 2, 0]} scale={[12, 7, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[11, 4, 1]} rotation={[0, -Math.PI / 2, 0]} scale={[12, 7, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#ffe6d1" position={[2, 3, 12]} rotation={[0, Math.PI, 0]} scale={[14, 6, 1]} />
      </Environment>
      <hemisphereLight args={["#ffffff", "#b7c0ca", 0.25]} />
      <directionalLight position={[6, 11, 8]} intensity={2.7} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03}>
        <orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -10, 0.5, 45]} />
      </directionalLight>
      <Plant live={live} />
      <ContactShadows position={[0, FLOOR - 0.14, 0]} opacity={0.42} scale={24} blur={2.4} far={3} color="#1c2a3d" />
    </>
  );
}

/** Interactive 3D steam plant. Values in `live` are read every frame, so updating them never re-renders. */
export default function Turbine3D({ live, className }: { live: LiveRef; className?: string }) {
  return (
    <Canvas className={className} dpr={[1, 1.75]} shadows camera={{ position: [11.4, 6.5, 20.8], fov: 24 }} gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping }}>
      <Scene live={live} />
      <Camera />
    </Canvas>
  );
}
