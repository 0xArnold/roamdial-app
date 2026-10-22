// three.js 着色器与材质工厂
import * as THREE from 'three';

// 通用光点材质：闪烁 + 软圆 + 叠加混合（星云/地球点阵/星空共用）
export function makePointsMaterial(pixelRatio, scale = 620) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAudio: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uScale: { value: scale },
      uBrightness: { value: 1.0 },
      uSoftness: { value: 0.0 },
      uOpacity: { value: 1.0 }
    },
    vertexShader: /* glsl */`
      attribute float aSize;
      attribute float aAlpha;
      attribute float aPhase;
      attribute vec3 aColor;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uScale;
      uniform float uBrightness;
      uniform float uOpacity;
      uniform float uAudio;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = aColor;
        float tw = 0.76 + 0.24 * sin(uTime * 0.85 + aPhase);
        vAlpha = aAlpha * uOpacity * uBrightness * (1.0 + uAudio * 1.05);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio * uScale * tw * (1.0 + uAudio * 0.22) / max(0.001, -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uSoftness;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.05, d);
        float glow = pow(max(0.0, 1.0 - d * 2.0), 2.2);
        float soft = exp(-24.0 * d * d) * (1.0 - smoothstep(0.38, 0.5, d));
        float a = mix(core * 0.60 + glow * 0.55, soft, uSoftness) * vAlpha;
        if (a < 0.004) discard;
        gl_FragColor = vec4(vColor, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}

// 地球球体：暗面 + 暖色受照 + 青色菲涅尔边缘光
export function makeGlobeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uReveal: { value: 1 },
      uLight: { value: new THREE.Vector3(-0.55, 0.42, 0.72).normalize() }
    },
    vertexShader: /* glsl */`
      varying vec3 vN;
      varying vec3 vP;
      void main() {
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vP = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uLight;
      uniform float uReveal;
      varying vec3 vN;
      varying vec3 vP;
      void main() {
        vec3 V = normalize(cameraPosition - vP);
        vec3 N = normalize(vN);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 5.0);
        float sun = max(dot(N, normalize(uLight)), 0.0);
        vec3 deep = vec3(0.041, 0.083, 0.075);
        vec3 lit  = vec3(0.052, 0.097, 0.086);
        vec3 col = mix(deep, lit, sun * 0.75);
        col += vec3(0.98, 0.74, 0.46) * pow(sun, 3.5) * 0.008;  // 受照暖光
        float edgeLight = pow(max(dot(N, normalize(vec3(-0.7, 0.6, 0.18))), 0.0), 4.0);
        col += vec3(1.0, 0.91, 0.76) * fres * edgeLight * 0.95;
        col += vec3(0.42, 0.82, 0.72) * fres * 0.035;            // 边缘青光
        gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), uReveal);
      }
    `
  });
}

// 大气层：背面大球，菲涅尔辉光
export function makeAtmosphereMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uAudio: { value: 0 }, uReveal: { value: 1 } },
    vertexShader: /* glsl */`
      varying vec3 vN;
      varying vec3 vP;
      void main() {
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vP = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uAudio;
      uniform float uReveal;
      varying vec3 vN;
      varying vec3 vP;
      void main() {
        vec3 V = normalize(cameraPosition - vP);
        float facing = abs(dot(normalize(vN), V));
        float rim = pow(1.0 - facing, 2.4) * smoothstep(0.0, 0.18, facing);
        vec3 col = mix(vec3(0.20, 0.55, 0.50), vec3(0.45, 0.80, 0.72), rim);
        gl_FragColor = vec4(col, rim * (0.035 + uAudio * 0.14) * uReveal);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}

// 经纬网
export function makeGraticule(radius, step = 30) {
  const pts = [];
  const push = (lng, lat) => {
    const la = lat * Math.PI / 180, lo = lng * Math.PI / 180;
    pts.push(radius * Math.cos(la) * Math.sin(lo), radius * Math.sin(la), radius * Math.cos(la) * Math.cos(lo));
  };
  for (let lat = -60; lat <= 60; lat += step) {
    for (let lng = -180; lng < 180; lng += 4) { push(lng, lat); push(lng + 4, lat); }
  }
  for (let lng = -180; lng < 180; lng += step) {
    for (let lat = -84; lat < 84; lat += 4) { push(lng, lat); push(lng, lat + 4); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({
    color: 0xf5f1e8, transparent: true, opacity: 0.055, depthWrite: false
  }));
}

// 背景星空
export function makeStarfield(count, radius) {
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const color = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    pos[i * 3] = r * Math.cos(th) * radius;
    pos[i * 3 + 1] = r * Math.sin(th) * radius;
    pos[i * 3 + 2] = u * radius;
    size[i] = 0.5 + Math.random() * 1.6;
    phase[i] = Math.random() * Math.PI * 2;
    const w = 0.75 + Math.random() * 0.25;
    color[i * 3] = w; color[i * 3 + 1] = w; color[i * 3 + 2] = w * 0.96;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  g.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
  const alpha = new Float32Array(count).fill(0.5);
  g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  return g;
}
