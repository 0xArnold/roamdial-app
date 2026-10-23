// 国家质心（lng, lat）与本地时区估算。质心取各国几何中心（近似值，仅用于把没有精确坐标的电台放到地球上）；
// 时区优先用政治时区覆盖表，其余按经度/15 估算（标注为近似当地时间）。
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

// 政治时区覆盖（小时）；未覆盖的按 round(lng/15) 估算
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

// 电台所在地的当前时间（UTC ms -> {hh, mm} 24 小时制）
// lng 可能为 NaN（无坐标且无国家），返回 null 供调用方隐藏时间
export function localTimeAt(cc, lng, nowMs) {
  const off = tzOffsetHours(cc, lng);
  if (!Number.isFinite(off)) return null;
  const d = new Date(nowMs + off * 3600e3);
  return { h: d.getUTCHours(), m: d.getUTCMinutes(), offset: off };
}

// 国家代码 -> 旗帜 emoji
export function flagOf(cc) {
  if (!cc || cc.length !== 2) return '🌐';
  return String.fromCodePoint(...[...cc.toUpperCase()].map(c => 127397 + c.charCodeAt(0)));
}

// 美国州全名 -> 缩写（用于把电台 state 字段匹配到城市锚点的州后缀）
export const US_STATE_FULL_TO_ABBR = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', 'District of Columbia': 'DC',
  Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL',
  Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA',
  Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN',
  Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK',
  Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
  Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY'
};

// 国家代码 -> 中文国名（覆盖常见；其余回落英文名）
export const COUNTRY_ZH = {
  US:'美国',GB:'英国',DE:'德国',FR:'法国',IT:'意大利',ES:'西班牙',PT:'葡萄牙',NL:'荷兰',BE:'比利时',
  CH:'瑞士',AT:'奥地利',SE:'瑞典',NO:'挪威',DK:'丹麦',FI:'芬兰',IS:'冰岛',IE:'爱尔兰',PL:'波兰',
  CZ:'捷克',SK:'斯洛伐克',HU:'匈牙利',RO:'罗马尼亚',BG:'保加利亚',GR:'希腊',HR:'克罗地亚',RS:'塞尔维亚',
  SI:'斯洛文尼亚',BA:'波黑',MK:'北马其顿',AL:'阿尔巴尼亚',EE:'爱沙尼亚',LV:'拉脱维亚',LT:'立陶宛',
  UA:'乌克兰',RU:'俄罗斯',BY:'白俄罗斯',MD:'摩尔多瓦',TR:'土耳其',CY:'塞浦路斯',IL:'以色列',SA:'沙特阿拉伯',
  AE:'阿联酋',QA:'卡塔尔',KW:'科威特',BH:'巴林',OM:'阿曼',YE:'也门',JO:'约旦',LB:'黎巴嫩',SY:'叙利亚',
  IQ:'伊拉克',IR:'伊朗',EG:'埃及',LY:'利比亚',TN:'突尼斯',DZ:'阿尔及利亚',MA:'摩洛哥',SD:'苏丹',ET:'埃塞俄比亚',
  KE:'肯尼亚',UG:'乌干达',TZ:'坦桑尼亚',NG:'尼日利亚',GH:'加纳',SN:'塞内加尔',CI:'科特迪瓦',CM:'喀麦隆',
  ZA:'南非',ZW:'津巴布韦',ZM:'赞比亚',MZ:'莫桑比克',MG:'马达加斯加',MU:'毛里求斯',NA:'纳米比亚',BW:'博茨瓦纳',
  IN:'印度',PK:'巴基斯坦',BD:'孟加拉国',LK:'斯里兰卡',NP:'尼泊尔',MM:'缅甸',TH:'泰国',VN:'越南',KH:'柬埔寨',
  LA:'老挝',MY:'马来西亚',SG:'新加坡',ID:'印度尼西亚',PH:'菲律宾',BN:'文莱',CN:'中国',HK:'中国香港',
  MO:'中国澳门',TW:'中国台湾',JP:'日本',KR:'韩国',KP:'朝鲜',MN:'蒙古',KZ:'哈萨克斯坦',UZ:'乌兹别克斯坦',
  TM:'土库曼斯坦',KG:'吉尔吉斯斯坦',TJ:'塔吉克斯坦',AF:'阿富汗',AM:'亚美尼亚',GE:'格鲁吉亚',AZ:'阿塞拜疆',
  CA:'加拿大',US:'美国',MX:'墨西哥',GT:'危地马拉',BZ:'伯利兹',HN:'洪都拉斯',SV:'萨尔瓦多',NI:'尼加拉瓜',
  CR:'哥斯达黎加',PA:'巴拿马',CU:'古巴',JM:'牙买加',HT:'海地',DO:'多米尼加',PR:'波多黎各',TT:'特立尼达和多巴哥',
  CO:'哥伦比亚',VE:'委内瑞拉',EC:'厄瓜多尔',PE:'秘鲁',BO:'玻利维亚',BR:'巴西',CL:'智利',AR:'阿根廷',
  UY:'乌拉圭',PY:'巴拉圭',GY:'圭亚那',SR:'苏里南',GF:'法属圭亚那',AU:'澳大利亚',NZ:'新西兰',PG:'巴布亚新几内亚',
  FJ:'斐济',NC:'新喀里多尼亚',PF:'法属波利尼西亚',AQ:'南极洲',GL:'格陵兰',FO:'法罗群岛',VA:'梵蒂冈',
  SM:'圣马力诺',MC:'摩纳哥',LI:'列支敦士登',AD:'安道尔',MT:'马耳他',LU:'卢森堡',GI:'直布罗陀',IM:'马恩岛',
  CW:'库拉索',BQ:'荷兰加勒比区',AW:'阿鲁巴',VC:'圣文森特',GD:'格林纳达',BB:'巴巴多斯',LC:'圣卢西亚',
  KN:'圣基茨',AG:'安提瓜',BS:'巴哈马',RE:'留尼汪','MQ':'马提尼克','GP':'瓜德罗普','MQ':'马提尼克',
  YT:'马约特','GI':'直布罗陀','XK':'科索沃','PS':'巴勒斯坦','SS':'南苏丹','ER':'厄立特里亚','SO':'索马里',
  DJ:'吉布提','RW':'卢旺达','BI':'布隆迪','CG':'刚果(布)','CD':'刚果(金)','CF':'中非','TD':'乍得','NE':'尼日尔',
  ML:'马里','BF':'布基纳法索','BJ':'贝宁','TG':'多哥','GN':'几内亚','GW':'几内亚比绍','SL':'塞拉利昂',
  LR:'利比里亚','GM':'冈比亚','CV':'佛得角','ST':'圣多美','GQ':'赤道几内亚','GA':'加蓬','AO':'安哥拉',
  MW:'马拉维',LS:'莱索托',SZ:'斯威士兰',KM:'科摩罗',SC:'塞舌尔',MV:'马尔代夫',BT:'不丹',TL:'东帝汶',
  SB:'所罗门群岛','VU':'瓦努阿图','WS':'萨摩亚','TO':'汤加','KI':'基里巴斯','FM':'密克罗尼西亚','PW':'帕劳',
  MH:'马绍尔群岛','NR':'瑙鲁','TV':'图瓦卢','CK':'库克群岛','NU':'纽埃','AS':'美属萨摩亚','GU':'关岛',
  MP:'北马里亚纳','WF':'瓦利斯','CX':'圣诞岛','CC':'科科斯','NF':'诺福克','TK':'托克劳','UM':'中途岛'
};

const COUNTRY_EN = typeof Intl?.DisplayNames === 'function'
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;

export function countryName(cc, en, language = 'zh') {
  if (language === 'zh' && cc && COUNTRY_ZH[cc]) return COUNTRY_ZH[cc];
  if (language === 'en' && cc && COUNTRY_EN) return COUNTRY_EN.of(cc) || en || cc;
  return en || cc || '';
}
