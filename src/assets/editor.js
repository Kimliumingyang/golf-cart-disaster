import {assets,download} from './library.js';
import {slots,categories} from './catalog.js';
export function setupAssetEditor(game){
  const dialog=document.createElement('dialog');dialog.id='asset-editor';
  dialog.innerHTML=`<section class="art-panel"><div class="art-top"><div><small>GOLF CART DISASTER · V0.9</small><h2>素材工作台 <span>ART GARAGE</span></h2></div><button id="art-close" aria-label="关闭素材工作台">✕</button></div><p class="art-info">PNG / SVG 上传后只替换画面，不修改碰撞体。自动等比适配；原文件与历史版本保留在当前浏览器。</p><div class="art-body"><div class="art-fields"><label>素材分类<select id="art-category"></select></label><label>替换位置<select id="art-slot"></select></label><label class="art-upload">选择 PNG / SVG<input id="art-file" type="file" accept="image/png,image/svg+xml,.png,.svg"></label><p id="art-status" role="status"></p><label>历史版本<select id="art-history"></select></label><div class="art-actions"><button id="art-restore">恢复此版本</button><button id="art-original">下载原文件</button><button id="art-clear">恢复项目默认</button></div><p class="art-info">整人图会按预设区域切分并跟随真实肢体运动。需要精确对齐时，可单独上传 head / torso / thigh 等部件。</p></div><div class="art-preview"><canvas id="art-preview-canvas" width="480" height="360"></canvas><p id="art-metadata"></p></div></div><div class="art-bottom"><div><strong>缺失的重要美术</strong><ul id="art-needs"></ul></div><button id="art-export">导出美术需求清单</button></div></section>`;
  document.body.append(dialog);
  const q=id=>dialog.querySelector('#'+id), cat=q('art-category'), slot=q('art-slot');
  for(const [id,label]of Object.entries(categories)){const o=new Option(label,id);cat.add(o);}
  function fillSlots(){slot.replaceChildren();for(const s of slots.filter(s=>s.category===cat.value))slot.add(new Option(s.label,s.id));refresh();}
  function refresh(){
    const selected=slot.value, a=assets.get(selected), canvas=q('art-preview-canvas'),c=canvas.getContext('2d');
    c.clearRect(0,0,480,360);for(let y=0;y<360;y+=16)for(let x=0;x<480;x+=16){c.fillStyle=((x+y)/16)%2?'#e3e9df':'#f6f2e7';c.fillRect(x,y,16,16);}
    if(a)assets.draw(c,selected,20,20,440,320);else{c.fillStyle='#62795d';c.font='bold 18px Arial';c.textAlign='center';c.fillText('未上传 · 游戏中使用代码占位',240,180);}
    q('art-metadata').textContent=a?`${a.name} · ${a.image.width} × ${a.image.height} · ${a.source==='upload'?'本地上传':'项目素材'}`:'保留物理和游戏逻辑，只替换视觉。';
    const history=q('art-history');history.replaceChildren();const versions=assets.history.filter(r=>r.slot===selected).reverse();
    history.add(new Option('选择历史原文件…',''));for(const r of versions)history.add(new Option(`${r.createdAt.slice(0,19)} · ${r.name}`,r.key));
    const needs=q('art-needs');needs.replaceChildren();for(const n of assets.needs()){const li=document.createElement('li');li.textContent=n.description+' · '+n.slot;needs.append(li);}if(!needs.children.length){const li=document.createElement('li');li.textContent='重要素材已齐全，仍可继续替换。';needs.append(li);}
    q('art-status').textContent=assets.storageAvailable?'自动保存到当前浏览器；上传不修改服务器文件。':'当前浏览器存储不可用，素材仅在本页有效，请下载保留原文件。';
  }
  let resume=false;
  function close(){dialog.close();game.input.clear();if(resume&&game.state==='PAUSE')game.setState('RUN');}
  document.getElementById('art').onclick=()=>{resume=game.state==='RUN';game.input.clear();if(resume)game.setState('PAUSE');dialog.showModal();refresh();};
  q('art-close').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  cat.onchange=fillSlots;slot.onchange=refresh;
  q('art-file').onchange=async()=>{const file=q('art-file').files[0];if(!file)return;try{q('art-status').textContent='正在验证并保存原文件…';await assets.upload(slot.value,file);refresh();q('art-status').textContent='替换成功，碰撞体和物理参数保持不变。';}catch(e){q('art-status').textContent=e.message;}finally{q('art-file').value='';}};
  q('art-original').onclick=()=>assets.downloadOriginal(slot.value,q('art-history').value);
  q('art-restore').onclick=async()=>{try{if(q('art-history').value)await assets.restore(slot.value,q('art-history').value);refresh();}catch(e){q('art-status').textContent=e.message;}};
  q('art-clear').onclick=async()=>{try{await assets.clear(slot.value);refresh();}catch(e){q('art-status').textContent=e.message;}};
  q('art-export').onclick=()=>{const text=['# Golf Cart Disaster V0.9 — 美术需求清单','',...assets.needs().map(n=>`- [ ] ${n.description} (${n.slot}) · ${n.format}`),'','上传只影响渲染。角色建议分头、躯干、骨盆、上臂、前臂、大腿和小腿提供透明图。','车辆建议车身和车轮分开；环境图不参与碰撞。'].join('\n');download(new Blob([text],{type:'text/markdown;charset=utf-8'}),'ART_REQUIREMENTS.md');};
  assets.addEventListener('change',()=>{if(dialog.open)refresh();});fillSlots();
}
