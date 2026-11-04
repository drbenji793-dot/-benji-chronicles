import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {clueNameReview,clueNameReviewHTML} from '../src/clue-name-review.js';
import {sourceToolsUI} from '../src/source-tools-ui.js';
for(const language of ['ar','en']){
 const alias=language==='ar'?'يوسف':'Joseph',name=language==='ar'?'سالم':'Salem';
 const event={id:'e',revision:7,type:'secret',title:'Clue',truth:alias+' knows.',belief:'<img src=x onerror=alert(1)>',characterIds:['hero','hero','missing','old']};
 const data={events:[event],characters:[{id:'hero',name,aliases:[alias],revision:3,status:'approved'},
  {id:'candidate',name:'Candidate identity',aliases:[alias],status:'candidate'},
  {id:'old',name:'Retired',recordStatus:'superseded',aliases:[alias]}],workshop:{questions:[]}};
 const before=structuredClone(data),audit=clueNameReview(data,event);
 assert.equal(audit.linked.length,3);assert.equal(audit.matches.length,2);
 assert.equal(audit.matches[0].linked,true);assert.equal(audit.matches[1].linked,false);
 assert.equal(audit.matches[0].field,'truth');assert.equal(audit.linked[0].revision,3);
 assert(audit.linked.filter(c=>!c.available).length===2);
 const doc=new JSDOM(clueNameReviewHTML(audit,{href:id=>'#character='+id})).window.document;
 assert.equal(doc.querySelector('details').open,false);
 assert.match(doc.body.textContent,/not an approved correction/);
 assert.match(doc.body.textContent,/Linked character missing or retired/);
 assert.equal(doc.querySelectorAll('img,script').length,0);
 const context={model:()=>data,branch:()=>({id:'b',revision:8}),bookId:'book',chapters:()=>[],writer:()=> 'Benji',
  route:()=> '#character',select:()=>'<select></select>',field:()=>'<input>'};
 const visible=new JSDOM(sourceToolsUI(context).cluesHTML()).window.document;
 assert(visible.querySelector('[data-clue-name-review]'));
 assert.match(visible.querySelector('[data-clue-name-review]').textContent,new RegExp(name));
 assert.equal(visible.querySelectorAll('script,img').length,0);
 assert.deepEqual(data,before);
 assert.equal(clueNameReview(data,{...event,truth:alias+'ine',characterIds:[]}).matches.length,0);
 assert.match(clueNameReviewHTML(clueNameReview({},{})),/No character IDs linked/);
}
console.log('PASS shared clue names: stable IDs, ambiguous aliases, candidate and retired identities, exact field evidence, collapsed rendered UI, safe HTML and unchanged source');
