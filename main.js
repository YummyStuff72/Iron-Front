import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js";

const root=document.getElementById("game");
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x91a7ad);
scene.fog=new THREE.Fog(0x91a7ad,75,180);

const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,500);
camera.position.set(32,38,42);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
root.appendChild(renderer.domElement);

const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(0,0,0); controls.enableDamping=true; controls.dampingFactor=.08;
controls.minDistance=18; controls.maxDistance=90; controls.maxPolarAngle=Math.PI*.46; controls.minPolarAngle=.35;
controls.enablePan=true; controls.panSpeed=.8;

scene.add(new THREE.HemisphereLight(0xcfe9ef,0x405046,2.0));
const sun=new THREE.DirectionalLight(0xfff2d1,3.0);
sun.position.set(-30,55,20); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-70;sun.shadow.camera.right=70;sun.shadow.camera.top=70;sun.shadow.camera.bottom=-70;
scene.add(sun);

const terrain=new THREE.Mesh(new THREE.PlaneGeometry(150,150,20,20),new THREE.MeshStandardMaterial({color:0x526b53,roughness:1}));
terrain.rotation.x=-Math.PI/2; terrain.receiveShadow=true; scene.add(terrain);

const grid=new THREE.GridHelper(150,75,0x72867a,0x63756d); grid.position.y=.03; grid.material.opacity=.18; grid.material.transparent=true; scene.add(grid);

const state={iron:600,fuel:300,power:120,pop:4,popMax:30,time:0,selected:[],build:null,gameOver:false,enemyHQ:100};
const objects=[],units=[],buildings=[];
const enemy={hq:null,units:[]};

const costs={
  hq:{iron:300},house:{iron:120},factory:{iron:220,fuel:80},power:{iron:140},mine:{iron:100},refinery:{iron:120},
  rifle:{iron:40},tank:{iron:120,fuel:40},artillery:{iron:160,fuel:60}
};

function mat(c){return new THREE.MeshStandardMaterial({color:c,roughness:.75,metalness:.08})}
function box(w,h,d,c){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c));m.castShadow=true;m.receiveShadow=true;return m}
function addObj(o,type,data){o.userData={type,...data};scene.add(o);objects.push(o);return o}

function makeBuilding(type,x,z,team="player"){
  const colors={hq:0x3d7d8a,house:0x71868c,factory:0x52616a,power:0xd6a84d,mine:0x5c725d,refinery:0x8a5d47};
  const dims={hq:[5,4,5],house:[4,2.5,4],factory:[5,3,5],power:[3.5,3,3.5],mine:[4,2,4],refinery:[4,3,4]}[type];
  const g=new THREE.Group();
  const base=box(dims[0],dims[1],dims[2],team==="enemy"?0x7c4646:colors[type]); base.position.y=dims[1]/2;g.add(base);
  const roof=box(dims[0]*.75,.45,dims[2]*.75,team==="enemy"?0x4a2525:0x24353a);roof.position.y=dims[1]+.22;g.add(roof);
  if(type==="hq"){const mast=box(.25,3,.25,team==="enemy"?0xb14e4e:0x80d7e4);mast.position.y=dims[1]+1.8;g.add(mast)}
  g.position.set(x,0,z); addObj(g,"building",{kind:type,team,hp:type==="hq"?100:40,maxHp:type==="hq"?100:40});
  buildings.push(g); return g;
}
function makeUnit(type,x,z,team="player"){
  const col=team==="enemy"?0xc44d4d:{rifle:0x4d9db2,tank:0x778d95,artillery:0x9e9a5b}[type];
  const g=new THREE.Group();
  if(type==="rifle"){const body=box(.75,1.15,.65,col);body.position.y=.58;g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.28,10,8),mat(0xc4a47a));head.position.y=1.35;g.add(head)}
  else {const body=box(type==="tank"?1.8:1.5,.65,type==="tank"?2.4:1.8,col);body.position.y=.38;g.add(body);const barrel=box(.22,.22,type==="tank"?1.6:2.2,0x273238);barrel.position.set(0,.72,type==="tank"?-.9:-1.1);barrel.rotation.x=.02;g.add(barrel)}
  g.position.set(x,0,z);g.userData={type:"unit",kind:type,team,hp:type==="rifle"?30:type==="tank"?100:70,maxHp:type==="rifle"?30:type==="tank"?100:70,speed:type==="rifle"?3.7:type==="tank"?2.3:1.7,target:null};
  scene.add(g);objects.push(g);units.push(g); if(team==="enemy") enemy.units.push(g); return g;
}
function canPay(c){return state.iron>=(c.iron||0)&&state.fuel>=(c.fuel||0)}
function pay(c){state.iron-=c.iron||0;state.fuel-=c.fuel||0;updateHUD()}
function toast(t){const el=document.getElementById("toast");el.textContent=t;el.style.opacity=1;clearTimeout(toast.t);toast.t=setTimeout(()=>el.style.opacity=0,1700)}
function updateHUD(){
  iron.textContent=Math.floor(state.iron);fuel.textContent=Math.floor(state.fuel);power.textContent=Math.floor(state.power);
  pop.textContent=`${state.pop} / ${state.popMax}`;
  enemyBar.style.width=Math.max(0,state.enemyHQ)+"%";
}
const iron=document.getElementById("iron"),fuel=document.getElementById("fuel"),power=document.getElementById("power"),pop=document.getElementById("pop"),enemyBar=document.getElementById("enemyBar");

makeBuilding("hq",-18,-12);
for(let i=0;i<3;i++) makeUnit("rifle",-12+i*1.4,-6);
const enemyHQ=makeBuilding("hq",24,18,"enemy"); enemy.hq=enemyHQ;
for(let i=0;i<4;i++) makeUnit(i%2?"rifle":"tank",20+i*2,11,"enemy");

for(let i=0;i<18;i++){
  const x=(Math.random()-.5)*105,z=(Math.random()-.5)*80;
  const tree=new THREE.Group();const trunk=box(.35,1.6,.35,0x594638);trunk.position.y=.8;tree.add(trunk);
  const crown=new THREE.Mesh(new THREE.ConeGeometry(1.4,3,7),mat(0x294d35));crown.position.y=2.7;tree.add(crown);tree.position.set(x,0,z);scene.add(tree);
}
for(let i=0;i<20;i++){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.5+Math.random()*.7,0),mat(0x69746f));rock.position.set((Math.random()-.5)*110,.35,(Math.random()-.5)*85);rock.scale.y=.5;rock.castShadow=true;scene.add(rock)}

function screenRay(e){
  const r=renderer.domElement.getBoundingClientRect();
  const mouse=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
  const ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);return ray;
}
function terrainPoint(ray){const p=new THREE.Vector3();return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),p)?p:null}
function clearSelection(){state.selected.forEach(o=>{if(o.userData.selRing){o.remove(o.userData.selRing);o.userData.selRing=null}});state.selected=[];selection.classList.add("hidden")}
function select(obj){
  clearSelection();state.selected=[obj];
  const ring=new THREE.Mesh(new THREE.RingGeometry(obj.userData.type==="unit"?1.1:2,1.18,24),new THREE.MeshBasicMaterial({color:0x70d4aa,side:THREE.DoubleSide,transparent:true,opacity:.8}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.06;obj.add(ring);obj.userData.selRing=ring;
  selection.classList.remove("hidden");selName.textContent=obj.userData.kind||obj.userData.type.toUpperCase();selInfo.textContent=`HP ${Math.ceil(obj.userData.hp)} / ${obj.userData.maxHp} · ${obj.userData.team}`;
}
const selection=document.getElementById("selection"),selName=document.getElementById("selName"),selInfo=document.getElementById("selInfo");

renderer.domElement.addEventListener("pointerdown",e=>{
  if(e.button!==0)return;
  const ray=screenRay(e),hits=ray.intersectObjects(objects,true);
  if(hits.length){
    let o=hits[0].object;while(o.parent&&!o.userData.type)o=o.parent;
    if(o.userData.team==="player") select(o); else {clearSelection();toast("Enemy unit: right-click it to attack.")} return;
  }
  if(state.build){const p=terrainPoint(ray);if(p){placeBuilding(p);return}}
  clearSelection();
});
renderer.domElement.addEventListener("contextmenu",e=>{
  e.preventDefault(); if(!state.selected.length)return;
  const ray=screenRay(e),hits=ray.intersectObjects(objects,true);let target=null;
  if(hits.length){target=hits[0].object;while(target.parent&&!target.userData.type)target=target.parent}
  const p=terrainPoint(ray);
  state.selected.forEach(u=>{if(u.userData.type==="unit"){u.userData.target=target||p}})
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){state.build=null;document.querySelectorAll("[data-build]").forEach(b=>b.classList.remove("active"))}
  if(e.key.toLowerCase()==="r") recruit("rifle");
});
function placeBuilding(p){
  const type=state.build,c=costs[type];
  if(!canPay(c)){toast("Insufficient resources.");return}
  pay(c);makeBuilding(type,Math.round(p.x/2)*2,Math.round(p.z/2)*2);state.build=null;
  document.querySelectorAll("[data-build]").forEach(b=>b.classList.remove("active"));toast(`${type.toUpperCase()} constructed`);
}
document.querySelectorAll("[data-build]").forEach(b=>b.onclick=()=>{state.build=b.dataset.build;document.querySelectorAll("[data-build]").forEach(x=>x.classList.toggle("active",x===b))});
document.querySelectorAll("[data-unit]").forEach(b=>b.onclick=()=>recruit(b.dataset.unit));
function recruit(type){
  const c=costs[type];if(!canPay(c)||state.pop>=state.popMax){toast(state.pop>=state.popMax?"Population cap reached.":"Insufficient resources.");return}
  const hq=buildings.find(b=>b.userData.kind==="hq"&&b.userData.team==="player");pay(c);state.pop++;makeUnit(type,hq.position.x+Math.random()*4-2,hq.position.z+4+Math.random()*2);toast(`${type.toUpperCase()} deployed`);
}
const selNameEl=selName;

function damage(attacker,target,dt){
  const range=attacker.userData.kind==="artillery"?12:attacker.userData.kind==="tank"?7:4.5;
  const d=attacker.position.distanceTo(target.position);
  if(d<=range){
    attacker.userData.cool=(attacker.userData.cool||0)-dt;
    if(attacker.userData.cool<=0){
      target.userData.hp-=attacker.userData.kind==="rifle"?10:attacker.userData.kind==="tank"?22:28;
      attacker.userData.cool=attacker.userData.kind==="artillery"?2.0:1.0;
      if(target.userData.kind==="hq"&&target.userData.team==="enemy"){state.enemyHQ=Math.max(0,target.userData.hp);updateHUD()}
    }
    return true;
  }
  return false;
}
function updateUnits(dt){
  for(const u of [...units]){
    if(u.userData.hp<=0){
      scene.remove(u);const i=units.indexOf(u);if(i>=0)units.splice(i,1);continue;
    }
    let t=u.userData.target;
    if(t&&t.userData&&t.userData.hp<=0){u.userData.target=null;t=null}
    if(t&&t.userData){if(!damage(u,t,dt)){const dir=new THREE.Vector3().subVectors(t.position,u.position);dir.y=0;if(dir.length()>1.2){dir.normalize();u.position.addScaledVector(dir,u.userData.speed*dt)}}}
    else if(t&&t.isVector3){const dir=new THREE.Vector3().subVectors(t,u.position);dir.y=0;if(dir.length()<1){u.userData.target=null}else{dir.normalize();u.position.addScaledVector(dir,u.userData.speed*dt)}}
    else if(u.userData.team==="enemy"){
      const players=units.filter(x=>x.userData.team==="player");const p=players.sort((a,b)=>a.position.distanceTo(u.position)-b.position.distanceTo(u.position))[0];
      const hq=buildings.find(b=>b.userData.kind==="hq"&&b.userData.team==="player");
      const target=p&&p.position.distanceTo(u.position)<18?p:hq;
      if(target)u.userData.target=target;
    }
  }
  // Enemy AI continuously reinforces and occasionally attacks.
  if(Math.floor(state.time)%12===0 && Math.floor(state.time)!==state.lastWave){
    state.lastWave=Math.floor(state.time);
    const n=2+Math.floor(state.time/45);
    for(let i=0;i<Math.min(n,4);i++)makeUnit(i%3===0?"tank":"rifle",20+Math.random()*7,12+Math.random()*6,"enemy");
  }
}
function enemyBuildingDamage(dt){
  const enemyUnits=units.filter(u=>u.userData.team==="enemy");
  for(const u of enemyUnits){
    const hq=buildings.find(b=>b.userData.kind==="hq"&&b.userData.team==="player");
    if(hq && (!u.userData.target || !u.userData.target.userData))u.userData.target=hq;
  }
}
function economy(dt){
  const mines=buildings.filter(b=>b.userData.team==="player"&&b.userData.kind==="mine").length;
  const ref=buildings.filter(b=>b.userData.team==="player"&&b.userData.kind==="refinery").length;
  const pow=buildings.filter(b=>b.userData.team==="player"&&b.userData.kind==="power").length;
  state.iron+=dt*(2+mines*4);state.fuel+=dt*(1+ref*2);state.power+=dt*(pow*.4);
  state.iron=Math.min(state.iron,99999);state.fuel=Math.min(state.fuel,99999);
}
function checkEnd(){
  const hq=enemy.hq;
  if(hq.userData.hp<=0&&!state.gameOver){state.gameOver=true;showEnd(true)}
  const playerHQ=buildings.find(b=>b.userData.kind==="hq"&&b.userData.team==="player");
  if(playerHQ&&playerHQ.userData.hp<=0&&!state.gameOver){state.gameOver=true;showEnd(false)}
}
function showEnd(win){
  const d=document.createElement("div");d.className="victory";d.innerHTML=`<div class="box"><h1>${win?"VICTORY":"DEFEAT"}</h1><p>${win?"Enemy command destroyed.":"Your command post has fallen."}</p><button>RETURN TO BATTLE</button></div>`;
  document.body.appendChild(d);d.querySelector("button").onclick=()=>location.reload();
}

const mini=document.getElementById("miniCanvas"),ctx=mini.getContext("2d");
function drawMini(){
  ctx.clearRect(0,0,180,120);ctx.fillStyle="#31483a";ctx.fillRect(0,0,180,120);
  const sx=x=>90+x/150*90,sy=z=>60+z/100*60;
  for(const b of buildings){ctx.fillStyle=b.userData.team==="enemy"?"#d55":"#69c";ctx.fillRect(sx(b.position.x)-3,sy(b.position.z)-3,6,6)}
  for(const u of units){ctx.fillStyle=u.userData.team==="enemy"?"#f55":"#8dd";ctx.fillRect(sx(u.position.x)-1,sy(u.position.z)-1,3,3)}
}
let last=performance.now();
function loop(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(!state.gameOver){state.time+=dt;economy(dt);updateUnits(dt);enemyBuildingDamage(dt);checkEnd()}
  const m=Math.floor(state.time/60),sec=Math.floor(state.time%60);document.getElementById("timer").textContent=`${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  document.getElementById("phase").textContent=(Math.floor(state.time/30)%2)?"NIGHT":"DAY";
  if(state.selected.length){const o=state.selected[0];if(o.userData){selInfo.textContent=`HP ${Math.max(0,Math.ceil(o.userData.hp))} / ${o.userData.maxHp} · ${o.userData.team}`}}
  updateHUD();drawMini();controls.update();renderer.render(scene,camera);requestAnimationFrame(loop)
}
window.addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
updateHUD();requestAnimationFrame(loop);
