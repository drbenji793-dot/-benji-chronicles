import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {answersHTML} from '../src/answer-export.js';
import {readableReview,reviewPackage} from '../src/garden-exchange.js';
import {companionHTML,events,cast} from '../src/companion.js';
const branch={id:'b',revision:3,updated_at:'2026-11-01T12:00:00Z',data:{title:'ابن الجبل',summary:'سالم',characters:[],events:[],workshop:{questions:[]}}};
const p=reviewPackage({book:{id:'book',title:'ابن الجبل',language:'ar'},branch,chapters:[]});
for(const html of [answersHTML({branch,exportedAt:'2026-11-02T00:00:00Z'}),readableReview(p)]){
 const doc=new JSDOM(html).window.document;assert.equal(doc.documentElement.lang,'en');assert.equal(doc.querySelectorAll('.technical-details').length,1);const details=doc.querySelector('.technical-details');assert(!details.open);assert(![...details.nextElementSibling?.parentElement.children||[]].slice([...doc.body.children].indexOf(details)+1).some(e=>e.tagName!=='SCRIPT'));assert(details.textContent.includes('r3'));assert(details.textContent.includes('Exported'));assert(doc.body.textContent.includes('ابن الجبل'));
}
const rows=events.map(([n])=>({chapter_number:n,title:'عنوان',body:'سلمى',revision:9}));
for(const kind of ['characters','storyline']){const html=companionHTML(kind,rows,x=>String(x),true);assert(!html.includes('نسخة النص'));assert(!html.includes('Completed and remaining'));assert(html.includes(kind==='characters'?'Characters':'Storyline'));assert(html.includes(kind==='characters'?cast[0][0]:events[0][3]));}
console.log('Export presentation: English shell, collapsed bottom stamps, Arabic source preservation and companion cleanup pass.');
