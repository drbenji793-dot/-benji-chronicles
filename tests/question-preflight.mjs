import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {questionPreflight,questionPreflightHTML} from '../src/question-preflight.js';
import {renderDSL} from '../src/dsl.js';

for(const language of ['ar','en']){
 const title=language==='ar'?'سؤال محفوظ':'Saved question';
 const data={
  summary:language==='ar'?'ملخص القصة محفوظ':'Saved story summary',
  events:[{id:'ev1',title:'Current event',revision:4,status:'approved'},{id:'old',title:'Retired event',recordStatus:'superseded'}],
  characters:[{id:'c1',name:language==='ar'?'سالم':'Salem',revision:2,status:'approved'}],
  decisions:[{id:'d1',title:'Locked fact',status:'accepted'}],
  workshop:{questions:[
    {id:'q',title,eventIds:['ev1','old'],characterIds:['c1'],sourceChapterId:'chapter',sourceChapterRevision:3,status:'open'},
    {id:'locked',title:'Accepted decision',status:'approved',answer:'Keep',eventIds:['ev1']},
    {id:'same',title,answer:'Already asked',status:'answered'}
  ]}
 };
 const chapters=[{id:'chapter',title:'Current chapter',revision:5,chapter_number:7},{id:'retired-ch',recordStatus:'superseded',revision:2}];
 const original=structuredClone(data),originalChapters=structuredClone(chapters);
 const info=questionPreflight(data,{bookId:'book',branchId:'branch',baseRevision:21,language,chapters,question:data.workshop.questions[0]});
 assert.equal(info.bookId,'book');assert.equal(info.branchId,'branch');assert.equal(info.revision,21);assert.equal(info.language,language);
 assert.match(info.brief,/Compiled from saved planning/);
 assert.equal(info.activeEventCount,1);assert.equal(info.activeCharacterCount,1);assert.equal(info.activeChapterCount,1);
 assert.equal(info.linked.length,4);
 assert(info.linked.some(s=>s.id==='old'&&s.missing));
 assert.equal(info.chapter.state,'Linked chapter revision changed');
 assert.deepEqual(info.duplicates.map(x=>x.id),['same']);
 assert.deepEqual(info.related.map(x=>x.id),['locked']);
 assert(info.approvedDecisions.some(x=>x.id==='locked'));
 assert(info.approvedDecisions.some(x=>x.id==='d1'));
 assert(info.warnings.some(x=>x.includes('chapter source revision changed')));
 assert(info.warnings.some(x=>x.includes('Some linked sources')));
 assert(info.warnings.some(x=>x.includes('Protected related decisions')));
 assert.equal(info.sourceAvailable,false);
 const html=questionPreflightHTML(info,{href:(kind,id)=>'#'+kind+'/'+id});
 const doc=new JSDOM(html).window.document;
 assert(doc.querySelector('[data-question-preflight]'));
 assert(!doc.querySelector('[data-question-preflight]').open);
 assert(doc.body.textContent.includes(title));
 assert(doc.body.textContent.includes('Planning r21'));
 assert(doc.querySelectorAll('a').length>0);
 assert.equal(doc.querySelectorAll('script').length,0);
 assert.deepEqual(data,original);
 assert.deepEqual(chapters,originalChapters);

 const empty=questionPreflight({workshop:{questions:[]}},{bookId:'fresh',branchId:'new',baseRevision:1,language,question:{id:'new',title:'New'}});
 assert(empty.warnings.some(x=>x.includes('No explicit event')));
 assert.equal(empty.linked.length,0);
 const escaped=questionPreflightHTML(questionPreflight({summary:'<script>bad()</script>',workshop:{questions:[]}},{question:{id:'new'}}));
 assert.equal(new JSDOM(escaped).window.document.querySelectorAll('script').length,0);
}

// Current actual form, not a future promise: edit a linked question and verify that the
// selected saved chapter revision is stored through the normal guarded editor.
const dom=new JSDOM('<button data-writer="Benji" aria-pressed="true"></button><main></main>',{url:'https://example.test/#book=b&view=dsl&dslview=decisions'});
for(const key of ['window','document','location','MutationObserver','localStorage','FormData','File'])globalThis[key]=dom.window[key];
globalThis.confirm=()=>true;globalThis.requestAnimationFrame=f=>f();
dom.window.HTMLDialogElement.prototype.showModal=function(){};
let b={id:'branch',revision:3,name:'Main',data:{summary:'Protected',
 events:[{id:'ev',title:'Event',status:'approved',revision:1}],links:[],objects:[],characters:[],
 workshop:{questions:[{id:'q',title:'An existing question',options:['Yes','No'],note:'Source reason',eventIds:['ev'],answer:'',status:'open'}]}}};
const chapter={id:'ch',title:'Current saved chapter',chapter_number:1,revision:6};
const api=async(path,options)=>{
 if(options){b={...b,...JSON.parse(options.body),revision:b.revision+1};return [structuredClone(b)];}
 if(path.startsWith('chronicles_dsl_projects'))return [{revision:1}];
 if(path.startsWith('chronicles_dsl_branches'))return [structuredClone(b)];
 if(path.startsWith('chronicles_books'))return [{id:'b',title:'Test',language:'en'}];
 if(path.includes('chronicles_book_entries')||path.includes('chronicles_chapters'))return [chapter];
 return [];
};
await renderDSL(document.querySelector('main'),api,'b');
const edit=document.querySelector('[data-question]');
assert(edit,'Existing editable question control should exist');
edit.click();
const form=document.querySelector('dialog form');
assert(form);
assert(form.querySelector('[data-question-preflight]'));
assert.match(form.textContent,/Current book and question source check/);
assert.equal(form.elements.sourceChapterId.value,'');
form.elements.sourceChapterId.value='ch';
form.elements.note.value='Source reason';
form.onsubmit({preventDefault(){}});
for(let i=0;i<4;i++)await new Promise(r=>setTimeout(r,0));
assert.equal(b.data.workshop.questions[0].sourceChapterId,'ch');
assert.equal(b.data.workshop.questions[0].sourceChapterRevision,6);
assert.equal(b.data.summary,'Protected');
dom.window.close();
console.log('PASS source scoped question preflight, duplicate and protected decisions, stale chapters, Unicode, live editor saved chapter selection and immutable story');
process.exit(0);
