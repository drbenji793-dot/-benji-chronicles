const root='#reference=outside-time&lang=ar';
export function renderOutsideTime(params,nav,main){
 const view=params.get('view')||'cover';
 const tabs=[['chapters','Chapters'],['storyline','Storyline'],['characters','Characters'],['references','References']];
 nav.hidden=false;nav.dir='ltr';
 nav.innerHTML='<div class="ink-tabs">'+tabs.map(([id,label])=>`<a href="${root}&view=${id}" ${view===id?'class="selected" aria-current="page"':''}>${label}</a>`).join('')+'<a href="#collection&lang=ar">Library</a></div>'+`<div class="story-aux-nav"><a href="${root}">Story cover</a><a href="${root}&view=rules">Book Rules</a></div>`;
 const footer=document.querySelector('.footer-rules a[data-book-rules],.footer-rules a[href*="writing-rules"]');if(footer){footer.hidden=false;footer.href=root+'&view=rules';}
 if(view==='cover'){
  main.innerHTML=`<section class="shelf story-entrance" dir="rtl"><div class="story-cover-art outside-time-cover" role="img" aria-label="غلاف خارج الزمن"><div class="cover-lettering"><h2>خارج الزمن</h2><small>دليل القصة 101</small></div><span class="cover-credit">Benji &amp; Almostasherq</span></div><p class="collection-caption">مرجع الكتابة · الإصدار ١ · مخطط مقترح</p><div class="story-reading"><a class="primary" href="${root}&view=storyline">افتح خط القصة</a><a href="${root}&view=chapters">خطة الفصول</a></div></section>`;return;
 }
 if(view==='references'){
  main.innerHTML=`<section class="reference-page" dir="rtl"><h1>خارج الزمن · المراجع</h1><div class="reference-nav"><a href="/downloads/Outside_Time_101.html" download>تحميل دليل 101 كاملًا</a><a href="/images/outside-time-cover.webp" download>تحميل الغلاف</a></div><figure class="outside-time-art"><img src="/images/outside-time-cover.webp" alt="أتوبيس قديم وامرأة بطاقية حمراء ورجل ينتظرها"><figcaption>الغلاف الفني المقترح لخارج الزمن</figcaption></figure></section>`;return;
 }
 const section={storyline:'story',chapters:'chapters',characters:'characters',rules:'rules'}[view]||'story';
 main.innerHTML=`<section class="outside-time-workspace" dir="rtl"><h1>خارج الزمن</h1>${view==='chapters'?'<p class="collection-caption">خطة فصول مقترحة، وليست فصولًا مكتوبة.</p>':''}<iframe class="outside-time-guide" title="خارج الزمن 101 · دليل القصة" src="/outside-time-101.html?embed=1#${section}"></iframe></section>`;
 const frame=main.querySelector('iframe');frame.addEventListener('load',()=>{const doc=frame.contentDocument;if(!doc)return;const resize=()=>{if(!frame.isConnected){observer.disconnect();return;}frame.style.height=Math.ceil(doc.body.getBoundingClientRect().height+32)+'px';};const observer=new ResizeObserver(resize);observer.observe(doc.body);resize();});
}
