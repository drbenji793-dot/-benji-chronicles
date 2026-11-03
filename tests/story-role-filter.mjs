import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {essentialCharacterRecord,storyClaritySnapshot,storyClarityHTML} from '../src/story-clarity.js';
const source={summary:'Saved planning',
 characters:[
  {id:'hero',name:'Hero',tier:'primary',role:'Blacksmith',revision:2},
  {id:'opposition',name:'Opponent',tier:'major',role:'Officer',revision:1},
  {id:'ally',name:'Ally',role:'Supporting ally',tier:'supporting'},
  {id:'visitor',name:'Visitor',role:'Occasional visitor',tier:'minor'},
  {id:'unclassified',name:'Name without status'},
  {id:'retired',name:'Retired old name',tier:'main',recordStatus:'superseded'}
 ],workshop:{questions:[]}};
const original=structuredClone(source);
const result=storyClaritySnapshot(source);
assert.deepEqual(result.characters.map(c=>c.id),['hero','opposition']);
assert.equal(result.otherCharacterCount,3);
assert.equal(essentialCharacterRecord({name:'Blank',role:'Merchant'}),false);
assert.equal(essentialCharacterRecord({name:'Named',role:'Protagonist'}),true);
assert.equal(essentialCharacterRecord({name:'One',essential:true}),true);
assert.equal(essentialCharacterRecord({name:'Minor',tier:'minor',role:'protagonist'}),false);
const doc=new JSDOM(storyClarityHTML(result,{characterHref:id=>'#character='+id})).window.document;
const roles=doc.querySelector('[data-story-roles]').textContent;
assert.match(roles,/Hero/);
assert.match(roles,/Opponent/);
assert.doesNotMatch(roles,/Occasional visitor/);
assert.doesNotMatch(roles,/Retired old name/);
assert.match(roles,/3 additional character cards remain in Characters/);
assert.deepEqual(source,original);
console.log('PASS explicit central roles, secondary character separation, live links, retired exclusion, unchanged biographies');
