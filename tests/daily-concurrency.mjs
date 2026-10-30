import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const container=process.argv[2];
if(!container)throw new Error('An isolated database test container is required');
const user='00000000-0000-4000-8000-000000000399';
function query(sql,onOutput=()=>{}){return new Promise((resolve,reject)=>{
 const child=spawn('docker',['exec','-i',container,'psql','-U','postgres','-Atq','-v','ON_ERROR_STOP=1']);
 let output='',error='';child.stdout.on('data',data=>{output+=data;onOutput(String(data));});child.stderr.on('data',data=>error+=data);
 child.on('error',reject);child.on('close',code=>code?reject(new Error(error)):resolve(output.trim()));child.stdin.end(sql);
});}
await query(`insert into auth.users(id,email,raw_user_meta_data) values('${user}','daily-concurrency@example.test','{}');`);
const auth=`begin;set local role authenticated;select set_config('test.uid','${user}',true);`;
await Promise.all([0,1].map(()=>query(`${auth}do $$begin perform public.start_daily_challenge();perform pg_sleep(.2);end$$;commit;`)));
assert.equal(await query(`select count(*) from public.daily_challenges where user_id='${user}';`),'1');
const id=await query(`select id from public.daily_challenges where user_id='${user}';`);
assert.match(id,/^[0-9a-f-]{36}$/);
await query(`select set_config('test.uid','${user}',false);do $$declare item jsonb;begin
 for item in select q from public.daily_challenges d cross join lateral jsonb_array_elements(d.items) q where d.id='${id}' loop
 perform public.save_daily_answer('${id}',item->'problem'->>'id',coalesce(nullif(item->'solution'->'accepted_answers','null'::jsonb)->>0,item->'solution'->>'correct_answer'));end loop;end$$;`);
await Promise.all([0,1].map(()=>query(`${auth}do $$begin perform public.finish_daily_challenge('${id}');perform pg_sleep(.2);end$$;commit;`)));
assert.equal(await query(`select rating from public.profiles where id='${user}';`),'840');
assert.equal(await query(`select count(*) from public.rating_history where daily_challenge_id='${id}';`),'1');
console.log('PASS: simultaneous starts create one set; simultaneous finishes award rating exactly once');

// A save sent before the deadline but waiting on a profile lock must use the
// actual time after acquiring that lock, not the transaction/statement start.
const timedUser='00000000-0000-4000-8000-000000000400';
await query(`insert into auth.users(id,email,raw_user_meta_data) values('${timedUser}','daily-deadline-race@example.test','{}');select set_config('test.uid','${timedUser}',false);select public.start_timed_daily_challenge();`);
const timedId=await query(`select id from public.daily_challenges where user_id='${timedUser}';`);
await query(`update public.daily_challenges set started_at=clock_timestamp()-interval '39 minutes',expires_at=clock_timestamp()+interval '1 second' where id='${timedId}';`);
let markLocked;
const locked=new Promise(resolve=>{markLocked=resolve;});
const holding=query(`begin;select id from public.profiles where id='${timedUser}' for update;select 'LOCKED';select pg_sleep(2);commit;`,chunk=>{if(chunk.includes('LOCKED'))markLocked();});
await locked;
const lateSave=query(`begin;set local role authenticated;select set_config('test.uid','${timedUser}',true);select public.save_daily_answer('${timedId}',(select 'not-needed-after-expiry'),'A');commit;`);
await Promise.all([holding,lateSave]);
assert.equal(await query(`select completed_at is not null and timed_out and answers='{}'::jsonb and correct_count=0 from public.daily_challenges where id='${timedId}';`),'t');
assert.equal(await query(`select count(*) from public.rating_history where daily_challenge_id='${timedId}';`),'1');
console.log('PASS: a save waiting on a lock cannot bypass the deadline');
