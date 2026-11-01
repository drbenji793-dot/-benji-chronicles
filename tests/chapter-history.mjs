import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountChapterHistory} from '../src/chapter-history.js';
const dom=new JSDOM('<main></main>');globalThis.document=dom.window.document;
const root=document.querySelector('main'),calls=[],restored=[];
let current=true,failList=true,failBody=true,release;
const api=async path=>{calls.push(path);const p=new URL('https://example.test/'+path).searchParams;assert.equal(p.get('entry_id'),'eq.chapter');
 if(p.has('id')){assert.equal(p.get('limit'),'1');if(failBody){failBody=false;throw Error('Temporary read failure');}if(p.get('id')==='eq.v58')return new Promise(resolve=>release=()=>resolve([{id:'v58',title:'Old',body:'Old',revision:58}]));return [{id:'v59',entry_id:'chapter',title:'عنوان',body:'<p>Saved text</p>',revision:59}];}
 assert(!p.get('select').includes('body'));assert(!p.get('select').includes('writing_meta'));assert.equal(p.get('limit'),'30');if(failList){failList=false;throw Error('Temporary list failure');}if(p.has('revision')){assert.equal(p.get('revision'),'lt.31');return [];}
 return Array.from({length:30},(_,i)=>({id:'v'+(60-i),revision:60-i,title:'Title',saved_by:'Guest 2',saved_at:'2026-11-01T12:00:00Z'}));};
await mountChapterHistory({root,api,entryId:'chapter',currentRevision:60,esc:String,clean:String,language:'ar',isCurrent:()=>current,onRestore:async s=>restored.push(s)});
assert.equal(root.querySelector('[data-more]').textContent,'Retry');await root.querySelector('[data-more]').onclick();assert.equal(root.querySelectorAll('.version').length,30);assert.equal(root.querySelector('.version').querySelector('[data-restore]'),null);assert.equal(calls.filter(x=>x.includes('&id=')).length,0);
const rows=root.querySelectorAll('.version');await rows[1].querySelector('[data-read]').onclick();assert(root.querySelector('[data-history-status]').textContent.includes('Temporary read failure'));await root.querySelector('[data-history-status] button').onclick();assert(root.querySelector('[data-preview]').textContent.includes('Saved text'));assert.equal(root.querySelector('.preview').dir,'rtl');const count=calls.length;await rows[1].querySelector('[data-read]').onclick();assert.equal(calls.length,count);
await rows[1].querySelector('[data-restore]').onclick();assert.equal(restored.length,1);assert.equal(restored[0].revision,59);
await root.querySelector('[data-more]').onclick();assert.equal(root.querySelector('[data-more]').hidden,true);
const pending=rows[2].querySelector('[data-restore]').onclick();current=false;release();await pending;assert.equal(restored.length,1,'Closed or changed context must not restore a late result');
dom.window.close();console.log('PASS paged chapter history, scoped reads, retry, cached body, current revision guard and stale restore protection');
