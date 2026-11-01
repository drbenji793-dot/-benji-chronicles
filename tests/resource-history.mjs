import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountResourceHistory} from '../src/resource-history.js';
const dom=new JSDOM('<main></main>');globalThis.document=dom.window.document;
const root=document.querySelector('main'),calls=[];
let failList=true,failBody=true;
const api=async path=>{
 calls.push(path);const q=new URL('https://test/'+path).searchParams;
 assert.equal(q.get('story_number'),'eq.12');assert.equal(q.get('language'),'eq.ar');assert.equal(q.get('kind'),'eq.storyboard');
 if(q.get('select')==='body'){
  if(failBody){failBody=false;throw Error('Temporary body failure');}
  assert.equal(q.get('revision'),'eq.60');return [{body:'نص محفوظ <script>not executable</script>'}];
 }
 assert.equal(q.get('select'),'revision,saved_by,saved_at');assert.equal(q.get('limit'),'30');
 if(failList){failList=false;throw Error('Temporary list failure');}
 const cursor=q.get('revision');if(cursor){assert.equal(cursor,'lt.31');return [];}
 return Array.from({length:30},(_,i)=>({revision:60-i,saved_by:'Guest 2',saved_at:'2026-11-01T20:00:00Z'}));
};
await mountResourceHistory({root,api,story:12,language:'ar',kind:'storyboard',esc:String,date:String});
assert.equal(root.querySelector('[data-more]').textContent,'Retry');
await root.querySelector('[data-more]').onclick();assert.equal(root.querySelectorAll('details').length,30);
assert(calls.every(p=>!p.includes('select=body')));
const item=root.querySelector('details');item.open=true;
const tick=()=>new Promise(r=>setTimeout(r,15));await tick();
assert(item.textContent.includes('Temporary body failure'));
await item.querySelector('button').onclick();assert.equal(item.querySelector('pre').textContent,'نص محفوظ <script>not executable</script>');assert.equal(item.querySelector('script'),null);
const count=calls.length;item.open=false;await tick();item.open=true;await tick();assert.equal(calls.length,count);
await root.querySelector('[data-more]').onclick();assert.equal(root.querySelectorAll('details').length,30);assert(root.querySelector('[data-more]').hidden);
// A late result from an old dialog must not replace the new dialog content.
let finish;const pending=mountResourceHistory({root,api:()=>new Promise(r=>finish=r),story:12,language:'ar',kind:'storyboard',esc:String,date:String});root.textContent='New dialog';finish([]);await pending;assert.equal(root.textContent,'New dialog');
dom.window.close();console.log('PASS metadata-only paging, scoped lazy bodies, retry, cache, escaped text and stale dialog protection');
