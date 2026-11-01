import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {gardenGraph,updateLife,bookGarden} from '../src/book-garden.js';
const data={title:'Test book',characters:[{id:'a',name:'Ada',role:'Keeper'},{id:'b',name:'Ben'},{id:'arch',name:'Archived',archived:true}],events:[{id:'e',title:'Meeting',characters:'Ada, Ben',status:'proposal',order:1},{id:'f',title:'Decision',characters:'Ada',status:'question',order:2}],links:[{id:'l',from:'e',to:'f',kind:'causes'},{from:'missing',to:'e'}],objects:[],summary:'Known story',unknown:{keep:true}};
const before=JSON.stringify(data),g=gardenGraph(data);
assert.equal(g.nodes.length,4);assert.equal(g.edges.length,4);assert.equal(JSON.stringify(data),before);
let renamed=updateLife(data,{...data.characters[0],name:'Amina'});assert.equal(gardenGraph(renamed).edges.length,4);assert.equal(renamed.characters[0].id,'a');assert.equal(renamed.characters.length,3);assert.deepEqual(renamed.unknown,{keep:true});assert.deepEqual(renamed.events,data.events);assert.equal(JSON.stringify(data),before);
console.log('PASS graph identity compatibility and preservation of source data');
