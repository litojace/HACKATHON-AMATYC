"""Read exam scans and generate CSS framing metadata; never alter source images.
Requires Pillow and tesseract. Choice gaps are added only at verified blank rows.
"""
import csv, io, json, os, re, subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[2]
def inspect(path):
    im = Image.open(path).convert('L'); w, h = im.size
    box = im.point(lambda x: 255 if x < 248 else 0).getbbox()
    if not box: return None
    l, t, r, b = box; l=max(0,l-16); t=max(0,t-16); r=min(w,r+16); b=min(h,b+16)
    frame=[w,h,l,t,r-l,b-t]
    output=subprocess.check_output(['tesseract',str(path),'stdout','--psm','6','tsv'],stderr=subprocess.DEVNULL,env={**os.environ,'OMP_THREAD_LIMIT':'1'},text=True)
    words=[v for v in csv.DictReader(io.StringIO(output),delimiter='\t') if v['level']=='5' and v['text'].strip()]
    labels=[v for v in words if re.fullmatch('[ABCDE][.)]',v['text'])]
    a=next((v for v in labels if v['text'][0]=='A'),None)
    if a and {v['text'][0] for v in labels} == set('ABCDE'):
        option_top=min(int(v['top']) for v in labels)
        # A full-width blank band is essential: never cut through math/diagrams.
        blank=[]
        for y in range(max(t,option_top-32),option_top):
            if im.crop((l,y,r,y+1)).getextrema()[0]>=248: blank.append(y)
        if blank:
            split=blank[-1]
            if split>t+12 and b-split>12: frame.append(split-t)
    return '/images/exams/'+path.name,frame
paths=sorted((root/'public/images/exams').glob('*.webp'))
with ThreadPoolExecutor(max_workers=8) as pool:
    frames=dict(result for result in pool.map(inspect,paths) if result)
(root/'data/historical/image-frames.json').write_text(json.dumps(frames,separators=(',',':'))+'\n')
print(f'Inspected {len(frames)} scans; identified safe question/choice separation in {sum(len(v)>6 for v in frames.values())}.')
print('Very short source crops requiring review:',[k for k,v in frames.items() if v[1]<50])
