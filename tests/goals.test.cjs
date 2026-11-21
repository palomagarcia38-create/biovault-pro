const {setup,user,key,sample,tick}=require('./accounts.test.cjs');
const assert=require('node:assert/strict');
let passed=0;const run=async(name,test)=>{await test();passed++;console.log('PASS',name);};
async function saveMeasurement(s,more={}){
 const {w}=s;w.openNewWeighingModal();for(const[id,value]of Object.entries({mPersonName:'Pessoa de teste',mAge:'28',mSex:'F',mHeight:'165',mWeight:'65',mDate:'2026-11-20',mFat:'30',mMuscle:'28',...more}))w.document.getElementById(id).value=value;
 await w.saveWeighing({preventDefault(){}});await tick();
}
function fillGoals(s,more={}){const d=s.w.document;d.querySelector('input[name="goalObjective"][value="lose_weight"]').checked=true;for(const[id,value]of Object.entries({goalTargetWeight:'60',goalTargetFat:'25',goalTargetMuscle:'32',goalDeadline:'2027-02-20',...more}))d.getElementById(id).value=value;s.w.saveGoalPlan({preventDefault(){}});}
function goals(s){return JSON.parse(s.w.localStorage.getItem(s.w.__state.goalKey));}
const plan={schema:2,objective:'lose_weight',targets:{weight:60,fat:25,muscle:32,visceral:null},baseline:{id:'first',date:'2026-10-01',weight:70,fat:30,muscle:28,visceral:null},deadline:'2027-02-20',startedAt:'2026-10-01',updatedAt:'2026-11-20'};
(async()=>{
await run('first save asks for goals and never invents targets from slider defaults',async()=>{
 const s=await setup();s.w.continueOnDevice();assert.equal(goals(s),null);await saveMeasurement(s);assert(!s.w.document.getElementById('goalPlanModal').classList.contains('hidden'));assert.equal(s.w.document.getElementById('goalTargetWeight').value,'');assert.equal(s.w.document.querySelector('input[name="goalObjective"]:checked'),null);assert.equal(s.w.__state.readings.length,1);assert.deepEqual(s.errors,[]);s.close();
});
await run('saved plan captures initial measurement, targets and deadline and syncs only to owner',async()=>{
 const s=await setup({user:user('alice')});await saveMeasurement(s);fillGoals(s);await tick();const g=goals(s);assert.equal(g.baseline.weight,65);assert.equal(g.targets.weight,60);assert.equal(g.deadline,'2027-02-20');assert.equal(g.objective,'lose_weight');assert(s.writes.some(x=>x.path==='users/alice/goals/active'));assert(!('_pending'in s.writes.find(x=>x.path==='users/alice/goals/active').payload));assert.equal(s.w.__state.readings[0].weight,65);assert.match(s.w.document.getElementById('goalPlanOverview').textContent,/0 de 3/);assert.deepEqual(s.errors,[]);s.close();
});
await run('progress handles direction, overshoot, regression, maintenance and missing values',async()=>{
 const s=await setup(),p=s.w.__state.goalMetricProgress;
 assert.equal(p(70,65,60).progress,50);assert.equal(p(28,30,32,'muscle').progress,50);assert.equal(p(30,24,25,'fat').progress,100);assert.equal(p(70,75,60).progress,0);assert.equal(p(65,65.4,65).reached,true);assert.equal(p(65,66,65).reached,false);assert.equal(p(null,25,20,'fat').available,false);assert.equal(p(30,null,25,'fat').progress,null);assert.equal(s.w.__state.goalDays('2026-11-20','2026-11-27'),7);s.close();
});
await run('edits preserve the original baseline and retain the previous plan',async()=>{
 const s=await setup({user:user('alice'),storage:{[key('alice')]:[sample('now',65)],biovault_user_alice_goals:plan}});s.w.openGoalPlan();fillGoals(s,{goalTargetWeight:'58'});await tick();const g=goals(s);assert.equal(g.baseline.weight,70);assert.equal(g.history[0].targets.weight,60);assert.equal(g.targets.weight,58);const backup=JSON.parse(s.w.document.defaultView.JSON.stringify(s.w.__state.readings));assert.equal(backup[0].weight,65);assert.deepEqual(s.errors,[]);s.close();
});
await run('invalid composition or a deadline before baseline does not overwrite a plan',async()=>{
 const s=await setup({user:user('alice'),storage:{[key('alice')]:[sample('now')],biovault_user_alice_goals:plan}});s.w.openGoalPlan();fillGoals(s,{goalTargetFat:'60',goalTargetMuscle:'50'});assert.equal(goals(s).targets.fat,25);assert.match(s.w.document.getElementById('goalFormStatus').textContent,/100%/);fillGoals(s,{goalDeadline:'2026-09-01'});assert.equal(goals(s).deadline,'2027-02-20');assert.match(s.w.document.getElementById('goalFormStatus').textContent,/prazo válido/);s.close();
});
await run('missing baseline composition is not displayed as zero or as achieved',async()=>{
 const p={...plan,targets:{fat:25},baseline:{...plan.baseline,fat:null}};const s=await setup({user:user('alice'),storage:{[key('alice')]:[{...sample('now'),fat:24}],biovault_user_alice_goals:p}});assert.match(s.w.document.getElementById('goalPlanOverview').textContent,/Sem este indicador/);assert.match(s.w.document.getElementById('goalPlanOverview').textContent,/0 de 1/);assert.equal(s.w.document.querySelector('#goalPlanOverview [role="progressbar"]').getAttribute('aria-valuenow'),null);s.close();
});
await run('deferring does not create targets and the next weighing does not reopen onboarding',async()=>{
 const s=await setup();s.w.continueOnDevice();await saveMeasurement(s);s.w.deferGoalPlan();assert.equal(goals(s).dismissed,true);assert.deepEqual(goals(s).targets,{});await saveMeasurement(s,{mWeight:'64'});assert(s.w.document.getElementById('goalPlanModal').classList.contains('hidden'));assert.equal(s.w.__state.readings.length,2);s.close();
});
await run('goals are isolated by account and late snapshots do not replace another account plan',async()=>{
 const s=await setup({user:user('alice'),storage:{biovault_user_alice_goals:plan,biovault_user_bob_goals:{...plan,targets:{weight:80}}}});const listener=s.snapshots.find(x=>x.path==='users/alice/goals/active');s.emitUser('bob');listener.cb({exists:()=>true,data:()=>({...plan,targets:{weight:40}})});assert.equal(goals(s).targets.weight,80);assert.deepEqual(s.errors,[]);s.close();
});
await run('a plan defined before measuring anchors once to the first saved measurement',async()=>{
 const s=await setup();s.w.continueOnDevice();s.w.openGoalPlan();fillGoals(s);assert.equal(goals(s).baseline,null);await saveMeasurement(s);assert.equal(goals(s).baseline.weight,65);await saveMeasurement(s,{mWeight:'64'});assert.equal(goals(s).baseline.weight,65);s.close();
});
console.log(JSON.stringify({passed}));
})().catch(error=>{console.error(error);process.exitCode=1;});
