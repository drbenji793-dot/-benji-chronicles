import {JSDOM} from 'jsdom';
import assert from 'node:assert/strict';
import {renderDSL} from '../src/dsl.js';
const dom=new JSDOM('<main></main>',{url:'https://example.test/#book=b&view=dsl&dslview=synopsis'});
for(const key of ['window','document','location','MutationObserver','localStorage','FormData'])globalThis[key]=dom.window[key];
globalThis.requestAnimationFrame=f=>f();
dom.window.HTMLDialogElement.prototype.showModal=function(){};
let language='ar',writes=0;
const data={title:'Book',events:[],links:[],objects:[],characters:[{id:'hero',name:'سالم'}],places:[{id:'home',title:'Home',description:'A saved place'}],decisions:[{id:'keep',title:'Approved choice',recordStatus:'current',decision:'Preserved'}],readerSynopsis:{ar:{title:'ابن الجبل',short:'حكاية سالم'},en:{title:'Book',short:'The story of Salem'}},workshop:{questions:[{id:'q',title:'What next?',options:['One','Two'],status:'open'}]}};
const original=structuredClone(data),branch={id:'path',book_id:'b',revision:8,name:'Current',data};
const api=async(path,opts)=>{if(opts){writes++;throw Error('Unexpected write');}if(path.startsWith('chronicles_books'))return [{id:'b',title:'Book',language}];if(path.startsWith('chronicles_dsl_projects'))return [{}];if(path.startsWith('chronicles_dsl_branches'))return [structuredClone(branch)];return [];};
const root=document.querySelector('main');
for(language of ['ar','en']){
 for(const [view,section,selected] of [['synopsis','','Synopsis'],['garden','characters','Characters'],['garden','places','Places'],['decisions','','Questions']]){
  location.hash='#book=b&view=dsl&dslbranch=path&dslview='+view+'&section='+section;
  await renderDSL(root,api,'b');
  assert.equal(root.querySelector('.story-sections [aria-current]').textContent,selected);
  assert.deepEqual([...root.querySelectorAll('.story-sections a')].map(a=>a.textContent),['Synopsis','Characters','Places','Questions']);
  for(const a of root.querySelectorAll('.story-sections a'))assert.equal(new URLSearchParams(a.hash.slice(1)).get('dslbranch'),'path');
  assert.equal(root.querySelector('.goe-tabs'),null);
  assert.equal(root.querySelector('[data-export-gpt]'),null);
  if(view==='synopsis'){
   assert.match(root.querySelector('[data-reader-synopsis]').textContent,language==='ar'?/حكاية سالم/:/The story of Salem/);
   const more=root.querySelector('[data-writer-synopsis]');assert.equal(more.firstElementChild.tagName,'SUMMARY');assert.equal(more.open,false);
   assert(root.querySelector('a[href*="reference=1"]'));assert(root.querySelector('[data-story-import]'));
  }
  if(section==='characters')assert.equal(root.querySelector('[data-life]').textContent,'سالم');
  if(section==='places'){root.querySelector('[data-record]').click();assert(document.querySelector('dialog').textContent.includes('A saved place'));document.querySelector('[data-close]').click();}
  if(view==='decisions'){
   assert(root.querySelector('[data-answer-form="q"]'));
   assert(root.querySelector('[data-saved-decisions] [data-record="keep"]'));
   root.querySelector('[data-saved-decisions] [data-record="keep"]').click();
   assert(document.querySelector('dialog').textContent.includes('Preserved'));document.querySelector('[data-close]').click();
  }
 }
}
assert.equal(writes,0);assert.deepEqual(data,original);
console.log('PASS unified story navigation in both languages, branch retention, reader synopsis, place and decision editors, inline answers and zero data writes');
dom.window.close();process.exit(0);
