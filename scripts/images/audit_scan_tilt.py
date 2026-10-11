"""Measure scan tilt for CSS display corrections; original assets stay intact.
Requires Pillow and numpy. Uses horizontal ink projection with conservative gates.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2]
angles={}
for path in sorted((root/'public/images/exams').glob('*.webp')):
    im=Image.open(path).convert('L'); im.thumbnail((650,650))
    pixels=np.array(im); y,x=np.where(pixels<150)
    if len(x)<1000: continue
    x=x-pixels.shape[1]/2
    def score(angle):
        rows=np.rint(y+np.tan(np.deg2rad(angle))*x).astype(int)
        counts=np.bincount(rows-rows.min()).astype(float)
        return np.sum(counts**2)
    baseline=score(0)
    candidates=[(score(a),round(float(a),2)) for a in np.arange(-2,2.01,.1)]
    best,angle=max(candidates)
    # Exclude barely tilted scans and uncertain/boundary fits.
    if .3<=abs(angle)<1.9 and best>baseline*1.2:
        angles['/images/exams/'+path.name]=angle
(root/'data/historical/image-tilt.json').write_text(json.dumps(angles,indent=2)+'\n')
print(f'High-confidence display corrections: {len(angles)}')
print('Reported scan:',angles.get('/images/exams/amatyc-2007-fall-q01.webp'))
