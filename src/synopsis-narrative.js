// Select authored narrative fields only. Never turn event lists or decisions into prose.
export function savedNarrative(data={}){
 const story=data.storyDraft||data.currentStory||{};
 for(const text of [data.storyBrief?.text,story.treatment,story.synopsis])if(typeof text==='string'&&text.trim())return text;
 return '';
}
