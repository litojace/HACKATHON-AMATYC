import fitz,json,re,subprocess,csv,io
from pathlib import Path
from PIL import Image
import numpy as np
root=Path(__file__).resolve().parents[2]; review=Path(__import__('sys').argv[1])
records=json.loads((review/'inventory.json').read_text())
problems=[]; keys={};issues=[]
def words(page,path):
 native=page.get_text('words')
 if len(native)>30:return [(w[0],w[1],w[2],w[3],w[4]) for w in native],False
 png=review/(path.stem+f'-p{page.number}.png')
 page.get_pixmap(matrix=fitz.Matrix(3,3)).save(png)
 cache=png.with_suffix('.tsv')
 if cache.exists():tsv=cache.read_text()
 else:
  tsv=subprocess.check_output(['tesseract',str(png),'stdout','--psm','6','tsv'],stderr=subprocess.DEVNULL,text=True);cache.write_text(tsv)
 out=[]
 for row in csv.DictReader(io.StringIO(tsv),delimiter='\t'):
  if row.get('text','').strip():out.append((int(row['left'])/3,int(row['top'])/3,(int(row['left'])+int(row['width']))/3,(int(row['top'])+int(row['height']))/3,row['text']))
 return out,True
for r in sorted(records,key=lambda r:(r['kind'],r['year'] or '',r['semester'] or '')):
 path=review/(r['sha256'][:16]+'-'+Path(r['filename']).name);doc=fitz.open(path);exam=f"amatyc-{r['year']}-{r['semester']}"
 allwords=[]
 for page in doc:
  ws,ocr=words(page,path);allwords.append((ws,ocr))
 if r['kind']=='answer_key':
  ws=allwords[0][0];answers={}
  for w in ws:
   if re.fullmatch(r'(?:[1-9]|1\d|20)\.?',w[4]) and w[0]<100 and w[1]>120:
    n=int(w[4].rstrip('.')); candidates=[v for v in ws if v[0]>w[2]+10 and v[0]<180 and abs((v[1]+v[3]-w[1]-w[3])/2)<8]
    candidates.sort(key=lambda v:v[0]);ans=''.join(v[4] for v in candidates)
    if ans: answers[n]=ans
  manual={'amatyc-2004-spring':list('CDAEADBECCBDACBDACCE'),'amatyc-2007-fall':list('CDAABEDCEBCBCBEEBADC'),'amatyc-2009-fall':list('EDAE CDECAD'.replace(' ',''))+['E|A','B','C','A','D','B','D','B','A','19701'],'amatyc-2018-spring':list('ACEBAEDBEEDCDACCB')+['70','E','C']}
  if exam in manual:answers=dict(enumerate(manual[exam],1))
  keys[exam]={'answers':answers,'source':r['filename'],'ocr':allwords[0][1]}
  if len(answers)!=20:issues.append({'key':exam,'answers':answers})
  print('KEY',exam,len(answers),flush=True)
  continue
 starts=[]
 for pn,(ws,ocr) in enumerate(allwords):
  if 'ANSWERS:' in doc[pn].get_text():continue
  for w in ws:
   if re.fullmatch(r'(?:[1-9]|1\d|20)[.\)]',w[4]) and w[0]<65 and w[1]>15:
    n=int(w[4][:-1]);starts.append((n,pn,w[1],ocr))
 if exam=='amatyc-2007-fall':starts.append((4,0,270,True))
 if exam=='amatyc-2009-fall':
  starts=[(n,0,y,True) for n,y in enumerate([77.7,137.7,196,263,309.3,370.7,429,475.3,542,575.3,630.3,690.3],1)]+[(n,1,y,True) for n,y in enumerate([78.7,106,201,273.3,346.3,446.3,518.7,591.7],13)]
 # First occurrence of each expected question, sequential page positions.
 selected=[];last=(-1,-1)
 for n in range(1,21):
  opts=[v for v in starts if v[0]==n and (v[1],v[2])>last]
  if not opts:issues.append({'exam':exam,'missing':n});continue
  v=min(opts,key=lambda v:(v[1],v[2]));selected.append(v);last=(v[1],v[2])
 boundaries={}
 for n,pn,y,ocr in selected:
  # A fraction or superscript can extend above the question-number baseline.
  # Use a full-width whitespace band, rather than cutting at that baseline.
  pix=doc[pn].get_pixmap(matrix=fitz.Matrix(3,3),colorspace=fitz.csGRAY)
  rows=np.frombuffer(pix.samples,dtype=np.uint8).reshape(pix.height,pix.width)
  occupied=(rows[:,30:min(pix.width,1800)]<170).sum(axis=1)>3
  low=max(0,int((y-32)*3));high=int((y-2)*3)
  bands=[];start=None
  for row in range(low,high):
   if not occupied[row] and start is None:start=row
   if occupied[row] and start is not None:
    if row-start>=9:bands.append((start,row))
    start=None
  if start is not None and high-start>=9:bands.append((start,high))
  boundaries[n]=(sum(bands[-1])/6 if bands else y-12)
 for idx,(n,pn,y,ocr) in enumerate(selected):
  end=selected[idx+1] if idx+1<len(selected) else None
  bottom=boundaries[end[0]] if end and end[1]==pn else 750
  clip=fitz.Rect(10,max(0,boundaries[n]),600,bottom)
  im=doc[pn].get_pixmap(matrix=fitz.Matrix(2.2,2.2),clip=clip)
  img=Image.frombytes('RGB',[im.width,im.height],im.samples)
  pid=f'{exam}-q{n:02d}';img.save(root/f'public/images/exams/{pid}.webp',quality=87)
  ws=allwords[pn][0];segment=[w for w in ws if w[1]>=y-3 and w[1]<bottom]
  segment.sort(key=lambda w:(round(w[1]/4),w[0]))
  text=' '.join(w[4] for w in segment)
  native=doc[pn].get_text('text',clip=clip) if not ocr else text
  problems.append({'id':pid,'exam':exam,'year':int(r['year']),'semester':r['semester'],'number':n,'image':f'/images/exams/{pid}.webp','text':text,'native_text':native,'ocr':ocr,'source':r['filename'],'page':pn+1,'crop':[round(x,2) for x in clip]})
 print('EXAM',exam,len(selected),flush=True)
(review/'extracted.json').write_text(json.dumps({'problems':problems,'keys':keys,'issues':issues},indent=2))
print('TOTAL',len(problems),'ISSUES',json.dumps(issues),flush=True)
