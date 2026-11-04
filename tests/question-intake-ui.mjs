import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderDSL} from '../src/dsl.js';

for(const language of ['ar','en']){
 const dom=new JSDOM('<button data-writer="Benji" aria-pressed="true"></button><main></main>',{url:'https://example.test/#book=b&view=dsl&dslview=decisions'});
 for(const key of ['window','document','location','MutationObserver','localStorage','FormData','File'])globalThis[key]=dom.window[key];
 globalThis.confirm=()=>true;globalThis.requestAnimationFrame=f=>f();dom.window.HTMLDialogElement.prototype.showModal=function(){};
 const original=language==='ar'?'ملخص محفوظ':'Current Story Brief';
 let state={id:'br',revision:5,name:'Main',data:{summary:original,
 events:[{id:'ev',title:'Current event',status:'approved',revision:1}],links:[],objects:[],characters:[],
 workshop:{questions:[{id:'existing',title:'Protected brother identity',answer:'Keep original',status:'approved',eventIds:['ev']}]} }};
 const chapter={id:'chapter',title:'Saved chapter',chapter_number:1,revision:3};
 let writes=0;
 const api=async(path,options)=>{
  if(options){writes++;state={...state,...JSON.parse(options.body),revision:state.revision+1};return [structuredClone(state)];}
  if(path.startsWith('chronicles_dsl_projects'))return [{revision:1}];
  if(path.startsWith('chronicles_dsl_branches'))return [structuredClone(state)];
  if(path.startsWith('chronicles_books'))return [{id:'b',title:'Test',language}];
  if(path.includes('chronicles_book_entries')||path.includes('chronicles_chapters'))return [chapter];
  return [];
 };
 await renderDSL(document.querySelector('main'),api,'b');
 const start=document.querySelector('[data-new-question]');assert(start);
 start.click();
 const form=document.querySelector('dialog form');assert(form);
 assert(form.elements.sourceScope);
 assert(form.querySelector('[data-question-preflight]'));
 form.elements.title.value='Who has the letter?';
 form.elements.note.value='The holder changes the next event';
 form.elements.decisionKind.value='Missing decision';
 form.elements.sourceScope.value='linked';
 // No source selected: do not save anything.
 form.onsubmit({preventDefault(){}});
 for(let i=0;i<4;i++)await new Promise(r=>setTimeout(r,0));
 assert.equal(writes,0);
 assert.match(document.querySelector('dialog').textContent,/Link an existing event/);
 // A book-wide story question has explicit saved Story Brief as evidence.
 form.elements.sourceScope.value='brief';
 form.onsubmit({preventDefault(){}});
 for(let i=0;i<4;i++)await new Promise(r=>setTimeout(r,0));
 assert.equal(writes,1);
 assert.equal(state.data.workshop.questions[0].answer,'Keep original');
 assert.equal(state.data.workshop.questions[1].sourceScope,'brief');
 assert.equal(state.data.workshop.questions[1].sourceBriefSnapshot,original);
 assert.equal(state.data.workshop.questions[1].questionContext.bookId,'b');
 assert.equal(state.data.summary,original);
 dom.window.close();
}
console.log('PASS real new question UI blocks unsourced question, allows explicit saved Story Brief, preserves protected decisions across Arabic/English');

process.exit(0);
