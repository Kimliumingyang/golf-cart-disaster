import {readFile,writeFile} from 'node:fs/promises';
import {slots} from '../src/assets/catalog.js';
const manifest=JSON.parse(await readFile('public/assets/manifest.json','utf8'));
const available=new Set(manifest.assets.map(a=>a.slot));
const missing=slots.filter(s=>s.required&&!available.has(s.id));
const text=['# Golf Cart Disaster V0.9 — 美术需求清单','',...missing.map(s=>`- [ ] **${s.label}** — \`${s.id}\`，透明 PNG 或 SVG。`),'','已接入之前上传的四位乘客、加长球车、场景背景；原文件保留在 `public/assets/originals/`。','缺失项继续代码绘制，不影响开局、物理或通关。工作台可以基于当前浏览器上传状态重新导出这份清单。','','角色精细换装建议提供 head、torso、pelvis、upperArm、forearm、thigh、calf 透明部件。','车身与车轮尽量分开导出。PNG 整人图可直接上传，当前会按预设比例分片；Figma 图层或统一骨骼点能进一步提高对齐质量。'].join('\n')+'\n';
await writeFile('ART_REQUIREMENTS.md',text);
console.log('Missing important project art:',missing.map(s=>s.id).join(', '));
