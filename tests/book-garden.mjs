import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {gardenGraph,updateLife,bookGarden} from '../src/book-garden.js';
const data={title:'Test book',characters:[{id:'a',name:'Ada',role:'Keeper'},{id:'b',name:'Ben'},{id:'arch',name:'Archived',archived:true}],events:[{id:'e',title:'Meeting',characters:'Ada, Ben',status:'proposal',order:1},{id:'f',title:'Decision',characters:'Ada',status:'question',order:2}],links:[{id:'l',from:'e',to:'f',kind:'causes'},{from:'missing',to:'e'}],objects:[],summary:'Known story',unknown:{keep:true}};
const before=JSON.stringify(data),g=gardenGraph(data);
assert.equal(g.nodes.length,4);assert.equal(g.edges.length,4);assert.equal(JSON.stringify(data),before);
let renamed=updateLife(data,{...data.characters[0],name:'Amina'});assert.equal(gardenGraph(renamed).edges.length,4);assert.equal(renamed.characters[0].id,'a');assert.equal(renamed.characters.length,3);assert.deepEqual(renamed.unknown,{keep:true});assert.deepEqual(renamed.events,data.events);assert.equal(JSON.stringify(data),before);
const dom=new JSDOM('<main></main>');globalThis.document=dom.window.document;const root=document.querySelector('main');let saved=structuredClone(data),saves=0,opened=[];
let ui;const render=()=>{root.innerHTML=ui.html();ui.bind(root)};
ui=bookGarden({model:()=>saved,branch:()=>({id:'branch',revision:1,name:'Main'}),book:()=>({title:'Test book'}),branches:()=>[],render,save:async d=>{saves++;saved=d},modal:(title,body)=>{opened.push(title);const d=document.createElement('dialog');d.innerHTML=body;document.body.append(d);return d;},close:()=>{},editEvent:id=>opened.push(id),editLink:()=>{},editOverview:()=>{}});
render();assert(root.querySelector('[data-populate]'));assert.equal(saves,0);assert(!root.querySelector('[data-node-id]'));
root.querySelector('[data-populate]').click();await new Promise(r=>setTimeout(r,0));assert.equal(saves,1);assert(saved.garden.populated);assert.deepEqual(saved.characters,data.characters);assert.deepEqual(saved.events,data.events);assert.deepEqual(saved.links,data.links);assert.equal(root.querySelectorAll('[data-node-id]').length,4);assert(!root.querySelector('[data-populate]'));
root.querySelector('[data-node-id="c:a"]').click();assert.equal(opened.at(-1),'Ada');
root.querySelector('[data-tab="lives"]').click();assert.equal(root.querySelectorAll('[data-life]').length,2);const search=root.querySelector('[data-life-search]');search.value='Ada';search.dispatchEvent(new dom.window.Event('input'));assert.equal(root.querySelector('[data-life="b"]').style.display,'none');
root.querySelector('[data-tab="timeline"]').click();assert.equal(root.querySelectorAll('[data-event-id]').length,2);
root.querySelector('[data-tab="world"]').click();root.querySelector('[data-all]').click();assert(root.querySelector('.goe-plane').style.transform.includes('scale('));
// Save failure leaves the unopened state intact and offers a retry.
saved=structuredClone(data);ui=bookGarden({model:()=>saved,branch:()=>({revision:1}),book:()=>({title:'Another book'}),render,save:async()=>{throw Error('Revision conflict')}});render();root.querySelector('[data-populate]').click();await new Promise(r=>setTimeout(r,0));assert(root.textContent.includes('Revision conflict'));assert(!root.querySelector('[data-populate]').disabled);assert(!saved.garden);
dom.window.close();console.log('PASS: explicit graph, stable identities, no mutation before population, views, cards, search, failure retry');
