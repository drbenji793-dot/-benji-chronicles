import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {buildHTML} from '../src/export-book.js';
const w=new JSDOM('').window;globalThis.FileReader=w.FileReader;globalThis.fetch=async()=>({ok:true,blob:async()=>new w.Blob(['asset'])});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const [story,language] of [[12,'ar'],[1,'ar'],[1,'en']]){
 const rows=[{id:'chapter',chapter_number:1,language,title:'سالم & Book',body:'<p>حكاية سالم</p>',revision:7,updated_at:'2026-10-31T12:00:00Z',updated_by:'Benji'}];
 const notes=[{chapter_id:'chapter',author:'Guest 2',created_at:'2026-10-30T12:00:00Z',body:'ملاحظة'}],resources=[{kind:'Story Brief',body:'النص',revision:2,updated_at:'2026-10-29T12:00:00Z'}];
 const before=JSON.stringify({rows,notes,resources});
 const html=await buildHTML(rows,notes,{story,language,title:'Book',cover:false,colors:true,resources},{esc,clean:x=>x,onProgress:()=>{}});
 const doc=new JSDOM(html).window.document,main=doc.querySelector('main');
 assert.equal(doc.documentElement.dir,'ltr');assert.equal(doc.querySelectorAll('.technical-details').length,1);assert(main.lastElementChild.matches('.technical-details'));assert(!main.lastElementChild.open);assert(main.lastElementChild.textContent.includes('r7'));assert(main.lastElementChild.textContent.includes('Guest 2'));assert(!doc.querySelector('article .meta'));assert.equal(doc.querySelector('article.export-paper').dir,language==='ar'?'rtl':'ltr');assert(doc.body.textContent.includes('حكاية سالم'));assert(doc.body.textContent.includes('ملاحظة'));assert.equal(JSON.stringify({rows,notes,resources}),before);
}
console.log('Legacy HTML exports: three routes, one bottom panel, unchanged source text/data, Arabic direction and source stamps pass.');w.close();
