const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs');
const assert=require('assert/strict');
const crypto=require('crypto');
const path=require('path');
const projectRoot=path.resolve(__dirname,'..');
const legacyMarkup=name=>JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures',name+'.json'),'utf8')).map(id=>'<div id="'+id+'"></div>').join('');
const html=fs.readFileSync(path.join(projectRoot,'public/index.html'),'utf8');
let source=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
source=source.replace("import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js')","window.__appModule()").replace("import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')","window.__fireModule()");
source+=`\nwindow.__inspect={analyze,profile,calcBmiValue,classifyBmi,reference,validDate,holoAppearance,clinicalRanges,estimateRestingEnergy,chartPeriodReadings,getKnowledge:()=>clinicalKnowledge,getMetricCharts:()=>metricCharts,getHolo:()=>holo,getSelected:()=>currentReading,getReadings:()=>readings,getChart:()=>chartInst};`;
const tick=()=>new Promise(r=>setTimeout(r,30));
const sample=(id,date,protocol='Em jejum',more={})=>({id,date,weight:64,height:165,fat:28,muscle:29,visceral:6,bodyAge:28,rm:1450,waist:74,hip:98,sex:'F',age:28,protocol,_sync:'synced',...more});
const rows=[sample('a','2026-10-01','Em jejum',{weight:60}),sample('b','2026-10-02','Hidratado',{weight:70}),sample('c','2026-10-03','Em jejum',{weight:80,fat:39,muscle:24,visceral:15,bodyAge:45,waist:90,hip:100})];
const results=[];
function text(w,id){return w.document.getElementById(id).textContent;}
function visible(w,id){return !w.document.getElementById(id).classList.contains('hidden');}
function records(w){return JSON.parse(w.localStorage.getItem('biovault_local_readings'));}
async function setup(data=[],cloud=null,opts={}){
  const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(html,{url:'https://biovault.test',runScripts:'outside-only',virtualConsole:vc});
  const w=dom.window;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
  w.crypto.randomUUID=crypto.randomUUID;w.Chart=class{constructor(ctx,config){this.config=config;}destroy(){}};
  if(opts.gpuFail)w.THREE={WebGLRenderer:class{constructor(){throw Error('WebGL unavailable');}}};
  if(opts.engine){
    w.eval(fs.readFileSync(require.resolve('three/build/three.min.js'),'utf8'));
    w.THREE.WebGLRenderer=class{
      constructor(){if(opts.software)throw Error('GPU unavailable');this.domElement=w.document.createElement('canvas');this.renders=0;this.loop=null;}
      setPixelRatio(){}setClearColor(){}setSize(width,height){this.width=width;this.height=height;}
      render(){this.renders++;}setAnimationLoop(fn){this.loop=fn;}dispose(){this.disposed=true;}
    };
    if(opts.software){
      w.CanvasRenderingContext2D=class{};w.__drawnTriangles=0;
      w.HTMLCanvasElement.prototype.getContext=function(){return{setTransform(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){w.__drawnTriangles++;},stroke(){}};};
    }
    const container=w.document.getElementById('canvas3dContainer');
    Object.defineProperty(container,'clientWidth',{value:160});Object.defineProperty(container,'clientHeight',{value:360});
  }
  if(opts.storage!=null)w.localStorage.setItem('biovault_local_readings',opts.storage);else w.localStorage.setItem('biovault_local_readings',JSON.stringify(data));
  for(const [key,value]of Object.entries(opts.storageKeys||{}))w.localStorage.setItem(key,value);
  if(cloud){
    const remote=structuredClone(cloud.records||[]);w.__cloud={writes:[],deletions:[],knowledgeReads:[],records:remote};let callback;
    const emit=()=>callback?.({metadata:{fromCache:false},docs:w.__cloud.records.map(r=>({id:r.id,data:()=>({...r})}))});
    const fire={getFirestore:()=>({}),collection:()=>({}),doc:(db,col,id)=>({id,collection:col}),serverTimestamp:()=>null,
      getDoc:async(ref)=>{w.__cloud.knowledgeReads.push(ref);return{exists:()=>!!cloud.knowledge,data:()=>cloud.knowledge};},
      onSnapshot:(ref,options,cb)=>{callback=cb;setTimeout(emit,0);return()=>{};},
      setDoc:async(ref,item)=>{w.__cloud.writes.push({id:ref.id,...item});if(cloud.failWrite)throw Object.assign(Error('denied'),{code:'permission-denied'});w.__cloud.records=w.__cloud.records.filter(r=>r.id!==ref.id);w.__cloud.records.push({id:ref.id,...item});setTimeout(emit,0);},
      deleteDoc:async(ref)=>{w.__cloud.deletions.push(ref.id);if(cloud.failDelete)throw Object.assign(Error('denied'),{code:'permission-denied'});w.__cloud.records=w.__cloud.records.filter(r=>r.id!==ref.id);setTimeout(emit,0);}};
    w.__appModule=()=>Promise.resolve({initializeApp:()=>({})});w.__fireModule=()=>Promise.resolve(fire);
  }else {w.__appModule=()=>Promise.reject(Error('offline'));w.__fireModule=()=>Promise.reject(Error('offline'));}
  w.eval(source);await tick();return{w,dom,errors};
}
async function fill(w,values={}){
  w.openNewWeighingModal();
  const inputs={mDate:'2026-11-19',mWeight:'65',mHeight:'165',mFat:'28',mMuscle:'29',mVisc:'6',mBodyAge:'28',mRm:'1450',mWaist:'74.5',mHip:'98.5',...values};
  for(const[id,value]of Object.entries(inputs))w.document.getElementById(id).value=value;
  await w.saveWeighing({preventDefault(){}});await tick();
}
async function run(name,test){await test();results.push(name);console.log('PASS',name);}
(async()=>{
 await run('empty state, real local save, persistence on reload and decimal measures',async()=>{
  const {w,dom,errors}=await setup();assert(visible(w,'emptyStateBox'));assert(w.document.getElementById('btnOpenReport').disabled);await fill(w);const saved=records(w);assert.equal(saved.length,1);assert.equal(saved[0].waist,74.5);assert.equal(saved[0]._sync,'pending');assert.match(text(w,'rightCardsColumn'),/23.9/);assert.deepEqual(errors,[]);
  const reload=await setup(saved);assert.equal(reload.w.__inspect.getSelected().id,saved[0].id);assert(visible(reload.w,'dashboardMain'));assert.deepEqual(reload.errors,[]);reload.dom.window.close();dom.window.close();
 });
 await run('filter, stable history IDs, report, goals and share select the same measurement',async()=>{
  const {w,dom,errors}=await setup(rows);w.document.getElementById('onlyFastingChk').checked=true;w.recomputeAll();w.selectHistoryReading('a');assert.match(text(w,'activeReadingBadge'),/01\/10\/2026/);w.switchSubView('goals');w.document.getElementById('gFatSlider').value=25;w.updateGoalsBox();assert.match(text(w,'goalsSummaryText'),/atual 28.0%/);
  w.openReportModal();assert.match(text(w,'repSynthesis'),/selecionada de 01\/10\/2026/);assert.match(text(w,'repTableRows'),/60.0 kg/);w.closeReportModal();w.selectHistoryReading('c');w.document.getElementById('compareSelect').value='a';w.toggleCompareMode();assert.match(text(w,'leftCardsColumn'),/\+20.0 kg/);w.selectMetricDetail('weight');assert.match(text(w,'detailMetricTitle'),/Peso corporal/);w.open=(url)=>w.__shared=url;w.shareWhatsApp();assert.match(decodeURIComponent(w.__shared),/80.0 kg/);assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('filtered deletion never removes another record; empty filtered and final states',async()=>{
  const {w,dom,errors}=await setup(rows);w.document.getElementById('onlyFastingChk').checked=true;w.recomputeAll();await w.deleteReading('c');let data=records(w);assert.equal(data.find(r=>r.id==='c')._deleted,true);assert.equal(data.find(r=>r.id==='b').weight,70);assert.equal(data.find(r=>r.id==='a').weight,60);await w.deleteReading('a');assert(visible(w,'filterEmpty'));assert(!visible(w,'bioMap'));w.document.getElementById('onlyFastingChk').checked=false;w.recomputeAll();assert.match(text(w,'activeReadingBadge'),/02\/10\/2026/);await w.deleteReading('b');assert(visible(w,'emptyStateBox'));assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('Omron age and sex boundaries, low-fat advice and full-precision RCQ/BMI',async()=>{
  const {w,dom,errors}=await setup([sample('a','2026-11-01','Em jejum',{sex:'M',age:28,fat:25,muscle:44.1,weight:68.06,waist:89.96,hip:100})]);let a=w.__inspect.analyze(w.__inspect.getSelected());assert.equal(a.fat.status,'MUITO ALTO');assert.equal(a.muscle.status,'MUITO ALTO');assert.equal(a.whr.altered,false);assert.equal(a.bmi.status,'NORMAL');
  a=w.__inspect.analyze(sample('f','2026-11-01','Em jejum',{sex:'F',age:40,fat:20,muscle:35.2}));assert.equal(a.muscle.status,'MUITO ALTO');assert.match(a.fat.action,/Evite.*restrição/);
  for(const[age,sex,min,max]of [[28,'F',21,33],[45,'F',23,34],[65,'F',24,36],[28,'M',8,20],[45,'M',11,22],[65,'M',13,25]]){assert.equal(w.__inspect.analyze(sample('x','2026-01-01','Em jejum',{sex,age,fat:min})).fat.status,'NORMAL');assert.equal(w.__inspect.analyze(sample('x','2026-01-01','Em jejum',{sex,age,fat:max})).fat.status,'ALTO');}
  assert.equal(w.__inspect.analyze(sample('x','2026-01-01','Em jejum',{age:19})).fat.status,'SEM REFERÊNCIA');assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('no fasting measurements: no silent substitution, report disabled',async()=>{
  const {w,dom,errors}=await setup([rows[1]]);w.document.getElementById('onlyFastingChk').checked=true;w.recomputeAll();assert(visible(w,'filterEmpty'));assert(!visible(w,'bioMap'));assert(w.document.getElementById('btnOpenReport').disabled);assert.equal(text(w,'histCountBadge'),'0');assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('pending local survives empty cloud and syncs once with a stable document ID',async()=>{
  const {w,dom,errors}=await setup([sample('loc_pending','2026-11-01','Em jejum',{_sync:'pending'})],{records:[]});await tick();assert.equal(records(w)[0].id,'loc_pending');assert.equal(records(w)[0]._sync,'synced');assert.equal(w.__cloud.writes.length,1);assert.equal(w.__cloud.writes[0].id,'loc_pending');assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('Firebase refuses deletion: original preserved and failure shown',async()=>{
  const {w,dom,errors}=await setup(rows,{records:rows,failDelete:true});await w.deleteReading('b');await tick();const data=records(w);assert.equal(data.find(r=>r.id==='b')._deleted,false);assert.equal(data.length,3);assert.match(text(w,'appStatus'),/recusou/);assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('backdated save stays selected and a failed Firebase write stays pending',async()=>{
  const {w,dom,errors}=await setup(rows,{records:rows,failWrite:true});await fill(w,{mDate:'2026-09-01'});assert.match(text(w,'activeReadingBadge'),/01\/09\/2026/);assert.equal(records(w).filter(r=>r._sync==='pending').length,1);assert.equal(w.__cloud.writes.length,1);assert.match(text(w,'syncPill'),/1 pendente/);assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('malformed history is preserved and an unsaved form keeps its fields',async()=>{
  const {w,dom,errors}=await setup([],null,{storage:'not-json'});await fill(w);assert.equal(w.localStorage.getItem('biovault_local_readings'),'not-json');assert(visible(w,'newWeighingModal'));assert.equal(w.document.getElementById('mWeight').value,'65');assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('input limits and invalid composition stop saving; report matches actual status',async()=>{
  const {w,dom,errors}=await setup(rows);await fill(w,{mVisc:'31'});assert.equal(records(w).length,3);await fill(w,{mFat:'60',mMuscle:'60'});assert.equal(records(w).length,3);assert.match(text(w,'saveStatus'),/100%/);w.selectHistoryReading('c');w.openReportModal();assert.match(text(w,'repTableRows'),/MUITO ALTO/);assert.equal(w.document.querySelectorAll('#repTableRows tr').length,10);assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('hidden chart opens correctly with separate kg/percent scales; date validation',async()=>{
  const {w,dom,errors}=await setup(rows);assert.equal(w.__inspect.getChart(),null);w.switchSubView('chart');assert.equal(w.__inspect.getChart().config.data.datasets[0].yAxisID,'kg');assert.equal(w.__inspect.getChart().config.data.datasets[1].yAxisID,'percent');assert.equal(w.__inspect.validDate('2026-02-30'),false);assert.equal(w.__inspect.validDate('2026-11-19'),true);assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('v4 preserves every existing element ID and callable app function',async()=>{
  const {w,dom,errors}=await setup(rows);
  const previous=new JSDOM(legacyMarkup('biovault-v3-before-v4.html'),{runScripts:'outside-only'});
  for(const el of previous.window.document.querySelectorAll('[id]'))assert(w.document.getElementById(el.id),`missing ${el.id}`);
  for(const fn of ['saveProfilePrefs','recomputeAll','toggleCompareMode','selectMetricDetail','selectHistoryReading','deleteReading','updateGoalsBox','switchSubView','autoCalcModalBmi','openNewWeighingModal','closeNewWeighingModal','pickProto','saveWeighing','openReportModal','closeReportModal','shareWhatsApp'])assert.equal(typeof w[fn],'function',fn);
  assert.deepEqual(errors,[]);previous.window.close();dom.window.close();
 });
 await run('high total fat keeps normal visceral green; low fat is not shown as excess',async()=>{
  const {w,dom,errors}=await setup(rows);const sampleFat=sample('f','2026-11-20','Em jejum',{fat:45,visceral:8});
  let state=w.__inspect.holoAppearance(sampleFat);assert.equal(state.fatHigh,true);assert.equal(state.visceralHigh,false);assert.equal(state.visceralColor,0x10b981);
  state=w.__inspect.holoAppearance({...sampleFat,fat:15});assert.equal(state.fatLow,true);assert.equal(state.fatHigh,false);assert.equal(state.abdomenColor,0x0ea5e9);
  state=w.__inspect.holoAppearance({...sampleFat,visceral:15});assert.equal(state.visceralColor,0xff2a5f);assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('missing Three.js keeps 2D, history, explanation and report usable',async()=>{
  const {w,dom,errors}=await setup(rows);assert(visible(w,'holoPortrait'));assert(!visible(w,'canvas3dContainer'));w.document.getElementById('holoMode3d').click();assert(visible(w,'holoFallback'));w.selectHistoryReading('a');w.selectMetricDetail('muscle');assert(text(w,'detailClinicalEvidence').includes('força'));w.openReportModal();assert(visible(w,'reportModal'));assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('GPU initialization failure is isolated from the app and preserves data',async()=>{
  const {w,dom,errors}=await setup(rows,null,{gpuFail:true});assert(visible(w,'holoFallback'));assert(!visible(w,'canvas3dContainer'));assert.equal(records(w).length,3);w.openReportModal();assert(visible(w,'reportModal'));assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('structured ranges use selected record sex and age; evidence has source links',async()=>{
  const {w,dom,errors}=await setup([sample('f','2026-11-20','Em jejum',{age:45,fat:40})]);w.selectMetricDetail('fat');assert.match(text(w,'detailRefRanges'),/23.0 a 33.9%/);assert.match(text(w,'detailReferenceNote'),/45 anos/);assert(w.document.querySelectorAll('#detailCitation a').length>=2);for(const a of w.document.querySelectorAll('#detailCitation a'))assert.equal(new URL(a.href).protocol,'https:');
  w.selectMetricDetail('whr');assert.match(text(w,'detailRefRanges'),/0,85/);assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('visualization, content, chart and PDF navigation never change cloud measurements',async()=>{
  const {w,dom,errors}=await setup(rows,{records:rows});w.document.getElementById('holoMode2d').click();w.selectMetricDetail('bmi');w.switchSubView('history');w.selectHistoryReading('a');w.switchSubView('chart');w.openReportModal();await tick();assert.equal(w.__cloud.writes.length,0);assert.equal(w.__cloud.deletions.length,0);assert.equal(records(w).length,3);assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('real Three.js geometry, stable model reuse, rotation, 2D switch and resource disposal',async()=>{
  const {w,dom,errors}=await setup([sample('f','2026-11-20','Em jejum',{fat:45,visceral:8})],null,{engine:true});
  w.document.getElementById('holoMode3d').click();const h=w.__inspect.getHolo();assert(h.body);assert(h.body.children.length>20);assert(visible(w,'canvas3dContainer'));assert(!visible(w,'holoFallback'));assert.equal(h.parts.core.material.color.getHex(),0x10b981);assert.equal(h.materials.abdomen.color.getHex(),0xf59e0b);assert(h.renderer.renders>0);
  const before=h.target;w.document.querySelector('[data-holo-turn="right"]').click();assert(h.target>before);w.document.getElementById('canvas3dContainer').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home'}));assert.equal(h.target,0);
  const model=h.body;w.recomputeAll();assert.equal(h.body,model);assert.equal(w.document.querySelectorAll('#canvas3dContainer canvas').length,1);
  w.document.getElementById('holoMode2d').click();assert(visible(w,'holoFallback'));assert(!visible(w,'canvas3dContainer'));w.document.getElementById('holoMode3d').click();assert(visible(w,'canvas3dContainer'));
  const renderer=h.renderer;w.dispatchEvent(new w.Event('pagehide'));assert.equal(renderer.disposed,true);assert.equal(h.renderer,null);assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('software 3D projects the actual model and supports rotation when WebGL fails',async()=>{
  const {w,dom,errors}=await setup([sample('f','2026-11-20','Em jejum',{fat:45,visceral:8})],null,{engine:true,software:true});
  w.document.getElementById('holoMode3d').click();const h=w.__inspect.getHolo();assert.equal(h.software,true);assert(visible(w,'canvas3dContainer'));assert(w.__drawnTriangles>100);const before=w.__drawnTriangles;w.document.querySelector('[data-holo-turn="right"]').click();assert(w.__drawnTriangles>before);assert.equal(h.parts.core.material.color.getHex(),0x10b981);w.document.getElementById('holoMode2d').click();assert(visible(w,'holoFallback'));assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('Portuguese cloud fields render without rewriting or losing the original fields',async()=>{
  const pt={id:'pt1',date:'2026-11-20',peso:64.5,gordura:28.5,musculo:29.1,visceral:7,idadeBio:30,cintura:75.5,quadril:98.5,basal:1460};
  const {w,dom,errors}=await setup([],{records:[pt]});const data=records(w)[0];assert.equal(data.weight,64.5);assert.equal(data.peso,64.5);assert.equal(data.rm,1460);assert.equal(data.bodyAge,30);assert.match(text(w,'leftCardsColumn'),/64.5kg/);assert.equal(w.__cloud.writes.length,0);assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('older local cache imports once and never resurrects a removed imported entry',async()=>{
  const legacy=JSON.stringify([{id:'local_42',date:'2026-11-20',peso:65,gordura:29,musculo:28,visceral:6,idadeBio:30,cintura:75,quadril:100,basal:1470}]);
  const {w,dom,errors}=await setup([],null,{storageKeys:{bv_measurements:legacy}});assert.equal(records(w).length,1);assert.equal(records(w)[0]._sync,'pending');assert.equal(w.localStorage.getItem('bv_measurements'),legacy);const marker=w.localStorage.getItem('biovault_v42_imported_keys');assert(marker);assert.deepEqual(errors,[]);dom.window.close();
  const reload=await setup([],null,{storageKeys:{bv_measurements:legacy,biovault_v42_imported_keys:marker}});assert.equal(records(reload.w).length,0);assert(visible(reload.w,'emptyStateBox'));assert.equal(reload.w.localStorage.getItem('bv_measurements'),legacy);assert.deepEqual(reload.errors,[]);reload.dom.window.close();
 });
 await run('legacy preferences are used only when canonical preferences do not exist',async()=>{
  const keys={bv_sex:'M',bv_age:'40',bv_height:'180'};const first=await setup([],null,{storageKeys:keys});assert.equal(first.w.document.getElementById('realAgeInput').value,'40');assert.equal(first.w.document.getElementById('sexSelect').value,'M');first.dom.window.close();
  const next=await setup([],null,{storageKeys:{...keys,biovault_prefs:JSON.stringify({sex:'F',age:28,height:165})}});assert.equal(next.w.document.getElementById('realAgeInput').value,'28');assert.equal(next.w.document.getElementById('sexSelect').value,'F');assert.deepEqual(next.errors,[]);next.dom.window.close();
 });
 await run('optional metabolism is calculated, identified and distinguished from the reported value',async()=>{
  const {w,dom,errors}=await setup();await fill(w,{mRm:''});const saved=records(w)[0];assert.equal(saved.rm,1439);assert.equal(saved.rmMethod,'harris-benedict-1984');w.selectMetricDetail('rm');assert.match(text(w,'detailWhatIs'),/Não é uma leitura/);assert.match(text(w,'detailStatusTag'),/CALCULADO/);w.openReportModal();assert.match(text(w,'repSynthesis'),/Harris/);w.closeReportModal();await fill(w,{mRm:'1500'});assert.equal(records(w)[1].rm,1500);assert.equal(records(w)[1].rmMethod,'reported');assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('Harris-Benedict units and sex coefficients are correct; missing values are rejected',async()=>{
  const {w,dom,errors}=await setup();const calc=w.__inspect.estimateRestingEnergy;assert.equal(calc(65,165,28,'F'),1439);assert.equal(calc(80,180,40,'M'),1797);assert(Number.isNaN(calc(80,0,40,'M')));assert(Number.isNaN(calc(80,180,12,'M')));assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('quick history uses the same selected record and restores the original tab',async()=>{
  const {w,dom,errors}=await setup(rows);w.switchSubView('goals');const parent=w.document.getElementById('subView-history').parentNode;w.openQuickPanel('history');assert(visible(w,'quickPanelModal'));assert.equal(w.document.querySelectorAll('#quickPanelBody .history-telemetry tbody tr').length,3);w.document.querySelector('#quickPanelBody .history-telemetry [data-reading-id="a"]').click();assert(!visible(w,'quickPanelModal'));assert.equal(w.document.getElementById('subView-history').parentNode,parent);assert(visible(w,'subView-goals'));assert.match(text(w,'activeReadingBadge'),/01\/10\/2026/);assert.equal(records(w).length,3);assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('quick chart reuses the chart canvas and restores tabs without losing goals',async()=>{
  const {w,dom,errors}=await setup(rows);w.switchSubView('goals');w.document.getElementById('gFatSlider').value='26';w.updateGoalsBox();const canvas=w.document.getElementById('bioChart');w.openQuickPanel('chart');assert(w.document.getElementById('quickPanelBody').contains(canvas));assert.equal(w.__inspect.getChart().config.data.datasets.length,3);w.closeQuickPanel();assert(!w.document.getElementById('quickPanelBody').contains(canvas));assert(visible(w,'subView-goals'));assert.equal(w.document.getElementById('gFatSlider').value,'26');assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('front/back and visual scan preserve rotation, smooth torso and independent visceral color',async()=>{
  const {w,dom,errors}=await setup([sample('f','2026-11-20','Em jejum',{fat:45,visceral:8})],null,{engine:true});const h=w.__inspect.getHolo();assert(h.parts.sculptedTorso.geometry.attributes.color);w.document.querySelector('[data-holo-turn="back"]').click();assert.equal(h.target,Math.PI);w.document.querySelector('[data-holo-turn="reset"]').click();assert.equal(h.target,0);w.toggleHoloScan();assert.equal(h.parts.scan.visible,true);assert.equal(h.scanActive,true);w.toggleHoloScan();assert.equal(h.parts.scan.visible,false);assert.equal(h.renderer.loop,null);assert.equal(h.parts.core.material.color.getHex(),0x10b981);const previous=new JSDOM(legacyMarkup('biovault-v4-before-v42.html'),{runScripts:'outside-only'});for(const el of previous.window.document.querySelectorAll('[id]'))assert(w.document.getElementById(el.id),el.id);previous.window.close();assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('holographic artwork follows total-fat bands and keeps visceral color independent',async()=>{
  const high=sample('high','2026-11-20','Em jejum',{fat:45,visceral:8});
  const low=sample('low','2026-11-19','Em jejum',{fat:15,visceral:15});
  const {w,dom,errors}=await setup([low,high],{records:[low,high]});
  assert(visible(w,'holoPortrait'));assert.equal(w.document.getElementById('holoPortrait').dataset.warm,'true');assert.equal(w.document.getElementById('portraitVisceralCore').style.color,'rgb(16, 185, 129)');
  w.selectHistoryReading('low');assert.equal(w.document.getElementById('holoPortrait').dataset.warm,'false');assert.equal(w.document.getElementById('portraitVisceralCore').style.color,'rgb(255, 42, 95)');
  assert.equal(w.__cloud.writes.length,0);assert.equal(w.__cloud.deletions.length,0);assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('new navigation reuses history, manual form and profile controls without writing records',async()=>{
  const {w,dom,errors}=await setup(rows,{records:rows});
  w.document.querySelector('[data-app-nav="settings"]').click();assert(w.document.getElementById('profileDrawer').open);
  w.document.querySelector('[data-app-nav="scan"]').click();assert(visible(w,'newWeighingModal'));w.closeNewWeighingModal();
  w.document.querySelector('[data-app-nav="history"]').click();assert(visible(w,'quickPanelModal'));assert(w.document.querySelector('#quickPanelBody #subView-history'));w.closeQuickPanel();
  w.document.getElementById('inspectReadingButton').click();assert(text(w,'detailMetricTitle').length>0);
  assert.equal(w.__cloud.writes.length,0);assert.equal(w.__cloud.deletions.length,0);assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('artwork failure retains the original 2D view and every v4.2 element',async()=>{
  const {w,dom,errors}=await setup(rows);w.document.getElementById('holoArtWarm').dispatchEvent(new w.Event('error'));assert(visible(w,'holoFallback'));assert(!visible(w,'holoPortrait'));
  const previous=new JSDOM(legacyMarkup('biovault-v42-before-reference.html'),{runScripts:'outside-only'});
  for(const el of previous.window.document.querySelectorAll('[id]'))assert(w.document.getElementById(el.id),el.id);previous.window.close();w.openReportModal();assert(visible(w,'reportModal'));assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('very high muscle is explained as a reserve to preserve, with correct individual thresholds',async()=>{
  const {w,dom,errors}=await setup([sample('f','2026-11-20','Em jejum',{muscle:40,fat:28})]);
  const a=w.__inspect.analyze(w.__inspect.getSelected());assert.equal(a.muscle.status,'MUITO ALTO');assert.equal(a.muscle.altered,false);assert.equal(a.muscle.favorable,true);
  w.selectMetricDetail('muscle');assert.match(text(w,'detailConversationHeadline'),/não significa.*perder músculo/);assert.match(text(w,'detailWhyAltered'),/40.0%/);assert.match(text(w,'detailWhyAltered'),/9.7 ponto/);assert.match(text(w,'detailWhyAltered'),/não.*reduzi-la/);assert.match(text(w,'detailClinicalEvidence'),/13 kcal/);assert.match(text(w,'detailClinicalEvidence'),/balanço energético/);assert(!w.document.querySelector('#subView-alerts [data-metric="muscle"]'));assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('indicator popup preserves page position and restores focus when closed or escaped',async()=>{
  const {w,dom,errors}=await setup(rows,{records:rows});let scrolled=0;w.HTMLElement.prototype.scrollIntoView=()=>scrolled++;w.scrollTo=()=>scrolled++;
  const card=w.document.querySelector('#leftCardsColumn [data-metric="fat"]');card.focus();card.click();assert(visible(w,'metricDetailModal'));assert.equal(w.document.activeElement.id,'closeMetricDetailButton');assert(w.document.getElementById('metricDetailModal').contains(w.document.getElementById('selectedMetricPanel')));assert.equal(w.document.body.style.overflowY,'hidden');
  w.document.getElementById('closeMetricDetailButton').click();assert(!visible(w,'metricDetailModal'));assert.equal(w.document.activeElement,card);assert.equal(w.document.body.style.overflowY,'');assert.equal(scrolled,0);
  card.click();w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(!visible(w,'metricDetailModal'));assert.equal(scrolled,0);assert.equal(w.__cloud.writes.length,0);assert.equal(w.__cloud.deletions.length,0);assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('all ten individual charts have their own units and do not turn missing measures into zero',async()=>{
  const {w,dom,errors}=await setup([sample('m','2026-11-20','Em jejum',{waist:null,hip:null})]);w.openQuickPanel('chart');
  assert.equal(w.document.querySelectorAll('.metric-chart-card').length,10);assert.equal(w.__inspect.getMetricCharts().length,7);assert.match(text(w,'metricChartEmpty-whr'),/Sem valores/);assert.match(text(w,'metricChartEmpty-waist'),/Sem valores/);assert.match(text(w,'metricChartEmpty-hip'),/Sem valores/);
  const charts=w.__inspect.getMetricCharts();assert(charts.some(c=>c.config.options.scales.y.title.text==='kcal/dia'));assert(charts.some(c=>c.config.options.scales.y.title.text==='nível'));assert(charts.some(c=>c.config.options.scales.y.title.text==='kg/m²'));assert.equal(w.__inspect.getChart().config.data.datasets.length,3);assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('metric selection and date windows filter the charts without changing saved measurements',async()=>{
  const data=[sample('old','2026-01-01'),sample('mid','2026-11-01'),sample('new','2026-11-20')];const {w,dom,errors}=await setup(data,{records:data});w.openQuickPanel('chart');w.document.getElementById('chartMetricSelect').value='muscle';w.document.getElementById('chartPeriodSelect').value='7';w.renderEvolutionChart();
  assert.equal(w.document.querySelectorAll('.metric-chart-card').length,1);assert.equal(w.__inspect.getMetricCharts()[0].config.data.labels.length,1);assert.match(text(w,'chartPeriodNote'),/Uma pesagem/);assert(w.document.getElementById('combinedChartSection').classList.contains('hidden'));
  w.document.getElementById('chartMetricSelect').value='all';w.document.getElementById('chartPeriodSelect').value='0';w.renderEvolutionChart();assert.equal(w.__inspect.getMetricCharts().length,10);assert.equal(w.__inspect.getChart().config.data.labels.length,3);assert.equal(records(w).length,3);assert.equal(w.__cloud.writes.length,0);assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('popup evolution opens the chosen metric and selected reference comparison stays correct',async()=>{
  const {w,dom,errors}=await setup(rows);w.document.getElementById('compareSelect').value='a';w.toggleCompareMode();w.selectMetricDetail('muscle');w.document.getElementById('metricEvolutionButton').click();assert(!visible(w,'metricDetailModal'));assert(visible(w,'quickPanelModal'));assert.equal(w.document.getElementById('chartMetricSelect').value,'muscle');assert.equal(w.__inspect.getMetricCharts().length,1);assert.match(text(w,'metricChartGrid'),/01\/10\/2026/);assert.match(text(w,'metricChartGrid'),/-5.0 p.p./);assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('cloud scientific knowledge is read from a separate document and unreviewed payload is ignored',async()=>{
  const knowledge=JSON.parse(fs.readFileSync(path.join(projectRoot,'public/clinical-knowledge-v4.4.json'),'utf8'));
  const cloud={records:rows,knowledge:{version:'4.4.0',payload:JSON.stringify(knowledge)}};let state=await setup(rows,cloud);assert.equal(state.w.__cloud.knowledgeReads[0].collection,'clinical_knowledge');assert.equal(state.w.__cloud.knowledgeReads[0].id,'biovault-v4-4');assert.equal(state.w.__inspect.getKnowledge().version,'4.4.0');assert.equal(state.w.__cloud.writes.length,0);assert.deepEqual(state.errors,[]);state.dom.window.close();
  state=await setup(rows,{records:rows,knowledge:{version:'4.4.0',payload:'{"metrics":{"muscle":"incorrect content"}}'}});assert.equal(state.w.__inspect.getKnowledge().metrics.muscle.states.veryHigh.headline,knowledge.metrics.muscle.states.veryHigh.headline);assert.equal(state.w.__cloud.writes.length,0);assert.deepEqual(state.errors,[]);state.dom.window.close();
 });
 await run('low fat and normal visceral remain independently explained and original v4.3 controls survive',async()=>{
  const {w,dom,errors}=await setup([sample('f','2026-11-20','Em jejum',{fat:15,muscle:40,visceral:8,waist:90,hip:100})]);let a=w.__inspect.analyze(w.__inspect.getSelected());assert.match(a.muscle.action,/não busque emagrecer/);assert.match(a.visceral.contextEvidence,/RCQ.*acima/);assert.equal(a.visceral.altered,false);
  const previous=new JSDOM(legacyMarkup('biovault-v43-before-v44.html'),{runScripts:'outside-only'});for(const el of previous.window.document.querySelectorAll('[id]'))assert(w.document.getElementById(el.id),el.id);previous.window.close();assert.deepEqual(errors,[]);dom.window.close();
 });
 await run('body age outside the Omron display range is retained without an invalid clinical alert',async()=>{
 const data=[sample('outside','2026-11-20','Em jejum',{bodyAge:89})];const {w,dom,errors}=await setup(data,{records:data});
 const a=w.__inspect.analyze(w.__inspect.getSelected());assert.equal(a.bodyAge.status,'SEM REFERÊNCIA');assert.equal(a.bodyAge.altered,false);w.selectMetricDetail('bodyAge');assert.match(text(w,'detailWhyAltered'),/fora da faixa.*18–80/);assert.equal(records(w)[0].bodyAge,89);assert.equal(w.__cloud.writes.length,0);assert.equal(w.__cloud.deletions.length,0);assert.deepEqual(errors,[]);dom.window.close();
 });
 console.log(JSON.stringify({passed:results.length,tests:results},null,2));
 fs.writeFileSync(__dirname+'/results.json',JSON.stringify({passed:results.length,tests:results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
