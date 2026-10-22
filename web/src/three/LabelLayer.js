// DOM 标签层：场景把 3D 投影坐标交给它，直接操作 DOM（不经过 React，保证 60fps）
export class LabelLayer {
  constructor(container) {
    this.container = container;
    this.pool = [];
    this.active = 0;
  }
  _node(i) {
    if (this.pool[i]) return this.pool[i];
    const d = document.createElement('div');
    d.className = 'tlabel';
    d.innerHTML = '<div class="tl-name"></div><div class="tl-meta"></div><div class="tl-dot"></div>';
    d.style.display = 'none';
    this.container.appendChild(d);
    this.pool[i] = d;
    return d;
  }
  // items: [{x, y, name, meta, cls, opacity}]  屏幕坐标 + 文案
  update(items) {
    const n = Math.min(items.length, this.pool.length > items.length ? this.pool.length : 64);
    for (let i = 0; i < n; i++) {
      const it = items[i];
      const d = this._node(i);
      if (d._name !== it.name || d._meta !== it.meta || d._cls !== it.cls) {
        d._name = it.name; d._meta = it.meta; d._cls = it.cls;
        d.className = 'tlabel ' + (it.cls || '');
        d.querySelector('.tl-name').textContent = it.name;
        d.querySelector('.tl-meta').textContent = it.meta || '';
        d.querySelector('.tl-meta').style.display = it.meta ? '' : 'none';
      }
      // 仅位置/透明度变化时才写样式，避免每帧无谓 DOM 写
      const key = it.x + '|' + it.y + '|' + it.opacity;
      if (d._pos !== key) {
        d._pos = key;
        d.style.display = '';
        d.style.opacity = String(it.opacity == null ? 1 : it.opacity);
        d.style.transform = it.cls === 'sel'
          ? `translate(${it.x + 40}px,${it.y}px)`
          : `translate(-50%,-100%) translate(${it.x}px,${it.y}px)`;
      }
    }
    for (let i = n; i < this.active; i++) {
      if (this.pool[i]) this.pool[i].style.display = 'none';
    }
    this.active = n;
  }
  clear() {
    for (const d of this.pool) if (d) d.style.display = 'none';
    this.active = 0;
  }
}
