// Read-only visual timeline for the Arabic book "خارج الزمن".
// Dates and chapters are always read from Supabase, not recreated in browser storage.
const MONTHS={يناير:1,فبراير:2,مارس:3,أبريل:4,ابريل:4,مايو:5,يونيو:6,يوليو:7,أغسطس:8,اغسطس:8,سبتمبر:9,أكتوبر:10,اكتوبر:10,نوفمبر:11,ديسمبر:12};
const NOTES={
  1:{summary:'رأفت يرى من الأتوبيس امرأة ترتدي طاقية حمراء ويظن أنها شخص من ماضيه. يبحث عنها ولا يعثر عليها.',clues:'الطاقية الحمراء، المكان الذي عاد إليه، والاسم الذي نطق به.',link:'هوية المرأة ليست مؤكدة بعد.'},
  2:{summary:'نتعرف على حسام داخل استوديو برنامجه «الليل وآخره» من خلال مكالمات المستمعين وحياته خارج الميكروفون.',clues:'البرنامج، حسام، سامح، والمكالمات اليومية.',link:'البداية الإنسانية لمسار إذاعة ١٩٨٦.'},
  3:{summary:'أم محمود تتصل بالبرنامج بحثًا عن ابنها الذي سافر للعمل في أسوان، ولم يتصل بها منذ سبعة وعشرين يومًا.',clues:'محمود، أسوان، الفندق، ٢٧ يومًا، واحتمال نقل العمال إلى مكان آخر.',link:'تسجيل المكالمة يظهر لاحقًا في ملف منى في الفصل ٠٤.'},
  4:{summary:'منى تعمل على ملفات قديمة، وتصل إلى شريط من ملف اختفاء المذيع حسام، فتسمع صوت أم محمود.',clues:'ملف حسام، التسجيل القديم، وتواريخ المستندات.',link:'هذه نقطة وصل مؤكدة بين تسجيل ١٩٨٦ ومسار منى في ٢٠٢٦.'},
  9:{summary:'يتلقى حسام اتصالًا غريبًا من منى، التي تتعامل مع ملفه من زمن آخر. يحاولان التحقق مما يعرفه كل منهما.',clues:'شريط الشهادة، منى، سامح، وتاريخ اختفاء حسام.',link:'اليوم الدقيق في نوفمبر ١٩٨٦ لم يحدد بعد. لا نفترضه.'}
};
const toLatin=s=>String(s||'').replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function opening(body){
 const match=String(body||'').match(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/i);
 return (match?match[1]:String(body||'').split('\n')[0]).replace(/<[^>]*>/g,'').trim();
}
function dateInfo(row){
 const label=opening(row.body);
 const normalized=toLatin(label);
 const yearMatch=normalized.match(/(?:19|20)\d{2}/);
 const year=yearMatch?Number(yearMatch[0]):null;
 const monthName=Object.keys(MONTHS).find(name=>normalized.includes(name));
 const month=monthName?MONTHS[monthName]:null;
 const fullMatch=monthName?normalized.match(new RegExp('(?:^|[،, ]+)(\\d{1,2})\\s+'+monthName+'\\s+(?:19|20)\\d{2}')):null;
 const day=fullMatch?Number(fullMatch[1]):null;
 const precision=day?'exact':month?'month':year?'season':'missing';
 return {label,year,month,day,precision,sort:(year||9999)*10000+(month||12)*100+(day||32)};
}
function stylesheet(){
 return '<style>'+
 '.ct-root{max-width:1180px;margin:0 auto;padding:14px 0 42px;color:var(--ink);direction:rtl}'+
 '.ct-heading{display:flex;justify-content:space-between;gap:12px;align-items:end;flex-wrap:wrap;margin:14px 0 15px}'+
 '.ct-heading h1{font-size:clamp(28px,3vw,42px);margin:0;line-height:1.3}.ct-heading p{margin:6px 0 0;color:var(--muted);font-size:13px}'+
 '.ct-kicker{font-size:11px;font-weight:800;letter-spacing:1px;color:var(--warm)}'+
 '.ct-controls{display:flex;flex-wrap:wrap;gap:9px;justify-content:space-between;align-items:center;border:1px solid var(--line);border-radius:13px;padding:10px;background:var(--panel);margin:18px 0}'+
 '.ct-switch,.ct-years{display:flex;gap:5px;flex-wrap:wrap}.ct-controls button{background:transparent;border:1px solid transparent;border-radius:8px;padding:7px 11px;font-size:12px;color:var(--ink);cursor:pointer;min-height:32px}'+
 '.ct-controls button[aria-pressed=true]{background:var(--paper);border-color:var(--line);font-weight:800;box-shadow:0 1px 2px #0001}'+
 '.ct-notice{font-size:12px;color:var(--muted);background:var(--panel);border-inline-start:3px solid var(--warm);padding:11px 15px;border-radius:8px;margin:0 0 15px;line-height:1.8}'+
 '.ct-lanes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:start;direction:rtl}.ct-lane{min-width:0;padding:13px 12px 16px;border:1px solid var(--line);background:color-mix(in srgb,var(--panel) 62%,transparent);border-radius:13px}'+
 '.ct-lane-head{display:flex;align-items:center;justify-content:space-between;gap:5px;border-bottom:1px solid var(--line);padding-bottom:11px;margin-bottom:12px}.ct-lane-head strong{font-size:23px}.ct-lane-head span{font-size:11px;color:var(--muted)}'+
 '.ct-events{border-right:2px solid var(--line);margin-right:6px;padding-right:14px;display:grid;gap:12px}'+
 '.ct-event{position:relative;border:1px solid var(--line);border-radius:11px;background:var(--panel);padding:13px 12px;min-width:0;box-shadow:0 1px 2px #00000008}.ct-event::before{content:"";position:absolute;right:-21px;top:19px;width:9px;height:9px;border-radius:50%;border:2px solid var(--warm);background:var(--panel)}'+
 '.ct-date{font-size:11px;color:var(--warm);font-weight:750;margin-bottom:5px;line-height:1.65}.ct-event h3{font-size:17px;line-height:1.5;margin:2px 0 7px}.ct-event h3 a{color:var(--ink);text-decoration:none}.ct-event h3 a:hover{text-decoration:underline}.ct-event p{font-size:13px;line-height:1.85;margin:7px 0}'+
 '.ct-event details{margin-top:9px;padding-top:8px;border-top:1px solid var(--line);font-size:12px;line-height:1.85}.ct-event summary{cursor:pointer;color:var(--warm)}'+
 '.ct-pills{display:flex;flex-wrap:wrap;gap:5px}.ct-pill{display:inline-block;font-size:10px;padding:3px 7px;border-radius:30px;border:1px solid var(--line);color:var(--muted)}.ct-pill.partial{border-style:dashed}'+
 '.ct-go{display:inline-block;font-size:12px;color:var(--warm);font-weight:700;margin-top:8px;text-decoration:underline;text-underline-offset:3px}'+
 '.ct-read{display:grid;gap:12px;max-width:820px;margin:auto}.ct-read-row{display:grid;grid-template-columns:56px minmax(0,1fr);gap:12px;align-items:start}.ct-step{width:46px;height:46px;border:1px solid var(--line);background:var(--panel);border-radius:50%;display:grid;place-items:center;font-size:15px;font-weight:800;color:var(--warm)}.ct-read .ct-event::before{display:none}.ct-read .ct-event{padding:14px}'+
 '.ct-connections{margin-top:22px;border-top:1px solid var(--line);padding-top:18px}.ct-connections h2{font-size:19px;margin:0 0 12px}.ct-connection-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.ct-connection{padding:13px;border:1px solid var(--line);background:var(--panel);border-radius:11px}.ct-connection strong{font-size:13px}.ct-connection p{font-size:12px;line-height:1.8;margin:7px 0;color:var(--muted)}.ct-connection a{font-size:12px;color:var(--warm)}'+
 '.ct-bottom{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:15px;font-size:12px}.ct-bottom a{color:var(--warm)}.ct-empty{text-align:center;color:var(--muted);padding:26px}'+
 '@media(max-width:720px){.ct-root{padding:5px 0 30px}.ct-lanes,.ct-connection-grid{grid-template-columns:1fr}.ct-lane{padding:12px}.ct-heading h1{font-size:28px}.ct-controls{align-items:stretch}.ct-switch,.ct-years{width:100%}.ct-controls button{flex:1}.ct-event h3{font-size:17px}.ct-read-row{grid-template-columns:42px 1fr;gap:7px}.ct-step{height:36px;width:36px;font-size:12px}}'+
 '@media print{.ct-controls{display:none}.ct-lanes{grid-template-columns:repeat(3,minmax(0,1fr))}.ct-event details{display:block}}'+
 '</style>';
}
export function renderStoryTimeline(main,api,bookId){
 const originalHash=window.location.hash;
 let order='chronology', era='all', chapters=[];
 const chapterHref=no=>'#book='+bookId+'&chapter='+no;
 const extra=(c)=>NOTES[c.chapter_number]||{summary:'Saved chapter. Open it to read the event and confirm its place in the story.',clues:'Details come from the saved chapter text.',link:'Review the connection to earlier and later chapters.'};
 const years=()=>[...new Set(chapters.map(c=>c.info.year).filter(Boolean))].sort((a,b)=>a-b);
 function eventHTML(c){
  const detail=extra(c),info=c.info;
  const status=info.precision==='exact'?'Exact date':info.precision==='missing'?'Missing date':'Day not set';
  return '<article class="ct-event" aria-label="Chapter '+c.chapter_number+'">'+
   '<div class="ct-date">'+h(info.label||'Place and date not set')+'</div>'+
   '<h3><a href="'+chapterHref(c.chapter_number)+'">'+String(c.chapter_number).padStart(2,'0')+' · '+h(c.title)+'</a></h3>'+
   '<div class="ct-pills"><span class="ct-pill '+(info.precision!=='exact'?'partial':'')+'">'+status+'</span><span class="ct-pill">Revision '+c.revision+'</span></div>'+
   '<p>'+h(detail.summary)+'</p>'+
   '<details><summary lang="en" dir="ltr">Clues and connections</summary><p><strong>Known clues:</strong> '+h(detail.clues)+'</p><p><strong>Connection:</strong> '+h(detail.link)+'</p></details>'+
   '<a class="ct-go" href="'+chapterHref(c.chapter_number)+'">Open chapter</a></article>';
 }
 function connections(){
  return '<section class="ct-connections"><h2>Connections across time</h2><div class="ct-connection-grid">'+
    '<div class="ct-connection"><strong>١٩٨٦ ↔ ٢٠٢٦ · مكالمة أم محمود</strong><p>الفصل ٠٣ يقدم المكالمة، والفصل ٠٤ يكشف تسجيلها داخل ملف منى.</p><a href="'+chapterHref(3)+'">Chapter 03</a> · <a href="'+chapterHref(4)+'">Chapter 04</a></div>'+
    '<div class="ct-connection"><strong>١٩٨٦ ↔ ٢٠٢٦ · حسام ومنى</strong><p>الفصل ٠٩ يصل بالصوت إلى منى. تفاصيل يوم الاتصال ومكانه الدقيق ما زالت بحاجة للتثبيت.</p><a href="'+chapterHref(9)+'">Chapter 09</a></div>'+
    '<div class="ct-connection"><strong>٢٠٢٢ · رأفت والطاقية الحمراء</strong><p>ظهور المرأة نقطة غموض في مسار رأفت. لا نعتبر هويتها أو علاقتها بالمسارات الأخرى حقيقة مؤكدة الآن.</p><a href="'+chapterHref(1)+'">Chapter 01</a></div>'+
   '</div></section>';
 }
 function render(){
  if(!main.isConnected||window.location.hash!==originalHash)return;
  const list=chapters.filter(c=>era==='all'||String(c.info.year||'unknown')===era);
  const sorted=[...list].sort((a,b)=>order==='reading'?a.chapter_number-b.chapter_number:a.info.sort-b.info.sort||a.chapter_number-b.chapter_number);
  const incomplete=chapters.filter(c=>c.info.precision!=='exact');
  const missing=chapters.length?Array.from({length:Math.max(...chapters.map(c=>c.chapter_number))},(_,i)=>i+1).filter(n=>!chapters.some(c=>c.chapter_number===n)):[];
  let body='';
  if(order==='reading'){
   body='<div class="ct-read">'+sorted.map(c=>'<div class="ct-read-row"><div class="ct-step">'+String(c.chapter_number).padStart(2,'0')+'</div>'+eventHTML(c)+'</div>').join('')+'</div>';
  }else{
   const lanes=(era==='all'?years():[Number(era)]).filter(Boolean);
   body='<div class="ct-lanes">'+lanes.map(year=>{
    const items=sorted.filter(c=>c.info.year===year);
    return '<section class="ct-lane"><div class="ct-lane-head"><strong>'+year+'</strong><span>'+items.length+' chapter(s)</span></div><div class="ct-events">'+items.map(eventHTML).join('')+'</div></section>';
   }).join('')+'</div>';
  }
  if(!list.length)body='<p class="ct-empty">No saved chapters for this selection.</p>';
  main.innerHTML=stylesheet()+'<section class="ct-root" dir="rtl">'+
   '<header class="ct-heading"><div><span class="ct-kicker">خارج الزمن · STORYLINE</span><h1>Story Timeline</h1><p>The same chapters in two views. Select a chapter to open it.</p></div><span class="ct-pill">'+chapters.length+' saved chapters</span></header>'+
   '<div class="ct-controls"><div class="ct-switch" role="group" aria-label="Sort order">'+
     '<button type="button" data-ct-order="chronology" aria-pressed="'+(order==='chronology')+'">Chronological Order</button>'+
     '<button type="button" data-ct-order="reading" aria-pressed="'+(order==='reading')+'">Reading Order</button></div>'+
     '<div class="ct-years" role="group" aria-label="Filter by year">'+
     ['all',...years()].map(y=>'<button type="button" data-ct-era="'+y+'" aria-pressed="'+(era===String(y))+'">'+(y==='all'?'All Years':y)+'</button>').join('')+'</div></div>'+
   '<p class="ct-notice" lang="en" dir="ltr">Each card uses the date in the saved chapter opening. '+incomplete.length+' chapters have no exact day. Their position within the month or season may be approximate. '+(missing.length?'Missing chapters between existing numbers: '+missing.join('، ')+'. ':'')+'This view does not change story text.</p>'+
   body+connections()+
   '<div class="ct-bottom" lang="en" dir="ltr"><a href="'+chapterHref(1)+'">Start Reading</a><a href="#book='+bookId+'&view=storyline-guide">Guide 101</a><a href="#book='+bookId+'&rules=1">Book Rules</a><span>Source: saved Chronicles chapters</span></div></section>';
  main.querySelectorAll('[data-ct-order]').forEach(b=>b.addEventListener('click',()=>{order=b.dataset.ctOrder;render()}));
  main.querySelectorAll('[data-ct-era]').forEach(b=>b.addEventListener('click',()=>{era=b.dataset.ctEra;render()}));
 }
 main.innerHTML=stylesheet()+'<section class="ct-root" dir="rtl"><p class="ct-empty">Loading saved chapter dates…</p></section>';
 api('chronicles_book_entries?book_id=eq.'+encodeURIComponent(bookId)+'&kind=eq.chapter&select=chapter_number,title,body,revision,updated_at&order=chapter_number.asc')
  .then(rows=>{chapters=rows.filter(c=>Number.isInteger(c.chapter_number)).map(c=>({...c,info:dateInfo(c)}));render();})
  .catch(err=>{if(main.isConnected&&window.location.hash===originalHash)main.innerHTML=stylesheet()+'<section class="ct-root" dir="rtl"><p class="ct-empty">Could not load chapters from the database. No data was changed. '+h(err.message)+'</p></section>';});
}
