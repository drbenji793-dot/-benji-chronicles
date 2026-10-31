import {JSDOM} from 'jsdom';import assert from 'node:assert/strict';
import {mountShelfOrder,mergeShelfOrder} from '../src/shelf-order.js';
const dom=new JSDOM('<section class="shelf" data-edition="ar"><div class="library-bookshelf"><a href="#collection&lang=ar">Lost Files</a><div class="managed-book"><a href="#book=11111111-1111-1111-1111-111111111111">Book One</a><button class="delete-book">Delete</button></div><div class="managed-book"><a href="#book=22222222-2222-2222-2222-222222222222">Book Two</a><button class="delete-book">Delete</button></div></div></section>',{url:'https://benji-chronicles.vercel.app/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location,requestAnimationFrame:dom.window.requestAnimationFrame.bind(dom.window),cancelAnimationFrame:dom.window.cancelAnimationFrame.bind(dom.window)});
window.scrollBy=()=>{};const a='collection:ar',b='book:11111111-1111-1111-1111-111111111111',c='book:22222222-2222-2222-2222-222222222222';
let record={scope:'ar:library',order_keys:[c,a,b],revision:1},writes=0,fail=false;
const api=async(path,options)=>{if(path.startsWith('rpc/')){writes++;if(fail)throw Error('offline');const p=JSON.parse(options.body);assert.equal(p.p_revision,record.revision);record={...record,order_keys:p.p_keys,revision:record.revision+1};}return options?structuredClone(record):[structuredClone(record)];};
const shelf=document.querySelector('.shelf');await mountShelfOrder(shelf,api);const grid=shelf.querySelector('.library-bookshelf'),keys=()=>[...grid.children].map(e=>e.dataset.shelfKey);const wait=ms=>new Promise(r=>setTimeout(r,ms));
assert.deepEqual(keys(),[c,a,b]);assert.equal(grid.querySelectorAll('.managed-book').length,3);assert.equal(grid.children[0].querySelector('.delete-book').textContent,'Delete');
shelf.querySelector('[data-arrange]').click();grid.children[0].querySelector('[data-later]').click();await wait(0);assert.deepEqual(record.order_keys,[a,c,b]);assert.equal(writes,1);shelf.querySelector('[data-undo]').click();await wait(0);assert.deepEqual(keys(),[c,a,b]);assert.equal(record.revision,3);
fail=true;grid.children[0].querySelector('[data-later]').click();await wait(0);assert.deepEqual(keys(),[c,a,b]);assert(shelf.querySelector('[role=status]').textContent.includes('not saved'));fail=false;
shelf.querySelector('[data-arrange]').click();
const event=(type,props,target=grid.children[0].querySelector('a'))=>{const e=new window.Event(type,{bubbles:true,cancelable:true});for(const [k,v] of Object.entries(props))Object.defineProperty(e,k,{value:v});target.dispatchEvent(e);return e;};
// Scrolling before the hold threshold cancels rearranging.
event('touchstart',{touches:[{clientX:20,clientY:200}]});event('touchmove',{touches:[{clientX:20,clientY:240}]});await wait(470);assert(!document.querySelector('.shelf-drag-ghost'));event('touchend',{});
// Hold, drag, release saves; following synthetic click must not open a book.
document.elementFromPoint=()=>grid.children[2];event('touchstart',{touches:[{clientX:20,clientY:200}]});await wait(470);assert(document.querySelector('.shelf-drag-ghost'));const move=event('touchmove',{touches:[{clientX:200,clientY:300}]});assert(move.defaultPrevented);event('touchend',{});await wait(0);assert.deepEqual(keys(),[a,b,c]);assert.deepEqual(record.order_keys,[a,b,c]);assert(!document.querySelector('.shelf-drag-ghost'));const click=event('click',{});assert(click.defaultPrevented);
// Cancel restores order without a write.
const count=writes;event('touchstart',{touches:[{clientX:20,clientY:200}]});await wait(470);event('touchmove',{touches:[{clientX:200,clientY:300}]});event('touchcancel',{});assert.deepEqual(keys(),[a,b,c]);assert.equal(writes,count);
assert.deepEqual(mergeShelfOrder([a,c],[a,b,c]),[a,c,b]);
await mountShelfOrder(shelf,api);assert.equal(shelf.querySelectorAll('.shelf-arrange').length,1);
dom.window.close();console.log('PASS saved ordering, whole cards, arrows, Undo, failed saves, scroll cancellation, hold/drag/drop, click suppression, cancel and restored-book keys.');
