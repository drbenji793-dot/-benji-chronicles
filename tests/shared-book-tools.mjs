import {JSDOM} from 'jsdom';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COLLECTION_PLANNING,ENGLISH_PLANNING,collectionRoute} from '../src/collection-workspace.js';
import {makeMasterStory} from '../src/dsl-master.js';
const language=process.env.TEST_LANGUAGE||'ar';
const titles=Array.from({length:12},(_,i)=>'Story '+(i+1));
const chapters=titles.map((title,i)=>({id:'chapter-'+(i+1),story_number:i+1,language,chapter_number:1,title,body:'<p>Original '+(i+1)+'</p>',revision:7,updated_by:'Benji',updated_at:'2026-10-26T12:00:00Z'}));
const books=titles.map((title,i)=>({id:(language==='en'?ENGLISH_PLANNING:COLLECTION_PLANNING)[i+1],title,language}));
const extraBook={id:'11111111-1111-4111-8111-111111111111',title:'Future Book',language,primary_writer:'Benji',collaboration:'shared'};
books.push(extraBook,{...extraBook,id:'ff9fed20-1254-45b6-82f4-9f7b9fe7c3ba',title:'Outside Time'});
const branches=books.map((b,i)=>({id:'branch-'+(i+1),book_id:b.id,revision:1,name:'Main Path',updated_by:'Benji',data:{...makeMasterStory(b.title),events:[{id:'event-'+(i+1),title:'Event '+(i+1),summary:'Story '+(i+1),order:1,status:'draft',type:'event',year:null,sourceId:chapters[i]?.id,sourceChapter:1,sourceRevision:7}]}}));
const dom=new JSDOM(readFileSync('public/index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,''),{url:'https://benji-chronicles.vercel.app/#story=1&lang='+language,runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;w.matchMedia=()=>({matches:false});w.scrollTo=()=>{};w.document.fonts={ready:Promise.resolve()};w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
const writes=[],reads=[];
w.fetch=async(url,o={})=>{const u=new URL(url),table=u.pathname.split('/').at(-1),p=u.searchParams;reads.push([table,p.toString()]);let rows=[];
 if(o.method&&o.method!=='GET'){
  writes.push({table,query:p.toString(),data:JSON.parse(o.body)});
  assert.equal(table,'chronicles_dsl_branches','Planning may only write its own branch');
  const b=branches.find(b=>p.get('id')==='eq.'+b.id);assert.equal(p.get('book_id'),'eq.'+b.book_id);assert.equal(p.get('revision'),'eq.'+b.revision);Object.assign(b,JSON.parse(o.body),{revision:b.revision+1});rows=[b];
 }else if(table==='chronicles_chapters')rows=chapters.filter(c=>(!p.has('story_number')||p.get('story_number')==='eq.'+c.story_number)&&(!p.has('id')||p.get('id')==='eq.'+c.id));
 else if(table==='chronicles_books')rows=p.has('id')?books.filter(b=>p.get('id')==='eq.'+b.id):books;
 else if(table==='chronicles_dsl_branches')rows=branches.filter(b=>p.get('book_id')==='eq.'+b.book_id);
 else if(table==='chronicles_dsl_projects')rows=[{book_id:p.get('book_id')?.slice(3),revision:1}];
 return {ok:true,json:async()=>structuredClone(rows)};
};
w.eval(readFileSync(process.env.TEST_BUNDLE||'public/app.js','utf8').replaceAll('import.meta.url',JSON.stringify('https://benji-chronicles.vercel.app/app.js')));const q=s=>w.document.querySelector(s);const wait=()=>new Promise(r=>setTimeout(r,180));
try {
 await wait();
 const labels=['Story Brief','Chapters','Notes','Review','Export','Garden of Eden'];
 for(let n=1;n<=12;n++){
  const root='#story='+n+'&lang='+language;w.location.hash=root;await wait();
  assert.deepEqual([...w.document.querySelectorAll('.ink-tabs a')].map(a=>a.textContent),labels);
  for(const [tool,selector] of [['brief','h1'],['notes','.dsl'],['critique','.critique-page'],['export','#collection-export'],['garden','.goe']]){
   q('[data-book-tool="'+tool+'"]').click();await wait();
   assert(q(selector),'Story '+n+' '+tool+' renders');
   assert.equal(new URLSearchParams(w.location.hash.slice(1)).get('story'),String(n));
   assert.deepEqual([...w.document.querySelectorAll('.ink-tabs a')].map(a=>a.textContent),labels);
   if(tool==='export'){q('#collection-export').click();assert(q('#export-dialog').open);q('#export-close').click();}
  }
  q('[data-book-tool="chapters"]').click();await wait();assert(q('.chronicles-book-home'),'story '+n+' '+w.location.hash+' '+q('#status').textContent);
 }
 for(const book of books.slice(12)){
  w.location.hash='#book='+book.id;await wait();
  for(const tool of ['brief','notes','critique','export','garden','chapters']){
   assert.deepEqual([...w.document.querySelectorAll('.ink-tabs a')].map(a=>a.textContent),labels);
   q('[data-book-tool="'+tool+'"]').click();await wait();
   assert.equal(new URLSearchParams(w.location.hash.slice(1)).get('book'),book.id,tool+' '+q('#status').textContent);
   assert(!q('#main .loading'),'Independent route completed: '+tool);
   if(tool==='garden')assert(q('.goe'));
  }
 }
 assert.equal(writes.length,0);console.log('PASS all 12 collection stories: six tools, routes, export dialog, no writes');
}finally{w.close()}
