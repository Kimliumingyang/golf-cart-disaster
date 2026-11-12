import {scenarioList,createScenario} from './debug/scenarios.js';
import {assets} from './assets/library.js';
import {setupAssetEditor} from './assets/editor.js';
import {addPerson,reseat,local} from './physics/world.js';
import './style.css';
import {Game} from './game/game.js';
import {Renderer} from './render/canvas.js';
import {createInput} from './ui/input.js';
import {setupUI,showModal,updateUI} from './ui/ui.js';
import {testDriver} from './debug/driver.js';
const game=new Game();game.input=createInput(game);setupUI(game);setupAssetEditor(game);showModal(game);const renderer=new Renderer(document.getElementById('game'));let last=performance.now(),accumulator=0;
function frame(now){const delta=Math.min(100,now-last);last=now;accumulator+=delta*game.slow;while(accumulator>=1000/60){if(!window.golf?.manual)game.step(game.debug&&game.auto?testDriver(game):game.input.sample());accumulator-=1000/60;}renderer.render(game);updateUI(game);requestAnimationFrame(frame);}requestAnimationFrame(frame);
if(game.debug){window.golf={game,assets,draw:()=>{renderer.render(game);updateUI(game);},scenarios:{list:scenarioList,create:createScenario},physics:{addPerson,reseat,local},step:(n=1)=>{for(let i=0;i<n;i++)game.step(game.auto?testDriver(game):game.input.sample());},drive:testDriver,snapshot:()=>({state:game.state,x:game.x,v:game.speed,people:game.people.length,pickups:game.pickups,stats:{...game.stats},events:{...game.events},logs:game.logs,parts:game.people.map(p=>({id:p.id,grip:p.grip,outside:p.outside,seated:p.seated,handGrip:!!p.handGrip,seatDistance:p.seatDistance,maxSeatDistance:p.maxSeatDistance,maxLiftPx:p.maxLiftPx,recoveredCount:p.recoveredCount??0}))})};window.addEventListener('keydown',e=>{if(e.code==='KeyH')game.hitboxes=!game.hitboxes;if(e.code==='KeyL')game.slow=game.slow===1?.5:1;if(e.code==='KeyT')game.auto=!game.auto;});}
