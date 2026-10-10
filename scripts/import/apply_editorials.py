"""Apply reviewed detailed explanations without changing statements or official keys."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[2]
overrides = json.loads((root / 'data/editorials/detailed-solutions.json').read_text())
for relative in ['data/demo/questions.json', 'data/historical/questions.json']:
    path = root / relative
    questions = json.loads(path.read_text())
    for question in questions:
        if question['id'] in overrides:
            question['written_solution'] = overrides[question['id']]
    path.write_text(json.dumps(questions, indent=2, ensure_ascii=False) + '\n')
print(f'Applied {len(overrides)} reviewed detailed explanations.')
