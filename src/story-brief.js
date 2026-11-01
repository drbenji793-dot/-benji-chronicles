// Read existing planning formats without creating or approving story content.
export function savedStoryBrief(data={}) {
 const story=data.storyDraft||data.currentStory||{};
 if(data.storyBrief?.text?.trim())return data.storyBrief.text;
 const sections=[];
 const synopsis=story.treatment||story.synopsis||data.summary;
 if(synopsis?.trim())sections.push(synopsis.trim());
 const outlines=(story.chapters||[]).map((c,i)=>[(i+1)+' · '+(c.title||''),c.summary,...(c.points||[])].filter(Boolean).join('\n'));
 if(outlines.length)sections.push('Chapter outline · Planning\n'+outlines.join('\n\n'));
 const events=[...(data.events||[])].filter(e=>e.status!=='deleted'&&e.status!=='excluded').sort((a,b)=>(a.order??0)-(b.order??0));
 for(const [label,items] of [
  ['Written chapter summaries',events.filter(e=>e.status==='written')],
  ['Proposed events and open decisions · Not approved',events.filter(e=>e.status!=='written')]
 ]){
  const text=items.map(e=>[e.title,e.dateLabel,e.summary,e.outcome].filter(Boolean).join('\n')).join('\n\n');
  if(text)sections.push(label+'\n'+text);
 }
 return sections.length?'Compiled from saved planning. Proposed events and endings remain proposals.\n\n'+sections.join('\n\n'):'No synopsis or event summaries have been saved for this book yet.';
}
