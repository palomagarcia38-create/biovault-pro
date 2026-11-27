const {setup,user,tick}=require('./accounts.test.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
let passed=0;
const run=async(name,test)=>{await test();passed++;console.log('PASS',name);};
const state=s=>JSON.parse(JSON.stringify(s.w.BioshapeTraining.exportData()));
const records=s=>Object.values(state(s).records);
const click=(s,action,id)=>{const selector=`#trainingModal [data-tr="${action}"]${id==null?'':`[data-id="${id}"]`}`;const el=s.w.document.querySelector(selector);assert(el,'Missing action '+selector);el.click();};
const field=(s,selector,value)=>{const el=s.w.document.querySelector(selector);assert(el,selector);el.value=value;el.dispatchEvent(new s.w.Event('change',{bubbles:true}));};
const submit=(s,id)=>s.w.document.getElementById(id).dispatchEvent(new s.w.Event('submit',{bubbles:true,cancelable:true}));
function saveTemplate(s){s.w.openTraining();click(s,'explore');click(s,'template','0');submit(s,'trEditorForm');assert.equal(records(s).filter(r=>r.kind==='plan').length,1);}
function logSeries(s,load='25',reps='10'){click(s,'exercise');field(s,'[data-log="load"][data-set="0"]',load);field(s,'[data-log="reps"][data-set="0"]',reps);click(s,'set');}
(async()=>{
await run('opening the training tab creates no plan, session or cloud write',async()=>{
 const s=await setup({user:user('alice')});s.w.openTraining();assert.match(s.w.document.getElementById('trainingSummary').textContent,/Seu treino começa aqui/);assert.equal(records(s).length,0);assert.equal(s.writes.length,0);assert.deepEqual(s.errors,[]);s.close();
});
await run('all catalog demonstrations are bundled, use real images and have start/end positions',async()=>{
 const s=await setup();const list=s.w.BIOSHAPE_EXERCISES;assert.equal(list.length,20);for(const e of list){assert.equal(e.images.length,2);for(const image of e.images)assert(fs.statSync('public/'+image).size>500);assert(e.setup&&e.movement&&e.avoid);}s.close();
});
await run('editable template requires explicit saving and retains prescribed values when reordered',async()=>{
 const s=await setup();s.w.continueOnDevice();s.w.openTraining();click(s,'explore');click(s,'template','0');assert.equal(records(s).length,0);field(s,'[data-editor-index="0"] [data-editor-field="sets"]','4');click(s,'move');submit(s,'trEditorForm');const p=records(s).find(r=>r.kind==='plan').value;assert.equal(p.items[0].sets,4);assert.equal(p.items.length,6);assert.equal(records(s).filter(r=>r.kind==='session').length,0);assert.deepEqual(s.errors,[]);s.close();
});
await run('starting, logging and completing a partial workout preserves real values and timer',async()=>{
 const s=await setup();s.w.continueOnDevice();saveTemplate(s);click(s,'start');logSeries(s);let session=records(s).find(r=>r.kind==='session').value;assert.equal(session.items[0].logs[0].load,25);assert.equal(session.items[0].logs[0].reps,10);assert.equal(session.items[0].logs[0].done,true);assert.equal(session.items[0].logs[1].load,null);assert(session.restUntil>Date.now());click(s,'back');click(s,'finish');session=records(s).find(r=>r.kind==='session').value;assert.equal(session.status,'completed');assert.equal(session.runningSince,0);assert.equal(session.restUntil,0);assert.match(s.w.document.getElementById('trainingSummary').textContent,/TREINO PARCIAL REGISTRADO/);click(s,'feedback','pain');assert.match(s.w.document.getElementById('trainingSummary').textContent,/Peça avaliação/);assert.deepEqual(s.errors,[]);s.close();
});
await run('in-progress sessions survive reload without inventing missing weights',async()=>{
 let s=await setup();s.w.continueOnDevice();saveTemplate(s);click(s,'start');logSeries(s,'','12');const data=s.w.localStorage.getItem('bioshape_training_local');s.close();s=await setup({storage:{bioshape_training_local:data}});s.w.continueOnDevice();s.w.openTraining();click(s,'resume');click(s,'exercise');assert.equal(s.w.document.querySelector('[data-log="load"]').value,'');assert.equal(s.w.document.querySelector('[data-log="reps"]').value,'12');assert.match(s.w.document.getElementById('trainingSummary').textContent,/Nenhuma carga registrada/);assert.deepEqual(s.errors,[]);s.close();
});
await run('invalid repetitions cannot be marked as complete, and negative loads are rejected',async()=>{
 const s=await setup();s.w.continueOnDevice();saveTemplate(s);click(s,'start');click(s,'exercise');click(s,'set');assert(!records(s).find(r=>r.kind==='session').value.items[0].logs[0].done);field(s,'[data-log="load"]','-2');assert.equal(records(s).find(r=>r.kind==='session').value.items[0].logs[0].load,null);assert.deepEqual(s.errors,[]);s.close();
});
await run('account switch isolates workout records and ignores stale snapshots',async()=>{
 const s=await setup({user:user('alice')});saveTemplate(s);const observer=s.snapshots.find(x=>x.path==='users/alice/training');const previous=state(s);s.emitUser('bob');s.w.openTraining();assert.equal(records(s).length,0);observer.cb({docs:Object.entries(previous.records).map(([id,r])=>({id,data:()=>({schema:1,kind:r.kind,data:JSON.stringify(r.value),updatedAt:r.updatedAt,revision:r.revision})}))});assert.equal(records(s).length,0);assert.match(s.w.document.getElementById('trainingSummary').textContent,/Seu treino começa aqui/);assert.deepEqual(s.errors,[]);s.close();
});
await run('cloud records write only under the owner and late acknowledgments cannot change another account',async()=>{
 let finish;const pending=new Promise(resolve=>finish=resolve);const s=await setup({user:user('alice'),waitWrite:ref=>ref.path.includes('/training/')?pending:Promise.resolve()});saveTemplate(s);await new Promise(r=>setTimeout(r,420));const write=s.writes.find(x=>x.path.includes('/training/'));assert(write.path.startsWith('users/alice/training/'));assert.equal(write.payload.kind,'plan');assert(!('pending'in write.payload));s.emitUser('bob');finish();await tick();assert.equal(records(s).length,0);assert.equal(Object.values(JSON.parse(s.w.localStorage.getItem('bioshape_training_alice')).records)[0].pending,true);assert.deepEqual(s.errors,[]);s.close();
});
await run('one completed set locks exercise substitution and keeps recorded history',async()=>{
 const s=await setup();s.w.continueOnDevice();saveTemplate(s);click(s,'start');logSeries(s);click(s,'swap','extensora');assert.equal(records(s).find(r=>r.kind==='session').value.items[0].exerciseId,'leg-press');assert.match(s.w.document.getElementById('trToast').textContent,/já tem séries/);s.close();
});
await run('coach uses the actual journal and does not fabricate progress or exercise prescriptions',async()=>{
 const s=await setup();s.w.continueOnDevice();s.w.openTraining();click(s,'tab','coach');click(s,'ask','evolução');assert.match(s.w.document.getElementById('trChat').textContent,/0 treino\(s\)/);assert.match(s.w.document.getElementById('trainingSummary').textContent,/Não é uma conversa com IA generativa/);field(s,'#trQuestion','Sinto dor no exercício');submit(s,'trCoachForm');assert.match(s.w.document.getElementById('trChat').textContent,/Interrompa o exercício/);assert.deepEqual(s.errors,[]);s.close();
});
await run('unsafe cloud document values are ignored and names are escaped as text',async()=>{
 const s=await setup({user:user('alice')});saveTemplate(s);const p=records(s).find(r=>r.kind==='plan'),observer=s.snapshots.find(x=>x.path==='users/alice/training');const bad={...p.value,items:[{...p.value.items[0],exerciseId:'<img onerror=alert(1)>'}]};observer.cb({docs:[{id:'bad',data:()=>({schema:1,kind:'plan',data:JSON.stringify(bad),updatedAt:Date.now()+1000,revision:'bad'})}]});assert.equal(records(s).length,1);assert.deepEqual(s.errors,[]);s.close();
});
console.log(JSON.stringify({passed,productionWrites:0}));
})().catch(error=>{console.error(error);process.exitCode=1;});
