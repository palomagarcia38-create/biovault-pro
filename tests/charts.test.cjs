const {setup,user,key,sample}=require('./accounts.test.cjs');
const assert=require('node:assert/strict');
let passed=0;
const run=async(name,fn)=>{await fn();console.log('PASS',name);passed++;};
const reading=(id,date,extra={})=>({...sample(id),date,fat:35,muscle:29,visceral:6,bodyAge:28,waist:80,hip:100,...extra});
const plan=(base,targets,extra={})=>({schema:2,objective:'lose_weight',baseline:base,targets,startedAt:base.date,...extra});
async function open(rows,goals){
 const s=await setup({user:user('alice'),storage:{[key('alice')]:rows,...(goals?{biovault_user_alice_goals:goals}:{})}});
 const charts=[];s.w.Chart=class{constructor(canvas,config){charts.push({id:canvas.id,...config});}destroy(){}};
 s.w.switchSubView('chart');return {...s,charts,metric:name=>charts.findLast(c=>c.id==='metricChart-'+name)};
}
(async()=>{
await run('nearby weights have a wider scale, visible lower goal and unchanged records',async()=>{
 const rows=[reading('a','2026-11-01',{weight:80}),reading('b','2026-11-20',{weight:80.2})],g=plan(rows[0],{weight:65});
 const s=await open(rows,g),c=s.metric('weight'),y=c.options.scales.y;
 assert(y.min<65);assert(y.max>80.2);assert(y.max-y.min>=10);assert.equal(c.options.plugins.bioshapeGoal.value,65);
 assert.match(s.w.document.querySelector('.chart-goal').textContent,/Meta 65 kg/);
 assert.deepEqual(Array.from(c.data.datasets[0].data),[80,80.2]);
 assert.deepEqual(JSON.parse(s.w.localStorage.getItem(key('alice'))),rows);assert.equal(s.writes.length,0);assert.deepEqual(s.errors,[]);s.close();
});
await run('single and identical measurements keep a useful range and a horizontal goal across the chart',async()=>{
 const a=reading('a','2026-11-01',{weight:65});
 for(const rows of [[a],[a,{...a,id:'b',date:'2026-11-20'}]]){
 const s=await open(rows,plan(a,{weight:75})),c=s.metric('weight'),y=c.options.scales.y;
 assert(y.min<65&&y.max>75);assert.equal(c.data.datasets[0].data.length,rows.length);
 const lines=[],ctx={save(){},restore(){},beginPath(){},setLineDash(x){assert.deepEqual(Array.from(x),[6,5]);},moveTo(x,y){lines.push([x,y]);},lineTo(x,y){lines.push([x,y]);},stroke(){}};
 c.plugins[0].afterDatasetsDraw({ctx,chartArea:{top:0,bottom:230,left:40,right:300},scales:{y:{getPixelForValue:()=>100}}},{},c.options.plugins.bioshapeGoal);
 assert.deepEqual(lines,[[40,100],[300,100]]);assert.deepEqual(s.errors,[]);s.close();}
});
await run('no goals are invented and missing values stay gaps within a wider range',async()=>{
 const s=await open([reading('a','2026-11-01',{fat:null}),reading('b','2026-11-20',{fat:35})]),c=s.metric('fat');
 assert.deepEqual(Array.from(c.data.datasets[0].data),[null,35]);assert.equal(c.data.datasets[0].spanGaps,false);
 assert(c.options.scales.y.max-c.options.scales.y.min>=10);assert.equal(c.options.plugins.bioshapeGoal.value,null);
 assert.equal(s.w.document.querySelectorAll('.chart-goal').length,0);assert.equal(s.w.localStorage.getItem('biovault_user_alice_goals'),null);assert.deepEqual(s.errors,[]);s.close();
});
await run('percentage boundaries keep all recorded points and valid goals visible without negative ticks',async()=>{
 for(const value of [0,0.1,99.9,100]){
 const a=reading('a','2026-11-01',{fat:value}),s=await open([a],plan(a,{fat:95})),c=s.metric('fat'),y=c.options.scales.y;
 assert(y.min>=0);assert(y.max<=100);assert(y.min<=value&&y.max>=value);assert(y.min<=95&&y.max>=95);assert.deepEqual(s.errors,[]);s.close();}
});
await run('muscle and visceral goals honor units, muscle kind and equipment',async()=>{
 const base=reading('a','2026-11-01',{equipment:'Omron'}),now=reading('b','2026-11-20',{equipment:'InBody',muscle:25,muscleUnit:'kg',visceral:100,visceralUnit:'cm2'});
 const s=await open([base,now],plan(base,{muscle:32,visceral:5}));
 assert.equal(s.metric('muscle').options.plugins.bioshapeGoal.value,null);assert.equal(s.metric('visceral').options.plugins.bioshapeGoal.value,null);
 const g=plan(now,{muscle:30,visceral:80},{units:{muscle:'kg',visceral:'cm2'},muscleKind:'skeletal'});
 s.w.localStorage.setItem('biovault_user_alice_goals',JSON.stringify(g));s.w.renderEvolutionChart();
 assert.equal(s.metric('muscle').options.plugins.bioshapeGoal.value,30);assert.equal(s.metric('visceral').options.plugins.bioshapeGoal.value,80);
 assert(s.metric('muscle').options.scales.y.max>30);assert(s.metric('visceral').options.scales.y.min<80);assert.deepEqual(s.errors,[]);s.close();
});
await run('combined axes include goals, preserve kg/percent separation and integer labels stay exact',async()=>{
 const a=reading('a','2026-11-01',{weight:80}),s=await open([a],plan(a,{weight:60,fat:25,muscle:34}));
 const c=s.charts.find(c=>c.id==='bioChart');assert(c.options.scales.kg.min<60);assert(c.options.scales.percent.min<25);
 assert(c.options.scales.percent.max>35);assert.equal(c.data.datasets[0].yAxisID,'kg');assert.equal(c.data.datasets[1].yAxisID,'percent');
 assert.match(s.w.document.getElementById('chartStatus').textContent,/peso 60 kg/);
 for(const d of [{key:'visceral',unit:'nível',digits:0},{key:'bodyAge',unit:'anos',digits:0}]){
 const r=s.w.metricChartRange(d,[1,9]);assert(Number.isInteger(r.stepSize));assert(Number.isInteger(r.min));}
 assert.deepEqual(s.errors,[]);s.close();
});
await run('synced goal edits redraw visible charts and account changes do not leak targets',async()=>{
 const a=reading('a','2026-11-01'),s=await open([a],plan(a,{weight:60}));
 const snapshot=s.snapshots.find(x=>x.path==='users/alice/goals/active');snapshot.cb({exists:()=>true,data:()=>plan(a,{weight:50})});
 assert.equal(s.metric('weight').options.plugins.bioshapeGoal.value,50);assert(s.metric('weight').options.scales.y.min<50);
 s.emitUser('bob');s.w.localStorage.setItem('biovault_user_bob_readings',JSON.stringify([a]));s.emitUser('alice');s.emitUser('bob');s.w.switchSubView('chart');
 assert.equal(s.metric('weight').options.plugins.bioshapeGoal.value,null);assert.deepEqual(s.errors,[]);assert.equal(s.writes.length,0);s.close();
});
console.log(JSON.stringify({passed,productionWrites:0}));
})().catch(e=>{console.error(e);process.exitCode=1;});
