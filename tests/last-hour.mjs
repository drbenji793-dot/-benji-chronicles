import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {validateStory} from '../src/dsl-engine.js';
import {gardenGraph} from '../src/book-garden.js';
const id='ab7a1070-1966-4996-8026-000000000101',data=JSON.parse(await readFile('data/last-hour-proposal-v1.json','utf8'));
assert.equal(data.characters.length,12);assert.equal(data.events.length,11);assert(data.events.every(e=>e.status==='proposal'&&e.summary.length>30));assert.equal(validateStory(data).length,0);assert(gardenGraph(data).edges.length>20);
assert.equal(createHash('sha256').update(await readFile('public/sources/the-last-hour-bible.html')).digest('hex'),'67b7ea498a644703e6fdff03204ea071402a9693105396b7f326bf8d124274bd');
const bundle=await build({entryPoints:['src/app.js'],bundle:true,write:false,format:'iife',logLevel:'silent',define:{__CHRONICLES_EDITION__:'"en"','import.meta.url':'"https://example.com/app.js"'}});
const book={id,title:'THE LAST HOUR',language:'en',primary_writer:'Benji',collaboration:'solo',description:'Proposal'},branch={id:'branch-lh',book_id:id,name:'Story bible v1 · Proposal',data,revision:1,archived:false};
async function fixture(suffix){
 const dom=new JSDOM((await readFile('public/index.html','utf8')).replace(/<script[\s\S]*?<\/script>/g,''),{url:'https://benji-chronicles-english.vercel.app/#book='+id+suffix,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,doc=w.document,calls=[];w.matchMedia=()=>({matches:false});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;doc.fonts={ready:Promise.resolve()};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
 w.fetch=async(url,opts={})=>{const u=new URL(url),name=u.pathname.split('/').at(-1);calls.push({name,opts});let rows=[];if(name==='chronicles_books')rows=[book];if(name==='chronicles_dsl_branches')rows=[branch];if(name==='chronicles_dsl_projects')rows=[{book_id:id,revision:1,published:null}];return {ok:true,json:async()=>rows};};
 w.eval(bundle.outputFiles[0].text);await new Promise(r=>setTimeout(r,160));return {dom,w,doc,calls};
}
let f=await fixture('&view=brief');assert.equal(f.doc.querySelectorAll('.lh-section').length,11);assert.equal(f.doc.querySelectorAll('.book-navigation .ink-tabs>a').length,6);f.doc.querySelector('[data-lh-section="cast"]').click();assert(f.doc.querySelector('#lh-cast').open);assert(f.doc.querySelector('#lh-cast').textContent.includes('Nora Reyes'));assert(!f.calls.some(c=>c.opts.method));f.dom.window.close();
f=await fixture('&view=dsl&dslview=garden');assert(f.doc.querySelector('[data-populate]'));assert(f.doc.querySelector('.goe-stats').textContent.includes('12'));f.dom.window.close();
f=await fixture('&view=export');f.doc.querySelector('#preview-book-export').click();const html=f.doc.querySelector('#book-export-preview').srcdoc;assert(html.includes('No chapters drafted'));assert(html.includes('Nora Reyes'));assert(html.includes('Carol'));assert(!f.doc.querySelector('#export-message').textContent.includes('Choose at least'));f.doc.querySelector('#full-story-package').click();assert(f.doc.querySelector('#export-file-links a[download]'));assert(!f.calls.some(c=>c.opts.method));f.dom.window.close();
f=await fixture('&view=critique');assert(f.doc.querySelector('[data-reports]').textContent.includes('Chronology'));f.dom.window.close();
console.log('PASS: 11 source sections, six navigation buttons, 12 lives, 11 proposed events, Garden connections, stored review, zero-chapter full export, original source preserved and no incidental writes.');
