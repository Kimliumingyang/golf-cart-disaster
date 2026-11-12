import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
const html=await readFile('dist/index.html','utf8');
const files=await readdir('dist/assets');
const js=await readFile('dist/assets/'+files.find(f=>/^index-.*\.js$/.test(f)),'utf8');
const css=await readFile('dist/assets/'+files.find(f=>/^index-.*\.css$/.test(f)),'utf8');
const manifest=JSON.parse(await readFile('public/assets/manifest.json','utf8'));
for(const a of manifest.assets){const bytes=await readFile('public/'+a.path);const type=a.path.endsWith('.svg')?'image/svg+xml':'image/png';a.data=`data:${type};base64,${bytes.toString('base64')}`;}
const output=html.replace(/<script type="module" crossorigin src="[^"]+"><\/script>/,()=>`<script>window.__GCD_ASSETS__=${JSON.stringify(manifest).replace(/</g,'\\u003c')}</script><script type="module">${js.replace(/<\/script/gi,'<\\/script')}</script>`).replace(/<link rel="stylesheet" crossorigin href="[^"]+">/,()=>`<style>${css}</style>`);
await writeFile('GolfCartDisaster.html',output);
await mkdir('work/package',{recursive:true});
await writeFile('work/package/index.html',output);
console.log('Standalone HTML packaged with all project art; uploads remain local to the browser.');
