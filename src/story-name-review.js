import {activeRecord} from './current-book-brief.js';

const normalize=value=>String(value??'').normalize('NFKC').trim();
const rxLiteral=value=>value.replace(/[.*+?^$()|[\]{}\\]/g,'\\$&');
export function textContainsName(text,name){
 const sample=normalize(text),term=normalize(name);
 if(!sample||term.length<2)return false;
 // Do not match a short alias inside a longer Arabic or English word.
 return new RegExp('(?:^|[^\\p{L}\\p{N}])'+rxLiteral(term)+'(?=$|[^\\p{L}\\p{N}])','iu').test(sample);
}

export function recordedNameCandidates(data,passage,{linkedCharacterIds=[]}={}){
 const linked=new Set(linkedCharacterIds);
 const candidates=[],seen=new Set();
 for(const character of (data.characters||[]).filter(activeRecord)){
  const currentName=normalize(character.name);
  if(!character.id||!currentName)continue;
  for(const candidate of character.aliases||[]){
   const alias=normalize(typeof candidate==='string'?candidate:candidate?.name);
   if(!alias||alias===currentName||!textContainsName(passage,alias))continue;
   const key=character.id+':'+alias.toLocaleLowerCase();
   if(seen.has(key))continue;
   seen.add(key);
   candidates.push({characterId:character.id,matchedName:alias,currentName,
    linked:linked.has(character.id),
    review:linked.has(character.id)?
     'Recorded alternate name in linked source, not automatically obsolete':
     'Recorded alternate name without a section source link, verify identity and intentional aliases'});
  }
 }
 return candidates;
}
