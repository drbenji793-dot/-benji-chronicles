export const OUTSIDE_TIME_BOOK='ff9fed20-1254-45b6-82f4-9f7b9fe7c3ba';
const root='#book='+OUTSIDE_TIME_BOOK;
export function outsideTimeNavigation(params,nav){
 const view=params.has('chapter')?'chapters':params.has('rules')?'rules':params.get('view')||'cover';
 const tabs=[['chapters','Chapters'],['storyline','Storyline'],['characters','Characters'],['references','References']];
 nav.hidden=false;nav.dir='ltr';
 nav.innerHTML='<div class="ink-tabs">'+tabs.map(([id,label])=>`<a href="${id==='chapters'?root+'&chapter=1':root+'&view='+id}" ${view===id?'class="selected" aria-current="page"':''}>${label}</a>`).join('')+'<a href="#collection&lang=ar">Library</a></div>'+`<div class="story-aux-nav"><a href="${root}">Story cover</a><a href="${root}&rules=1">Book Rules</a></div>`;
 const footer=document.querySelector('.footer-rules a[data-book-rules],.footer-rules a[href*="writing-rules"]');if(footer){footer.hidden=false;footer.href=root+'&rules=1';}
}
export function renderOutsideTime(params,nav,main){
 outsideTimeNavigation(params,nav);
 const view=params.get('view')||'cover';
 if(view==='cover'){
  main.innerHTML=`<section class="shelf story-entrance" dir="rtl"><a class="story-cover-art outside-time-cover cover-open" href="${root}&chapter=1" aria-label="قراءة رواية خارج الزمن"><div class="cover-lettering"><h2>خارج الزمن</h2><small>رواية قيد الكتابة</small></div><span class="cover-credit">Benji &amp; Almostasherq</span></a><p class="collection-caption">Arabic Original · مسودة قيد الكتابة</p><div class="story-reading"><a class="primary" href="${root}&chapter=1">Read Story</a><a href="${root}&view=storyline">Storyline</a></div></section>`;return;
 }
 if(view==='references'){
  main.innerHTML=`<section class="reference-page" dir="rtl"><h1>خارج الزمن · المراجع</h1><div class="reference-nav"><a href="/downloads/Outside_Time_101.html" download>تحميل دليل 101 كاملًا</a><a href="/images/outside-time-cover.webp" download>تحميل الغلاف</a></div><figure class="outside-time-art"><img src="/images/outside-time-cover.webp" alt="أتوبيس قديم وامرأة بطاقية حمراء ورجل ينتظرها"><figcaption>الغلاف الفني المقترح لخارج الزمن</figcaption></figure></section>`;return;
 }
 const section={storyline:'story',chapters:'chapters',characters:'characters',rules:'rules'}[view]||'story';
 main.innerHTML=`<section class="outside-time-workspace" dir="rtl"><h1>خارج الزمن</h1>${view==='chapters'?'<p class="collection-caption">خطة فصول مقترحة، وليست فصولًا مكتوبة.</p>':''}<iframe class="outside-time-guide" title="خارج الزمن 101 · دليل القصة" src="/outside-time-101.html?embed=1#${section}"></iframe></section>`;
 const frame=main.querySelector('iframe');frame.addEventListener('load',()=>{const doc=frame.contentDocument;if(!doc)return;const resize=()=>{if(!frame.isConnected){observer.disconnect();return;}frame.style.height=Math.ceil(doc.body.getBoundingClientRect().height+32)+'px';};const observer=new ResizeObserver(resize);observer.observe(doc.body);resize();});
}
