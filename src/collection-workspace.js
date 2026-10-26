// Planning identities only. Manuscripts remain in chronicles_chapters.
export const COLLECTION_PLANNING = Object.freeze({
  1: 'f6c8da33-1ecb-52df-8f71-a9373f476087',
  2: '57386ee3-486f-5ad5-af68-425cff0bec48',
  3: '204d06c2-b98a-505e-a2a9-99a0e661c181',
  4: '6a485d0e-3cce-5d65-85a6-19ee5671a5e1',
  5: '9e119b14-43e5-5b22-a024-abecf8da63ed',
  6: '30f70042-c6af-551d-98be-7e4bc2260e54'
});
export const planningId = (story, language='ar') => language==='ar' ? COLLECTION_PLANNING[story] : undefined;
export const planningStory = id => Number(Object.keys(COLLECTION_PLANNING).find(n=>COLLECTION_PLANNING[n]===id)) || null;
export const collectionRoute = (story, view, extra={}) => '#'+new URLSearchParams({story:String(story),lang:'ar',...(view==='chapters'?{chapter:'1'}:view==='cover'?{}:{view}),...extra});
export function collectionNavigation(story,params){
 const view=params.has('chapter')?'chapters':params.get('view')||'cover';
 return '<div class="ink-tabs">'+[...(Number(story)===1?[['contents','Contents']]:[]),['chapters','Chapters'],['storyline','Storyline'],['dsl','DSL'],['characters','Characters'],['references','References']].map(([id,label])=>'<a href="'+collectionRoute(story,id)+'" '+(view===id?'class="selected" aria-current="page"':'')+'>'+label+'</a>').join('')+'<a href="#collection&lang=ar">Library</a></div><div class="story-aux-nav"><a href="'+collectionRoute(story,'cover')+'">Story cover</a><a href="'+collectionRoute(story,'rules')+'">Book Rules</a></div>';
}
