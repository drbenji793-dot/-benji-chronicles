import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderDSL} from '../src/dsl.js';
import {loadPlanning} from '../src/planning-loader.js';
for(const language of ['ar','en'])for(const interruption of ['before','during-read','during-write','wrong-response']){
 const dom=new JSDOM('<button data-writer="Benji" aria-pressed="true"></button><main></main>',{url:'https://example.test/#book=b&view=dsl&dslview=garden'});
 for(const k of ['window','document','location','MutationObserver','localStorage','FormData'])globalThis[k]=dom.window[k];globalThis.requestAnimationFrame=f=>f();globalThis.confirm=()=>true;dom.window.HTMLDialogElement.prototype.showModal=function(){};
 let branch={id:'branch',book_id:'b',revision:7,name:'Main',archived:false,partialData:true,data:{title:'Book',events:[],links:[],objects:[],characters:[{id:'c',name:language==='ar'?'سالم':'Salem',biography:'Preserve'}],retained:{original:true}}};
 let writes=0,release,entered;
 const waiting=new Promise(r=>entered=r);
 const api=async(path,options)=>{
  if(options){writes++;const saved={...branch,...JSON.parse(options.body),revision:8};if(interruption==='during-write'){entered();await new Promise(r=>release=r);}return [{...saved,id:interruption==='wrong-response'?'another-branch':saved.id}];}
  if(path.includes('select=data,revision')){if(interruption==='during-read'){entered();await new Promise(r=>release=r);}return [structuredClone(branch)];}
  if(path.startsWith('chronicles_dsl_projects'))return [{revision:1}];
  if(path.startsWith('chronicles_dsl_branches'))return [structuredClone(branch)];
  if(path.startsWith('chronicles_books'))return [{id:'b',title:'Book',language}];return [];
 };
 const q=s=>document.querySelector(s);
 await renderDSL(q('main'),api,'b');q('[data-life="c"]').click();q('[data-edit-life]').click();const form=q('dialog form');form.elements.name.value='Draft name';form.dispatchEvent(new window.Event('input'));
 const key='chronicles-dsl-draft:b:branch',savedDraft=localStorage.getItem(key);assert(savedDraft?.includes('Draft name'));
 if(interruption==='before')location.hash='#book=other';
 const save=form.onsubmit({preventDefault(){}});
 if(interruption==='during-read'||interruption==='during-write'){await waiting;location.hash='#book=other';release();}
 await save;
 assert.equal(writes,['during-write','wrong-response'].includes(interruption)?1:0);
 assert.equal(localStorage.getItem(key),savedDraft,'uncertain or rejected save keeps the exact recovery draft');
 assert(form.querySelector('.dsl-form-status').textContent.match(/source changed|does not match/));
 assert.equal(branch.revision,7);dom.window.close();
}
const read=async path=>path.startsWith('chronicles_dsl_branches')?[{id:'current',revision:2,archived:false}]:[];
await assert.rejects(()=>loadPlanning(read,{bookId:'b',branchId:'missing'}),/requested planning branch is unavailable/);
console.log('PASS Arabic and English stale form, navigation during read/write, wrong save response, preserved draft and missing explicit branch refusal');
process.exit(0);
