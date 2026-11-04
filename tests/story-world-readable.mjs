import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {bookGarden} from '../src/book-garden.js';
for(const language of ['ar','en']){
 const dom=new JSDOM('<main></main><aside></aside>');const root=dom.window.document.querySelector('main'),aside=dom.window.document.querySelector('aside');
 const data={characters:[],decisions:[{id:'decision',title:'Current choice',description:'Full current instruction',recordStatus:'current',pending:'Review chapter',source:'source.html'},{id:'report',title:language==='ar'?'تقرير مراجعة Claude':'Claude review report',description:'Original report preserved',recordStatus:'current'}]};const original=structuredClone(data);let saves=0,ui;
 const render=()=>{root.innerHTML=ui.html();ui.bind(root);};
 const ctx={model:()=>data,branch:()=>({id:'b',revision:3}),book:()=>({title:'Book',language}),route:(view,p)=>'#view='+view+'&dslview='+p.dslview,render,modal:(title,html)=>{aside.innerHTML='<h2>'+title+'</h2>'+html;return aside;},area:(k,label,value)=>'<label>'+label+'<textarea name="'+k+'">'+value+'</textarea></label>',select:()=>'<select name="recordStatus"></select>',submit:()=>saves++,field:()=>'',editEvent:()=>{}};
 ui=bookGarden(ctx);render();assert(root.querySelector('a[href="#view=dsl&dslview=twists"]'));assert(root.querySelector('a[href="#view=dsl&dslview=decisions"]'));assert.equal(root.querySelector('.goe-more').open,false);
 root.querySelector('[data-tab="decisions"]').click();const reports=root.querySelector('[data-review-reports]');assert.equal(reports.open,false);assert(reports.textContent.includes('Original report preserved'));assert(!reports.querySelector('[data-record="decision"]'));
 root.querySelector('[data-record="decision"]').click();assert(!aside.querySelector('form'));assert(aside.textContent.includes('Full current instruction'));assert(aside.textContent.includes('Review chapter'));assert.equal(aside.querySelector('details').open,false);assert.equal(saves,0);
 aside.querySelector('[data-edit-record]').click();assert.equal(aside.querySelector('form').dir,'ltr');assert.equal(aside.querySelector('[name=description]').value,'Full current instruction');assert.equal(saves,1);assert.deepEqual(data,original);
 root.querySelector('[data-record="report"]').click();assert(aside.textContent.includes('Original report preserved'));assert(!aside.querySelector('form'));assert.deepEqual(data,original);dom.window.close();
}
console.log('PASS readable decision details, explicit edit, preserved reports and approval states, scoped navigation and collapsed tools in Arabic/English');
