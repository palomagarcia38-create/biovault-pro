const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs');const assert=require('node:assert/strict');const crypto=require('crypto');
const html=fs.readFileSync('public/index.html','utf8');
let source=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
for(const name of ['app','firestore','auth'])source=source.replace(`import('./vendor/firebase-${name}.js?v=50200.1')`,`window.__sdk.${name}()`);
source+='\nwindow.__state={get readings(){return readings},get user(){return currentUser},get key(){return CACHE_KEY},get goalKey(){return GOALS_KEY},goalMetricProgress,goalDays,goalConfigured,get prefsKey(){return PREFS_KEY},switchAccount,flushPending,cloudMeasurementPayload};';
const tick=()=>new Promise(r=>setTimeout(r,20));
const sample=(id,weight=65)=>({id,date:'2026-11-20',weight,height:165,age:28,sex:'F',personName:'Local',_sync:'synced'});
const user=id=>({uid:id,email:id+'@example.invalid',displayName:id==='alice'?'Paloma':'Estefani'});
const key=id=>'biovault_user_'+id+'_readings';
async function setup(options={}){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:'https://biovault.test/',runScripts:'outside-only',virtualConsole:vc});
 const w=dom.window;w.crypto.randomUUID=crypto.randomUUID;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;w.Chart=class{destroy(){}constructor(){}};
 for(const [name,value] of Object.entries(options.storage||{}))w.localStorage.setItem(name,typeof value==='string'?value:JSON.stringify(value));
 const snapshots=[],writes=[],deletions=[],credentials=[];let authCallback;
 const fire={getFirestore:()=>({}),collection:(db,...p)=>({path:p.join('/')}),doc:(db,...p)=>({path:p.join('/')}),serverTimestamp:()=>null,getDoc:async()=>({exists:()=>false}),
  onSnapshot:(ref,opts,cb)=>{const profile=typeof opts==='function';const observer={path:ref.path,cb:profile?opts:cb,active:true,profile};snapshots.push(observer);return()=>{observer.active=false;};},
  setDoc:async(ref,payload)=>{writes.push({path:ref.path,payload:structuredClone(payload)});if(options.waitWrite)await options.waitWrite(ref,payload);},
  deleteDoc:async ref=>deletions.push(ref.path)};
 const session={};
 const auth={getAuth:()=>session,indexedDBLocalPersistence:{},setPersistence:async()=>{},
  onAuthStateChanged:(a,cb)=>{authCallback=cb;setTimeout(()=>cb(options.user||null),0);},
  signOut:async()=>authCallback(null),
  signInWithEmailAndPassword:async(a,email,password)=>{credentials.push({email,password});if(options.signInError)throw Object.assign(Error(),{code:options.signInError});authCallback(user('alice'));return{user:user('alice')};},
  createUserWithEmailAndPassword:async(a,email,password)=>{credentials.push({email,password});authCallback(user('alice'));return{user:user('alice')};},updateProfile:async()=>{},sendPasswordResetEmail:async()=>{}};
 w.__sdk={app:async()=>({getApps:()=>[],initializeApp:()=>({})}),firestore:async()=>fire,auth:async()=>auth};
 for(const file of ['training-catalog.js','training.js'])w.eval(fs.readFileSync('public/'+file,'utf8'));
 w.eval(source);await tick();await tick();
 return{w,dom,errors,writes,deletions,snapshots,credentials,emitAccount:(id,records)=>{const s=snapshots.filter(s=>s.path===`users/${id}/measurements`).at(-1);s.cb({metadata:{fromCache:false},docs:records.map(r=>({id:r.id,data:()=>r}))});},emitUser:id=>authCallback(id?user(id):null),close:()=>{w.BioshapeTraining?.configure({});dom.window.close();}};
}
let passed=0;async function run(name,fn){await fn();passed++;console.log('PASS',name);}
module.exports={setup,user,key,sample,tick};
if(require.main===module)(async()=>{
await run('signed out never subscribes to shared medical data and local mode preserves old data',async()=>{
 const original=[sample('legacy')],s=await setup({storage:{biovault_local_readings:original,biovault_prefs:{name:'Paloma'}}});
 assert.equal(s.snapshots.length,0);assert.equal(s.w.__state.readings.length,0);assert.equal(s.w.document.getElementById('authScreen').hidden,false);
 assert.deepEqual(JSON.parse(s.w.localStorage.getItem('biovault_local_readings')),original);
 s.w.continueOnDevice();assert.equal(s.w.__state.readings[0].id,'legacy');assert.equal(s.snapshots.length,0);assert.equal(s.w.document.getElementById('authScreen').hidden,true);assert.deepEqual(s.errors,[]);s.close();
});
await run('account switches isolate both measurements and profile and ignore a late old-account snapshot',async()=>{
 const s=await setup({user:user('alice'),storage:{[key('alice')]:[sample('a')],biovault_user_alice_prefs:{name:'Paloma',height:170,age:28},[key('bob')]:[sample('b',80)],biovault_user_bob_prefs:{name:'Estefani',height:160,age:30},bv_measurements:[sample('must-not-migrate')]}});
 const old=s.snapshots.find(x=>x.path==='users/alice/measurements');assert.equal(s.w.__state.readings.length,1);
 s.emitUser('bob');assert.equal(s.w.__state.readings[0].id,'b');assert.equal(s.w.document.getElementById('profileNameInput').value,'Estefani');
 old.cb({metadata:{fromCache:false},docs:[{id:'leak',data:()=>sample('leak')}]});assert.equal(s.w.__state.readings[0].id,'b');
 await s.w.logoutAccount();assert.equal(s.w.__state.readings.length,0);assert.equal(s.w.document.getElementById('profileNameInput').value,'');assert.equal(s.w.document.getElementById('authScreen').hidden,false);
 assert.equal(JSON.parse(s.w.localStorage.getItem(key('alice')))[0].id,'a');assert(s.snapshots.every(x=>x.path.startsWith('users/')));assert.deepEqual(s.errors,[]);s.close();
});
await run('authenticated measurement inherits the account name and writes to the owner path',async()=>{
 const s=await setup({user:user('alice')});s.w.openNewWeighingModal();const d=s.w.document;
 assert.equal(d.getElementById('mPersonName').value,'Paloma');assert(d.getElementById('mPersonName').readOnly);assert(d.getElementById('mPersonName').closest('label').hidden);
 for(const [id,value]of Object.entries({mDate:'2026-11-20',mWeight:'65',mHeight:'165',mAge:'28',mSex:'F'}))d.getElementById(id).value=value;
 await s.w.saveWeighing({preventDefault(){}});await tick();
 const write=s.writes.find(x=>x.path.includes('/measurements/'));assert(write.path.startsWith('users/alice/measurements/'));assert.equal(write.payload.personId,'alice');assert.equal(write.payload.personName,'Paloma');assert(!('_sync'in write.payload));
 assert.match(d.getElementById('personContextName').textContent,/Oi, Paloma/);assert.deepEqual(s.errors,[]);s.close();
});
await run('a delayed upload cannot acknowledge, overwrite or expose another account cache',async()=>{
 let finish;const wait=new Promise(resolve=>finish=resolve);
 const pending={...sample('pending'),_sync:'pending',_revision:'one'};
 const s=await setup({user:user('alice'),storage:{[key('alice')]:[pending],[key('bob')]:[sample('bob-record',80)]},waitWrite:ref=>ref.path.includes('/measurements/')?wait:Promise.resolve()});
 assert.equal(s.writes.filter(x=>x.path.includes('/measurements/')).length,1);s.emitUser('bob');finish();await tick();
 assert.equal(s.w.__state.readings[0].id,'bob-record');assert.equal(JSON.parse(s.w.localStorage.getItem(key('alice')))[0]._sync,'pending');
 assert.equal(s.writes.filter(x=>x.path.includes('/measurements/'))[0].path,'users/alice/measurements/pending');assert.deepEqual(s.errors,[]);s.close();
});
await run('delete requested during upload is applied after creation with the same owner ID',async()=>{
 let finish;const wait=new Promise(resolve=>finish=resolve);
 const s=await setup({user:user('alice'),storage:{[key('alice')]:[{...sample('pending'),_sync:'pending',_revision:'one'}]},waitWrite:()=>wait});
 await s.w.deleteReading('pending');finish();await tick();await tick();
 assert(s.deletions.includes('users/alice/measurements/pending'));assert.equal(s.w.__state.readings.length,0);assert.deepEqual(s.errors,[]);s.close();
});
await run('legacy history is imported only after review and its source is preserved',async()=>{
 const legacy=[sample('legacy')];const s=await setup({user:user('alice'),storage:{biovault_local_readings:legacy}});
 assert.equal(s.w.__state.readings.length,0);s.w.importDeviceHistory();assert.equal(s.w.__state.readings.length,0);assert.match(s.w.document.getElementById('importBackupSummary').textContent,/alice@example.invalid/);
 s.w.confirmImportBackup();await tick();assert.equal(s.w.__state.readings[0].id,'legacy');assert.deepEqual(JSON.parse(s.w.localStorage.getItem('biovault_local_readings')),legacy);
 assert(s.writes.some(x=>x.path==='users/alice/measurements/legacy'));assert.deepEqual(s.errors,[]);s.close();
});
await run('sign-in is guarded against duplicate submission and configuration errors are clear',async()=>{
 const s=await setup({signInError:'auth/configuration-not-found'}),d=s.w.document;
 d.getElementById('accountEmailInput').value='alice@example.invalid';d.getElementById('accountPassword').value='synthetic-password';
 await Promise.all([s.w.submitAccountForm({preventDefault(){}}),s.w.submitAccountForm({preventDefault(){}})]);
 assert.equal(s.credentials.length,1);assert.match(d.getElementById('authStatus').textContent,/precisa ser ativado/);assert.equal(d.getElementById('authScreen').hidden,false);assert.deepEqual(s.errors,[]);s.close();
});
await run('signed-in profile sync applies only to its owner and late profile callbacks are discarded',async()=>{
 const s=await setup({user:user('alice')});const profile=s.snapshots.find(x=>x.path==='users/alice/profile/main');
 profile.cb({exists:()=>true,data:()=>({name:'Paloma Garcia',height:170,age:28,sex:'F',personId:'alice'})});
 assert.equal(s.w.document.getElementById('profileNameInput').value,'Paloma Garcia');s.emitUser('bob');profile.cb({exists:()=>true,data:()=>({name:'Never show',height:180,age:50,sex:'M'})});
 assert.notEqual(s.w.document.getElementById('profileNameInput').value,'Never show');assert.deepEqual(s.errors,[]);s.close();
});
console.log(JSON.stringify({passed}));
})().catch(error=>{console.error(error);process.exitCode=1;});
