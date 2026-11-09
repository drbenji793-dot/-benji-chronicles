import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {currentStoryUI,IBN_BOOK} from '../src/current-story.js';
function fixture(language='ar',bookId=IBN_BOOK){
 const dom=new JSDOM('<main></main>',{url:'https://example.test/#book='+bookId});globalThis.location=dom.window.location;globalThis.DOMParser=dom.window.DOMParser;
 let data={title:'Book',sourceDocument:{fields:{name:'Original'},inventory:[]},workshop:{questions:[{id:'q',sourceFields:{name:'Original'},answer:'Original',status:'answered'}]},retained:{yes:true}},branch={id:'a',revision:7};
 let dialog,writes=[],closed=0,rendered=0,save=async()=>{};
 const c={bookId,model:()=>data,branch:()=>branch,modal:(title,html)=>{dialog=dom.window.document.createElement('section');dialog.innerHTML=html;dom.window.document.querySelector('main').append(dialog);return dialog;},writer:()=> 'Benji',save:async d=>{writes.push(d);await save(d);},close:()=>closed++,render:()=>rendered++};
 currentStoryUI(c).action('import');const input=dialog.querySelector('[data-answer-file]'),button=dialog.querySelector('[data-answer-apply]'),message=dialog.querySelector('.dsl-form-status');
 const file=(name=language==='ar'?'سعد أبو العلا':'Saad Abu al Ala')=>({name:'answers.json',size:100,text:async()=>JSON.stringify({schema:'ibn-al-jabal-workbook',fields:{name}})});
 return {dom,input,button,message,writes,dialog,file,read:f=>input.onchange({target:{files:f?[f]:[]}}),change:()=>branch={id:'another',revision:7},edit:()=>data.sourceDocument.fields.name='Manual edit',save:f=>save=f,closed:()=>closed,rendered:()=>rendered};
}
for(const language of ['ar','en']){
 {const f=fixture(language);await f.read(f.file());await f.button.onclick();assert.equal(f.writes.length,1);assert.equal(f.writes[0].workshop.questions[0].status,'open');assert.deepEqual(f.writes[0].retained,{yes:true});assert.equal(f.closed(),1);f.dom.window.close();}
 for(const stale of ['branch','manual','navigation','closed']){const f=fixture(language);await f.read(f.file());if(stale==='branch')f.change();if(stale==='manual')f.edit();if(stale==='navigation')location.hash='#other';if(stale==='closed')f.dialog.remove();await f.button.onclick();assert.equal(f.writes.length,0);if(stale!=='closed')assert.match(f.message.textContent,/source changed/);f.dom.window.close();}
 {const f=fixture(language);let release;const older=f.read({...f.file(),text:()=>new Promise(r=>release=r)});await f.read(f.file('Newest'));release(JSON.stringify({schema:'ibn-al-jabal-workbook',fields:{name:'Old'}}));await older;await f.button.onclick();assert.equal(f.writes[0].sourceDocument.fields.name,'Newest');f.dom.window.close();}
 for(const invalid of ['invalid','cancel','reading']){const f=fixture(language);await f.read(f.file());let release;const pending=f.read(invalid==='cancel'?null:{...f.file(),text:invalid==='invalid'?async()=>'{':()=>new Promise(r=>release=r)});await f.button.onclick();assert.equal(f.writes.length,0);if(release)release('{');await pending;assert(f.button.disabled);await f.button.onclick();assert.equal(f.writes.length,0);f.dom.window.close();}
 {const f=fixture(language);let release;f.save(()=>new Promise(r=>release=r));await f.read(f.file());const pending=f.button.onclick();await f.button.onclick();assert.equal(f.writes.length,1);assert(f.input.disabled);location.hash='#other';release();await pending;assert.equal(f.closed(),0);assert.equal(f.rendered(),0);f.dom.window.close();}
 {const f=fixture(language);f.save(async()=>{throw Error('Save failed');});await f.read(f.file());await f.button.onclick();assert.match(f.message.textContent,/Save failed/);assert(!f.button.disabled);f.save(async()=>{});await f.button.onclick();assert.equal(f.writes.length,2);assert.equal(f.closed(),1);f.dom.window.close();}
 {const f=fixture(language,'other');await f.read(f.file());assert.match(f.message.textContent,/belongs to Ibn al Jabal/);await f.button.onclick();assert.equal(f.writes.length,0);f.dom.window.close();}
}
console.log('PASS workbook import latest-file selection, invalid/cancelled reads, same-revision source switch, manual edits, duplicate submission, failure retry and navigation in both languages');
