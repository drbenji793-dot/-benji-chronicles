import assert from 'node:assert/strict';
import {sourceInventory} from '../src/source-inventory.js';
const data={events:[
{id:'approved',type:'twist',status:'approved',title:'An approved clue',revision:3},
{id:'proposal',type:'secret',status:'proposed',title:'A candidate',revision:2},
{id:'other',type:'event',status:'written',title:'A scene'},
{id:'conflict',type:'clue',status:'conflict',title:'A disagreement'},
{id:'unknown',type:'other',title:'No approval'},
{id:'retired',type:'twist',status:'approved',recordStatus:'superseded',title:'Old twist'}
]};
const before=JSON.stringify(data),r=sourceInventory(data);
assert.deepEqual(r.counts,{total:6,active:5,retired:1,classifiedTwists:3,otherActive:2,unclassified:1,conflicts:1});
assert.equal(r.rows.find(x=>x.id==='retired').classification,'Superseded or retired');
assert.equal(r.rows.find(x=>x.id==='other').classification,'Saved prose referenced; planning approval unknown');
assert.match(r.rows.find(x=>x.id==='unknown').warnings.join(' '),/Outside the Twists filter/);
assert.equal(r.rows.find(x=>x.id==='proposal').classification,'Proposal');
assert.equal(r.rows.find(x=>x.id==='approved').revision,3);
assert.equal(JSON.stringify(data),before);
assert.deepEqual(sourceInventory().counts,{total:0,active:0,retired:0,classifiedTwists:0,otherActive:0,unclassified:0,conflicts:0});
console.log('PASS source inventory, exact Twists filter, approval vs proposals, conflicts, retired records, unknown state, unchanged source');
