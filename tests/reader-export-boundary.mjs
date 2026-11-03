import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {buildHTML} from '../src/export-book.js';
import {sourcePackage} from '../src/source-tools.js';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://test.invalid/'});
globalThis.FileReader=dom.window.FileReader;
globalThis.fetch=async url=>({
 ok:typeof url==='string'&&url.startsWith('/'),
 blob:async()=>new dom.window.Blob(['fixture'],{type:'application/octet-stream'})
});
const hidden='PRIVATE_TWIST_IDENTITY_CANNOT_BE_PUBLISHED';
const data={
 events:[{id:'private',title:'Clue',type:'secret',truth:hidden,status:'proposal'}],
 workshop:{questions:[]},summary:'Public summary remains unchanged'
};
const rows=[{id:'c1',chapter_number:1,title:'Saved reader chapter',body:'<p>Saved chapter contains only public prose.</p>',language:'en',revision:2}];
const notes=[];
const options={story:1,language:'en',title:'Original reader story',cover:false,colors:false,resources:[],planning:data};
const before=structuredClone(data),originalRows=structuredClone(rows);
const clean=s=>s,esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const html=await buildHTML(rows,notes,options,{esc,clean,onProgress(){}});
const reader=new JSDOM(html).window.document;
assert.match(reader.body.textContent,/Saved reader chapter/);
assert(!html.includes(hidden));
assert(!html.includes('PRIVATE_TWIST'));
assert(!html.includes('storyEssence'));
assert.equal(reader.querySelectorAll('script').length,0);
assert.deepEqual(data,before);
assert.deepEqual(rows,originalRows);
const ctx={bookId:'book',branchId:'branch',baseRevision:2,writer:'Benji'};
const review=sourcePackage(data,ctx,{kind:'clue',chapters:[]});
assert(JSON.stringify(review).includes(hidden));
assert.equal(review.audience,'Writer review; contains spoilers');
console.log('PASS reader chapter export excludes private planning facts while separate author review retains sourced spoilers');
