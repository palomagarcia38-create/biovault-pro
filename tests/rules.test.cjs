const fs=require('node:fs');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,getDocs,collection,deleteDoc}=require('firebase/firestore');
const assert=require('node:assert/strict');
(async()=>{
  const env=await initializeTestEnvironment({projectId:'demo-biovault',firestore:{host:'127.0.0.1',port:8081,rules:fs.readFileSync('firestore.rules','utf8')}});
  let passed=0;
  try {
    const alice=env.authenticatedContext('alice').firestore(),bob=env.authenticatedContext('bob').firestore(),anon=env.unauthenticatedContext().firestore();
    const reading={date:'2026-11-20',weight:65,height:165,personId:'alice',personName:'Synthetic Alice'};
    await assertSucceeds(setDoc(doc(alice,'users/alice/measurements/a'),reading));passed++;
    await assertSucceeds(getDoc(doc(alice,'users/alice/measurements/a')));passed++;
    await assertSucceeds(getDocs(collection(alice,'users/alice/measurements')));passed++;
    await assertFails(getDoc(doc(bob,'users/alice/measurements/a')));passed++;
    await assertFails(getDocs(collection(bob,'users/alice/measurements')));passed++;
    await assertFails(setDoc(doc(bob,'users/alice/measurements/a'),reading));passed++;
    await assertFails(deleteDoc(doc(bob,'users/alice/measurements/a')));passed++;
    await assertFails(getDoc(doc(anon,'users/alice/measurements/a')));passed++;
    await assertFails(setDoc(doc(anon,'users/alice/measurements/a'),reading));passed++;
    await assertFails(setDoc(doc(alice,'users/alice/measurements/wrong'),{...reading,personId:'bob'}));passed++;
    await assertFails(setDoc(doc(alice,'users/alice/measurements/invalid'),{...reading,weight:-1}));passed++;
    await assertSucceeds(setDoc(doc(alice,'users/alice/profile/main'),{name:'Synthetic Alice',personId:'alice',sex:'F',age:28,height:165}));passed++;
    await assertFails(getDoc(doc(bob,'users/alice/profile/main')));passed++;
    await assertFails(setDoc(doc(alice,'users/alice/profile/main'),{name:'X',personId:'alice',admin:true}));passed++;
    await assertFails(getDocs(collection(alice,'measurements')));passed++;
    await assertFails(getDocs(collection(anon,'measurements')));passed++;
    await assertFails(setDoc(doc(alice,'measurements/legacy'),reading));passed++;
    await assertSucceeds(getDoc(doc(anon,'clinical_knowledge/biovault-v4-4')));passed++;
    assert.equal((await getDoc(doc(alice,'users/alice/measurements/a'))).data().weight,65);passed++;
    console.log(JSON.stringify({passed,project:'demo-biovault',productionWrites:0}));
  }finally{await env.cleanup();}
})().catch(error=>{console.error(error);process.exitCode=1;});
