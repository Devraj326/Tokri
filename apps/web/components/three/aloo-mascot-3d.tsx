'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useLowMotion } from '../../hooks/use-reduced-motion';

export type MascotState = 'idle' | 'watch' | 'happy' | 'tilt' | 'cover' | 'peek' | 'shake' | 'jump';

interface Api {
  state: MascotState;
  look: number;
  t: number;
}

function outlineMat() {
  return new THREE.MeshBasicMaterial({ color: 0x1b1a17, side: THREE.BackSide });
}
function withOutline(mesh: THREE.Mesh, s = 1.06) {
  const o = new THREE.Mesh(mesh.geometry, outlineMat());
  o.scale.setScalar(s);
  mesh.add(o);
  return mesh;
}
function fitRenderer(r: THREE.WebGLRenderer, cam: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  if (canvas.width !== Math.floor(w * r.getPixelRatio()) || canvas.height !== Math.floor(h * r.getPixelRatio())) {
    r.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  }
}
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export function AlooMascot3D({ state, look, className }: { state: MascotState; look: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<Api>({ state: 'idle', look: 0.5, t: 0 });
  const lowMotion = useLowMotion();

  useEffect(() => {
    if (apiRef.current.state !== state) {
      apiRef.current.state = state;
      apiRef.current.t = 0;
    }
    apiRef.current.look = look;
  }, [state, look]);

  useEffect(() => {
    if (lowMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const api = apiRef.current;

    const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    cam.position.set(0, 0.35, 6.4);
    cam.lookAt(0, 0.05, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dl = new THREE.DirectionalLight(0xffffff, 0.65);
    dl.position.set(2, 3, 4);
    scene.add(dl);
    const toon = (c: number) => new THREE.MeshToonMaterial({ color: c });
    const root = new THREE.Group();
    scene.add(root);

    const g = new THREE.SphereGeometry(1, 48, 32);
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = 0.06 * Math.sin(v.x * 3.1 + v.y * 2.3) + 0.04 * Math.sin(v.z * 4.7 + v.y * 3.3);
      v.multiplyScalar(1 + n);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const bodyMesh = new THREE.Mesh(g, toon(0xd3a464));
    withOutline(bodyMesh, 1.045);
    bodyMesh.scale.set(1, 0.9, 0.88);
    root.add(bodyMesh);

    [[0.55, 0.5, 0.6], [-0.72, -0.15, 0.58], [0.25, -0.58, 0.72], [-0.35, 0.68, 0.58], [0.8, -0.2, 0.45]].forEach(([x, y, z]) => {
      const s = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), new THREE.MeshBasicMaterial({ color: 0x8e5e2c }));
      const p = new THREE.Vector3(x, y, z).normalize().multiplyScalar(1.07);
      s.position.set(p.x, p.y * 0.9, p.z * 0.88);
      s.lookAt(p.clone().multiplyScalar(3));
      root.add(s);
    });

    const eyes: { e: THREE.Group; p: THREE.Mesh }[] = [];
    [-1, 1].forEach((sd) => {
      const e = new THREE.Group();
      e.position.set(0.3 * sd, 0.2, 0.8);
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      w.scale.z = 0.55;
      withOutline(w, 1.14);
      e.add(w);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 12), new THREE.MeshBasicMaterial({ color: 0x1b1a17 }));
      p.position.z = 0.1;
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl.position.set(0.03, 0.04, 0.08);
      p.add(hl);
      e.add(p);
      root.add(e);
      eyes.push({ e, p });
    });

    const brows = [-1, 1].map((sd) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: 0x1b1a17 }));
      b.position.set(0.3 * sd, 0.47, 0.84);
      root.add(b);
      return b;
    });

    [-1, 1].forEach((sd) => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), new THREE.MeshBasicMaterial({ color: 0xe8897a }));
      c.position.set(0.55 * sd, -0.08, 0.75);
      c.lookAt(1.5 * sd, -0.2, 3);
      root.add(c);
    });
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.032, 8, 24, Math.PI), new THREE.MeshBasicMaterial({ color: 0x1b1a17 }));
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, -0.12, 0.86);
    root.add(mouth);

    const hands = [-1, 1].map((sd) => {
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), toon(0xc9944f));
      withOutline(h, 1.12);
      root.add(h);
      (h.userData as { sd: number }).sd = sd;
      return h;
    });
    [-1, 1].forEach((sd) => {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), toon(0xb98445));
      f.scale.set(1, 0.5, 1.3);
      withOutline(f, 1.1);
      f.position.set(0.38 * sd, -0.9, 0.15);
      root.add(f);
    });
    const sweat = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: 0x6fb3e0 }));
    sweat.scale.y = 1.4;
    sweat.position.set(0.8, 0.55, 0.55);
    sweat.visible = false;
    root.add(sweat);

    let last = performance.now();
    let blinkAt = 2;
    const REST = (sd: number): [number, number, number] => [1.08 * sd, -0.3, 0.3];
    const COVER = (sd: number): [number, number, number] => [0.3 * sd, 0.2, 1.02];

    let raf = 0;
    let disposed = false;
    const frame = (now: number) => {
      if (disposed) return;
      fitRenderer(r, cam, canvas);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      api.t += dt;
      const t = now / 1000;
      const s = api.state;
      const st = api.t;
      let yaw = Math.sin(t * 0.6) * 0.15;
      let pitch = 0;
      let py = Math.sin(t * 2) * 0.03;
      let roll = 0;
      let px = 0;
      let pyy = 0;
      let mouthS = 1;
      if (s === 'watch' || s === 'happy') {
        yaw = -0.55 + api.look * 0.65;
        pitch = 0.28;
        px = -0.03 + api.look * 0.05;
        pyy = -0.04;
      }
      if (s === 'happy') {
        pitch += Math.sin(st * 12) * 0.14 * Math.max(0, 1 - st / 1.1);
        mouthS = 1.3;
      }
      if (s === 'tilt') {
        roll = 0.28;
        yaw = -0.3;
        pitch = 0.2;
        mouthS = 0.6;
      }
      if (s === 'cover' || s === 'peek') {
        yaw = 0;
        pitch = 0.08;
      }
      if (s === 'shake') {
        yaw = Math.sin(st * 24) * 0.45 * Math.max(0, 1 - st / 0.9);
        mouthS = 0.5;
      }
      if (s === 'jump') {
        py = Math.abs(Math.sin(st * 7)) * 0.7 * Math.max(0, 1 - st / 1.5);
        mouthS = 1.5;
      }
      root.rotation.y = s === 'jump' ? Math.min(st / 0.7, 1) * Math.PI * 2 : lerp(root.rotation.y, yaw, 0.15);
      root.rotation.x = lerp(root.rotation.x, pitch, 0.15);
      root.rotation.z = lerp(root.rotation.z, roll, 0.12);
      root.position.y = lerp(root.position.y, py - 0.1, 0.3);
      mouth.scale.x = lerp(mouth.scale.x, mouthS, 0.2);
      sweat.visible = s === 'shake';
      if (sweat.visible) sweat.position.y = 0.55 - st * 0.4;
      brows.forEach((b, i) => {
        b.rotation.z = lerp(b.rotation.z, s === 'tilt' ? (i ? -0.35 : 0.2) : s === 'shake' ? (i ? 0.3 : -0.3) : 0, 0.2);
        b.position.y = lerp(b.position.y, s === 'happy' || s === 'jump' ? 0.53 : 0.47, 0.2);
      });
      hands.forEach((h) => {
        const sd = (h.userData as { sd: number }).sd;
        let tgt = REST(sd);
        if (s === 'idle' && t % 6 < 1.4 && sd === 1) tgt = [1.15, 0.45 + Math.sin(t * 14) * 0.12, 0.3];
        if (s === 'cover') tgt = COVER(sd);
        if (s === 'peek') tgt = sd === 1 ? [0.42, -0.12, 1.0] : COVER(sd);
        if (s === 'jump') tgt = [1.1 * sd, 0.7, 0.2];
        h.position.x = lerp(h.position.x, tgt[0], 0.18);
        h.position.y = lerp(h.position.y, tgt[1], 0.18);
        h.position.z = lerp(h.position.z, tgt[2], 0.18);
      });
      eyes.forEach(({ p }) => {
        p.position.x = lerp(p.position.x, px, 0.25);
        p.position.y = lerp(p.position.y, pyy, 0.25);
      });
      const blink = t > blinkAt && t < blinkAt + 0.12;
      if (t > blinkAt + 0.12) blinkAt = t + 2 + Math.random() * 3;
      eyes.forEach(({ e }) => (e.scale.y = blink ? 0.12 : 1));
      r.render(scene, cam);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      r.dispose();
    };
  }, [lowMotion]);

  if (lowMotion) {
    const covered = state === 'cover' || state === 'peek';
    return (
      <svg viewBox="0 0 200 200" className={className} aria-hidden>
        <ellipse cx="100" cy="105" rx="90" ry="78" fill="#D3A464" stroke="#1B1A17" strokeWidth={4} />
        {[-1, 1].map((sd) => (
          <g key={sd}>
            <circle cx={100 + 32 * sd} cy="90" r="18" fill="#fff" stroke="#1B1A17" strokeWidth={3} />
            <circle cx={100 + 32 * sd + (look - 0.5) * 14} cy="94" r="7" fill="#1B1A17" />
          </g>
        ))}
        {covered && [-1, 1].map((sd) => <circle key={sd} cx={100 + 32 * sd} cy={state === 'peek' && sd === 1 ? 108 : 86} r="24" fill="#C9944F" stroke="#1B1A17" strokeWidth={3} />)}
      </svg>
    );
  }

  return <canvas ref={canvasRef} className={className} aria-label="Aloo the mascot" role="img" />;
}
