"""Inventory/extract local PDFs or ZIP archives into a human review queue.
Requires the optional pdftotext command for text extraction. Never publishes."""
import argparse, hashlib, json, re, shutil, subprocess, zipfile
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('sources',nargs='+')
parser.add_argument('--output',default='/tmp/amatyc-import-review')
args=parser.parse_args()
out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
records=[]
for source in args.sources:
    source=Path(source)
    if not source.exists(): raise SystemExit(f'Source not found: {source}')
    files=[]
    if zipfile.is_zipfile(source):
        with zipfile.ZipFile(source) as archive:
            for info in archive.infolist():
                if info.filename.lower().endswith('.pdf') and '__MACOSX' not in Path(info.filename).parts and not Path(info.filename).name.startswith('._'):
                    if info.file_size>32*1024*1024: raise SystemExit('PDF exceeds 32 MB review limit')
                    content=archive.read(info)
                    digest=hashlib.sha256(content).hexdigest()
                    path=out/(digest[:16]+'-'+Path(info.filename).name)
                    path.write_bytes(content);files.append((info.filename,path))
    elif source.is_dir():files=[(p.name,p) for p in source.rglob('*.pdf')]
    elif source.suffix.lower()=='.pdf':files=[(source.name,source)]
    else:raise SystemExit(f'Unsupported source: {source}')
    for name,path in files:
        year=re.search(r'(?:19|20)\d{2}',name)
        short_year=re.search(r'(?:sp|au)(\d{2})',name,re.I)
        semester=re.search(r'(spring|fall|autumn)',name,re.I)
        short_semester=re.search(r'(sp|au)\d{2}',name,re.I)
        is_key=bool(re.search(r'key|answer',str(source)+'/'+name,re.I))
        extracted=None
        if shutil.which('pdftotext'):
            text_path=out/(hashlib.sha256(path.read_bytes()).hexdigest()[:16]+'.txt')
            subprocess.run(['pdftotext','-layout',str(path),str(text_path)],check=True)
            extracted=str(text_path)
        records.append(dict(source=str(source),filename=name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),year=year.group() if year else '20'+short_year.group(1) if short_year else None,semester=semester.group().lower() if semester else ('spring' if short_semester.group(1).lower()=='sp' else 'fall') if short_semester else None,kind='answer_key' if is_key else 'questions',text_path=extracted,verification_status='unreviewed',flags=['Manual question splitting required','Verify all notation, options, answers and diagrams']))
for record in records:
    record['candidate_matches']=[r['filename'] for r in records if r['kind']!=record['kind'] and record['year'] and r['year']==record['year'] and record['semester'] and r['semester']==record['semester']]
(out/'inventory.json').write_text(json.dumps(records,indent=2)+'\n')
print(f'Inventoried {len(records)} PDFs. Review queue: {out}/inventory.json. Nothing published.')
