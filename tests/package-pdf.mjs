import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createChroniclesLibrary} from '../src/new-books.js';
import {packagePDFRows} from '../src/package-pdf.js';
for(const language of ['ar','en']){
 const w=new JSDOM('<nav class="book-navigation"></nav><main id="main"></main>',{url:'https://example.test/#book=11111111-1111-4111-8111-111111111111&view=export'}).window;
 for(const key of ['document','location','FormData','DOMParser'])globalThis[key]=w[key];
 let urls=0;globalThis.URL.createObjectURL=()=>{urls++;return 'blob:test'};globalThis.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
 const book={id:'11111111-1111-4111-8111-111111111111',title:'حكاية سالم',language};
 const rows=[1,2].map(n=>({id:'c'+n,kind:'chapter',chapter_number:n,title:'فصل '+n,body:'<p>النص الأصلي '+n+'</p>',revision:n}));
 const branches=[{id:'b',revision:4,data:{storyDraft:{treatment:'مسودة مقترحة'},characters:[]}}];
 let resolvePDF,calls=0,captured;
 const lib=createChroniclesLibrary({api:async(path,opts)=>{assert(!opts,'no data writes');if(path.startsWith('chronicles_books'))return [book];if(path.startsWith('chronicles_book_entries'))return rows;if(path.startsWith('chronicles_dsl_branches'))return branches;return []},esc:s=>String(s??''),clean:s=>s,storage:{get:()=>null},say:()=>{},getWriter:()=> 'Benji',navigate:async()=>{},date:()=>'',workflow:{mount:()=>{}},trackAuthors:()=>{},buildBookPDF:async(data,options)=>{calls++;captured={data,options};return new Promise(r=>resolvePDF=r)}});
 await lib.load();await lib.render(new URLSearchParams(location.hash.slice(1)));
 const form=document.querySelector('form'),button=document.querySelector('#download-book-pdf');
 for(const name of ['synopsis','storyline','characters','rules'])form.elements[name].checked=false;
 form.elements.scope.value='selected';form.querySelector('[value=c2]').checked=false;
 const job=button.onclick();await button.onclick();assert.equal(calls,1);assert.equal(captured.data.length,1);assert.equal(captured.data[0].title,'1 · فصل 1');assert.equal(captured.data[0].body,'<p>النص الأصلي 1</p>');assert.equal(captured.options.language,language);
 resolvePDF(new Blob(['pdf']));await job;assert.equal(urls,1);assert.equal(document.querySelector('#export-file-links a').download,'حكاية سالم.pdf');
 const stale=button.onclick();form.elements.scope.value='all';resolvePDF(new Blob(['pdf']));await stale;assert.equal(urls,1);assert.match(document.querySelector('#export-message').textContent,/selection changed/);
 document.querySelector('#preview-book-export').onclick();const html=document.querySelector('iframe').srcdoc;assert.match(html,/Print \/ Save PDF/);assert.match(html,/@media print/);assert.equal(packagePDFRows(html).length,2);
 form.elements.chapters.checked=false;await button.onclick();assert.equal(calls,2);assert.match(document.querySelector('#export-message').textContent,/Choose at least one section/);
 w.close();
}
console.log('PASS package PDF: exact selection, Arabic/English, no writes, duplicate prevention, changed-selection refusal and offline PDF control');
