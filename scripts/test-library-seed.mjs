import {readFileSync} from 'node:fs';
const data=readFileSync(new URL('../data/historical/questions.json',import.meta.url),'utf8');
if(data.includes('$historical_records$'))throw new Error('Unexpected SQL delimiter');
process.stdout.write('select public.import_problem_records($historical_records$'+data+'$historical_records$::jsonb,true);\n');
