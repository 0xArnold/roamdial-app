import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

// Only a validated public URL can select a stream. Validate every redirect and pin
// DNS resolution to a public address; never forward credentials or cookies.
export async function publicTarget(raw) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid stream URL');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = await lookup(host, { all: true });
  if (!addresses.length || addresses.some(({address}) => ipaddr.process(address).range() !== 'unicast')) throw new Error('Non-public stream');
  return { url, address: addresses.find(a => a.family === 4) || addresses[0] };
}

// HLS 播放列表的 content-type（各服务器写法不一）
const PLAYLIST_TYPE_RE = /^(application\/(vnd\.apple\.)?mpegurl|audio\/(x-)?mpegurl|application\/(x-)?mpegurl)/i;

function isPlaylist(url, type) {
  return PLAYLIST_TYPE_RE.test(type || '') || /\.m3u8$/i.test(url.pathname);
}

// 把播放列表里的每个 URL（行 URL 与 EXT-X-KEY 等标签的 URI）改写成本站段代理地址，
// 使 HTTPS 页面下的 HLS 全部走同源，规避混合内容拦截。
function rewritePlaylist(text, baseUrl) {
  const proxyOf = uri => {
    let abs;
    try { abs = new URL(uri, baseUrl).href; } catch { return uri; }
    return `/api/stream-seg?u=${Buffer.from(abs, 'utf8').toString('base64url')}`;
  };
  return text.split(/\r?\n/).map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (trimmed.startsWith('#')) {
      return line.replace(/URI="([^"]+)"/g, (_m, uri) => `URI="${proxyOf(uri)}"`);
    }
    return proxyOf(trimmed);
  }).join('\n');
}

// 中继一个已校验的公网 URL。命中 HLS 播放列表时缓冲并重写（列表仅数 KB~数十 KB），
// 否则按原始字节流管道转发（普通音频 / m3u8 内的 .ts/.aac 段）。
export function relayStream(raw, req, res) {
  let outgoing, incoming, closed = false;
  const timer = { handle: null };
  const stop = () => {
    if (closed) return;
    closed = true;
    if (timer.handle) clearTimeout(timer.handle);
    outgoing?.destroy();
    incoming?.destroy();
  };
  res.on('close', stop);
  const fail = () => {
    if (closed) return;
    if (!res.headersSent) res.status(502).json({ error: 'Stream unavailable' });
    else res.destroy();
    stop();
  };
  async function connect(target, redirects = 0) {
    try {
      if (redirects > 4) return fail();
      const { url, address } = await publicTarget(target);
      if (closed) return;
      const transport = url.protocol === 'https:' ? https : http;
      outgoing = transport.get(url, {
        headers: { 'User-Agent': 'RoamDial/2.0', Accept: 'audio/*, application/ogg, application/octet-stream, application/vnd.apple.mpegurl, */*', 'Icy-MetaData': '0' },
        lookup: (_host, options, done) => done(null, ...(options.all ? [[address]] : [address.address, address.family]))
      }, upstream => {
        incoming = upstream;
        if ([301,302,303,307,308].includes(upstream.statusCode) && upstream.headers.location) {
          upstream.destroy(); connect(new URL(upstream.headers.location, url).href, redirects + 1); return;
        }
        const type = upstream.headers['content-type'] || 'application/octet-stream';
        if (upstream.statusCode !== 200) return fail();
        if (isPlaylist(url, type)) {
          // 播放列表：解压 → 重写 → 返回（同源，HTTPS 页面可加载）
          const enc = (upstream.headers['content-encoding'] || '').toLowerCase();
          let body = upstream;
          if (enc.includes('gzip')) body = upstream.pipe(zlib.createGunzip());
          else if (enc.includes('deflate')) body = upstream.pipe(zlib.createInflate());
          let text = '';
          body.setEncoding('utf8');
          body.on('data', c => { text += c; });
          body.on('end', () => {
            if (closed) return;
            res.set({
              'Content-Type': 'application/vnd.apple.mpegurl',
              'Cache-Control': 'no-store',
              'X-Content-Type-Options': 'nosniff'
            });
            res.send(rewritePlaylist(text, url.href));
          });
          body.on('error', fail);
          return;
        }
        // 普通流：仅接受音频/八进制流，拒绝 m3u/pls 等文本列表（避免把代理变开放代理）
        // 普通流：接受音频与 HLS 段容器（mp2t/mp4 等），拒绝 m3u/pls 等文本列表
        // （避免把代理变成开放代理，也不要把 HTML 错误页当音频返回）
        if (!/^(audio\/|video\/(mp2t|mp4)|application\/(ogg|octet-stream))/i.test(type) || /mpegurl|scpls|x-scpls/i.test(type)) return fail();
        res.set({ 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        upstream.on('error', fail);
        upstream.pipe(res);
        // 连接建立后清掉 connect 超时（流本身由 res close 收尾）
        if (timer.handle) { clearTimeout(timer.handle); timer.handle = null; }
      });
      // 连接超时（15s 连不上上游）
      timer.handle = setTimeout(fail, 15000);
      outgoing.on('error', fail);
    } catch { fail(); }
  }
  connect(raw);
}
