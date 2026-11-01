import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createNavigation} from '../src/navigation.js';
const dom=new JSDOM('<main id="main"></main>',{url:'https://example.test/#book=11111111-1111-1111-1111-111111111111&view=dsl&dslview=garden'});
const {window}=dom;
for(const k of ['window','document','history','location'])globalThis[k]=window[k];
globalThis.scrollX=globalThis.scrollY=0;globalThis.innerWidth=390;
window.scrollTo=()=>{};document.fonts={ready:Promise.resolve()};globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);
let release;let renders=0;let allowed=true;let leaveCount=0;const errors=[];
const gate=new Promise(r=>release=r);
const nav=createNavigation({render:async()=>{renders++;if(renders===1)await gate;},allowLeave:()=>allowed,leave:()=>leaveCount++,onError:e=>errors.push(e)});
const starting=nav.start();
const base='#book=11111111-1111-1111-1111-111111111111';
const a=document.createElement('a');a.href=base+'&view=brief';document.body.append(a);a.click();
const exportTap=nav.navigate(base+'&view=export');
assert.equal(location.hash,base+'&view=dsl&dslview=garden');
release();await starting;await exportTap;
assert.equal(location.hash,base+'&view=export');assert.equal(renders,2);assert.equal(leaveCount,1);
assert.equal(document.querySelector('main').getAttribute('aria-busy'),'false');
// A queued route must still respect the unsaved content guard.
let release2;document.fonts.ready=new Promise(r=>release2=r);
const opening=nav.navigate(base+'&view=brief');
const blocked=nav.navigate(base+'&view=critique');allowed=false;release2();await opening;await blocked;
assert.equal(location.hash,base+'&view=brief');assert.equal(renders,3);assert.deepEqual(errors,[]);
// A view link is intercepted and routes through the same guard.
a.href=base+'&view=export';a.click();await new Promise(r=>setTimeout(r,10));
assert.equal(location.hash,base+'&view=brief');
console.log('Navigation queue: latest tap retained, view links managed, unsaved guard preserved.');dom.window.close();
