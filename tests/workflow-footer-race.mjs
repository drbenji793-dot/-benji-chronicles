import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createWorkflow} from '../src/workflow.js';
import {mountTechnicalFooter} from '../src/technical-footer.js';
// Exercise real footer relocation during the asynchronous workflow request.
for(const bookId of ['ordinary-book','c911584d-bd5b-42fe-b41c-a2a456c64d41']){
 const dom=new JSDOM('<main id="main"><section class="editor-area"><div class="toolbar"></div><details class="technical-details"><summary>Technical</summary><p class="save-meta">Saved source stamp</p></details></section></main><footer><details class="technical-details"><summary>Technical</summary><p>Reader v195 · 2026-11-02T22:41:39Z · UTC</p></details></footer>');
 for(const k of ['document','MutationObserver'])globalThis[k]=dom.window[k];
 let resolve,requests=0;
 const pending=new Promise(r=>resolve=r);
 const chapter={id:'fixture-chapter',book_id:bookId,kind:'chapter',chapter_number:1,revision:7,language:'ar',body:'<p>Original text</p>',title:'Fixture',updated_at:'2026-11-02T00:00:00Z'};
 const before=JSON.stringify(chapter);
 const workflow=createWorkflow({api:async(path,options)=>{assert(!options,'No writes are permitted');assert(path.startsWith('chronicles_workflow?'));requests++;return pending},esc:String,clean:String,date:String,getWriter:()=> 'Benji',say:()=>{},storage:{},getIndex:()=>[],refresh:()=>{},diffHTML:()=>'',supplements:[]});
 const mounting=workflow.mount(chapter,'extra','Fixture',()=>false);
 const originalButton=document.querySelector('[data-wf=approve]');
 const stop=mountTechnicalFooter(document.querySelector('main'),document.querySelector('footer'));
 assert(!document.querySelector('.workflow-panel').contains(originalButton));
 assert(originalButton.isConnected);
 resolve([{approved_revision:7,approved_by:'Benji',approved_at:'2026-11-02T00:00:00Z',transferred_revision:7,transferred_at:'2026-11-02T00:00:00Z'}]);
 await mounting;
 assert(!document.body.textContent.includes('Status unavailable'));
 assert(document.querySelector('.workflow-status').textContent.includes('Approved revision v107'));
 assert.equal(originalButton.textContent,'Approved');assert(originalButton.disabled);
 assert(document.querySelector('[data-wf=transfer]').disabled);
 if(bookId.startsWith('c911')){assert.equal(document.querySelector('[data-wf=approve-send]').textContent,'Sent to Ink');assert(document.querySelector('[data-wf=approve-send]').disabled)}
 assert.equal(JSON.stringify(chapter),before);assert.equal(requests,1);
 stop();dom.window.close();
}
console.log('Workflow status survives technical footer relocation for ordinary and review books; no content writes.');
