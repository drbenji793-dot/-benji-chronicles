import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {clueProseReview,clueProseReviewHTML} from '../src/clue-prose-review.js';
import {sourceToolsUI} from '../src/source-tools-ui.js';
for(const term of ['Salem','سالم']){
 const dom=new JSDOM('<main></main>');globalThis.document=dom.window.document;globalThis.window=dom.window;
 const event={id:'e',type:'clue',title:'Clue',revision:4},chapter={id:'c',revision:9,title:'Chapter',body:'<p>'+term+' waited.</p><p>'+term+'ine</p><p>&lt;img src=x&gt; '+term+'</p>'};
 const data={events:[event],characters:[],workshop:{questions:[]}},before=structuredClone(data);let branch={id:'b',revision:1},fail=false,pending;
 const c={model:()=>data,branch:()=>branch,bookId:'book',chapters:()=>[chapter],writer:()=> 'Benji',route:()=> '#',field:(name,label)=>`<label>${label}<input name="${name}"></label>`,select:(name,label,opts)=>`<label>${label}<select name="${name}">${Object.entries(opts).map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label>`,modal:(title,html)=>{const div=document.createElement('div');div.innerHTML=html;document.body.append(div);return div;},readProseChapter:async()=>{if(fail)throw Error('Chapter changed. Reopen Review before citing it.');if(pending)await pending;return chapter;}};
 const ui=sourceToolsUI(c),root=document.querySelector('main');root.innerHTML=ui.cluesHTML();ui.bind(root);root.querySelector('[data-tool-prose]').click();
 const form=document.querySelector('form');form.elements.chapter.value='c';form.elements.term.value=term;
 const run=()=>form.onsubmit({preventDefault(){},currentTarget:form});await run();
 assert.equal(form.querySelectorAll('[data-prose-flags] details').length,2);assert.equal(form.querySelectorAll('img,script').length,0);assert.match(form.textContent,/r9/);assert.match(form.textContent,/Review paragraph 3/);
 fail=true;await run();assert.match(form.textContent,/Chapter changed/);assert.equal(form.querySelector('[data-prose-flags]'),null);fail=false;
 let resolve;pending=new Promise(r=>resolve=r);const inFlight=run();branch={id:'different',revision:1};resolve();await inFlight;assert.match(form.textContent,/Planning changed/);assert.equal(form.querySelector('[data-prose-flags]'),null);
 assert.deepEqual(data,before);assert.equal(clueProseReview(event,chapter,['unrelated'],term).matches.length,0);assert.throws(()=>clueProseReview(event,chapter,[],''));assert.match(clueProseReviewHTML(clueProseReview(event,chapter,[],term)),/Only this selected saved chapter/);
 dom.window.close();
}
console.log('PASS Arabic and English prose flags, exact paragraph evidence, escaping, stale chapter and switched planning rejection, retry and unchanged source');
