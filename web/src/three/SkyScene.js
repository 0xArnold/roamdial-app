// three.js 流派星云：单 BufferGeometry 数万粒子，自定义 shader 闪烁/软圆，
// UnrealBloom 辉光；筛选只改 alpha 属性（带动画过渡）；流派标签 DOM 投影。
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Data } from '../data.js';
import { genreName } from '../i18n.js';
import { makePointsMaterial, makeStarfield } from './materials.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class SkyScene {
  constructor(renderer, labels) {
    this.renderer = renderer;
    this.labels = labels;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 10, 30000);
    this.camera.position.set(0, 0, 5600);

    this.pan = { x: 0, y: 0 };
    this.panTarget = { x: 0, y: 0 };
    this.dist = 5600;
    this.distTarget = 5600;

    this.scene.background = makeBgTexture();

    // 背景星尘（两层视差）
    this.starMatA = makePointsMaterial(renderer.getPixelRatio(), 12000);
    this.starMatB = makePointsMaterial(renderer.getPixelRatio(), 17000);
    this.starsA = new THREE.Points(makeStarfield(6000, 9000), this.starMatA);
    this.starsB = new THREE.Points(makeStarfield(500, 14000), this.starMatB);
    this.starsA.position.z = -6000;
    this.starsB.position.z = -11000;
    this.starMatA.uniforms.uBrightness.value = 0.13;
    this.starMatB.uniforms.uBrightness.value = 0.13;
    this.scene.add(this.starsA); this.scene.add(this.starsB);

    // 流派星云粒子
    this._buildPoints();

    // 后处理：辉光
    this.useBloom = window.innerWidth > 700;
    if (this.useBloom) {
      this.composer = new EffectComposer(renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.4, 0.25);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }

    this.selected = null;
    this._tmp = new THREE.Vector3();
    this._bindControls(renderer.domElement);
  }

  _buildPoints() {
    const s = Data.sky;
    if (!s) return;
    const n = s.x.length;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = s.x[i];
      pos[i * 3 + 1] = s.y[i];
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(s.size, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(s.phase, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(s.color, 3));
    const counts = new Map(Data.genres.map(g => [g.key, g.count]));
    this._baseAlpha = Float32Array.from(Data.stations, st => Math.min(1, Math.max(0.5, Math.pow(1000 / (counts.get(st.genre) || 1), 0.24))));
    const alpha = this._baseAlpha.slice();
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
    this._alpha = alpha;
    this._alphaTarget = this._baseAlpha.slice();
    this.pointCount = n;
    this.pointMat = makePointsMaterial(this.renderer.getPixelRatio(), 5800);
    this.pointMat.uniforms.uBrightness.value = 0.95;
    this.points = new THREE.Points(geo, this.pointMat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  setVisibleMask(fn) {
    if (!this._alphaTarget) return;
    const sts = Data.stations;
    for (let i = 0; i < this.pointCount; i++) {
      this._alphaTarget[i] = fn(sts[i]) ? this._baseAlpha[i] : 0;
    }
  }

  _bindControls(el) {
    let last = null, pinch = null;
    el.addEventListener('pointerdown', e => {
      el.setPointerCapture(e.pointerId);
      last = { x: e.clientX, y: e.clientY };
    });
    el.addEventListener('pointermove', e => {
      if (!last) return;
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      const k = 1.15 / (this.dist / 5600);
      this.panTarget.x -= dx * k;
      this.panTarget.y += dy * k;
    });
    const up = e => { last = null; try { el.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ } };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', e => {
      e.preventDefault();
      this.distTarget = clamp(this.distTarget * Math.exp(e.deltaY * 0.0012), 1400, 12000);
    }, { passive: false });
    el.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    }, { passive: true });
    el.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && pinch) {
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        this.distTarget = clamp(this.distTarget * d / pinch, 1400, 12000);
        pinch = d;
      }
    }, { passive: false });
    el.addEventListener('touchend', () => { pinch = null; }, { passive: true });
  }

  setSelected(station) { this.selected = station || null; }

  focusStation(s, zoom) {
    if (!s) return;
    const p = Data.sky;
    const idx = Data.stations.indexOf(s);
    if (idx < 0) return;
    this.panTarget.x = p.x[idx];
    this.panTarget.y = p.y[idx];
    if (zoom) this.distTarget = clamp(zoom, 1400, 12000);
  }

  // 准星拾取
  // 相机无旋转、lookAt 原点，投影退化为纯缩放平移（闭式解，省去每点矩阵乘法）
  pickCenter() {
    if (!this.points) return null;
    const w = this.renderer.domElement.clientWidth, h = this.renderer.domElement.clientHeight;
    const cx = w / 2, cy = h / 2;
    const cam = this.camera;
    const pos = this.points.geometry.attributes.position.array;
    // 屏幕缩放系数：f = (h/2)/tan(fov/2)，screen = (world-pan)*f/dist + center
    const f = (h / 2) / Math.tan((cam.fov * Math.PI / 180) / 2);
    const k = f / this.dist;
    const ox = this.pan.x, oy = this.pan.y;
    let best = -1, bestD = 46;
    for (let i = 0; i < this.pointCount; i++) {
      if (this._alpha && this._alpha[i] < 0.4) continue;
      const sx = (pos[i * 3] - ox) * k + cx;
      const sy = -(pos[i * 3 + 1] - oy) * k + cy;
      const d = Math.hypot(sx - cx, sy - cy);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best < 0) return null;
    return { station: Data.stations[best], px: Math.round(bestD) };
  }

  nudge(station, dir) {
    return Data.nudgeNeighbor(station, dir);
  }

  update(dt, t) {
    const k = 1 - Math.exp(-dt * 7);
    this.pan.x += (this.panTarget.x - this.pan.x) * k;
    this.pan.y += (this.panTarget.y - this.pan.y) * k;
    this.dist += (this.distTarget - this.dist) * k;
    this.camera.position.set(this.pan.x, this.pan.y, this.dist);
    this.camera.lookAt(this.pan.x, this.pan.y, 0);
    this.pointMat.uniforms.uTime.value = t;
    this.starMatA.uniforms.uTime.value = t;
    this.starMatB.uniforms.uTime.value = t;
    this.starsA.position.x = this.pan.x * 0.06;
    this.starsA.position.y = this.pan.y * 0.06;
    this.starsB.position.x = this.pan.x * 0.03;
    this.starsB.position.y = this.pan.y * 0.03;

    // 筛选过渡
    if (this._alpha) {
      let dirty = false;
      for (let i = 0; i < this.pointCount; i++) {
        const d = this._alphaTarget[i] - this._alpha[i];
        if (Math.abs(d) > 0.002) { this._alpha[i] += d * Math.min(1, dt * 9); dirty = true; }
        else if (this._alpha[i] !== this._alphaTarget[i]) { this._alpha[i] = this._alphaTarget[i]; dirty = true; }
      }
      if (dirty) this.points.geometry.attributes.aAlpha.needsUpdate = true;
    }

    this._updateLabels();
  }

  _updateLabels() {
    const items = [];
    const w = this.renderer.domElement.clientWidth, h = this.renderer.domElement.clientHeight;
    const cam = this.camera;
    const tmp = this._tmp;
    // 流派标签
    const showLabels = this.dist > 2100;
    if (showLabels) {
      for (const cl of Data.skyClusters) {
        tmp.set(cl.x, cl.y, 0).project(cam);
        if (tmp.z > 1) continue;
        const sx = (tmp.x * 0.5 + 0.5) * w, sy = (-tmp.y * 0.5 + 0.5) * h;
        if (sx < 40 || sx > w - 40 || sy < 115 || sy > h - 100) continue;
        if (sx < Math.min(560, w * 0.45) && sy > h - 350) continue;
        const d = Math.hypot(sx - w / 2, sy - h / 2) / Math.max(w, h);
        const op = clamp(1 - d * 1.15, 0, 1) * clamp((this.dist - 2100) / 1400, 0, 1);
        if (op < 0.04) continue;
        items.push({
          x: sx, y: sy - 14,
          name: genreName(cl.key),
          meta: `${cl.count.toLocaleString('en-US')}`,
          cls: 'genre',
          opacity: op
        });
      }
    }
    // 选中台
    if (this.selected) {
      const i = Data.stations.indexOf(this.selected);
      if (i >= 0) {
        const pos = this.points.geometry.attributes.position.array;
        tmp.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).project(cam);
        const sx = (tmp.x * 0.5 + 0.5) * w, sy = (-tmp.y * 0.5 + 0.5) * h;
        items.push({
          x: sx, y: sy - 10,
          name: this.selected.name,
          meta: this._selMetaText || '',
          cls: 'sel',
          opacity: 1
        });
      }
    }
    this.labels.update(items);
  }

  setSelMetaText(text) { this._selMetaText = text; }

  setAudioLevel(level) {
    this.pointMat.uniforms.uAudio.value = level;
    if (this.bloom) this.bloom.strength = 0.34 + level * 0.24;
  }

  render(dt) {
    if (this.useBloom && this.composer) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.composer) this.composer.setSize(w, h);
    if (this.bloom) this.bloom.resolution.set(w, h);
  }
}

function makeBgTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(256, 200, 0, 256, 256, 380);
  g.addColorStop(0, '#142a26');
  g.addColorStop(0.55, '#10221e');
  g.addColorStop(1, '#0b1715');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
