import {bookNavigation,selectedBookTool} from './book-navigation.js';
// Planning identities only. Manuscripts remain in chronicles_chapters.
export const COLLECTION_PLANNING = Object.freeze({
  1: 'f6c8da33-1ecb-52df-8f71-a9373f476087',
  2: '57386ee3-486f-5ad5-af68-425cff0bec48',
  3: '204d06c2-b98a-505e-a2a9-99a0e661c181',
  4: '6a485d0e-3cce-5d65-85a6-19ee5671a5e1',
  5: '9e119b14-43e5-5b22-a024-abecf8da63ed',
  6: '30f70042-c6af-551d-98be-7e4bc2260e54',
  7: '8d040b99-612f-5245-bee2-6954a2118e05',
  8: 'b3bc5d1c-9e33-5fdf-a397-b7dd2c785c73',
  9: '9aaad764-f6cb-5b31-a3e0-fdc0a1693220',
  10: '4796aa5e-3210-5514-ab6a-d0f3086c4a25',
  11: '95c3056c-1edf-515c-bd4b-86b9b8652058',
  12: '4931a64a-9b26-55fc-bb71-76a8cb5f0cc3'
});
export const ENGLISH_PLANNING = Object.freeze({"1": "a79ff0e2-5f3c-5afb-b977-7b3b73deb609", "2": "8fc2e728-09cf-542d-bc9a-29d39aa8cb6b", "3": "e4448cec-3a83-52ba-8aac-b39001b0cff5", "4": "d3763a10-d623-5950-9aef-102cd1f099c4", "5": "d5487cbc-6c23-59b9-ab45-8a3127171146", "6": "bb115c4e-9781-57ba-94d6-15612cde2425", "7": "695edb3a-1593-5e79-a97b-fbffcd8469c7", "8": "c6f1b6ae-32ba-5257-9a03-d44979630b53", "9": "c430ec7a-3626-52c5-b387-db801f5e7429", "10": "78d94f2a-c45e-510e-bf0b-5b3c21c7936a", "11": "a06eea5b-bf85-571d-b22d-b8c3c5238e3e", "12": "a58784a7-a119-55a1-a20a-f6a710f84623"});
export const planningId = (story, language='ar') => (language==='en'?ENGLISH_PLANNING:COLLECTION_PLANNING)[story];
export const planningLanguage = id => Object.values(ENGLISH_PLANNING).includes(id)?'en':'ar';
export const planningStory = id => Number(Object.keys(COLLECTION_PLANNING).find(n=>COLLECTION_PLANNING[n]===id)||Object.keys(ENGLISH_PLANNING).find(n=>ENGLISH_PLANNING[n]===id)) || null;
export const collectionRoute = (story, view, extra={}) => '#'+new URLSearchParams({story:String(story),lang:'ar',...(view==='chapters'?{}:{view}),...extra});
export function collectionNavigation(story,params){
 const language=params.get('lang')==='en'?'en':'ar',root='#story='+story+'&lang='+language;
 return '<div class="ink-tabs">'+bookNavigation(root,selectedBookTool(params))+'</div><div class="story-aux-nav"><a href="'+root+'&view=cover">Story cover</a></div>';
}
