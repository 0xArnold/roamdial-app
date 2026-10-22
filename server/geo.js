// 国家质心（lng, lat）与本地时区估算。无精确坐标的电台按质心 + ID 哈希抖动散开。
export const CENTROIDS = {
  AD:[1.5,42.5],AE:[54,24],AF:[66,33],AG:[-61.8,17.1],AL:[20,41],AM:[45,40],AO:[17.5,-12.5],
  AQ:[20,-80],AR:[-64,-34],AS:[-170.7,-14.3],AT:[14.5,47.6],AU:[134,-25],AW:[-70,12.5],AZ:[47.5,40.4],
  BA:[17.8,44],BB:[-59.6,13.2],BD:[90,24],BE:[4.5,50.6],BF:[-1.7,12.2],BG:[25,43],BH:[50.6,26],
  BI:[29.9,-3.4],BJ:[2.3,9.5],BM:[-80.7,32.3],BN:[114.7,4.5],BO:[-65,-17],BQ:[-68.3,12.2],BR:[-52,-10],
  BS:[-77.4,25],BW:[23.7,-22.3],BY:[28,53],BZ:[-88.7,17.2],CA:[-106,56],CD:[23,-2],CF:[20,7],CG:[15,-1],
  CH:[8,46.8],CI:[-5.5,7.5],CL:[-71,-33],CM:[12.5,6],CN:[104,34],CO:[-74,4],CR:[-84,10],CU:[-79.5,22],
  CV:[-24,16],CW:[-68.9,12.2],CY:[33.4,35],CZ:[15.5,49.8],DE:[10,51],DK:[9.5,56],DO:[-70.7,19],
  DZ:[2.6,28],EC:[-78,-1.5],EE:[25.5,58.7],EG:[27,26],ER:[39,15],ES:[-3.7,40.2],ET:[39,9],FI:[26,64],
  FO:[-7,62],FR:[2.3,46.6],GB:[-2.5,54],GD:[-61.7,12.1],GE:[43.4,42],GF:[-53,4],GH:[-1.2,8],GI:[-5.35,36.1],
  GL:[-42,74],GP:[-61.6,16.25],GQ:[10.5,1.6],GR:[23,39],GT:[-90.5,15.5],GW:[-15,12],GY:[-59,5],HK:[114.17,22.3],
  HN:[-86.5,15],HR:[15.5,45.2],HT:[-72.4,19],HU:[19.5,47],ID:[115,-2],IE:[-8,53.4],IL:[34.9,31.5],IM:[-4.5,54.2],
  IN:[79,22],IQ:[43.7,33],IR:[53.7,32.4],IS:[-19,65],IT:[12.5,42.8],JM:[-77.3,18.2],JO:[36.2,31.2],JP:[138,36],
  KE:[37.9,0.5],KG:[75.1,41.2],KH:[104.9,12.6],KN:[-62.7,17.3],KP:[127,40],KR:[127.5,36.5],KW:[47.6,29.3],
  KZ:[67,48],LB:[35.9,33.9],LC:[-61,13.9],LK:[81,7.9],LT:[24,55.3],LU:[6.1,49.8],LV:[25,56.9],LY:[17,27],
  MA:[-6,32],MC:[7.42,43.74],MD:[29,47],ME:[19.3,42.8],MG:[46.8,-19],MK:[21.7,41.6],ML:[-4,17],MM:[96,21],
  MN:[103,46.8],MO:[113.55,22.2],MQ:[-61.1,14.6],MT:[14.4,35.9],MU:[57.55,-20.3],MW:[34,-13.5],MX:[-102.5,23],
  MY:[102.5,3.5],MZ:[35.5,-18],NA:[17,-22],NC:[165,21],NE:[9.5,17.5],NG:[8.5,9.6],NI:[-85.3,13.1],NL:[5.6,52.2],
  NO:[10,62],NP:[84,28.3],NZ:[172,-42],OM:[56,21],PA:[-80,8.8],PE:[-76,-9],PF:[-149.5,-17.5],PH:[122,12],
  PK:[69.3,30],PL:[19.4,52.1],PR:[-66.5,18.2],PS:[35.2,31.9],PT:[-8.2,39.6],PY:[-58,-23],QA:[51.2,25.3],
  RE:[55.5,-21.1],RO:[25,45.8],RS:[20.8,44],RU:[95,61],RW:[30,-2],SA:[45,24],SD:[30,15],SE:[15,62],SG:[103.8,1.35],
  SI:[15,46.1],SK:[19.5,48.7],SL:[-11.5,8.5],SM:[12.45,43.94],SN:[-14.5,14.5],SO:[46,6],SR:[-56,4],SS:[30,7],
  SV:[-88.9,13.7],SY:[38.5,35],TD:[18.6,15.4],TG:[1.2,8.4],TH:[101,15],TJ:[71,38.6],TM:[59,39],TN:[9.5,34],
  TR:[35,39],TT:[-61.25,10.5],TW:[121,23.7],TZ:[34.9,-6.4],UA:[31.5,49],UG:[32.4,1.4],UM:[166.6,19.3],
  US:[-98,39.5],UY:[-56,-33],UZ:[63.2,41.4],VA:[12.45,41.9],VC:[-61.2,13.25],VE:[-66,8],VI:[-64.9,18.35],
  VN:[106,16],XK:[20.9,42.6],YE:[47.6,15.6],YT:[45.2,-12.8],ZA:[24,-29],ZM:[28,-13.5],ZW:[30,-19]
};

export const TZ_OVERRIDE = {
  CN:8,HK:8,MO:8,TW:8,SG:8,MY:8,PH:8,MN:8,AU:10,KR:9,JP:9,NP:5.75,IN:5.5,LK:5.5,
  BD:6,MM:6.5,IR:3.5,AF:4.5,PK:5,KZ:6,UZ:5,TM:5,TJ:5,KG:6,IS:0,IE:0,GB:0,PT:0,
  ES:1,FR:1,DE:1,IT:1,NL:1,BE:1,SE:1,NO:1,DK:1,PL:1,CZ:1,AT:1,CH:1,HU:1,GR:2,
  FI:2,EE:2,LV:2,LT:2,UA:2,RO:2,BG:2,EG:2,IL:2,ZA:2,TR:3,SA:3,NG:1,KE:3,MA:1,DZ:1,TN:1,
  MX:-6,CO:-5,PE:-5,CL:-4,AR:-3,BR:-3,VE:-4,EC:-5,BO:-4,PY:-4,UY:-3,PA:-5,CR:-6,GT:-6,
  HN:-6,SV:-6,NI:-6,DO:-4,PR:-4,CU:-5,JM:-5,TT:-4,US:-5,CA:-5,TH:7,VN:7,KH:7,ID:7,LA:7
};

export function tzOffsetHours(cc, lng) {
  if (cc && TZ_OVERRIDE[cc] != null) return TZ_OVERRIDE[cc];
  if (Number.isFinite(lng)) return Math.round(lng / 15);
  return 0;
}

// 流派分类：raw tags -> canonical genre
const GENRE_RULES = [
  ['hiphop', ['hip hop', 'hiphop', 'hip-hop', 'rap', 'trap', 'grime']],
  ['electronic', ['electronic', 'electronica', 'dance', 'house', 'techno', 'trance', 'edm',
    'dubstep', 'drum and bass', 'dnb', 'garage', 'hardstyle', 'chillout', 'lounge',
    'ambient', 'synthwave', 'psytrance', 'breaks']],
  ['latin', ['latin', 'salsa', 'bachata', 'merengue', 'cumbia', 'reggaeton', 'reggae',
    'ska', 'rocksteady', 'tropical']],
  ['classical', ['classical', 'opera', 'orchestra', 'orchestral', 'symphonic', 'baroque', 'chamber']],
  ['jazz', ['jazz', 'blues', 'swing', 'soul', 'funk', 'rnb', 'r&b', 'motown', 'big band']],
  ['country', ['country', 'folk', 'bluegrass', 'americana']],
  ['religious', ['christian', 'religious', 'religion', 'gospel', 'worship', 'islam', 'islamic',
    'quran', 'muslim', 'buddhist', 'buddhism', 'hindu', 'spiritual', 'catholic']],
  ['news', ['news', 'talk', 'public radio', 'information', 'interview', 'politics', 'business', 'education']],
  ['rock', ['rock', 'alternative', 'indie', 'punk', 'metal', 'grunge', 'hard rock', 'rock n roll', 'emo']],
  ['oldies', ['oldies', '80s', '90s', '70s', '60s', '50s', 'retro', 'golden oldies', 'nostalgia', 'classic hits']],
  ['pop', ['pop', 'top 40', 'hits', 'chart', 'mainstream', 'dance pop', 'adult contemporary', 'disco']],
  ['world', ['world', 'local', 'regional', 'community', 'culture', 'cultural', 'ethnic', 'etnica',
    'international', 'indigenous', 'folklore']]
];
const TAG_TO_GENRE = new Map();
for (const [g, tags] of GENRE_RULES) for (const tag of tags) TAG_TO_GENRE.set(tag, g);

export function genreOf(tagStr) {
  const tags = (tagStr || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!tags.length) return 'mixed';
  for (const tag of tags) {
    const g = TAG_TO_GENRE.get(tag);
    if (g) return g;
  }
  return 'mixed';
}

// FNV-1a 哈希：几何抖动与星图布局都用它保证确定性
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
