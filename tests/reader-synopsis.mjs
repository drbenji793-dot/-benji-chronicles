import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readerSynopsis,readerSynopsisHTML,readerSynopsisUI} from '../src/reader-synopsis.js';
let data={title:'Book',summary:'PRIVATE PLANNING',events:[{summary:'PRISON DIMENSIONS'}],readerSynopsis:{ar:{title:'ابن الجبل',short:'حكاية سالم',medium:'حكاية أطول',detailed:'حكاية مفصلة'},en:{title:'Book',short:'A story',medium:'A longer story',detailed:'A detailed story'}}};
const original=structuredClone(data);
for(const language of ['ar','en'])for(const length of ['short','medium','detailed']){
 const selected=readerSynopsis(data,language,length),html=readerSynopsisHTML(selected),doc=new JSDOM(html).window.document;
 assert.equal(doc.querySelector('p').textContent,data.readerSynopsis[language][length]);
 assert.equal(doc.documentElement.dir,language==='ar'?'rtl':'ltr');
 assert.doesNotMatch(html,/PRIVATE PLANNING|PRISON DIMENSIONS|Sources|revision|<details/);
}
assert.equal(readerSynopsis({summary:'Do not export me'}).text,'');
assert(!new JSDOM(readerSynopsisHTML({title:'<script>bad</script>',text:'<img onerror=bad>',language:'en'})).window.document.querySelector('script,img'));
let exported,build,revision=7;
const dom=new JSDOM('<main></main>'),root=dom.window.document.querySelector('main');
const c={model:()=>data,branch:()=>({revision}),language:'ar',select:(name,label,choices,current)=>'<select name="'+name+'">'+Object.entries(choices).map(([k,v])=>'<option value="'+k+'" '+(k===current?'selected':'')+'>'+v+'</option>').join('')+'</select>',field:(name,label,value)=>'<input name="'+name+'" value="'+value+'">',area:(name,label,value)=>'<textarea name="'+name+'">'+value+'</textarea>',download:(...args)=>exported=args,modal:(title,html)=>{const m=dom.window.document.createElement('div');m.innerHTML=html;return m;},submit:(form,fn)=>build=fn,render:()=>{root.innerHTML=ui.html();ui.bind(root);}};
const ui=readerSynopsisUI(c);c.render();root.querySelector('[data-reader-length]').value='medium';root.querySelector('[data-reader-length]').dispatchEvent(new dom.window.Event('change'));
root.querySelector('[data-reader-export]').click();await new Promise(r=>setTimeout(r,0));assert.match(exported[0],/حكاية أطول/);assert.match(exported[1],/ar_medium/);
root.querySelector('[data-reader-edit]').click();const form=new Map([['title','عنوان'],['text','نص جديد']]);const next=build(form);assert.equal(next.readerSynopsis.ar.medium,'نص جديد');assert.deepEqual(next.events,data.events);assert.equal(next.summary,data.summary);assert.deepEqual(data,original);revision++;assert.throws(()=>build(form),/changed/);
console.log('PASS reader synopsis language and length selection, clean export, escaping, editing isolation and revision guard');
