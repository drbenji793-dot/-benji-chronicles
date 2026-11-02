import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {renderDSL} from '../src/dsl.js';
for(const mode of ['dsl','storyline']){
 const dom=new JSDOM('<main></main>',{url:'https://example.test/#book=b&view='+mode+'&dslview=synopsis'});for(const k of ['window','document','location','MutationObserver','localStorage','FormData'])globalThis[k]=dom.window[k];globalThis.requestAnimationFrame=f=>f();
 const data={summary:'Selected working text',title:'Book',events:[],links:[],characters:[],objects:[],workshop:{questions:[]}};
 const api=async p=>p.startsWith('chronicles_books')?[{id:'b',title:'Book',language:'en'}]:p.startsWith('chronicles_dsl_projects')?[{revision:9,published:{data:{...data,summary:'Older published text'},branch_revision:2,published_at:'2026-11-01T00:00:00Z'}}]:p.startsWith('chronicles_dsl_branches')?[{id:'br',revision:8,data,name:'Selected',updated_at:'2026-11-02T00:00:00Z'}]:[];
 let blob;URL.createObjectURL=b=>(blob=b,'blob:test');URL.revokeObjectURL=()=>{};dom.window.HTMLAnchorElement.prototype.click=function(){};
 await renderDSL(document.querySelector('main'),api,'b',mode);document.querySelector('[data-action=export-html]').click();const html=await blob.text();assert(html.includes(mode==='dsl'?'Selected working text':'Older published text'));assert(!html.includes(mode==='dsl'?'Older published text':'Selected working text'));dom.window.close();
}
console.log('PASS exported Storyline matches working or published view without silent source substitution');process.exit(0);
