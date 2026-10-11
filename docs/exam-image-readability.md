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
