import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const arBook='11111111-1111-1111-1111-111111111111',enBook='22222222-2222-2222-2222-222222222222';
const books=[{id:arBook,title:'Arabic book',language:'ar',primary_writer:'Benji'},{id:enBook,title:'English book',language:'en',primary_writer:'Benji',related_work:arBook}];
const editions=[{id:'edition',source_key:arBook,target_book_id:enBook,mode:'translation',instructions:'Keep Cairo'}];
const chapter={id:'source',source_kind:'extra',book_id:arBook,kind:'chapter',chapter_number:1,title:'الفصل',body:'<p>Arabic source changed</p>',revision:2,updated_by:'Benji',updated_at:'2026-10-30T12:00:00Z'};
const target={...chapter,id:'target',book_id:enBook,title:'English chapter',body:'<p>Independent English text</p>',revision:1};
const source={target_entry_id:'target',edition_id:'edition',source_id:'source',source_revision:1,reviewed_revision:1,source_title:'الفصل',source_body:'<p>Original snapshot</p>'};
const wait=()=>new Promise(r=>setTimeout(r,160));
async function fixture(language,hash=''){
 const bundle=await build({entryPoints:['src/app.js'],bundle:true,write:false,format:'iife',logLevel:'silent',define:{__CHRONICLES_EDITION__:JSON.stringify(language),'import.meta.url':JSON.stringify('https://example.com/app.js')}});
 const dom=new JSDOM((await readFile('public/index.html','utf8')).replace(/<script[\s\S]*?<\/script>/g,''),{url:(language==='ar'?'https://benji-chronicles.vercel.app/':'https://benji-chronicles-english.vercel.app/')+hash,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,doc=w.document,calls=[];w.matchMedia=()=>({matches:false});w.scrollTo=()=>{};doc.fonts={ready:Promise.resolve()};w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{const u=new URL(url),name=u.pathname.split('/').at(-1);calls.push({name,opts,url:u});let data=[];
 if(name==='chronicles_books')data=books;
 if(name==='chronicles_english_editions')data=editions;
 if(name==='chronicles_english_sources')data=language==='en'?[source]:[];
 if(name==='chronicles_english_source_chapters')data=[chapter];
 if(name==='chronicles_send_to_english')data={book_id:enBook,added:1,mode:'translation'};
 if(name==='chronicles_review_english_source'){source.reviewed_revision=2;data=null;}
 if(name==='chronicles_book_entries'){data=u.searchParams.get('book_id')==='eq.'+arBook?[chapter]:[target];if(opts.method==='PATCH'){Object.assign(target,JSON.parse(opts.body),{revision:target.revision+1});data=[target];}}
 if(name==='chronicles_book_versions')data=[{...target,entry_id:'target',saved_by:'Benji',saved_at:target.updated_at}];
 if(name==='chronicles_chapters')data=[{...chapter,id:'ar-main',story_number:12,language:'ar'},{...target,id:'en-main',story_number:12,language:'en'}].filter(r=>!u.searchParams.has('id')||u.searchParams.get('id')==='eq.'+r.id);
 if(name==='chronicles_adaptations')data=[{story_number:12,title:'A Fracture in Time',revision:1}];
 return {ok:true,json:async()=>data};};
 w.eval(bundle.outputFiles[0].text);await wait();return {dom,w,doc,calls,q:s=>doc.querySelector(s)};
}
let f=await fixture('ar');
assert.equal(f.q('.collection-heading').textContent,'Arabic Library');assert(!f.q('.world-gates'));assert(f.q('.edition-bridge a').href.startsWith('https://benji-chronicles-english.vercel.app/'));assert(!f.q('#main').textContent.includes('English book'));f.dom.window.close();
f=await fixture('en');assert.equal(f.q('.collection-heading').textContent,'English Library');assert(f.q('#main').textContent.includes('English book'));assert(!f.q('#main').textContent.includes('Arabic book'));assert(f.q('.edition-bridge a').href.startsWith('https://benji-chronicles.vercel.app/'));f.dom.window.close();
f=await fixture('ar','#book='+arBook);assert(f.q('[data-send=translation]'));assert(f.q('[data-send=adaptation]'));
f.q('[data-send=translation]').click();await wait();const form=f.q('#send-english');assert(form);form.elements.title.value='English book';form.querySelector('[name=chapter]').checked=true;form.dispatchEvent(new f.w.Event('submit',{cancelable:true,bubbles:true}));await wait();const sent=f.calls.find(c=>c.name==='chronicles_send_to_english');assert(sent);assert.deepEqual(JSON.parse(sent.opts.body).p_chapters,[{id:'source',revision:2}]);assert(f.q('#edition-send-status a').href.endsWith('#book='+enBook));assert(form.querySelector('[name=chapter]').disabled);f.dom.window.close();
f=await fixture('en','#book='+enBook+'&chapter=1');assert(f.q('.edition-source').textContent.includes('Arabic source updated'));assert.equal(f.q('#chronicles-entry-body').dir,'ltr');assert.equal(f.q('#chronicles-entry-body').textContent,'Independent English text');assert(f.q('.edition-source').textContent.includes('Original snapshot'));
f.q('[data-review-source]').click();await wait();assert(!f.q('.edition-source').textContent.includes('Arabic source updated'));assert.equal(f.q('#chronicles-entry-body').textContent,'Independent English text');
f.q('#chronicles-edit').click();f.q('#chronicles-entry-body').innerHTML='<p>Revised English text</p>';f.q('#chronicles-save').click();await wait();assert.equal(target.body,'<p>Revised English text</p>');assert.equal(chapter.body,'<p>Arabic source changed</p>');f.q('#chronicles-history').click();await wait();assert(f.q('#modal-content').textContent.includes('Revision')||f.q('#modal-content').textContent.includes('Current'));f.dom.window.close();
f=await fixture('en','#story=12&lang=en&chapter=1');assert.equal(f.q('#prose').lang,'en');assert(f.q('a[href="https://benji-chronicles.vercel.app/#story=12&lang=ar"]'));f.dom.window.close();
console.log('PASS: isolated homes, existing English books, cross-site links, transfer UI with revision approval, source-change review, English editor/save/history and legacy English reader.');
