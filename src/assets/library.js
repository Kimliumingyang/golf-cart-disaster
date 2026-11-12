import {slots} from './catalog.js';
const DB='gcd-art-v08';
const transactionDone=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
const requestResult=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
export function safeSvg(source) {
  const doc=new DOMParser().parseFromString(source,'image/svg+xml');
  if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg') throw Error('SVG 格式无效。');
  const tags=new Set(['svg','g','path','rect','circle','ellipse','line','polyline','polygon','text','tspan','defs','linearGradient','radialGradient','stop','clipPath','mask','pattern','use','title','desc']);
  for(const node of [...doc.querySelectorAll('*')]) {
    if(!tags.has(node.localName)) {node.remove();continue;}
    for(const attr of [...node.attributes]) {
      const value=attr.value.trim();
      const externalUrls=[...value.matchAll(/url\s*\(\s*['"]?([^)'"]+)['"]?\s*\)/gi)].some(m=>!/^#[\w-]+$/.test(m[1].trim()));
      if(/^on/i.test(attr.name)||/javascript:|@import|expression\s*\(/i.test(value)||(/href$/i.test(attr.name)&&!value.startsWith('#'))||externalUrls) node.removeAttribute(attr.name);
    }
  }
  doc.documentElement.setAttribute('xmlns','http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(doc);
}
async function decode(blob) {
  const url=URL.createObjectURL(blob), image=new Image();
  try {image.src=url;await image.decode();if(!image.width||!image.height||image.width>8192||image.height>8192||image.width*image.height>16777216)throw Error('图片尺寸过大，最多 1600 万像素 / 边长 8192。');return {image,url};}
  catch(e){URL.revokeObjectURL(url);throw e;}
}
export class AssetLibrary extends EventTarget {
  constructor(){super();this.active=new Map();this.bundled=new Map();this.history=[];this.storageAvailable=false;this.serial=0;this.ready=this.init();}
  async init(){
    try {
      this.db=await new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>{req.result.createObjectStore('files',{keyPath:'key'});req.result.createObjectStore('active');};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
      this.storageAvailable=true;
      const tx=this.db.transaction(['files','active'],'readonly');
      const records=await requestResult(tx.objectStore('files').getAll());
      this.history=records;
      // Read active pointers in one fresh transaction after the awaited getAll completes.
      const pointers=this.db.transaction('active','readonly').objectStore('active');
      const keys=await requestResult(pointers.getAll());
      for(const key of keys){const r=records.find(r=>r.key===key);if(r)try{this.active.set(r.slot,{...r,...await decode(r.render)});}catch{ /* corrupt local image falls back to bundled art */ }}
    } catch(e){this.storageError=e.message;}
    try {
      const manifest=window.__GCD_ASSETS__??await (await fetch(new URL('assets/manifest.json',document.baseURI))).json();
      for(const entry of manifest.assets??[])try{
        const blob=entry.data?await (await fetch(entry.data)).blob():await (await fetch(new URL(entry.path,document.baseURI))).blob();
        const decoded=await decode(blob);this.bundled.set(entry.slot,{...entry,...decoded,original:blob,name:entry.name??entry.path.split('/').pop(),source:'bundled'});
      }catch{ /* missing optional art must never prevent playing */ }
    }catch{ /* all-code fallback also supports offline/standalone */ }
    this.dispatchEvent(new Event('change'));return this;
  }
  get(id){return this.active.get(id)??this.bundled.get(id);}
  draw(ctx,id,x,y,w,h,{crop,fit='contain'}={}){
    const asset=this.get(id);if(!asset)return false;const image=asset.image;
    let sx=0,sy=0,sw=image.width,sh=image.height;
    if(crop){[sx,sy,sw,sh]=[crop[0]*image.width,crop[1]*image.height,crop[2]*image.width,crop[3]*image.height];}
    let dw=w,dh=h;
    if(fit==='contain'||fit==='cover'){const scale=(fit==='cover'?Math.max:Math.min)(w/sw,h/sh);dw=sw*scale;dh=sh*scale;}
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(image,sx,sy,sw,sh,x+(w-dw)/2,y+(h-dh)/2,dw,dh);ctx.restore();return true;
  }
  async upload(slot,file){
    if(!slots.some(s=>s.id===slot))throw Error('未知素材槽。');
    if(file.size>8*1024*1024)throw Error('单个文件最多 8 MB。');
    const raw=await file.arrayBuffer(), bytes=new Uint8Array(raw);
    const isPng=[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
    const isSvg=/\.svg$/i.test(file.name);
    if(!isPng&&!isSvg)throw Error('只接受有效的 PNG / SVG 文件。');
    const original=new Blob([raw],{type:isPng?'image/png':'image/svg+xml'});
    const render=isSvg?new Blob([safeSvg(new TextDecoder().decode(raw))],{type:'image/svg+xml'}):original;
    const decoded=await decode(render);
    const record={key:`${slot}:${Date.now()}:${++this.serial}`,slot,name:file.name,original,render,width:decoded.image.width,height:decoded.image.height,createdAt:new Date().toISOString()};
    if(this.db){try{const tx=this.db.transaction(['files','active'],'readwrite');tx.objectStore('files').put(record);tx.objectStore('active').put(record.key,slot);await transactionDone(tx);}catch(e){URL.revokeObjectURL(decoded.url);throw Error('本地存储失败，原素材未被替换：'+e.message);}}
    this.history.push(record);this.release(slot);this.active.set(slot,{...record,...decoded,source:'upload'});this.dispatchEvent(new Event('change'));return record;
  }
  release(slot){const previous=this.active.get(slot);if(previous?.url)URL.revokeObjectURL(previous.url);this.active.delete(slot);}
  async restore(slot,key){const r=this.history.find(r=>r.slot===slot&&r.key===key);if(!r)throw Error('找不到此历史版本。');const decoded=await decode(r.render);if(this.db){const tx=this.db.transaction('active','readwrite');tx.objectStore('active').put(key,slot);await transactionDone(tx);}this.release(slot);this.active.set(slot,{...r,...decoded,source:'upload'});this.dispatchEvent(new Event('change'));}
  async clear(slot){if(this.db){const tx=this.db.transaction('active','readwrite');tx.objectStore('active').delete(slot);await transactionDone(tx);}this.release(slot);this.dispatchEvent(new Event('change'));}
  needs(){return slots.filter(s=>s.required&&!this.get(s.id)).map(s=>({slot:s.id,category:s.category,description:s.label,format:'PNG with transparency or SVG',status:'使用代码占位'}));}
  downloadOriginal(slot,key){const asset=key?this.history.find(r=>r.key===key):this.get(slot);if(!asset?.original)return;download(asset.original,asset.name);}
}
export function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export const assets=new AssetLibrary();
