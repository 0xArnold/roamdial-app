import * as THREE from 'three';
import { Data } from '../data.js';

// One particle per station, with the same identity at both ends of a transition.
// Project both layouts into a common space so different cameras and units agree.
export class ParticleTransition {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.active = false;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.material = new THREE.ShaderMaterial({
      uniforms: { uProgress: { value: 0 }, uRatio: { value: renderer.getPixelRatio() } },
      vertexShader: `
        attribute vec3 aTarget, aFromColor, aToColor;
        attribute vec2 aSize, aAlpha;
        attribute float aDelay;
        uniform float uProgress, uRatio;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float t = clamp((uProgress - aDelay * .16) / .84, 0., 1.);
          float e = t * t * (3. - 2. * t);
          vec3 p = mix(position, aTarget, e);
          p.x += sin(t * 3.14159265) * sin(aDelay * 53.) * .12;
          gl_Position = vec4(p.xy, 0., 1.);
          gl_PointSize = max(1., mix(aSize.x, aSize.y, e) * uRatio);
          vColor = mix(aFromColor, aToColor, e);
          vAlpha = mix(aAlpha.x, aAlpha.y, e) * (1. - smoothstep(.88, 1., uProgress));
        }`,
      fragmentShader: `
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - .5);
          float a = exp(-24. * d * d) * (1. - smoothstep(.38, .5, d)) * vAlpha;
          gl_FragColor = vec4(vColor, a);
        }`,
      transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
    });
  }

  snapshot(view) {
    const n = Data.stations.length;
    const positions = new Float32Array(n * 3), colors = new Float32Array(n * 3);
    const sizes = new Float32Array(n), alphas = new Float32Array(n);
    view.scene.updateMatrixWorld(true); view.camera.updateMatrixWorld(true);
    const g = view.points.geometry, p = g.attributes.position, c = g.attributes.aColor;
    const globe = !!view.world, v = new THREE.Vector3(), mv = new THREE.Vector3();
    for (let j = 0; j < p.count; j++) {
      const i = globe ? Data.globe.stIdx[j] : j;
      v.fromBufferAttribute(p,j).applyMatrix4(view.points.matrixWorld);
      const visible = !globe || v.dot(view.camera.position) > 1;
      mv.copy(v).applyMatrix4(view.camera.matrixWorldInverse);
      v.project(view.camera);
      positions[i*3] = THREE.MathUtils.clamp(v.x,-5,5);
      positions[i*3+1] = THREE.MathUtils.clamp(v.y,-5,5);
      colors.set([c.getX(j),c.getY(j),c.getZ(j)],i*3);
      sizes[i] = Math.min(24, g.attributes.aSize.getX(j) * view.pointMat.uniforms.uScale.value / Math.max(.01,-mv.z));
      alphas[i] = visible ? g.attributes.aAlpha.getX(j) * view.pointMat.uniforms.uBrightness.value : 0;
    }
    return {positions,colors,sizes,alphas};
  }

  begin(from, to, now, entry = false) {
    const interrupted = this.active ? this.currentSnapshot(now) : null;
    this.cancel();
    if (this.reducedMotion) return;
    this.from = from; this.to = to; this.start = now;
    this.duration = entry ? 1800 : 1400;
    const b = this.snapshot(to), a = interrupted || (entry ? this.snapshot(to) : this.snapshot(from));
    const n = Data.stations.length, size = new Float32Array(n*2), alpha = new Float32Array(n*2), delay = new Float32Array(n);
    for (let i=0;i<n;i++) {
      const seed = ((i*16807+13)%65521)/65521;
      delay[i]=seed;
      if (entry) {
        a.positions[i*3] += (seed-.5)*1.6;
        a.positions[i*3+1] += 1.8 + seed*1.8;
        a.sizes[i] = Math.max(2,b.sizes[i]*.65);
      }
      size.set([a.sizes[i],b.sizes[i]],i*2);
      alpha.set([a.alphas[i],b.alphas[i]],i*2);
    }
    const geometry = new THREE.BufferGeometry();
    for (const [key,arr,width] of [['position',a.positions,3],['aTarget',b.positions,3],['aFromColor',a.colors,3],['aToColor',b.colors,3],['aSize',size,2],['aAlpha',alpha,2],['aDelay',delay,1]])
      geometry.setAttribute(key,new THREE.BufferAttribute(arr,width));
    this.points = new THREE.Points(geometry,this.material); this.points.frustumCulled=false;
    this.scene.add(this.points); this.active=true; this.entry=entry;
  }

  currentSnapshot(now) {
    const g=this.points.geometry.attributes,n=g.position.count;
    const positions=new Float32Array(n*3),colors=new Float32Array(n*3),sizes=new Float32Array(n),alphas=new Float32Array(n);
    const progress=Math.min(1,(now-this.start)/this.duration);
    for(let i=0;i<n;i++) {
      const delay=g.aDelay.getX(i),t=THREE.MathUtils.clamp((progress-delay*.16)/.84,0,1),e=t*t*(3-2*t);
      for(let k=0;k<3;k++) {
        positions[i*3+k]=THREE.MathUtils.lerp(g.position.array[i*3+k],g.aTarget.array[i*3+k],e);
        colors[i*3+k]=THREE.MathUtils.lerp(g.aFromColor.array[i*3+k],g.aToColor.array[i*3+k],e);
      }
      positions[i*3]+=Math.sin(t*Math.PI)*Math.sin(delay*53)*.12;
      sizes[i]=THREE.MathUtils.lerp(g.aSize.getX(i),g.aSize.getY(i),e);
      alphas[i]=THREE.MathUtils.lerp(g.aAlpha.getX(i),g.aAlpha.getY(i),e);
    }
    return {positions,colors,sizes,alphas};
  }

  render(now,dt) {
    const p = Math.min(1,(now-this.start)/this.duration);
    this.progress=p;
    if(p>=1) { this.cancel(); return false; }
    const base = this.entry || p>=.5 ? this.to : this.from;
    const reveal = THREE.MathUtils.smoothstep(p,.88,1);
    base.pointMat.uniforms.uOpacity.value = base === this.to ? reveal : 0;
    const marker = base.marker?.visible;
    if(base.marker) base.marker.visible=false;
    if(base.world) base.setReveal(this.entry ? Math.min(1,p*2) : (base===this.to ? Math.max(0,p*2-1) : Math.max(0,1-p*2)));
    base.render(dt);
    if(base.marker) base.marker.visible=marker;
    base.pointMat.uniforms.uOpacity.value=1;
    if(base.world) base.setReveal(1);
    this.material.uniforms.uProgress.value=p;
    const clear=this.renderer.autoClear;this.renderer.autoClear=false;
    this.renderer.clearDepth();this.renderer.render(this.scene,this.camera);this.renderer.autoClear=clear;
    return true;
  }

  cancel() {
    if(this.points) { this.scene.remove(this.points);this.points.geometry.dispose();this.points=null; }
    this.active=false;
  }
  dispose() { this.cancel();this.material.dispose(); }
}
