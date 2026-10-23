import { companionHTML } from './companion.js';
const files=['time-fracture-cover.webp','compass-artwork.webp','drawing-compass-reference.webp','gold-border-reference.webp','original-pen-reference.webp'];
const titles=['الغلاف المعتمد','هوية Benji Chronicles','مرجع البرجل الهندسي','مرجع الإطار الذهبي','أيقونة القلم الأولى'];
const objectDetails=[['الساعة المتصدعة','27% 36%'],['ساعة الجيب','79% 88%'],['الملف والأوراق','17% 80%'],['الختم الأحمر','19% 78%'],['قلم الكتابة','13% 93%'],['الفوانيس','2% 50%'],['الشارع والعمارة','87% 40%'],['الشرخ والزجاج','53% 52%']];
export const exportCSS=`
@font-face{font-family:BookArabic;src:url('/fonts/book-arabic.woff2') format('woff2');font-weight:400;font-style:normal;font-display:block}
.export-paper{font-family:BookArabic,Georgia,serif;color:#171717;line-height:1.85;font-size:21px;direction:rtl;text-align:right;background:white}
.export-paper[lang=en]{direction:ltr;text-align:left;font-family:Georgia,serif}.export-paper p{margin:0 0 13px}.export-paper h1{font-size:34px;line-height:1.5;margin:12px 0 24px}.export-paper h2{font-size:27px}.export-paper .meta{font:12px/1.8 Arial,sans-serif;color:#555;margin-bottom:25px}.export-paper a{color:inherit}.export-paper blockquote{border-right:2px solid #aaa;margin-right:10px;padding-right:18px}.export-paper:not(.colored) span{color:inherit!important}.export-paper.colored .author-ahmed{color:#ad2936}.export-paper.colored .author-benji{color:#246b43}
.pdf-stage{position:fixed;left:-10000px;top:0;width:794px;z-index:-1}.pdf-page{width:794px;height:1123px;padding:62px 68px 64px;position:relative;box-sizing:border-box;background:#fff;color:#171717}.pdf-content{height:945px;overflow:hidden}.pdf-footer{position:absolute;bottom:25px;left:68px;right:68px;border-top:1px solid #bbb;padding-top:7px;font:11px/1.5 Arial,sans-serif;display:flex;justify-content:space-between;direction:ltr}.pdf-cover{width:650px;height:975px;object-fit:contain;display:block;margin:auto}.pdf-page.cover-page{padding:48px 50px}.pdf-content ul,.pdf-content ol{padding-right:28px}
`;
async function dataURL(url){const r=await fetch(url);if(!r.ok)throw Error('تعذر تحميل أحد ملفات الكتاب. حاول مرة أخرى.');const blob=await r.blob();return await new Promise((resolve,reject)=>{const f=new FileReader();f.onload=()=>resolve(f.result);f.onerror=reject;f.readAsDataURL(blob)});}
export function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();return url;}
export async function buildHTML(rows,notes,options,{esc,clean,onProgress}){
 onProgress('تضمين الصور والخط العربي…');
 const assets=await Promise.all(files.map(f=>dataURL('/artwork/'+f)));
 const font=await dataURL('/fonts/book-arabic.woff2');
 const css=exportCSS.replace("/fonts/book-arabic.woff2",font)+`
body{margin:0;background:#f4ecdc;color:#243e33}main{max-width:850px;margin:auto;padding:30px 22px}nav{display:flex;gap:9px;flex-wrap:wrap;margin:20px 0}nav a,button{padding:9px 12px;border:1px solid #baa27b;border-radius:8px;background:#fff9ee;color:#243e33;text-decoration:none;font:14px Arial}section{margin:35px 0;padding:24px;background:#fffdf8;border:1px solid #d2c3a8;border-radius:12px}.export-paper{padding:28px;background:white;border:1px solid #ddd;margin:26px 0}img{max-width:100%;height:auto}.book-cover{display:block;max-height:700px;margin:auto}.cast-grid,.reference-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:15px}.guide-card,figure{margin:12px 0;padding:18px;border:1px solid #cbbd9f;border-radius:10px}.guide-card h2{font-size:22px}.reference-grid img{height:240px;width:100%;object-fit:contain}.object-crop{height:200px;background-size:330%;background-repeat:no-repeat}.reference-note,small{font-size:13px;color:#5b655c}details{margin:20px 0}summary{cursor:pointer}li{margin:6px 0}.export-paper:not(.colored) [class]{color:inherit}html{scroll-behavior:smooth}@media print{nav,button,.offline-tools{display:none}body{background:white}main{max-width:none;padding:0}section{border:0}article.chapter{break-before:page;border:0;padding:0}.book-cover{height:90vh}.export-paper{font-size:16px}a{text-decoration:none}@page{margin:20mm}}`;
 const stamp=new Date().toISOString();
 const metadata={title:'شرخ زمني',exported_at:stamp,chapters:rows,notes};
 // JSON is inert and escaped to prevent chapter text closing the script element.
 const json=JSON.stringify(metadata).replace(/</g,'\\u003c');
 return `<!doctype html><html lang="${options.language||'ar'}" dir="${options.language==='en'?'ltr':'rtl'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>شرخ زمني · النسخة الكاملة</title><style>${css}</style></head><body><main><header><h1>شرخ زمني</h1><p>Benji Chronicles · Benji &amp; Almostasherq</p><p>نسخة مستقلة للقراءة دون إنترنت. أحدث النصوص المحفوظة وقت التصدير: ${esc(stamp)} UTC</p><nav><a href="#contents">Chapters</a><a href="#storyline">Storyline</a><a href="#characters">Characters</a><a href="#references">Artwork and references</a><a href="#notes">Notes</a></nav><div class="offline-tools"><button id="toggle-colors" aria-pressed="${options.colors}">Show or hide author colors</button><button id="offline-print">Print</button><p>أحمد بالأحمر، بنجي بالأخضر. الألوان تخص التعديلات المسجلة.</p></div></header>${options.cover?`<img class="book-cover" src="${assets[0]}" alt="غلاف شرخ زمني">`:''}<section id="contents"><h2>الفصول</h2><ol>${rows.map(c=>`<li><a href="#chapter-${c.chapter_number}">${esc(c.title)}</a></li>`).join('')}</ol></section>${rows.map(c=>`<article lang="${c.language||'ar'}" dir="${c.language==='en'?'ltr':'rtl'}" id="chapter-${c.chapter_number}" class="chapter export-paper${options.colors?' colored':''}"><div class="meta">الفصل ${c.chapter_number} · نسخة ${c.revision} · ${esc(c.updated_by)} · ${esc(c.updated_at)}</div><h1>${esc(c.title)}</h1>${clean(c.body)}</article>`).join('')}<section id="storyline">${companionHTML('storyline',rows,esc,true)}</section><section id="characters">${companionHTML('characters',rows,esc,true)}</section><section id="references"><h2>الصور والمراجع البصرية</h2><p>مراجع فنية للتصميم. الغلاف وهوية البرجل عملان مولّدان، وبقية الصور مراجع شاركها صاحب المشروع. ليست هذه صور شخصيات الرواية.</p><div class="reference-grid">${files.map((f,i)=>`<figure><a href="${assets[i]}" download="${f}"><img src="${assets[i]}" alt="${titles[i]}"></a><figcaption>${titles[i]}</figcaption></figure>`).join('')}${objectDetails.map(([title,pos])=>`<figure><div class="object-crop" role="img" aria-label="${title}" style="background-image:url('${assets[0]}');background-position:${pos}"></div><figcaption>${title} · تفصيل من الغلاف</figcaption></figure>`).join('')}</div></section><section id="notes"><h2>ملاحظات الفصول</h2>${notes.length?notes.map(n=>{const c=rows.find(c=>c.id===n.chapter_id);return `<article><h3><a href="#chapter-${c?.chapter_number}">${esc(c?.title||'فصل')}</a></h3><small>${esc(n.author)} · ${esc(n.created_at)}</small><p style="white-space:pre-wrap">${esc(n.body)}</p></article>`}).join(''):'<p>لا توجد ملاحظات محفوظة.</p>'}</section><p>هذه نسخة القراءة الحالية والملاحظات، ولا تشمل أرشيف النسخ السابقة. النص والبيانات الحالية مضمنة داخل الملف.</p></main><script type="application/json" id="book-data">${json}</script><script>document.getElementById('toggle-colors').onclick=function(){var on=this.getAttribute('aria-pressed')!=='true';this.setAttribute('aria-pressed',String(on));document.querySelectorAll('.export-paper').forEach(function(el){el.classList.toggle('colored',on)})};document.getElementById('offline-print').onclick=function(){window.print()};</script></body></html>`;
}
function textNodes(node){const walk=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);const result=[];let n;while(n=walk.nextNode())result.push(n);return result;}
function sliceNode(node,start,end){const copy=node.cloneNode(false);if(node.nodeType===Node.TEXT_NODE)return document.createTextNode(node.textContent.slice(start,end));const ns=textNodes(node);if(!ns.length)return copy;function point(pos){for(const n of ns){if(pos<=n.length)return [n,pos];pos-=n.length}return [ns.at(-1),ns.at(-1).length]};const range=document.createRange();range.setStart(...point(start));range.setEnd(...point(end));copy.append(range.cloneContents());return copy;}
export async function buildPDF(rows,options,{esc,clean,onProgress,signal}){
 const [{jsPDF},{default:html2canvas}]=await Promise.all([import('jspdf'),import('html2canvas')]);
 const style=document.createElement('style');style.textContent=exportCSS;document.head.append(style);
 const stage=document.createElement('div');stage.className='pdf-stage';document.body.append(stage);
 const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});pdf.setProperties({title:'شرخ زمني',author:'Benji & Almostasherq',subject:options.language==='en'?'Saved English edition':'Saved Arabic edition'});
 let pageCount=0,page,content;
 const check=()=>{if(signal?.aborted)throw new DOMException('تم إلغاء التصدير','AbortError')};
 const newPage=()=>{stage.innerHTML=`<div lang="${options.language||'ar'}" class="pdf-page export-paper${options.colors?' colored':''}"><div class="pdf-content"></div><div class="pdf-footer"><span>Benji Chronicles</span><span></span><span>شرخ زمني</span></div></div>`;page=stage.firstElementChild;content=page.firstElementChild;};
 const flush=async()=>{check();const canvas=await html2canvas(page,{scale:1.5,backgroundColor:'#ffffff',logging:false,windowWidth:1000,windowHeight:1200,scrollX:0,scrollY:0});if(pageCount)pdf.addPage();pdf.addImage(canvas.toDataURL('image/jpeg',.91),'JPEG',0,0,210,297,undefined,'FAST');canvas.width=canvas.height=1;pageCount++;onProgress(`تجهيز PDF · ${pageCount} صفحة`);await new Promise(r=>setTimeout(r,0));};
 try{
 await document.fonts.load('21px BookArabic');await document.fonts.ready;check();
 if(options.cover){newPage();page.classList.add('cover-page');page.innerHTML='<img class="pdf-cover" alt="" src="/artwork/time-fracture-cover.webp">';await page.firstElementChild.decode();await flush();}
 for(const c of rows){
 check();newPage();content.innerHTML=`<div class="meta">شرخ زمني · الفصل ${c.chapter_number}<br>نسخة ${c.revision} · ${esc(c.updated_by)} · ${esc(c.updated_at)}</div><h1>${esc(c.title)}</h1>`;
 const source=document.createElement('div');source.innerHTML=clean(c.body);
 const queue=[...source.childNodes].filter(n=>n.nodeType===1||n.textContent.trim());
 for(let node of queue){
 if(node.nodeType===3){const p=document.createElement('p');p.textContent=node.textContent;node=p;}
 let remaining=node.cloneNode(true);
 while(remaining){check();content.append(remaining);if(content.scrollHeight<=content.clientHeight+1){remaining=null;break}remaining.remove();
 const text=remaining.textContent;const boundaries=[...text.matchAll(/\s+/gu)].map(m=>m.index+m[0].length).filter(n=>n<text.length);
 // Split a long paragraph only at word boundaries while keeping nested author spans.
 let low=0,high=boundaries.length-1,best=0;
 while(low<=high){const mid=(low+high)>>1,trial=sliceNode(remaining,0,boundaries[mid]);content.append(trial);const fits=content.scrollHeight<=content.clientHeight+1;trial.remove();if(fits){best=boundaries[mid];low=mid+1}else high=mid-1;}
 if(best){content.append(sliceNode(remaining,0,best));remaining=sliceNode(remaining,best,text.length);await flush();newPage();}
 else if(content.childNodes.length){await flush();newPage();}
 else { // A single unusually long token: character-safe fallback prevents an infinite loop.
 const chars=Array.from(text);let end=Math.max(1,Math.floor(chars.length/2));let fragment;
 while(end){fragment=sliceNode(remaining,0,chars.slice(0,end).join('').length);content.append(fragment);if(content.scrollHeight<=content.clientHeight+1)break;fragment.remove();end=Math.floor(end/2);}
 if(!end)throw Error('يوجد عنصر أكبر من مساحة الصفحة. استخدم HTML لهذا الفصل.');const consumed=chars.slice(0,end).join('').length;remaining=consumed<text.length?sliceNode(remaining,consumed,text.length):null;await flush();newPage();
 }
 }
 }
 if(content.childNodes.length)await flush();
 }
 // Add total count in the footer without rerendering page images.
 for(let i=1;i<=pageCount;i++){pdf.setPage(i);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(100);pdf.text(`${i} / ${pageCount}`,105,290,{align:'center'});}
 check();return pdf.output('blob');
 }finally{stage.remove();style.remove();}
}

