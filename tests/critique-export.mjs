import {installCurrentGuideFixture} from './current-guide-fixture.mjs';
await installCurrentGuideFixture();
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import createDOMPurify from 'dompurify';
import {reviewBriefHTML,renderCritique} from '../src/critique.js';
for(const language of ['ar','en']){
 const dom=new JSDOM('<main></main>',{url:'https://example.test/#view=critique'});
 for(const k of ['window','document','location','MutationObserver','localStorage','FormData'])globalThis[k]=dom.window[k];
 const chapters=[{id:'one',chapter_number:1,title:'ابن الجبل',revision:4,body:'<p>حافيين &amp; سالم</p><script>alert(1)</script>'},{id:'two',chapter_number:2,title:'Next',revision:2,body:''}];
 const context={bookId:'book',title:'ابن الجبل',language,sourcePath:'chapters'};
 const before=JSON.stringify(chapters);
 const html=reviewBriefHTML({context,chapters,fingerprint:'source',generatedAt:'2026-11-02T00:00:00Z'},s=>createDOMPurify(window).sanitize(s));
 const doc=new JSDOM(html).window.document;
 assert.equal(doc.querySelector('meta[charset]').getAttribute('charset'),'utf-8');
 assert.equal(doc.querySelector('script'),null);
 assert(doc.body.textContent.includes('حافيين & سالم'));
 assert(doc.body.textContent.includes('No saved text supplied'));
 assert.equal(doc.body.textContent.includes('_zk5e'),language==='en');
 assert.equal(doc.body.textContent.includes('Arabic voice (_zk7; book selected E or F)'),language==='ar');
 assert.equal(doc.querySelectorAll('.technical-details').length,1);
 assert(doc.body.lastElementChild.matches('.technical-details'));
 assert.equal(doc.body.lastElementChild.open,false);
 assert(doc.body.lastElementChild.textContent.includes('Source r4'));
 assert(doc.body.lastElementChild.textContent.includes('Source r2'));
 assert.equal(doc.querySelectorAll('section .technical-details').length,0);
 await renderCritique(document.querySelector('main'),async p=>p.startsWith('chapters')?chapters:[],context);
 assert(!document.querySelector('main').textContent.includes('نقد صارم'));
 assert.equal(document.querySelector('.critique-page').dir,'ltr');
 let blob,filename;
 URL.createObjectURL=b=>(blob=b,'blob:test');URL.revokeObjectURL=()=>{};
 dom.window.HTMLAnchorElement.prototype.click=function(){filename=this.download;};
 const originalTimer=globalThis.setTimeout;globalThis.setTimeout=()=>0;
 await document.querySelector('[data-brief]').onclick(); await document.querySelector('[data-export-form]').onsubmit({preventDefault(){}});globalThis.setTimeout=originalTimer;
 assert.equal(filename,'Review_Brief_v006.html');assert.equal(blob.type,'text/html;charset=utf-8');
 assert((await blob.text()).startsWith('<!doctype html>'));
 assert.equal(JSON.stringify(chapters),before);
 // A book without planning must also refresh guidance before HTML export.
 const online=globalThis.fetch;globalThis.fetch=async()=>{throw Error('offline');};
 blob=null;await document.querySelector('[data-export-form]').onsubmit({preventDefault(){}});
 assert.equal(blob,null);assert(document.body.textContent.includes('could not be confirmed'));
 globalThis.fetch=online;await installCurrentGuideFixture();
 dom.window.close();
}
console.log('Review export: Arabic/English criteria, readable safe HTML, source fidelity and download verified.');
// The actual report handler must enter the shared update mechanism, preserve the
// chapter source and keep the local draft when another writer saves first.
{
 const dom=new JSDOM('<main></main>',{url:'https://example.test/#view=critique'});
 for(const k of ['window','document','location','MutationObserver','localStorage','FormData'])globalThis[k]=dom.window[k];
 const original={id:'branch',revision:8,book_id:'book',data:{summary:'سالم',characters:[],events:[]}};
 let saved,reject=false;
 const api=async(path,opts)=>{
  if(opts?.method==='PATCH'){const q=new URLSearchParams(path.split('?')[1]);assert.equal(q.get('book_id'),'eq.book');assert.equal(q.get('revision'),saved?'eq.9':'eq.8');if(reject)return [];saved=JSON.parse(opts.body);return [{...original,data:saved.data,revision:9}];}
  if(path.includes('select=reviews:'))return [{reviews:[]}];
  return path.startsWith('chapters')?[{id:'ch',revision:3,body:'<p>Story preserved</p>'}]:[structuredClone(original)];
 };
 await renderCritique(document.querySelector('main'),api,{bookId:'book',title:'Review',language:'ar',sourcePath:'chapters'});
 document.querySelector('[data-add-feedback]').click(); const f=document.querySelector('[data-critique-form]');f.elements.title.value='Review';f.elements.feedback.value='مراجعة';
 await f.onsubmit({preventDefault(){},target:f});
 assert.equal(saved.data.summary,original.data.summary);assert.equal(saved.data.currentUpdate.baseRevision,8);
 assert(saved.data.currentUpdate.changed.some(x=>x.kind==='editorialReviews'));
 assert.equal(saved.data.editorialReviews[0].sources[0].revision,3);
 reject=true;document.querySelector('[data-add-feedback]').click();const f2=document.querySelector('[data-critique-form]');f2.elements.title.value='Second';f2.elements.feedback.value='Second report';f2.dispatchEvent(new dom.window.Event('input'));
 await f2.onsubmit({preventDefault(){},target:f2});
 assert(document.querySelector('[data-state]').textContent.includes('another device'));
 assert(localStorage.getItem('chronicles-critique-draft:book').includes('Second report'));
 dom.window.close();
}
