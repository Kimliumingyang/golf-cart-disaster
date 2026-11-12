// Record actual 60 Hz physics from captured normal-input tapes. No positions/velocities/poses are edited.
const {chromium}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
(async()=>{
 const results=JSON.parse(fs.readFileSync('work/v09-sweep.json','utf8'));
 const selections=[
  {id:'ball-9',slug:'01-ball-recovery',label:'离座后挂在车边 → 接触路面起伏 → 自然落回',seconds:14,anchor:'ball-launched'},
  {id:'reckless-rock',slug:'02-hill-rollover',label:'冲坡 + 错误压头 → 翻滚、短暂救回 → 真正失败',seconds:15,anchor:'hill'},
  {id:'ball-medium-brake',slug:'03-heavy-impact',label:'同一颗球严重迎击 → 整车翻转 → 无法恢复',seconds:13,anchor:'ball-launched'},
 ];
 fs.mkdirSync('public/demos',{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 await page.goto(process.env.GAME_URL||'http://localhost:5176/?debug=1');await page.waitForFunction(()=>golf.draw);await page.evaluate(async()=>{golf.manual=true;await golf.assets.ready;});
 const metadata=[];
 for(const clip of selections){
  const run=results.find(r=>r.id===clip.id);if(!run)throw Error('Missing tape '+clip.id);
  const anchor=clip.anchor==='hill'?run.samples.find(s=>s.x>=273):run.logs.find(s=>s.event===clip.anchor);
  const anchorT=anchor.t, start=Math.max(0,run.samples.find(s=>s.t>=anchorT-1.7)?.frame??0), end=Math.min(run.tape.length,start+clip.seconds*60);
  const folder=path.resolve('work/frames-'+clip.slug);fs.mkdirSync(folder,{recursive:true});
  await page.evaluate(({tape,start,label})=>{const g=golf.game;g.reset(1);g.debug=false;g.setState('RUN');golf.manual=true;window.replayTape=tape;window.replayCursor=0;for(let i=0;i<start;i++){g.step(tape[i]);window.replayCursor++;}document.getElementById('debug').style.display='none';let overlay=document.getElementById('demo-caption');if(!overlay){overlay=document.createElement('div');overlay.id='demo-caption';overlay.style.cssText='position:absolute;left:25px;top:90px;background:#f9f4e3ee;border:2px solid #263b2a;padding:10px 14px;border-radius:5px;font:bold 14px Arial;max-width:420px;pointer-events:none';document.getElementById('app').append(overlay);}overlay.textContent=label+' · 正常输入物理重放 · 1×';golf.draw();},{tape:run.tape,start,label:clip.label});
  let frames=0;
  for(let at=start;at<end;at+=2){await page.evaluate(()=>{for(let i=0;i<2;i++){const input=window.replayTape[window.replayCursor++];if(input)golf.game.step(input);}golf.draw();});await page.screenshot({path:path.join(folder,`frame${String(frames).padStart(5,'0')}.png`)});frames++;if(frames%90===0)console.log(clip.slug,frames,'frames');}
  // Hold the actual final state for one second so failure/survival can be read.
  for(let i=0;i<30;i++){await page.screenshot({path:path.join(folder,`frame${String(frames++).padStart(5,'0')}.png`)});}
  const outfile='public/demos/'+clip.slug+'.mp4';
  const ff=spawnSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-framerate','30','-i',path.join(folder,'frame%05d.png'),'-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',outfile],{encoding:'utf8'});if(ff.status!==0)throw Error(ff.stderr);
  const final=await page.evaluate(()=>({x:golf.game.x,state:golf.game.state,stats:golf.game.stats,reason:golf.game.failureReason,lost:golf.game.lost}));
  metadata.push({...clip,startFrame:start,endFrame:end,frames,file:outfile,final});console.log('RECORDED',outfile,final);
 }
 fs.writeFileSync('public/demos/metadata.json',JSON.stringify(metadata,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
