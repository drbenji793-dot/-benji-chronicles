export const stories=[
 'قطار الليل','الدور الرابع','ثلاث شقق في وسط البلد','ترجمة ناقصة','الساعة اللي وقفت','شقة بالإيجار القديم','البصمة الغلط','نهر بلا شهود','الراجل اللي بلّغ عن نفسه','فندق الجيزة ١٩٧٣','رسالة من بكرة','شرخ زمني'
];
export const storyKey=n=>Number(n)===12?'main':'story:'+Number(n);
export const storyNumber=c=>Number(c?.story_number)||12;
export const storyTitle=(n,language='ar')=>Number(n)===12&&language==='en'?'A Fracture in Time':stories[Number(n)-1]||stories[11];
export function cover(n,esc,small=false){const i=Number(n)-1;return `<div class="story-cover-art" style="--cover-x:${(i%3)*50}%;--cover-y:${Math.floor(i/3)*100/3}%" role="img" aria-label="${esc(storyTitle(n))} cover illustration"><div class="cover-lettering"><h2 lang="ar" dir="rtl">${esc(storyTitle(n))}</h2>${Number(n)===12?'<small>A Fracture in Time</small>':''}</div><span class="cover-credit">Benji &amp; Almostasherq</span></div>`}
export function collectionCover(){return `<a class="collection-cover" href="#collection" aria-label="Open Lost Files collection"><div class="collection-cover-title"><h2 lang="ar" dir="rtl">ملفات مفقودة</h2><p>LOST FILES</p></div><div class="collection-cover-credit">Benji &amp; Almostasherq<small>12 stories</small></div></a><a class="open-collection primary" href="#collection">Open Collection</a>`}
export function storyGallery(esc,chapters){return `<div class="collection-grid">${stories.map((title,i)=>{const n=i+1,count=chapters.filter(c=>storyNumber(c)===n&&c.language==='ar').length;return `<a class="story-card collection-story" data-story="${n}" href="#story=${n}">${cover(n,esc,true)}<div class="card-body"><h2 dir="rtl">${esc(title)}</h2><small>${count} Arabic chapters</small><span>Open story</span></div></a>`}).join('')}</div>`}
