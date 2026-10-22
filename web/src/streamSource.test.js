import test from 'node:test';
import assert from 'node:assert/strict';
import { playbackSource } from './streamSource.js';
test('Phoenix HLS uses the verified HTTPS endpoint, preserving signed queries',()=>{
  assert.deepEqual(playbackSource('http://playtv-live.ifeng.com/live/06OLEEWQKN4_audio.m3u8?token=a%2Fb'),{url:'https://playtv-live.ifeng.com/live/06OLEEWQKN4_audio.m3u8?token=a%2Fb',hls:true});
});
test('HLS is identified from the path; unrelated MP3 and HTTP hosts are unchanged',()=>{
  assert.equal(playbackSource('https://example.com/live.M3U8?t=1').hls,true);
  assert.deepEqual(playbackSource('http://example.com/radio.mp3?name=.m3u8'),{url:'http://example.com/radio.mp3?name=.m3u8',hls:false});
});
