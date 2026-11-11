import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
const release=JSON.parse(await readFile('release.json','utf8'));
const language=process.env.SITE_LANGUAGE||'ar';
if(!['ar','en'].includes(language))throw Error('SITE_LANGUAGE must be ar or en');
await build({entryPoints:['src/app.js'],bundle:true,minify:true,format:'esm',outfile:'public/app.js',define:{__CHRONICLES_EDITION__:JSON.stringify(language)}});
const path='public/index.html';
let html=await readFile(path,'utf8');
html=html.replace(/<html lang="(?:ar|en)"/,'<html lang="'+language+'"');
html=html.replace(/<title>.*?<\/title>/,'<title>Chronicles '+(language==='en'?'ENG':'AR')+'</title>');
html=html.replace(/<strong>Benji Chronicles(?: English)?<\/strong>/,'<strong>Benji Chronicles'+(language==='en'?' English':'')+'</strong>');
html=html.replace(/(name="apple-mobile-web-app-title" content=")[^"]*/, '$1Chronicles '+(language==='en'?'ENG':'AR'));
html=html.replace(/Benji Chronicles · [^<]*Reader v[^<]*/, 'Benji Chronicles · Reader v'+release.version+' · '+release.releasedAt+' · UTC').replace(/app\.js\?v=\d+/, 'app.js?v='+release.version);
html=html.replace(/(last-hour|chapter-notes)\.css(?:\?v=\d+)?/g,(_,name)=>name+'.css?v='+release.version);
const iconBase=language==='ar'?'/icons/chronicles-ar-gear-v3':'/icons/chronicles-en';
html=html.replace(/(<link rel="icon"[^>]*href=")[^"]+/, '$1'+iconBase+'-32.png');
html=html.replace(/(<link rel="apple-touch-icon" href=")[^"]+/, '$1'+iconBase+'-180.png');
html=html.replace(/(<img src=")(?:\/compass-icon-192.png|\/icons\/chronicles-(?:ar(?:-gear-v3)?|en)-192.png)/, '$1'+iconBase+'-192.png');
await writeFile(path,html);
const manifest=JSON.parse(await readFile('public/manifest.webmanifest','utf8'));
manifest.name='Chronicles '+(language==='en'?'ENG':'AR');
manifest.short_name=manifest.name;
manifest.background_color='#d9c4ab';
manifest.icons=[192,512].map(size=>({src:iconBase+'-'+size+'.png',sizes:size+'x'+size,type:'image/png',purpose:'any'}));
await writeFile('public/manifest.webmanifest',JSON.stringify(manifest,null,2)+'\n');
console.log('Built Chronicles '+language);

await writeFile('public/update-reference.json',JSON.stringify({
 format:'chronicles-update-reference',version:1,edition:language,
 release,mechanismVersion:1,commit:process.env.VERCEL_GIT_COMMIT_SHA||null,
 deployment:process.env.VERCEL_URL||null,databaseMigrationVersion:null,
 requiredDatabaseMigration:'20261102093913',
 scope:'Chronicles planning, critique, book metadata and note resolution; see docs/save-path-audit.md',
 sources:{planning:'chronicles_dsl_branches: book_id + id + revision',publication:'chronicles_dsl_projects',history:'chronicles_dsl_history',chapters:'chronicles_book_entries or chronicles_chapters by book and language'},
 verification:'Release checks required by vercel.json; live deployment state is recorded by Vercel',
 pending:['Actual iPhone acceptance','Remaining RPC and recovery audit; raw SQL requires explicit source checks','Unrecorded editorial consequences']
},null,2)+'\n');
