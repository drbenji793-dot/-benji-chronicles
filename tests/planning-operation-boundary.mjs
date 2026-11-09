import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderDSL} from '../src/dsl.js';
import {makePlanningRecovery,readPlanningRecovery} from '../src/planning-recovery.js';
const data={title:'Book',summary:'Current story',events:[],links:[],objects:[],characters:[],workshop:{questions:[]},unknownFutureField:{retain:true}};
async function fixture({language='ar',empty=false,interrupt='',partial=false,mode='dsl'}={}){
 const dom=new JSDOM('<button data-writer="Benji" aria-pressed="true"></button><main></main>',{url:'https://example.test/#book=b&view=dsl&dslview=map'});
 for(const k of ['window','document','location','MutationObserver','localStorage','FormData'])globalThis[k]=dom.window[k];globalThis.requestAnimationFrame=f=>f();globalThis.confirm=()=>true;dom.window.HTMLDialogElement.prototype.showModal=function(){};
 const branch={id:'branch',book_id:'b',revision:7,name:'Main',data:structuredClone(data),partialData:partial};
 let writes=[],downloads=[],entered,release;const waiting=new Promise(r=>entered=r);
 URL.createObjectURL=blob=>(downloads.push(blob),'blob:test');URL.revokeObjectURL=()=>{};dom.window.HTMLAnchorElement.prototype.click=function(){};
 const pause=async stage=>{if(interrupt===stage){entered();await new Promise(r=>release=r);}};
 const api=async(path,options)=>{
  if(options){const body=JSON.parse(options.body);writes.push({path,body});if(interrupt==='failed-write')throw Error('Simulated save failure');await pause(path==='chronicles_dsl_projects'?'setup':'write');return [{...body,book_id:interrupt==='wrong-response'?'other':'b',id:'copy',revision:8}];}
  if(path.includes('select=data,revision')){await pause('read');return [{...branch,data:structuredClone(data)}];}
  if(path.startsWith('chronicles_books'))return [{id:'b',title:'Book',language}];
  if(path.startsWith('chronicles_dsl_projects'))return empty?[]:[{book_id:'b',revision:2}];
  if(path.startsWith('chronicles_dsl_branches')){if(empty)return [];const b=structuredClone(branch);if(partial)delete b.data.unknownFutureField;return [b];}return [];
 };
 const q=s=>document.querySelector(s);await renderDSL(q('main'),api,'b',mode);
 return {dom,q,branch,writes,downloads,waiting,resume:()=>release?.(),leave:()=>{location.hash='#book=other';release?.();},close:()=>dom.window.close()};
}
for(const language of ['ar','en']){
 // A partial current path must retain fields omitted from the lightweight view.
 {const f=await fixture({language,partial:true});f.q('[data-action=fork]').click();await f.q('dialog form').onsubmit({preventDefault(){}});assert.deepEqual(f.writes[0].body.data.unknownFutureField,{retain:true});assert.deepEqual(f.writes[0].body.base_snapshot.unknownFutureField,{retain:true});f.close();}
 for(const operation of ['fork','preview','initialize']){
  const f=await fixture({language,empty:operation==='initialize'});await f.q('[data-action='+operation+']').onclick();const form=f.q('dialog form');f.leave();
  if(operation==='preview')await f.q('[data-publish]').onclick();else await form.onsubmit({preventDefault(){}});
  assert.equal(f.writes.length,0,operation+' refuses a stale open dialog');assert.match(f.q('.dsl-form-status').textContent,/source changed/);f.close();
 }
 for(const interrupt of ['read','write','wrong-response']){
  const f=await fixture({language,partial:true,interrupt});f.q('[data-action=fork]').click();const form=f.q('dialog form'),saving=form.onsubmit({preventDefault(){}});
  if(interrupt!=='wrong-response'){await f.waiting;f.leave();}await saving;
  assert.equal(f.writes.length,interrupt==='read'?0:1);assert.match(form.querySelector('.dsl-form-status').textContent,/source changed|another source/);assert.notEqual(location.hash.includes('dslbranch=copy'),true);f.close();
 }
 {const f=await fixture({language,interrupt:'write'});f.q('[data-action=fork]').click();const form=f.q('dialog form'),pending=form.onsubmit({preventDefault(){}});await f.waiting;await form.onsubmit({preventDefault(){}});assert.equal(f.writes.length,1);f.resume();await pending;assert(location.hash.includes('dslbranch=copy'));f.close();}
 {const f=await fixture({language,interrupt:'failed-write'});f.q('[data-action=fork]').click();const form=f.q('dialog form');form.elements.name.value='Keep this name';await form.onsubmit({preventDefault(){}});assert.equal(form.elements.name.value,'Keep this name');assert.match(form.querySelector('.dsl-form-status').textContent,/Simulated save failure/);assert(!location.hash.includes('dslbranch=copy'));assert.equal(f.writes.length,1);f.close();}
 for(const operation of ['export','export-html','preview']){
  const f=await fixture({language,partial:true,interrupt:'read',mode:operation==='export-html'?'storyline':'dsl'});const pending=f.q('[data-action='+operation+']').onclick();await f.waiting;f.leave();await pending;assert.equal(f.downloads.length,0);assert.equal(f.writes.length,0);assert.equal(f.q('[data-publish]'),null);f.close();
 }
 {const f=await fixture({language,empty:true,interrupt:'setup'});f.q('[data-action=initialize]').click();const form=f.q('dialog form'),pending=form.onsubmit({preventDefault(){}});await f.waiting;f.leave();await pending;assert.equal(f.writes.length,1);assert.equal(f.writes[0].path,'chronicles_dsl_projects');assert.match(form.querySelector('.dsl-form-status').textContent,/source changed/);f.close();}
 {const f=await fixture({language});const snapshot=await makePlanningRecovery('b',f.branch);f.q('[data-action=import-recovery]').click();await f.q('[data-recovery-file]').onchange({target:{files:[{size:1,text:async()=>JSON.stringify(snapshot)}]}});f.leave();f.q('[data-recovery-continue]').click();assert.match(f.q('[data-recovery-result]').textContent,/source changed/);assert.equal(f.writes.length,0);f.close();}
 {const f=await fixture({language,partial:true});await f.q('[data-action=export]').onclick();const recovered=await readPlanningRecovery(await f.downloads[0].text(),'b');assert.deepEqual(recovered.data.unknownFutureField,{retain:true});f.close();}
}
console.log('PASS both editions: complete forks and exports, stale preview/fork/setup/recovery, interrupted reads and writes, mismatched copy responses');process.exit(0);
