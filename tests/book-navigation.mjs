import {collectionNavigation} from '../src/collection-workspace.js';
import {JSDOM} from 'jsdom';
import assert from 'node:assert/strict';
import {createChroniclesLibrary} from '../src/new-books.js';
const dom=new JSDOM('<nav class="book-navigation" hidden></nav><main id="main"></main><dialog id="modal"></dialog>');
globalThis.document=dom.window.document;
const id='11111111-1111-4111-8111-111111111111';
const book={id,title:'ابن الجبل',language:'ar',primary_writer:'Benji',collaboration:'shared'};
const entries=[{id:'chapter',kind:'chapter',chapter_number:1,title:'الورّاق',body:'<p>Original chapter</p>',revision:1},{id:'rules',kind:'rules',body:'Original rules',revision:1}];
let writes=0;
const api=async(path,opts)=>{if(opts)writes++;if(path.startsWith('chronicles_books'))return [book];if(path.startsWith('chronicles_book_entries'))return entries;return []};
const lib=createChroniclesLibrary({api,esc:String,clean:String,storage:{get:()=>null},say:()=>{},getWriter:()=> 'Benji',navigate:async()=>{},date:()=>'',workflow:{mount:()=>{}},trackAuthors:()=>{}});
await lib.load();
for(const language of ['ar','en']){
 book.language=language;
 for(const route of [{},{view:'contents'},{chapter:'1'},{rules:'1'},{view:'references'}]){
  await lib.render(new URLSearchParams({book:id,...route}));
  const nav=document.querySelector('.book-navigation');
  assert.equal(nav.hidden,false);
  const tabs=[...nav.querySelectorAll('.ink-tabs a')];
  assert.deepEqual(tabs.map(a=>a.textContent),['Story','Chapters','Story World','Review']);
  assert(tabs.every(a=>a.getAttribute('href').startsWith('#book='+id)));
  assert(tabs[2].getAttribute('href').endsWith('&view=dsl&dslview=garden'));
  if(route.chapter)assert.equal(nav.querySelector('[aria-current]').textContent,'Chapters');

 }
}
assert.equal(writes,0);assert.equal(entries[0].body,'<p>Original chapter</p>');
console.log('PASS Arabic and English full navigation across cover, contents, chapters, rules and references; no data writes');
// Collection navigation is rendered before planning requests finish. It must
// already offer the shared destinations and preserve the selected edition.
for(const language of ['ar','en'])for(let story=1;story<=12;story++){
 for(const route of [{view:'dsl',dslview:'garden'},{view:'brief'},{view:'critique'},{chapter:'1'}]){
  const params=new URLSearchParams({story:String(story),lang:language,...route});
  const nav=document.querySelector('.book-navigation');nav.innerHTML=collectionNavigation(story,params);
  const links=[...nav.querySelectorAll('.ink-tabs a')];
  assert.deepEqual(links.map(a=>a.textContent),['Story','Chapters','Story World','Review']);
  for(const link of nav.querySelectorAll('a')){const target=new URLSearchParams(link.hash.slice(1));assert.equal(target.get('story'),String(story));assert.equal(target.get('lang'),language);}
  assert.equal(nav.querySelector('[aria-current]').textContent,route.chapter?'Chapters':route.view==='dsl'?'Story World':route.view==='brief'?'Story':'Review');
 }
}
console.log('PASS immediate collection navigation for all 12 books, both editions and four destinations');
dom.window.close();
