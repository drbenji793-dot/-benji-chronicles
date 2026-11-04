import assert from 'node:assert/strict';
import {sourceClass,sourceExportAudit} from '../src/source-export-audit.js';
import {sourcePackage} from '../src/source-tools.js';
const data={events:[
 {id:'approved',type:'clue',title:'Confirmed',status:'approved',revision:3,truth:'Locked source'},
 {id:'proposal',type:'clue',title:'Candidate',status:'proposed',revision:2,truth:'An unapproved possibility'},
 {id:'conflict',type:'secret',title:'Competing idea',status:'conflict',revision:1},
 {id:'written',type:'event',title:'Saved chapter reference',status:'written'},
 {id:'superseded',type:'twist',title:'Old wrong fact',recordStatus:'superseded',status:'approved'},
 {id:'unclassified',type:'event',title:'Unknown status'}
],characters:[
 {id:'hero',name:'Known character',status:'approved'},
 {id:'oldname',name:'Retired character',recordStatus:'superseded'}
],workshop:{questions:[{id:'open',title:'Open question',status:'deferred'}]},decisions:[]};
const chapters=[{id:'ch1',revision:3,title:'Current chapter'}, {id:'retired',title:'Retired chapter',recordStatus:'superseded'}];
const before=structuredClone(data),beforeChapters=structuredClone(chapters);
const context={bookId:'book',branchId:'branch',baseRevision:7,writer:'Benji'};
const audit=sourceExportAudit(data,chapters);
assert.deepEqual(audit.retiredCounts,{events:1,characters:1,questions:0,decisions:0,chapters:1});
assert.equal(audit.groups['Approved planning metadata'].length,2);
assert.equal(audit.groups['Proposal only'].length,1);
assert.equal(audit.groups['Recorded conflict'].length,1);
assert.equal(audit.groups['Unresolved or pending'].length,1);
assert.equal(audit.groups['Written source, planning approval unknown'].length,1);
assert.equal(audit.groups.Unclassified.length,2);
assert.equal(audit.entries.some(x=>x.id==='superseded'||x.id==='oldname'||x.id==='retired'),false);
assert.equal(sourceClass({status:'written'}),'Written source, planning approval unknown');
const pkg=sourcePackage(data,context,{kind:'clue',chapters});
assert.deepEqual(pkg.targets.map(t=>t.id),['approved','proposal','conflict']);
assert.deepEqual(pkg.sources.chapters.map(c=>c.id),['ch1']);
assert.equal(pkg.sourceAudit.groups['Proposal only'][0].id,'proposal');
assert.equal(pkg.sourceAudit.entries.some(x=>x.id==='superseded'),false);
assert.match(pkg.audience,/spoilers/);
assert.deepEqual(data,before);
assert.deepEqual(chapters,beforeChapters);
console.log('PASS source package separates approval, proposals, conflicts, written records, unclassified and excludes retired chapters without changing planning');
