"""Read-only GeoNames candidate audit. Usage: python3 audit.py cities15000.zip"""
import sys,zipfile,sqlite3,json,re,collections,hashlib,pathlib,datetime
root=pathlib.Path(__file__).resolve().parents[2]
normalize=lambda x: re.sub(r'[^\w\u4e00-\u9fff]+',' ',x.casefold()).strip()
index=collections.defaultdict(dict); cities=[]
with zipfile.ZipFile(sys.argv[1]) as z:
 for line in z.read('cities15000.txt').decode().splitlines():
  f=line.split('\t'); city={'id':f[0],'name':f[1],'cc':f[8],'admin1':f[10],'lat':float(f[4]),'lng':float(f[5]),'population':int(f[14]),'timezone':f[17]}
  cities.append(city)
  for name in set([f[1],f[2]]+f[3].split(',')):
   k=normalize(name)
   if len(k)>=3 or (len(k)>=2 and re.search('[\u4e00-\u9fff]',k)): index[(city['cc'],k)][city['id']]=city
con=sqlite3.connect(f'file:{root}/server/roamdial.db?mode=ro',uri=True);con.row_factory=sqlite3.Row
rows=list(con.execute('select id,name,cc,state,exact from stations where exact=0')); candidates=[];ambiguous=0
for r in rows:
 matches=index.get((r['cc'],normalize(r['state'])),{})
 if len(matches)==1:
  candidates.append({'stationId':r['id'],'station':r['name'],'state':r['state'],'basis':'country + state equals unique city alias','precision':'city','verified':False,'city':next(iter(matches.values()))})
 elif len(matches)>1: ambiguous+=1
out={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':'https://download.geonames.org/export/dump/cities15000.zip','sha256':hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes()).hexdigest(),'cities':len(cities),'countries':len(set(c['cc'] for c in cities)),'missingExactStations':len(rows),'uniqueCityStateCandidates':len(candidates),'ambiguousCityStateStations':ambiguous,'candidates':candidates}
(root/'research/geonames/candidates.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print({k:v for k,v in out.items() if k!='candidates'})
print(candidates[:3])
