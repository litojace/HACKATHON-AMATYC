# Imported historical library

The supplied QUESTIONS.zip contains 41 exams with 20 questions each: 820 playable historical problems. KEYS.zip contains 42 keys. The Fall 2003 key has no corresponding question paper and is recorded as unmatched. Coverage runs Spring 2004 through Spring 2025; Fall 2020 and Spring 2021 papers are absent from the supplied archive. The 20 original samples remain separately labeled, for 840 total problems and 42 unrated contests.

Original source crops in `public/images/exams` preserve mathematical notation, printed choices, and diagrams. Click a statement to enlarge it. The PDF/OCR transcript supports search and accessibility assistance; it is not an independently corrected LaTeX transcription. Private answers live in `data/historical/questions.json` and server-only modules. Full PDFs are not served because some include embedded answer pages.

`data/historical/provenance.json` records archive filenames, SHA-256 hashes, page numbers, crop coordinates, OCR status, and the individually assigned principal technique and rating. Source archives and OCR caches remain outside the public application.

## Answer formats and corrections

805 questions have printed choices and 15 require short responses. Short answers accept case-insensitive text, whitespace, and numeric thousands separators. The three time/decimal formats retain their printed notation; numeric expression equivalence is not a CAS feature.

The official keys specify seven all-credit items, three correct-or-blank/no-penalty items, and two multiple-answer items. These are represented as explicit private grading policies rather than invented choices. Every all-credit submission, including blank, earns +2; a wrong no-penalty response earns 0. Alternate keyed letters are accepted. Short answers and corrections work in both server-graded local mode and Supabase.

## Difficulty and calculator instruction

Each of the 820 questions has an editorial difficulty estimate and named principal solving technique. Estimates depend on the insights, steps, domain restrictions, and search required, rather than the question position. They are not official Codeforces ratings or estimates calibrated from student performance. The original samples have also been lowered to reflect their actual prerequisite difficulty. The arena exposes the rationale.

New users start at 800. Codeforces rank thresholds/colors are used: Newbie gray, Pupil green (1200), Specialist cyan (1400), Expert blue (1600), Candidate Master violet (1900), Master orange (2100), International Master orange (2300), and the three Grandmaster ranks red (2400/2600/3000). Existing unused default-1500 accounts are migrated to 800; prior competitive rating histories are preserved. Practice and historical exams remain unrated.

The historical library currently has written entries for 300 of 820 questions: 290 worked mathematical explanations and 10 official-key correction notes. The remaining 530 questions still need worked explanations. This includes all 20 Spring 2025 problems and recurring integer-power problems, as well as additional source-based explanations added during ongoing editorial work. Explanations are original editorial walkthroughs, not represented as official AMATYC solutions. The original 20 sample explanations are also expanded. Power searches enumerate positive integer possibilities exactly before applying the printed restrictions.

33 historical questions and 12 original samples have calculator procedures. These teach SOLVE, EQN, TABLE, CALC, Ans, factorial, combinations, inverse trigonometry, or mode selection as part of the solving process. The interface steps through key instructions and expected displays; it is an instructional replay, not an executable Casio emulator. Questions without a reviewed procedure explicitly say so. A final arithmetic substitution is not presented as a calculator strategy.

## Reproduce and publish

Runtime needs only Node and the checked-in JSON/WebP assets. The following optional extraction workflow needs Python 3, PyMuPDF, Pillow, NumPy, and Tesseract. It is specifically reviewed for this supplied archive, not a universal PDF parser:

```sh
npm run import:pdf -- /path/QUESTIONS.zip /path/KEYS.zip --output /tmp/amatyc-review
python3 scripts/import/extract_historical.py /tmp/amatyc-review
python3 scripts/import/build_historical.py /tmp/amatyc-review
python3 scripts/import/enrich_historical.py
npm run import:json -- data/historical/questions.json --validate-only
```

Extraction includes explicit repairs for scanned question markers and key entries. Review original crops against source PDFs whenever changing extraction boundaries or input archives. The build stage replaces generated records; the enrichment stage restores the reviewed worked solutions and calculator procedures.

For Supabase apply migrations 001–005 in order, or 004–005 on an existing v2 database, then run `npm run seed` in a trusted shell with the project URL and service-role key. The seed imports all 840 questions, creates all 42 contest mappings, and refreshes reviewed rating metadata. It never publishes competitive rating changes. The runtime never needs a service-role key.
