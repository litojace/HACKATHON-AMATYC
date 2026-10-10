import json,math,itertools
from pathlib import Path
root=Path(__file__).resolve().parents[2];path=root/'data/historical/questions.json';ps=json.loads(path.read_text());byid={p['id']:p for p in ps}
def guide(fn,summary,steps,states=None):return dict(model='Casio FX-115ES PLUS',applicable=True,functionality=fn,summary=summary,steps=steps,**({'screen_states':states} if states else {}))
solutions=[
 r'Evaluate inside out: $2\#5=-1$, $0\#(-1)=1$, and $2\#1=3$. Answer D.',
 r'In base 5, each place value is odd, so parity is the parity of the digit sum. To be odd in base 10 the last digit is 1 or 3. The first four digits must have odd sum. Among their $5^4$ strings, the even-minus-odd count is $(3-2)^4=1$, so there are $(625-1)/2=312$ odd-sum strings. The count is $2(312)=624$. Answer A.',
 r'Although the displayed dice outcomes are unordered, each permutation is a distinct equally likely roll of the five dice. Each straight has $5!$ orderings. Thus $P=2(5!)/6^5=5/162\approx0.0309$. Answer C.',
 r'$x^2+2xy+y^2=(x+y)^2$. Over the real plane it is zero exactly on $x+y=0$, a single line. Answer D.',
 r'$\sum_{i=1}^9 i=45$ and $\sum_{i=1}^9 i^3=45^2=2025$. Positive powers increase strictly here, so $m=3$ and $n=2$. Their sum is 5. Answer D.',
 r'The cube-sum identity gives $\sum_{i=1}^{9999}i^3=(9999\cdot10000/2)^2=(9999\cdot5000)^2$. Because 9999 has no factor of 2 or 5, the power of 5 is 6 and the power of 2 is 8. Exactly 6 trailing zeros result. Answer D.',
 r'Reflect $(0,0)$ across $x+y=2$ to get $(a,b)=(2,2)$. Reflect that point across $y-x=4$ to obtain $(c,d)=(-2,6)$. Equidistance from $(0,0)$ and $(-2,6)$ is $x^2+y^2=(x+2)^2+(y-6)^2$, which simplifies to $3y-x=10$. Answer A.',
 r'The least two sums must be $a+b=1$ and $a+c=2$. The next two are $a+d$ and $b+c$, in either order. If they are 3 and 4 respectively, the numbers are $(-1/2,3/2,5/2,7/2)$; if they are 4 and 3 respectively, they are $(0,1,2,4)$. Both satisfy the ordering and distinct sums. The smaller possible $d$ is $7/2$. Answer C.',
 r'Let the circle radius be $r$. Each quadrant sector has area $\pi r^2/4$, and its chord triangle has area $r^2/2$. Reflecting the circular segment replaces each sector contribution to the central shaded region by $r^2-\pi r^2/4$. The four quadrants therefore have total shaded area $(4-\pi)r^2$. The required ratio is $\pi/(4-\pi)$. Answer E.',
 r'If Y were the knight, the statement "I am a spy" would be false, so Y is not the knight. There is more than one consistent assignment: X=spy, Y=knave, Z=knight; and X=knight, Y=knave, Z=spy. Their truth/lie requirements all hold, so the complete assignment is not determined. Answer E.',
 r'Complete the square to write the translated ellipse as $x^2+4(y-h)^2=1$. Its lower boundary first meets $y=x^2$ when $h$ reaches the maximum of $u+\tfrac12\sqrt{1-u}$ for $u=x^2\in[0,1]$. The derivative is $1-1/(4\sqrt{1-u})$, giving $u=15/16$ and $h=15/16+1/8=17/16$; endpoints give smaller values. Answer D.',
 r'$2025=3^4 5^2$. Legendre counting gives $v_3(2025!)=675+225+75+25+8+2=1010$ and $v_5(2025!)=405+81+16+3=505$. Thus the maximum exponent is $\min(\lfloor1010/4\rfloor,\lfloor505/2\rfloor)=252$. Answer D.',
 r'Let $T(0)=1$ and $T(n)=0$ for negative $n$. An ordered partition starts with 1, 2, 3, or 4, so $T(n)=T(n-1)+T(n-2)+T(n-3)+T(n-4)$. For $n=0,\ldots,10$ the counts are $1,1,2,4,8,15,29,56,108,208,401$. Answer C.',
 r'On the x-axis the roots are $19\pm6\sqrt{26}$, giving diagonal length $12\sqrt{26}$. On the y-axis the roots are $33\pm8\sqrt{26}$, giving diagonal length $16\sqrt{26}$. These perpendicular diagonals cross inside the quadrilateral, so area is $\tfrac12(12\sqrt{26})(16\sqrt{26})=2496$. Answer B.',
 r'The quotient of $(x^2-16)/(ax+b)$ has linear part $x/a-b/a^2$. Matching $3x+7$ gives $a=1/3$ and $b=-7/9$. Therefore $f(-3)=(-7)/(-1-7/9)=63/16$. Answer B.',
 r'Let E be the expected total. The first roll contributes mean $21/6$, and with probability $5/6$ the game restarts with the same expected future total. Thus $E=21/6+(5/6)E$, so $E=21$. Answer E.',
 r'The ten digits sum to 45. Omitting two distinct digits leaves a sum divisible by 9 exactly when their sum is 9; the possibilities are $(0,9),(1,8),(2,7),(3,6),(4,5)$. The first leaves $8!$ arrangements without a zero. Each of the other four leaves $8!-7!$ arrangements after excluding leading zero. Total $8!+4(8!-7!)=181440$. Answer E.',
 r'The recurrence produces $5,2,-3,-5,-2,3$ and then repeats. Its six-term block sums to zero. There are 2026 terms, namely 337 full blocks plus the first four terms, which sum to $5+2-3-5=-1$. Answer B.',
 r'Write the ellipse as $x^2/(ab)+y^2/a=1$. Its semiaxes are $\sqrt{ab}$ and $\sqrt a$. The centered inscribed and circumscribed circles have radii equal to the smaller and larger semiaxes, respectively, so their product is $a\sqrt b$, regardless of which axis is larger. Answer A.',
 r'Place $Q=(0,0)$ and $S=(2,0)$. The two triangles sharing QS give $R=(1,1)$ and, on the other side, $P=(1/2,-\sqrt3/2)$. The vector from P toward R has slope $2+\sqrt3=\tan75^\circ$. At T, TS points along the positive x-axis, so $\angle RTS=75^\circ$. Answer D.'
]
demo=json.loads((root/'data/demo/questions.json').read_text())
guides={1:demo[0]['calculator_trick'],
3:guide('Factorial and exact fractions','The factorial function counts every ordering of a straight; it performs the counting operation rather than merely substituting a precomputed favorable count.', ['In COMP enter 2×5 [SHIFT] [x⁻¹] (x!) to count both straights and all their permutations.','Divide by 6^5, the number of equally likely ordered rolls, and press [=]. The exact fraction is 5/162.','Press [S⇔D] for 0.0308641975… and round to four decimal places: 0.0309.'],['2×5!','5/162','0.0309']),
5:guide('TABLE to compare power sums','Generate powers for the nine terms with TABLE, and compare increasing exponents until their sum reaches 2025.', ['Choose [MODE] [7] (TABLE), enter f(X)=X^3, and set Start=1, End=9, Step=1. The rows are 1,8,27,64,125,216,343,512,729.','Sum the table values in COMP: they total 2025, identifying m=3. The sums for exponent 1 and 2 are 45 and 285, so neither works.','Use [SHIFT] [CALC] (SOLVE) on 45^X−2025 with initial guess 2. It returns X=2, identifying n=2; m+n=5.'],['X^3','Sum = 2025','n=2']),
11:guide('TABLE and numerical refinement','TABLE can locate the first-contact height after the ellipse is modeled geometrically. The numerical sweep selects the candidate; the written solution proves the exact fraction.', ['In TABLE enter f(X)=X²+0.5×√(1−X²). Here X is the horizontal coordinate and f(X) is the center height at contact.','Start=0, End=1, Step=0.05. Locate the maximum near X=0.97. Refine with Start=0.96, End=0.98, Step=0.001.','The largest values approach 1.0625=17/16. Keep X within [0,1] to avoid an invalid square root; the derivative argument confirms the exact maximum.'],['X²+0.5√(1−X²)','Maximum near X=0.968','h=1.0625']),
12:guide('TABLE for factorial valuations','Generate the divisions needed by Legendre’s formula without attempting to evaluate 2025!, which exceeds the calculator range.', ['In TABLE enter f(X)=2025÷3^X. Use Start=1, End=7, Step=1; take each row’s integer part to obtain 675,225,75,25,8,2,0.','Repeat with f(X)=2025÷5^X and Start=1, End=5, Step=1. The integer parts are 405,81,16,3,0.','Sum the integer parts in COMP, then compare the integer parts of 1010÷4 and 505÷2. Both are 252. Discarding fractional parts counts complete prime factors.'],['2025/3^X','v₃=1010; v₅=505','n=252']),
14:guide('EQN for axis intercepts','The quadratic solver obtains both intercepts on each axis, which define the two diagonals of the quadrilateral.', ['Use [MODE] [5] [3] (quadratic). With y=0, enter 1,−38,−575. Record both x roots; their difference is approximately 61.18823416.','Repeat the quadratic solver for x=0, entering 1,−66,−575. Record both y roots; their difference is approximately 81.58431222.','In COMP multiply the two unrounded diagonal differences and divide by 2 to obtain 2496. Use full displayed precision or the exact radicals from the written solution.'],['x²−38x−575=0','y²−66y−575=0','Area = 2496']),
16:guide('SOLVE for a restart expectation','Build the expectation equation using the restart probability, then let SOLVE find its fixed point.', ['In COMP enter 21÷6+(5÷6)×X−X, using [ALPHA] X. This is the zero-residual form of E=21/6+(5/6)E.','Press [SHIFT] [CALC] (SOLVE). At X? choose 10 and press [=].','Read X=21 with L−R=0. This solves the unknown expectation; entering only the final division would omit the model.'],['21/6+(5/6)X−X','Solve for X: 10','X=21']),
17:guide('Factorial for restricted permutations','Use x! to count the arrangements of each valid digit set, and subtract the permutations with leading zero.', ['First identify the five omitted pairs with sum 9: (0,9),(1,8),(2,7),(3,6),(4,5). The divisibility test is required before counting.','In COMP enter 8 [SHIFT] [x⁻¹] (x!) to count arrangements of the set with no zero. For each other set, the invalid zero-leading arrangements number 7!.','Evaluate 8!+4×(8!−7!) [=]. The factorial function performs both permutation counts and the leading-zero correction.'],['8!','8!−7!','181440']),
18:guide('CALC recurrence generation','Reuse an expression with two stored inputs to generate consecutive recurrence terms and reveal the repeating cycle.', ['In COMP enter B−A using the ALPHA variable keys. Press [CALC] and assign A=5, B=2 to obtain −3.','Press [CALC] again with A=2, B=−3 to get −5. Continue with consecutive pairs: (−3,−5)→−2, (−5,−2)→3, (−2,3)→5, (3,5)→2.','The pair (5,2) has returned, so the six-term cycle repeats. Its sum is zero; the last four terms after 337 cycles sum to −1.'],['B−A','−3; −5; −2; 3; 5; 2','337 cycles + 4 terms → −1']),
20:guide('Inverse tangent in degree mode','Use the calculator’s inverse trigonometric function to recover the diagonal angle from the coordinate components.', ['From the shared-diagonal triangles, use R=(1,1), P=(0.5,−√3/2). The PR direction has rise 1+√3/2 and run 0.5.','Set [SHIFT] [MODE] [3] (Deg). Enter [SHIFT] [tan] ((1+√3÷2)÷0.5) and close the argument.','Press [=] to obtain 75°. The degree setting matters; the mathematical solution establishes that this is the angle RTS rather than its supplement.'],['D','tan⁻¹((1+√3/2)/0.5)','75°'])}
for n,solution in enumerate(solutions,1):
 p=byid[f'amatyc-2025-spring-q{n:02d}'];p['written_solution']=solution;p['verification_status']='fully_verified'
 if n in guides:p['calculator_trick']=guides[n]
 else:p['calculator_trick']['summary']='The key step is '+p['title'].lower()+'. The mathematical solution gives the reasoning. No calculator-specific shortcut is presented merely to repeat the final arithmetic.'
# Recurring integer-power questions: verified finite enumeration supports an actual TABLE workflow.
dios={
'2008-fall-q12':(2009,[6,2,2],[1,1,1]),'2008-spring-q03':(2008,[3,3,3],[1,1,1]),
'2009-fall-q06':(2009,[4,3,2],[1,1,1]),'2010-fall-q13':(2010,[5,2,2],[1,1,1]),'2010-spring-q06':(2010,[3,3,2],[1,1,1]),
'2011-fall-q04':(2011,[6,2,2],[1,1,1]),'2011-spring-q13':(2011,[5,2,2],[1,1,1]),'2012-fall-q06':(2012,[5,2,2],[1,1,1]),'2012-spring-q07':(2012,[3,3,2],[1,1,1]),
'2013-fall-q11':(2013,[4,2,2],[1,2,1]),'2013-spring-q07':(2013,[3,2,2],[1,1,1]),'2014-fall-q13':(2014,[6,2,2],[1,1,1]),'2014-spring-q11':(2014,[4,2,2],[1,1,1]),
'2015-fall-q17':(2015,[5,3,2],[1,1,1]),'2015-spring-q11':(2015,[3,3,2],[1,1,1]),'2017-fall-q07':(2017,[2,2,7],[1,1,1]),'2018-fall-q08':(2018,[6,2,3],[1,1,1]),
'2019-fall-q04':(2019,[2,2,5],[1,1,1]),'2020-spring-q03':(2020,[2,2,4],[1,1,1]),'2022-fall-q03':(2022,[4,3,2],[2,1,1]),'2022-spring-q14':(2022,[4,2,2],[1,2,1]),'2023-fall-q11':(2023,[3,2,2],[1,1,1]),'2024-fall-q13':(2024,[4,3,2],[1,1,1])}
results = {
 '2024-fall-q13': 'The sum is 3+7+40=50 (C).',
 '2023-fall-q11': 'The repeated integer is 5 (C).',
 '2022-fall-q03': 'The sum is 3+11+23=37 (A).',
 '2022-spring-q14': 'The repeated b value is 11 (C).',
 '2020-spring-q03': 'The sum is 20+18+6=44 (E).',
 '2019-fall-q04': 'The sum is 43+13+1=57 (B).',
 '2018-fall-q08': 'There are four ordered solutions (E).',
 '2017-fall-q07': 'Both symmetric solutions have sum 17+40+2=59 (A).',
 '2015-fall-q17': 'The quotient c/(ab) is 42/(3×2)=7 (E).',
 '2015-spring-q11': 'The sum is 11+2+26=39 (B).',
 '2014-fall-q13': 'The sum is 3+31+18=52 (B).',
 '2014-spring-q11': 'Swapping b and c leaves the sum 3+13+42=58 (B).',
 '2013-fall-q11': 'The sum is 5+26+6=37 (B).',
 '2013-spring-q07': 'The sum is 4+10+43=57 (B).',
 '2012-fall-q06': 'The sum is 3+37+20=60 (E).',
 '2012-spring-q07': 'Both symmetric solutions have sum 8+11+13=32 (C).',
 '2011-fall-q04': 'Both symmetric solutions have sum 3+21+29=53 (D).',
 '2011-spring-q13': 'The primes are 2 and 3; the nonprime value is 42 (C).',
 '2010-fall-q13': 'The common divisor is gcd(28,35)=7 (D).',
 '2010-spring-q06': 'Both solutions have a+b=5+9=14 (D).',
 '2009-fall-q06': 'The sum is 4+9+32=45 (D).',
 '2008-fall-q12': 'The two powers of 2 are 16 and 32; the sum is 51 (E).',
 '2008-spring-q03': 'Every permutation has sum 4+6+12=22 (B).',
}
def prime(n):return n>=2 and all(n%d for d in range(2,math.isqrt(n)+1))
def pow2(n):return n>0 and n&(n-1)==0
for suffix,(target,exponents,coeffs) in dios.items():
 p=byid['amatyc-'+suffix];aexp,bexp,cexp=exponents;ac,bc,cc=coeffs
 candidates=[]
 for a in range(1,int((target/ac)**(1/aexp))+2):
  for b in range(1,int((target/bc)**(1/bexp))+2):
   rest=target-ac*a**aexp-bc*b**bexp
   if rest<=0 or rest%cc:continue
   c=round((rest/cc)**(1/cexp))
   if cc*c**cexp!=rest:continue
   if suffix=='2008-fall-q12' and sum(map(pow2,[a,b,c]))!=2:continue
   if suffix=='2008-spring-q03' and (len({a,b,c})<3 or any(x%2 for x in [a,b,c])):continue
   if suffix=='2009-fall-q06' and (math.isqrt(a)**2!=a or math.isqrt(b)**2!=b):continue
   if suffix=='2010-fall-q13' and math.gcd(b,c)==1:continue
   if suffix=='2011-spring-q13' and sum(map(prime,[a,b,c]))!=2:continue
   if suffix=='2012-fall-q06' and not prime(b-c):continue
   if suffix=='2013-spring-q07' and b%5:continue
   if suffix=='2014-fall-q13' and not prime(b):continue
   if suffix=='2015-fall-q17' and c%(a*b):continue
   if suffix in ['2015-spring-q11','2019-fall-q04','2020-spring-q03'] and a<=b:continue
   if suffix=='2023-fall-q11' and b>=c:continue
   candidates.append((a,b,c))
 assert candidates,(suffix,candidates)
 formula=f'(({target}−{ac}×A^{aexp}−{bc}×X^{bexp})÷{cc})^(1÷{cexp})'
 p['calculator_trick']=guide('TABLE with a stored parameter',f'Use TABLE to search for integer triples for {ac}a^{aexp}+{bc}b^{bexp}+{cc}c^{cexp}={target}. TABLE calculates candidate c values for a run of b values; it does not prove integrality or replace the printed restrictions.',[f'Bound a and b using positivity. In COMP store a trial value of a in A: value [SHIFT] [RCL] (STO), then the key marked A. Start with a=1 and repeat for every positive a with {ac}a^{aexp}<{target}.',f'Select [MODE] [7] (TABLE) and enter f(X)={formula}. X represents b. Scan positive b in blocks of at most 30 rows, with Step=1, stopping before the radicand becomes nonpositive.',f'For each near-integer table value, verify {ac}a^{aexp}+{bc}b^{bexp}+{cc}c^{cexp}={target} exactly in COMP. Apply every extra restriction in the printed question. Candidate triples passing the restrictions: '+', '.join(str(t) for t in candidates)+'. Then evaluate the quantity asked for.'],['Store a → A',formula,'Check exact powers; do not trust rounded decimals'])
 p['written_solution']='Bound the positive variables by the displayed power equation. For each allowable a and b, the remaining c is fixed by '+f'c^{cexp}=({target}−{ac}a^{aexp}−{bc}b^{bexp})/{cc}'+'. Check perfect powers exactly and apply the printed extra conditions. The complete surviving triples are '+', '.join(str(t) for t in candidates)+'. The source key gives '+', '.join(p['accepted_answers'])+'. '+results[suffix]
 # Answer independently checked by exact enumeration; solution outlines the exhaustive method.
 p['verification_status']='fully_verified'
path.write_text(json.dumps(ps,indent=2,ensure_ascii=False)+'\n')
(root/'data/historical/power-search-fixtures.json').write_text(json.dumps({k:{'target':v[0],'exponents':v[1],'coefficients':v[2]} for k,v in dios.items()},indent=2)+'\n')
print('Enriched',len(solutions),'Spring 2025 solutions and',len(dios),'power-search workflows.')
