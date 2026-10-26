/* DSL Master T001. Reusable architecture only. Never imports another novel's content. */
export const TEMPLATE_ID='DSL-T001';
export const TEMPLATE_REVISION=2;
export const MASTER_MODULES=[
 {id:'foundation',name:'Story foundation',fields:['premise','genre','theme','audience','centralConflict','stakes','narrativePromise']},
 {id:'characters',name:'Characters and arcs',fields:['name','role','desire','fear','secret','arc','relationships','knowledge']},
 {id:'world',name:'World and rules',fields:['locations','historicalNotes','technology','hardRules','exceptions']},
 {id:'events',name:'Events and timelines',fields:['date','precision','location','participants','goal','obstacle','outcome','consequences']},
 {id:'connections',name:'Cause and effect',fields:['from','to','relation','condition','evidence']},
 {id:'twists',name:'Twists and revelations',fields:['truth','belief','setup','reveal','payoff']},
 {id:'objects',name:'Objects and clues',fields:['identity','holder','location','history','originalAndCopies']},
 {id:'paths',name:'What If branches',fields:['hypothesis','alternatives','effects','approval']},
 {id:'reading',name:'Reading order',fields:['readerOrder','revelationOrder','viewpoint']},
 {id:'knowledge',name:'Knowledge tracking',fields:['readerKnows','characterKnows','characterBelieves']},
 {id:'quality',name:'Story health',fields:['contradictions','missingCauses','openQuestions','unpaidClues']},
 {id:'collaboration',name:'Collaboration',fields:['writer','comments','revisions','approval']},
 {id:'blender',name:'Story Blender',fields:['scenario','selectedEvents','sourceSnapshot','drafts','compare','adoptSummary','AI brief']},
 {id:'publication',name:'Published Storyline',fields:['preview','approval','linkedChapters','history']}
];
export function makeMasterStory(title='Untitled Novel',options={}){
 const allowedLanguage=['ar','en'].includes(options.language)?options.language:'ar';
 const allowedComplexity=['simple','standard','layered'].includes(options.complexity)?options.complexity:'standard';
 return {schema:2,template:{id:TEMPLATE_ID,revision:TEMPLATE_REVISION},title:String(title||'Untitled Novel'),summary:'',rules:'',hypothesis:'',
  foundation:{language:allowedLanguage,genre:String(options.genre||''),theme:'',audience:'',centralConflict:'',stakes:'',narrativePromise:'',startingApproach:options.approach||'premise',complexity:allowedComplexity,collaboration:options.collaboration||'shared'},
  world:{locations:'',historicalNotes:'',technology:'',hardRules:'',exceptions:''},characters:[],events:[],links:[],objects:[],decisions:[],blender:{drafts:[],adoptedId:null}};
}
export function getCharacters(data){return Array.isArray(data?.characters)?data.characters.filter(c=>!c.archived):[];}
export function appearsIn(event,name){if(!event?.characters||!name)return false;
 return String(event.characters).split(/[,،;؛\n]/u).some(part=>part.trim().toLocaleLowerCase()===String(name).trim().toLocaleLowerCase());}
export function storyHealth(data,chapters=[]){
 const events=(data?.events||[]).filter(e=>!e.archived), links=(data?.links||[]), characters=getCharacters(data), byId=new Map(events.map(e=>[e.id,e])),checks=[];
 const add=(kind,text,id=null)=>checks.push({kind,text,id});
 if(!String(data?.summary||'').trim())add('story','Story summary is missing.');
 if(!String(data?.foundation?.centralConflict||'').trim()&&data?.template?.id===TEMPLATE_ID)add('story','Central conflict is not defined.');
 if(!events.length)add('story','No events have been planned.');
 if(events.length>1&&!links.length)add('structure','No causal connections have been recorded between events.');
 for(const e of events){
  if(!String(e.outcome||'').trim())add('structure','Event has no recorded outcome: '+e.title,e.id);
  if(e.type==='twist'&&(!String(e.setup||'').trim()||!String(e.truth||'').trim()))add('twist','A twist needs its underlying truth and earlier setup: '+e.title,e.id);
  if(e.status==='question')add('decision','Open story question: '+e.title,e.id);
  if(e.sourceId){const chapter=chapters.find(c=>c.id===e.sourceId);if(chapter&&chapter.revision!==e.sourceRevision)add('chapter','Chapter revision differs from linked event: '+e.title,e.id);}
  if(e.status==='accepted'&&!links.some(l=>l.from===e.id||l.to===e.id)&&events.length>1)add('structure','Approved event has no recorded connections: '+e.title,e.id);
 }
 for(const c of characters){if(!String(c.desire||'').trim())add('character','Character needs a clear desire: '+c.name);if(!String(c.arc||'').trim())add('character','Character arc has not been described: '+c.name);}
 for(const l of links)if(!byId.has(l.from)||!byId.has(l.to))add('structure','Connection references an unavailable event.');
 const counts={events:events.length,characters:characters.length,twists:events.filter(e=>e.type==='twist').length,openQuestions:events.filter(e=>e.status==='question').length,linkedChapters:new Set(events.map(e=>e.sourceChapter).filter(Boolean)).size};
 return {counts,checks};
}
export function knowledgeMap(data){
 const chars=getCharacters(data);
 return (data?.events||[]).filter(e=>!e.archived).slice().sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)).map(e=>({
 id:e.id,title:e.title,reader:e.readerKnows||'',hidden:e.truth||'',characters:chars.filter(c=>appearsIn(e,c.name)).map(c=>({name:c.name,knowledge:e.knowledge||'',secret:c.secret||''}))}));
}
