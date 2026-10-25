'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useLowMotion } from '../../hooks/use-reduced-motion';

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

export function BasketCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lowMotion = useLowMotion();

  useEffect(() => {
    if (lowMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
    cam.position.set(0, 4.2, 8.6);
    cam.lookAt(0, 0.9, 0);
    // Intensities boosted vs. the original prototype: that was built on three.js r128
    // (non-physically-correct lighting); modern three.js always uses physically
    // correct lighting, which renders the same numeric intensities noticeably darker.
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const dl = new THREE.DirectionalLight(0xffffff, 1.8);
    dl.position.set(3, 6, 4);
    scene.add(dl);

    const tc = document.createElement('canvas');
    tc.width = tc.height = 128;
    const x = tc.getContext('2d')!;
    for (let i = 0; i < 8; i++) {
      x.fillStyle = i % 2 ? '#C9714A' : '#E0A060';
      x.fillRect(0, i * 16, 128, 16);
    }
    x.strokeStyle = 'rgba(27,26,23,.55)';
    x.lineWidth = 3;
    for (let i = 0; i <= 8; i++) {
      x.beginPath();
      x.moveTo(i * 16 + (i % 2 ? 4 : 0), 0);
      x.lineTo(i * 16 + (i % 2 ? 4 : 0), 128);
      x.stroke();
    }
    const tex = new THREE.CanvasTexture(tc);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 2);

    const basket = new THREE.Group();
    scene.add(basket);
    const pts = [
      [0, 0], [1.25, 0], [1.55, 0.25], [1.8, 0.85], [2, 1.5],
    ].map(([a, b]) => new THREE.Vector2(a, b));
    const shell = new THREE.Mesh(new THREE.LatheGeometry(pts, 56), new THREE.MeshToonMaterial({ map: tex, side: THREE.DoubleSide }));
    const ol = new THREE.Mesh(shell.geometry, outlineMat());
    ol.scale.set(1.03, 1.02, 1.03);
    basket.add(ol);
    basket.add(shell);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2, 0.1, 12, 72), new THREE.MeshToonMaterial({ color: 0x8e4a2a }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 1.5;
    withOutline(rim, 1.15);
    basket.add(rim);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.08, 10, 48, Math.PI), new THREE.MeshToonMaterial({ color: 0x8e4a2a }));
    handle.position.y = 1.5;
    withOutline(handle, 1.2);
    basket.add(handle);

    const toon = (c: number) => new THREE.MeshToonMaterial({ color: c });
    const makers: (() => THREE.Mesh)[] = [
      () => {
        const m = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 14), toon(0xd7372b)));
        const s = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.14, 5), toon(0x3e7a47));
        s.position.y = 0.38;
        m.add(s);
        return m;
      },
      () => {
        const m = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 14), toon(0xd3a464)));
        m.scale.set(1.25, 0.85, 0.95);
        return m;
      },
      () => withOutline(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.32), toon(0xf6f1e7)), 1.08),
      () => withOutline(new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.5), toon(0xd9a35b)), 1.08),
      () => {
        const m = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.55, 12), toon(0xf2b705)), 1.12);
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), toon(0x9a9a9a));
        sh.position.y = 0.55;
        m.add(sh);
        return m;
      },
      () => {
        const m = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 14), toon(0xb5485e)));
        const s = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 8), toon(0xb5485e));
        s.position.y = 0.4;
        m.add(s);
        return m;
      },
      () => withOutline(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.6), toon(0xf2d06b)), 1.08),
    ];

    type Item = { m: THREE.Mesh; vy: number; ty: number; done: boolean; spin: number };
    let items: Item[] = [];
    let spawnT = 0;
    let count = 0;
    let clearT = 0;
    let last = performance.now();
    let mk = 0;

    const spawn = (settled: boolean) => {
      const m = makers[mk++ % makers.length]();
      const a = Math.random() * Math.PI * 2;
      const rad = Math.random() * 0.85;
      const ty = 0.4 + Math.min(count, 10) * 0.09;
      m.position.set(Math.cos(a) * rad, settled ? ty : 6, Math.sin(a) * rad);
      m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      basket.add(m);
      items.push({ m, vy: 0, ty, done: settled, spin: (Math.random() - 0.5) * 6 });
      count++;
    };

    let scrollRot = 0;
    const stage = document.getElementById('app-stage') ?? window;
    const onScroll = () => {
      const top = stage === window ? window.scrollY : (stage as HTMLElement).scrollTop;
      scrollRot = top * 0.004;
    };
    stage.addEventListener('scroll', onScroll, { passive: true });

    let raf = 0;
    let disposed = false;
    const frame = (now: number) => {
      if (disposed) return;
      fitRenderer(r, cam, canvas);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      spawnT += dt;
      if (count < 11 && spawnT > 0.55) {
        spawnT = 0;
        spawn(false);
      }
      if (count >= 11 && items.every((i) => i.done)) {
        clearT += dt;
        if (clearT > 2.2) {
          items.forEach((i) => basket.remove(i.m));
          items = [];
          count = 0;
          clearT = 0;
        }
      }
      items.forEach((i) => {
        if (i.done) return;
        i.vy -= 18 * dt;
        i.m.position.y += i.vy * dt;
        i.m.rotation.x += i.spin * dt;
        i.m.rotation.z += i.spin * 0.6 * dt;
        if (i.m.position.y <= i.ty) {
          i.m.position.y = i.ty;
          i.vy = -i.vy * 0.32;
          if (Math.abs(i.vy) < 0.8) i.done = true;
        }
      });
      basket.rotation.y = (now / 1000) * 0.18 + scrollRot;
      basket.rotation.x = 0.08;
      r.render(scene, cam);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      stage.removeEventListener('scroll', onScroll);
      r.dispose();
    };
  }, [lowMotion]);

  if (lowMotion) {
    return (
      <div className={className} style={{ display: 'grid', placeItems: 'center' }}>
        <svg viewBox="0 0 80 80" style={{ width: 160 }} aria-hidden>
          <path d="M12 36h56l-5 28H17z" fill="#C9714A" stroke="#1B1A17" strokeWidth={2.5} strokeLinejoin="round" />
          <path d="M22 36c0-10 8-16 18-16s18 6 18 16" fill="#E3DACB" stroke="#1B1A17" strokeWidth={2.5} strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  return <canvas ref={canvasRef} className={className} aria-label="Groceries tumbling into a woven basket" role="img" />;
}
