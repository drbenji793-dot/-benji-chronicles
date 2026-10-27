import {JSDOM} from 'jsdom';
import assert from 'node:assert/strict';
import {createChroniclesLibrary} from '../src/new-books.js';
const dom=new JSDOM('<nav class="book-navigation" hidden></nav><main id="main"></main><dialog id="modal"></dialog>');
globalThis.document=dom.window.document;
const id='66739f5d-2bac-4d75-a4fd-6df93da8ac7e';
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
  assert.deepEqual(tabs.map(a=>a.textContent),['Contents','Chapters','Storyline','DSL','Blender','Characters','References','Critique']);
  assert(tabs.every(a=>a.getAttribute('href').startsWith('#book='+id)));
  assert.equal(tabs[4].getAttribute('href'),'#book='+id+'&view=dsl&dsltool=blend');
  assert.equal(tabs[5].getAttribute('href'),'#book='+id+'&view=dsl&dslview=characters');
  assert(nav.querySelector('a[href="#library&lang='+language+'"]'));
  if(route.chapter)assert.equal(nav.querySelector('[aria-current]').textContent,'Chapters');
  if(route.view)assert.equal(nav.querySelector('[aria-current]').textContent,route.view==='contents'?'Contents':'References');
 }
}
assert.equal(writes,0);assert.equal(entries[0].body,'<p>Original chapter</p>');
console.log('PASS Arabic and English full navigation across cover, contents, chapters, rules and references; no data writes');
dom.window.close();
