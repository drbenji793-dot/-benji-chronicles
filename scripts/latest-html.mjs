import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
const [source, domain, folder = 'public'] = process.argv.slice(2);
let html = readFileSync(source, 'utf8');
function bundle(url, mime) {
  const path = new URL(url, 'https://'+domain);
  if (path.hostname !== domain) return url;
  const resource = readFileSync(join(folder,path.pathname));
  return 'data:'+mime+';base64,'+resource.toString('base64');
}
html = html.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi, (tag, url) => tag.replace('src="'+url+'"','src="'+bundle(url,'text/javascript')+'"'));
html = html.replace(/<link\b[^>]*>/gi, tag => tag.includes('stylesheet') ? tag.replace(/href="([^"]+)"/,(attr,url)=>'href="'+bundle(url,'text/css')+'"') : tag);
html = html.replace(/<head\b[^>]*>/i, tag => tag+'<base href="https://'+domain+'/">');
writeFileSync('public/latest.html', html);
