export const stories=[
 'قطار الليل','الدور الرابع','ثلاث شقق في وسط البلد','ترجمة ناقصة','الساعة اللي وقفت','شقة بالإيجار القديم','البصمة الغلط','نهر بلا شهود','الراجل اللي بلّغ عن نفسه','فندق الجيزة ١٩٧٣','رسالة من بكرة','شرخ زمني'
];
export const storyKey=n=>Number(n)===12?'main':'story:'+Number(n);
export const storyNumber=c=>Number(c?.story_number)||12;
export let adaptations=[];
export const setAdaptations=rows=>{adaptations=rows};
export const adaptationTitle=n=>adaptations.find(a=>a.story_number===Number(n))?.title||(Number(n)===12?'A Fracture in Time':'Adaptation '+String(n).padStart(2,'0'));
export const storyTitle=(n,language='ar')=>language==='en'?adaptationTitle(n):stories[Number(n)-1]||stories[11];
export function cover(n,esc,small=false,language='ar'){const i=Number(n)-1;return `<div class="story-cover-art ${language==='en'?'american-cover':''}" style="--cover-x:${(i%3)*50}%;--cover-y:${Math.floor(i/3)*100/3}%" role="img" aria-label="${esc(storyTitle(n,language))} cover illustration"><div class="cover-lettering"><h2 lang="${language}" dir="${language==='en'?'ltr':'rtl'}">${esc(storyTitle(n,language))}</h2>${language==='en'?'<small>AMERICAN ADAPTATION</small>':''}</div><span class="cover-credit">Benji &amp; Almostasherq</span></div>`}
export function collectionCover(){return `<a class="collection-cover" href="#collection&lang=ar" aria-label="Open Lost Files collection"><div class="collection-cover-title"><h2 lang="ar" dir="rtl">ملفات مفقودة</h2><p>LOST FILES</p></div><div class="collection-cover-credit">Benji &amp; Almostasherq<small>12 stories</small></div></a><div class="edition-gates"><a class="primary" href="#collection&lang=ar">Arabic Originals</a><a href="#collection&lang=en">American Adaptations</a></div>`}
export function storyGallery(esc,chapters,language='ar'){return `<div class="collection-grid">${stories.map((title,i)=>{const n=i+1,count=chapters.filter(c=>storyNumber(c)===n&&c.language===language).length;return `<a class="story-card collection-story" data-story="${n}" href="#story=${n}&lang=${language}">${cover(n,esc,true,language)}<div class="card-body"><h2 dir="rtl">${esc(storyTitle(n,language))}</h2><small>${count?count+' chapters':'Adaptation not started'}</small><span>${language==='en'&&!count?'Plan adaptation':'Open story'}</span></div></a>`}).join('')}</div>`}
