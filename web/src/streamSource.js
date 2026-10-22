// Upgrade only hosts whose HTTPS stream endpoint has been verified.
const HTTPS_STREAM_HOSTS = new Set(['playtv-live.ifeng.com']);
export function playbackSource(raw) {
  const url = new URL(raw);
  if (url.protocol === 'http:' && HTTPS_STREAM_HOSTS.has(url.hostname)) url.protocol = 'https:';
  return { url: url.href, hls: /\.m3u8$/i.test(url.pathname) };
}
