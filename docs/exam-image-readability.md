Problem scan readability

`PrintedQuestionImage` uses the framing metadata in `data/historical/image-frames.json` to omit blank page margins without replacing the original scans. It retains 16 source pixels around all detected content. Images without metadata retain their complete framing.

The audit inspected all 820 historical scans. It identified 179 images with five recognized choice labels and a full-width blank row above them. Those images display a separate choices section with additional whitespace. Ambiguous scans remain intact: OCR never rewrites the question, notation, or choices.

The Fall 2018 question 10 scan was only 31 pixels high and omitted its answer choices. It was recovered from page 1 of the original `2018-fall (1).pdf`, using the rectangle `(10, 736, 600, 792)` at 2.2 times resolution. The corrected scan is 1298 × 124 pixels.

To regenerate the read-only analysis metadata, install Pillow and tesseract and run:

```sh
python3 scripts/images/audit_exam_frames.py
```

Review changed framing in the browser before publishing, especially scans with diagrams or choices spread across several lines. The audit does not modify image assets.

Clicking a scan opens a wide image dialog with 100–300% zoom, horizontal/vertical scrolling, Fit image, and keyboard dismissal. The dialog is mounted on the document body so page transitions and transformed containers cannot constrain it.

Scan tilt is corrected at display time using `data/historical/image-tilt.json`. The reported Fall 2007 question 1 needs a 0.8° clockwise correction. A conservative horizontal ink-projection audit identified 38 tilted scans; ambiguous scans remain unchanged. Extra padding accommodates the rotation, and the same correction applies to the enlarged image. Source images are never resampled or rewritten.

To repeat the tilt analysis with Pillow and numpy installed:

```sh
python3 scripts/images/audit_scan_tilt.py
```

Spring 2008 question 12 also had a source crop that ended before its choices.
It was recovered from page 2 of `competition2008spring.pdf`, using source rectangle
`(10, 50, 600, 100.7)` and six points of white padding below the extracted content,
rendered at 2.2 times resolution (1298 × 125 pixels). The bottom bound excludes
question 13's diagram, which starts at y=101.24. The restored printed choices are
A: 80, B: 81, C: 82, D: 83, and E: 84. Its framing metadata was updated separately;
no problem grading data or database migration is required.
