import {JSDOM} from 'jsdom';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COLLECTION_PLANNING,collectionRoute} from '../src/collection-workspace.js';
import {makeMasterStory} from '../src/dsl-master.js';
const titles=['قطار الليل','الدور الرابع','ثلاث شقق في وسط البلد','ترجمة ناقصة','الساعة اللي وقفت','شقة بالإيجار القديم'];
const chapters=titles.map((title,i)=>({id:'chapter-'+(i+1),story_number:i+1,language:'ar',chapter_number:1,title,body:'<p>Original '+(i+1)+'</p>',revision:7,updated_by:'Benji',updated_at:'2026-10-26T12:00:00Z'}));
const books=titles.map((title,i)=>({id:COLLECTION_PLANNING[i+1],title,language:'ar'}));
const branches=books.map((b,i)=>({id:'branch-'+(i+1),book_id:b.id,revision:1,name:'Main Path',updated_by:'Benji',data:{...makeMasterStory(b.title),events:[{id:'event-'+(i+1),title:'Event '+(i+1),summary:'Story '+(i+1),order:1,status:'draft',type:'event',year:null,sourceId:chapters[i].id,sourceChapter:1,sourceRevision:7}]}}));
const dom=new JSDOM(readFileSync('public/index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,''),{url:'https://benji-chronicles.vercel.app/#story=1&lang=ar',runScripts:'outside-only',pretendToBeVisual:true});
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
w.eval(readFileSync('public/app.js','utf8'));const q=s=>w.document.querySelector(s);const wait=()=>new Promise(r=>setTimeout(r,80));
try{
 await wait();
 for(let n=1;n<=titles.length;n++){
  w.location.hash=collectionRoute(n,'cover');await wait();
  assert.deepEqual([...w.document.querySelectorAll('.ink-tabs a')].map(a=>a.textContent),['Chapters','Storyline','DSL','Characters','References','Library']);
  q('.ink-tabs a[href*=chapter]').click();await wait();assert.equal(q('#prose').textContent,'Original '+n);assert(q('#edit'));assert(q('#history'));assert(q('#export-book'));
  q('.ink-tabs a[href*=view\\=dsl]').click();await wait();
  for(const label of ['Story Map','Timeline','Reading Order','Decisions','Characters','Knowledge','Twists','Objects','Story Health','Review','History'])assert([...w.document.querySelectorAll('.dsl-tabs a')].some(a=>a.textContent===label));
  for(const action of ['new-event','new-link','fork','new-object','template-guide','preview','blend','brief','export'])assert(q('[data-action="'+action+'"]'));
  assert.equal(q('.dsl-event a').getAttribute('href'),'#story='+n+'&lang=ar&chapter=1');
  assert.equal(q('.dsl-tabs a').getAttribute('href').includes('story='+n),true);
  q('[data-action=new-event]').click();assert.equal(q('[name=chapterLink]').options.length,2);assert.equal(q('[name=chapterLink]').options[1].value,'chapter-'+n);q('[data-close]').click();
  q('[data-action=blend]').click();q('[data-assemble]').click();assert.equal(q('[name=result]').value,'Story '+n);q('[data-blend-form]').dispatchEvent(new w.Event('submit',{cancelable:true}));await wait();assert.equal(branches[n-1].data.blender.drafts.length,1);
  q('.ink-tabs a[href*=view\\=storyline]').click();await wait();assert.equal(q('.dsl-readable a').getAttribute('href'),'#story='+n+'&lang=ar&chapter=1');
  q('.ink-tabs a[href*=view\\=characters]').click();await wait();assert(q('#resource-edit'));q('.ink-tabs a[href*=view\\=references]').click();await wait();assert(q('#resource-history'));
 }
 assert.equal(writes.length,titles.length);assert.deepEqual(chapters.map(c=>c.revision),titles.map(()=>7));
 w.location.hash='#library&lang=ar';await wait();assert.equal(w.document.querySelectorAll('.chronicles-new-card').length,0,'Planning holders must not create duplicate library books');
 w.location.hash='#story=7&lang=ar';await wait();assert(!q('.ink-tabs a[href*=view\\=dsl]'),'Other stories retain existing navigation');
 assert(!reads.some(([t,p])=>t==='chronicles_book_entries'&&books.some(b=>p.includes(b.id))),'Legacy DSL must load original chapter table');
 console.log('PASS all six story toolbars, DSL tabs/actions, per-story saves, real chapter links, legacy notes, no duplicate books, manuscript isolation');
}finally{w.close()}
