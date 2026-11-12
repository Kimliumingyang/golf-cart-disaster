import './style.css';
import {Game} from './game/game.js';
import {Renderer} from './render/canvas.js';
import {createInput} from './ui/input.js';
import {setupUI,showModal,updateUI} from './ui/ui.js';
import {testDriver} from './debug/driver.js';
const game=new Game();game.input=createInput(game);setupUI(game);showModal(game);const renderer=new Renderer(document.getElementById('game'));let last=performance.now(),accumulator=0;
function frame(now){const delta=Math.min(100,now-last);last=now;accumulator+=delta*game.slow;while(accumulator>=1000/60){if(!window.golf?.manual)game.step(game.debug&&game.auto?testDriver(game):game.input.sample());accumulator-=1000/60;}renderer.render(game);updateUI(game);requestAnimationFrame(frame);}requestAnimationFrame(frame);
if(game.debug){window.golf={game,step:(n=1)=>{for(let i=0;i<n;i++)game.step(game.auto?testDriver(game):game.input.sample());},drive:testDriver,snapshot:()=>({state:game.state,x:game.x,v:game.speed,people:game.people.length,pickups:game.pickups,events:{...game.events},logs:game.logs,parts:game.people.map(p=>({id:p.id,grip:p.grip,outside:p.outside}))})};window.addEventListener('keydown',e=>{if(e.code==='KeyH')game.hitboxes=!game.hitboxes;if(e.code==='KeyL')game.slow=game.slow===1?.5:1;if(e.code==='KeyT')game.auto=!game.auto;});}
