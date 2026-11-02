import {JSDOM} from 'jsdom';
import assert from 'node:assert/strict';
import {createChroniclesLibrary} from '../src/new-books.js';
const original='66739f5d-2bac-4d75-a4fd-6df93da8ac7e',current='c911584d-bd5b-42fe-b41c-a2a456c64d41',branch='9a8bd2d8-7cd0-484e-a94d-fbdc90f37bd1';
for(const archive of [false,true]){
 const params=new URLSearchParams({book:original,view:'critique',dslbranch:branch});if(archive)params.set('archive','1');
 const dom=new JSDOM('<nav class="book-navigation"></nav><main id="main"></main>',{url:'https://test.invalid/#'+params});for(const k of ['window','document','location','history','MutationObserver','localStorage','FormData'])globalThis[k]=dom.window[k];
 const books=[original,current].map(id=>({id,title:'ابن الجبل',language:'ar',primary_writer:'Benji'})),reads=[];
 const api=async(path,opts)=>{assert(!opts,'Read-only review must not write');reads.push(path);const q=new URLSearchParams(path.split('?')[1]);if(path.startsWith('chronicles_books'))return q.has('id')?books.filter(b=>'eq.'+b.id===q.get('id')):books;if(path.startsWith('chronicles_book_entries')){const id=q.get('book_id').slice(3);return [{id:id+'-chapter',book_id:id,kind:'chapter',chapter_number:1,title:'Chapter',revision:1}];}if(path.startsWith('chronicles_dsl_branches'))return q.get('select').startsWith('reviews:')?[{reviews:[],findings:[]}]:[{id:branch,revision:262}];return [];};
 const lib=createChroniclesLibrary({api,esc:String,clean:String,storage:{get:()=>null},say:()=>{},getWriter:()=> 'Benji',navigate:async()=>{},date:()=>'',workflow:{},trackAuthors:()=>{}});await lib.load();await lib.render(params);
 const id=archive?original:current;assert.equal(new URLSearchParams(location.hash.slice(1)).get('book'),id);assert.equal(new URLSearchParams(location.hash.slice(1)).get('dslbranch'),branch);assert(document.querySelector('main').textContent.includes(archive?'Original archived manuscript':'Current manuscript'));assert(reads.filter(p=>p.startsWith('chronicles_book_entries')).every(p=>new URLSearchParams(p.split('?')[1]).get('book_id')==='eq.'+id));assert(reads.filter(p=>p.startsWith('chronicles_dsl_branches')).every(p=>new URLSearchParams(p.split('?')[1]).get('book_id')==='eq.'+original));dom.window.close();
}
console.log('PASS current Review alias: manuscript source matches Chapters, branch retained, explicit archive preserved and no data writes');
