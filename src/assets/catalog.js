const people=[['driver','司机'],['rich','富豪'],['lady','贵妇'],['suit','西装男'],['golfer','高尔夫选手']];
export const slots=[
  {id:'ui.logo',label:'游戏标志',category:'ui',required:true},
  {id:'ui.flag',label:'接客旗帜',category:'ui'},
  ...['gas','brake','jump'].map(id=>({id:'ui.'+id,label:{gas:'油门按钮',brake:'刹车按钮',jump:'跳跃按钮'}[id],category:'ui'})),
  ...people.flatMap(([id,label])=>[
    {id:'characters.'+id,label:label+' · 整人图 / 自动分片',category:'characters',required:true},
    ...['head','torso','pelvis','upperArm','forearm','thigh','calf'].map(part=>({id:`characters.${id}.${part}`,label:`${label} · ${part}`,category:'characters'})),
  ]),
  {id:'vehicles.cart',label:'加长球车 · 车身',category:'vehicles',required:true},
  {id:'vehicles.wheel',label:'车轮 · 独立贴图',category:'vehicles'},
  {id:'environment.background',label:'远景背景（不替换碰撞地形）',category:'environment',required:true},
  {id:'environment.goose',label:'大鹅序列 · 4×3 图集（无碰撞）',category:'environment'},
  {id:'environment.gooseHonk',label:'大鹅叫声 · 4×2 图集（无碰撞）',category:'environment'},
  {id:'effects.ball',label:'高尔夫球',category:'effects',required:true},
  {id:'effects.splash',label:'水滴',category:'effects'},
];
export const categories={ui:'UI',characters:'角色',vehicles:'车辆',environment:'环境',effects:'特效'};
// A full standing PNG is used as a skin atlas. Dedicated part slots override these crops.
export const crops={head:[0,0,1,.34],torso:[.2,.31,.6,.26],pelvis:[.25,.53,.5,.1],upperArm:[.06,.33,.23,.17],forearm:[.02,.47,.23,.16],thigh:[.30,.60,.19,.19],calf:[.30,.77,.19,.22]};
