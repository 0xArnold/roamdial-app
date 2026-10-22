// three.js 点阵地球：暗面球体 + 受照暖光 + 青色大气 + 数万电台光点 + 惯性旋转 + 标签投影
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import landPoints from '../assets/land-points.json';
import { Data } from '../data.js';
import { makePointsMaterial, makeGlobeMaterial, makeAtmosphereMaterial, makeGraticule, makeStarfield } from './materials.js';

const D2R = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class GlobeScene {
  constructor(renderer, labels) {
    this.renderer = renderer;
    this.labels = labels;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c1917);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.05, 200);
    this.camera.position.set(0, 0, 2.9);

    this.rot = { lon: 105, lat: 18 };
    this.target = { lon: 105, lat: 18 };
    this.dist = 4.0;
    this.targetDist = 4.0;

    this.world = new THREE.Group();
    this.scene.add(this.world);

    // 球体与大气
    this.sphere = new THREE.Mesh(new THREE.SphereGeometry(0.997, 72, 48), makeGlobeMaterial());
    this.sphere.material.transparent = true;
    // Draw the fading surface before transparent land/station particles.
    this.sphere.renderOrder = -10;
    this.world.add(this.sphere);
    this.atmo = new THREE.Mesh(new THREE.SphereGeometry(1.025, 72, 48), makeAtmosphereMaterial());
    this.scene.add(this.atmo);
    this._buildLand();

    // 背景星空
    const starMat = makePointsMaterial(renderer.getPixelRatio(), 90);
    this.starMat = starMat;
    starMat.uniforms.uBrightness.value = 0.6;
    this.stars = new THREE.Points(makeStarfield(12000, 46), starMat);
    this.scene.add(this.stars);

    // 电台点阵
    this._buildPoints();
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.65, 0.32);
    this.composer.addPass(this.bloom);
    this.audioLevel = 0;

    // 选中标记：固定刻度圆环与音频驱动光核
    this.marker = new THREE.Group();
    this.marker.visible = false;
    const ringTex = makeRingTexture();
    this.ring1 = new THREE.Sprite(new THREE.SpriteMaterial({
      map: ringTex, color: 0xf5f1e8, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
    }));
    this.ring2 = this.ring1.clone();
    this.ring2.material = this.ring1.material.clone();
    this.ring2.material.map = makeGlowTexture();
    this.ring2.material.opacity = 0.65;
    this.marker.add(this.ring1); this.marker.add(this.ring2);
    this.scene.add(this.marker);

    this.selected = null;
    this.nearby = [];
    this._tmp = new THREE.Vector3();
    this._wp = new THREE.Vector3();
    this._mk = new THREE.Vector3();
    this._bindControls(renderer.domElement);
  }

  _buildLand() {
    const pos = [], colors = [];
    for (let i = 0; i < landPoints.length; i += 2) {
      const lon = landPoints[i] * D2R, lat = landPoints[i + 1] * D2R;
      pos.push(Math.cos(lat) * Math.sin(lon) * 1.001, Math.sin(lat) * 1.001, Math.cos(lat) * Math.cos(lon) * 1.001);
      colors.push(0.34, 0.43, 0.39);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: 0.009, vertexColors: true, transparent: true, opacity: 0.18, depthWrite: false });
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (length(gl_PointCoord - 0.5) > 0.5) discard;');
    };
    this.landMaterial = material;
    this.world.add(new THREE.Points(geometry, material));
  }

  _buildPoints() {
    const g = Data.globe;
    if (!g) return;
    const n = g.stIdx.length;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(g.pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(g.size, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(g.color, 3));
    const alpha = new Float32Array(n).fill(1);
    const phase = new Float32Array(n);
    for (let i = 0; i < n; i++) phase[i] = Math.random() * Math.PI * 2;
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    this._alpha = alpha; this._alphaTarget = new Float32Array(n).fill(1);
    this.pointCount = n;
    this.pointMat = makePointsMaterial(this.renderer.getPixelRatio(), 7.0);
    this.pointMat.uniforms.uBrightness.value = 0.45;
    this.pointMat.uniforms.uSoftness.value = 1.0;
    this.points = new THREE.Points(geo, this.pointMat);
    this.points.frustumCulled = false;
    this.world.add(this.points);
  }

  setVisibleMask(fn) {
    if (!this._alphaTarget) return;
    const sts = Data.stations;
    for (let i = 0; i < this.pointCount; i++) {
      this._alphaTarget[i] = fn(sts[Data.globe.stIdx[i]]) ? 1 : 0;
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
      const k = 0.32 / (this.dist * 0.85);
      this.target.lon += dx * k;
      this.target.lat = clamp(this.target.lat + dy * k, -84, 84);
    });
    const up = e => { last = null; try { el.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ } };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', e => {
      e.preventDefault();
      this.targetDist = clamp(this.targetDist * Math.exp(e.deltaY * 0.0011), 1.75, 4.6);
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
        this.targetDist = clamp(this.targetDist * d / pinch, 1.75, 4.6);
        pinch = d;
      }
    }, { passive: false });
    el.addEventListener('touchend', () => { pinch = null; }, { passive: true });
  }

  setSelected(station, nearby) {
    this.selected = station || null;
    this.nearby = nearby || [];
    this.marker.visible = !!station && Number.isFinite(station.elng);
  }

  focusStation(s) {
    if (!s || !Number.isFinite(s.elng) || !Number.isFinite(s.elat)) return;
    let dLon = ((s.elng - this.target.lon + 540) % 360) - 180;
    this.target.lon += dLon;
    this.target.lat = clamp(s.elat, -62, 62);
    this.targetDist = Math.min(this.targetDist, 2.4);
  }

  // 准星拾取：返回 {station, px}
  pickCenter() {
    if (!this.points) return null;
    const cam = this.camera;
    const w = this.renderer.domElement.clientWidth, h = this.renderer.domElement.clientHeight;
    const cx = w / 2, cy = h / 2;
    const camPos = cam.position;
    const wp = this._wp, tmp = this._tmp;
    const pos = Data.globe.pos;
    const m = this.world.matrixWorld;
    let best = -1, bestD = 44;
    for (let i = 0; i < this.pointCount; i++) {
      if (this._alpha && this._alpha[i] < 0.4) continue;
      wp.fromArray(pos, i * 3).applyMatrix4(m);
      if (wp.dot(camPos) < 1.0) continue;   // 背面
      tmp.copy(wp).project(cam);
      if (tmp.z > 1) continue;
      const sx = (tmp.x * 0.5 + 0.5) * w;
      const sy = (-tmp.y * 0.5 + 0.5) * h;
      const d = Math.hypot(sx - cx, sy - cy);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best < 0) return null;
    return { station: Data.stations[Data.globe.stIdx[best]], px: Math.round(bestD) };
  }

  nudge(station, dir) {
    return Data.nudgeNeighbor(station, dir);
  }

  update(dt, t) {
    const k = 1 - Math.exp(-dt * 7);
    this.rot.lon += (this.target.lon - this.rot.lon) * k;
    this.rot.lat += (this.target.lat - this.rot.lat) * k;
    this.dist += (this.targetDist - this.dist) * k;
    this.camera.position.set(0, 0, this.dist);
    this.world.rotation.y = -this.rot.lon * D2R;
    this.world.rotation.x = this.rot.lat * D2R;
    this.world.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    this.pointMat.uniforms.uTime.value = t;
    this.starMat.uniforms.uTime.value = t;
    this.stars.rotation.y = t * 0.004;

    // 筛选淡入淡出
    if (this._alpha) {
      let dirty = false;
      for (let i = 0; i < this.pointCount; i++) {
        const d = this._alphaTarget[i] - this._alpha[i];
        if (Math.abs(d) > 0.002) { this._alpha[i] += d * Math.min(1, dt * 9); dirty = true; }
        else if (this._alpha[i] !== this._alphaTarget[i]) { this._alpha[i] = this._alphaTarget[i]; dirty = true; }
      }
      if (dirty) this.points.geometry.attributes.aAlpha.needsUpdate = true;
    }

    // Reset when selection is cleared or has no usable coordinate.
    this.renderer.domElement.parentElement.dataset.centerSelected = 'false';
    this.ring1.visible = true;
    // 选中标记
    if (this.selected && Number.isFinite(this.selected.elng)) {
      const la = this.selected.elat * D2R, lo = this.selected.elng * D2R;
      this._mk.set(
        Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)
      ).multiplyScalar(1.004).applyMatrix4(this.world.matrixWorld);
      this.marker.position.copy(this._mk);
      this.marker.visible = this._mk.dot(this.camera.position) > 1.0;
      // Keep the dial readable at every zoom. Only its light responds to PCM.
      const s = 74 * 2 * Math.tan(this.camera.fov * Math.PI / 360) * (this.dist - this._mk.z) / this.renderer.domElement.clientHeight;
      this.ring1.scale.setScalar(s);
      this.ring2.scale.setScalar(s * (0.70 + this.audioLevel * 0.50));
      const projected = this._mk.clone().project(this.camera);
      const nearCenter = Math.hypot(projected.x * this.renderer.domElement.clientWidth / 2, projected.y * this.renderer.domElement.clientHeight / 2) < 84;
      const overlap = this.marker.visible && nearCenter;
      this.renderer.domElement.parentElement.dataset.centerSelected = overlap ? 'true' : 'false';
      this.ring1.visible = !(overlap && this.tuning);
    }

    // 标签
    this._updateLabels();
  }

  _updateLabels(force) {
    this._labelFrame = (this._labelFrame || 0) + 1;
    if (!force && this._labelFrame % 4 !== 0) return;
    const items = [];
    const w = this.renderer.domElement.clientWidth, h = this.renderer.domElement.clientHeight;
    const cam = this.camera;
    const camPos = cam.position, camLen2 = camPos.lengthSq();
    const wp = this._wp, tmp = this._tmp;
    const pos = Data.globe.pos;
    const m = this.world.matrixWorld;
    const sts = Data.stations;
    const sel = this.selected;
    const maxD = Math.max(w, h) * 0.52;
    // 维护最近 top-K（不全量 sort，避免每帧 O(k log k)）
    const K = w < 560 ? 3 : 7;
    const top = [];
    for (let i = 0; i < this.pointCount; i++) {
      const st = sts[Data.globe.stIdx[i]];
      if (sel && st.id === sel.id) continue;
      if (this._alpha && this._alpha[i] < 0.4) continue;
      wp.fromArray(pos, i * 3).applyMatrix4(m);
      if (wp.dot(camPos) < 1.0) continue;
      tmp.copy(wp).project(cam);
      if (tmp.z > 1) continue;
      const sx = (tmp.x * 0.5 + 0.5) * w, sy = (-tmp.y * 0.5 + 0.5) * h;
      if (sx < -80 || sx > w + 80 || sy < -40 || sy > h + 40) continue;
      const d = Math.hypot(sx - w / 2, sy - h / 2);
      if (d > maxD) continue;
      const cand = { st, sx, sy, d };
      if (top.length < K) { top.push(cand); top.sort((a, b) => a.d - b.d); }
      else if (d < top[top.length - 1].d) { top[top.length - 1] = cand; top.sort((a, b) => a.d - b.d); }
    }
    for (const it of top) {
      if (it.sy < 150 || it.sy > h - 100) continue;
      if (it.sx < Math.min(600, w) && it.sy > h - 350) continue;
      if (it.d < 100) continue;
      if (sel && this.marker.visible) {
        tmp.copy(this.marker.position).project(cam);
        const mx = (tmp.x * .5 + .5) * w, my = (-tmp.y * .5 + .5) * h;
        if (it.sx > mx - 100 && it.sx < mx + 310 && Math.abs(it.sy - my) < 55) continue;
      }
      if (items.some(other => Math.abs(other.x - it.sx) < 160 && Math.abs(other.y - it.sy) < 34)) continue;
      items.push({
        x: it.sx, y: it.sy - 8,
        name: it.st.name,
        meta: '',
        cls: 'dim',
        opacity: Math.max(0.15, 0.55 - it.d / Math.max(w, h))
      });
    }
    if (sel && Number.isFinite(sel.elng)) {
      const la = sel.elat * D2R, lo = sel.elng * D2R;
      wp.set(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo))
        .multiplyScalar(1.004).applyMatrix4(m);
      tmp.copy(wp).project(cam);
      const sx = (tmp.x * 0.5 + 0.5) * w, sy = (-tmp.y * 0.5 + 0.5) * h;
      items.unshift({
        x: sx, y: sy - 14,
        name: sel.name,
        meta: this._selMetaText || '',
        cls: 'sel',
        opacity: wp.dot(camPos) > 1.0 && sx > 0 && sx < w && sy > 110 && sy < h - 280 ? 1 : 0
      });
    }
    this.labels.update(items);
  }

  setSelMetaText(text) { this._selMetaText = text; }

  setAudioLevel(level) {
    this.pointMat.uniforms.uAudio.value = level;
    this.atmo.material.uniforms.uAudio.value = level;
    this.audioLevel = level;
    this.ring1.material.opacity = 0.90;
    this.ring2.material.opacity = 0.55 + level * 0.45;
    this.bloom.strength = 0.42 + level * 0.28;
  }

  setReveal(value) {
    this.sphere.material.uniforms.uReveal.value = value;
    this.atmo.material.uniforms.uReveal.value = value;
    this.landMaterial.opacity = .18 * value;
  }

  render(dt) { this.composer.render(dt); }

  resize(w, h) {
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}

// Fixed angular ticks, fine ivory ring and coral status indicator.
function makeRingTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = 'rgba(245,241,232,.9)'; ctx.lineWidth = 2.8;
  ctx.beginPath(); ctx.arc(128,128,86,-0.5,Math.PI*2-0.8); ctx.stroke();
  for (let i=0;i<48;i++) {
    const a=i*Math.PI/24, inner=i%4===0?101:108;
    ctx.strokeStyle='rgba(245,241,232,.45)'; ctx.lineWidth=i%4===0?2.2:1.5;
    ctx.beginPath();ctx.moveTo(128+Math.cos(a)*inner,128+Math.sin(a)*inner);
    ctx.lineTo(128+Math.cos(a)*121,128+Math.sin(a)*121);ctx.stroke();
  }
  ctx.fillStyle='#f36b45';ctx.beginPath();ctx.arc(190,66,9,0,Math.PI*2);ctx.fill();
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
function makeGlowTexture() {
  const c=document.createElement('canvas');c.width=c.height=128;
  const ctx=c.getContext('2d');const g=ctx.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,255,245,1)');g.addColorStop(.12,'rgba(255,236,200,1)');
  g.addColorStop(.3,'rgba(255,175,120,.6)');g.addColorStop(.65,'rgba(255,150,90,.12)');g.addColorStop(1,'rgba(255,140,80,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
