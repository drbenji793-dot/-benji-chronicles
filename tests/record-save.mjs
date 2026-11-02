import assert from 'node:assert/strict';
import {saveBookControl,saveBookRelation} from '../src/record-save.js';
let row=null;let calls=0;
const api=async(path,options)=>{
 calls++;const body=JSON.parse(options.body),q=new URLSearchParams(path.split('?')[1]);
 if(options.method==='POST'){assert(!path.includes('on_conflict'));if(row)throw Error('duplicate key');row={...body,revision:1};}
 else {assert.equal(q.get('book_key'),'eq.book');if(q.get('revision')!=='eq.'+row.revision)return [];row={...row,...body,revision:row.revision+1};}
 return [structuredClone(row)];
};
const created=await saveBookControl(api,'book',null,{title:'ابن الجبل'},'Benji');
const renamed=await saveBookControl(api,'book',created,{title:'New name'},'Ahmed');
await assert.rejects(()=>saveBookControl(api,'book',created,{deleted_at:'2026-11-02'},'Benji'),/another device/);
assert.equal(row.title,'New name');assert.equal(row.deleted_at,undefined);
await assert.rejects(()=>saveBookControl(api,'book',null,{title:'Lost update'},'Benji'),/duplicate/);
const removed=await saveBookControl(api,'book',renamed,{deleted_at:'2026-11-02'},'Benji');
const restored=await saveBookControl(api,'book',removed,{deleted_at:null},'Benji');
await assert.rejects(()=>saveBookControl(api,'book',removed,{title:'Stale restore'},'Ahmed'),/another device/);
const beforeCalls=calls;await saveBookControl(api,'book',restored,{title:restored.title},'Benji');assert.equal(calls,beforeCalls);
await assert.rejects(()=>saveBookControl(api,'other',restored,{title:'Wrong book'},'Benji'),/context/);
await assert.rejects(()=>saveBookControl(api,'book',restored,{ink_book_id:'wrong'},'Benji'),/Unsupported/);
let relation={id:'b',revision:2,related_work:null,title:'حكاية'};
const relationAPI=async(path,options)=>{const q=new URLSearchParams(path.split('?')[1]);assert.equal(q.get('id'),'eq.b');if(q.get('revision')!=='eq.'+relation.revision)return [];relation={...relation,...JSON.parse(options.body),revision:relation.revision+1};return [structuredClone(relation)];};
const old=structuredClone(relation);await saveBookRelation(relationAPI,old,'other','Benji');
await assert.rejects(()=>saveBookRelation(relationAPI,old,'wrong','Ahmed'),/another device/);assert.equal(relation.title,'حكاية');assert.equal(relation.related_work,'other');
console.log('PASS book rename/trash/restore stale protection, create race, no-op, scope and related work protection');
