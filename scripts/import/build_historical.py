import json,re,runpy,collections
from pathlib import Path
root=Path(__file__).resolve().parents[2];review=Path(__import__('sys').argv[1])
ratings=runpy.run_path(str(Path(__file__).with_name('historical_ratings.py')))['ratings'];methods=runpy.run_path(str(Path(__file__).with_name('historical_methods.py')))['methods']
source=json.loads((review/'extracted.json').read_text());inventory=json.loads((review/'inventory.json').read_text())
def category(method,text):
 s=method.lower()
 if any(w in s for w in ['probability','combinations','permutations','arrangements','dice','coin-pattern','expectation','pigeonhole','counting','stars and bars','subsets','committee','passcode','gift','queues','rankings','allocations','string separator','binomial','run-length','sampling','bagel','tilings']):return 'Probability and Combinatorics'
 if any(w in s for w in ['truth','knight','logic','information','counterexample','implication','suspect','game invariant','life grid','graph coloring','visibility logic','constraint','reachability','matching']):return 'Logic and Mathematical Reasoning'
 if any(w in s for w in ['trig','cosine','sine','radian','logarithm','secant','annuity']):return 'Trigonometry and Precalculus'
 if any(w in s for w in ['triangle','circle','square','slope','pentagon','polygon','hexagon','trapezoid','area','distance','incenter','incircle','inradius','circumradius','conic','midpoint','rectangle','box','intercept','lattice','pyramid','parallelogram','bisector','diagonal','angle','rotated','folding','volume','rail arc','semicircle','sector','voronoi','coordinate','spatial','perimeter','cylinder','chord','tangency','semiaxes']):return 'Geometry'
 if any(w in s for w in ['digit','divisib','prime','integer','factorial','coprime','modular','congru','pell','gcd','palindrome','base','trailing','power search','power count','factor pair','repdigit','factoradical','denominator','fraction counting','remainder','frobenius','valuation']):return 'Number Theory'
 if any(w in s for w in ['sequence','recurrence','fibonacci','series','periodic','finite difference','indexing','telescoping']):return 'Sequences and Series'
 if any(w in s for w in ['function','graph','domain','zeros','asymptote','fixed point','map definition','parabola vertex']):return 'Functions and Graphs'
 return 'Algebra'
ps=[];manifest=[]
for p in sorted(source['problems'],key=lambda p:(-p['year'],0 if p['semester']=='fall' else 1,p['number'])):
 exam=p['exam'];n=p['number'];key=source['keys'][exam];answer=key['answers'][str(n)];policy='standard'
 if 'all' in answer.lower() or 'everyone' in answer.lower():policy='credit_all';answer='Credit for all'
 if (exam,n) in [('amatyc-2014-fall',11),('amatyc-2015-spring',14),('amatyc-2016-spring',11)]:
  policy='no_penalty';answer={'amatyc-2014-fall':'322','amatyc-2015-spring':'504','amatyc-2016-spring':'11'}[exam]
 if (exam,n)==('amatyc-2015-spring',11):answer='B'
 if answer=='CorD':answer='C|D'
 accepted=answer.split('|')
 short=not all(re.fullmatch('[A-E]',a) for a in accepted) and policy!='credit_all'
 # Printed A-D item in Spring 2024; remaining source choice items use A-E.
 labels=list('ABCD' if (exam,n)==('amatyc-2024-spring',10) else 'ABCDE')
 if policy=='credit_all':accepted=labels
 method=methods[exam.removeprefix('amatyc-')][n-1];rating=ratings[exam.removeprefix('amatyc-')][n-1]
 rationale=f'Main technique: {method}. '+('Routine prerequisite or direct substitution; little search.' if rating<=900 else 'One standard model or short reasoning chain.' if rating<=1200 else 'Several linked steps or bounded case work.' if rating<=1500 else 'A non-obvious reduction, substantial cases, or careful domain/invariant reasoning.' if rating<=1800 else 'Extended search, multiple interacting insights, or advanced state analysis.')+' Editorial estimate; not an official AMATYC or Codeforces problem rating.'
 record=dict(id=p['id'],contest_name=f"AMATYC {p['semester'].title()} {p['year']}",question_number=n,title=method,category=category(method,p['text']),topic_tags=[category(method,p['text'])],difficulty_rating=rating,difficulty='Easy' if rating<1400 else 'Medium' if rating<1800 else 'Hard',difficulty_rationale=rationale,question_latex=p['text'],source_image_path=p['image'],answer_format='short_answer' if short else 'multiple_choice',options=[] if short else [dict(label=a,text='Printed option '+a) for a in labels],correct_answer=answer.split('|')[0],accepted_answers=accepted,grading_policy=policy,figure_required=False,figure_image_path=None,written_solution=None,calculator_trick=dict(model='Casio FX-115ES PLUS',applicable=False,summary='No reviewed calculator shortcut is published for this question yet. The original statement and official answer key are available; a final-arithmetic substitution would not teach a solving method.',steps=[]),verification_status='answer_verified',source_question_file=p['source'],source_answer_key_file=key['source'],publication_status='published')
 if policy!='standard':record['written_solution']='Official answer-key correction: '+('credit is awarded to everyone, including blank submissions.' if policy=='credit_all' else 'the keyed answer earns credit; all other responses are treated as blank, with no wrong-answer penalty.')
 ps.append(record)
 manifest.append(dict(id=p['id'],exam=exam,question_number=n,question_file=p['source'],key_file=key['source'],page=p['page'],crop=p['crop'],ocr=p['ocr'],rating=rating,principal_technique=method))
contests=[]
for exam in sorted({p['exam'] for p in source['problems']},reverse=True):
 p=next(p for p in source['problems'] if p['exam']==exam)
 contests.append(dict(id=exam,name=f"AMATYC {p['semester'].title()} {p['year']}",description='Complete original 20-question historical exam with source diagrams and official key corrections. Unrated practice.',year=p['year'],semester=p['semester'].title(),kind='historical_mock',duration_seconds=3600,question_count=20,correct_points=2,incorrect_points=-0.5,blank_points=0,starts_at=None,ends_at=None,review_at=None,rating_enabled=False))
(root/'data/historical/questions.json').write_text(json.dumps(ps,indent=2,ensure_ascii=False)+'\n')
(root/'data/historical/contests.json').write_text(json.dumps(contests,indent=2)+'\n')
(root/'data/historical/provenance.json').write_text(json.dumps(dict(exams=41,question_count=820,keys=42,unmatched_keys=['KEYS/smlkeyfall2003.pdf'],files=[{k:r[k] for k in ['filename','sha256','year','semester','kind']} for r in inventory],questions=manifest),indent=2)+'\n')
print(len(ps),len(contests),collections.Counter(p['answer_format'] for p in ps),collections.Counter(p['grading_policy'] for p in ps))
print('Short:',[(p['id'],p['correct_answer']) for p in ps if p['answer_format']=='short_answer'])
