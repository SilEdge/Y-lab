import './style.css';
import {DEFAULTS,STEP,Simulation,properties,amplitudeLimit,energy,tensions,clamp} from './physics.js';
import {createScene} from './scene.js';
import {drawXY,drawTime,trajectorySVG} from './charts.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const format=(n,d=3)=>n.toFixed(d).replace('.',',');
let params={...DEFAULTS},sim=new Simulation(params),running=!matchMedia('(prefers-reduced-motion: reduce)').matches,points=[],scene=null,accumulator=0,steps=0,lastStamp=null,lastUI=0;
const fields=new Map();
function field(container,{key,label,symbol='',unit,min,max,step,factor=1,digits=0}){
 const wrap=document.createElement('div');wrap.className='field';
 wrap.innerHTML=`<div class="field-top"><label for="range-${key}">${label} <em>${symbol}</em></label><div class="value-input"><input type="number" id="value-${key}" aria-label="${label}, ${unit}" min="${min}" max="${max}" step="${step}"/><span>${unit}</span></div></div><input type="range" id="range-${key}" aria-label="${label}" min="${min}" max="${max}" step="${step}"/><div class="range-bounds"><span>${format(min,digits)} ${unit}</span><span class="max-bound">${format(max,digits)} ${unit}</span></div>`;
 $(container).append(wrap);
 const range=wrap.querySelector('input[type=range]'),number=wrap.querySelector('input[type=number]');
 const cfg={wrap,range,number,factor,digits,min,max,step,key,unit};fields.set(key,cfg);
 range.addEventListener('input',()=>changeParameter(key,Number(range.value)/factor));
 let pendingInput;
 function commitNumber(){clearTimeout(pendingInput);const v=Number(number.value);if(Number.isFinite(v))changeParameter(key,clamp(v,cfg.min,cfg.max)/factor);else syncFields();}
 number.addEventListener('change',commitNumber);
 number.addEventListener('input',()=>{clearTimeout(pendingInput);pendingInput=setTimeout(commitNumber,350);});
 number.addEventListener('keydown',e=>{if(e.key==='Enter'){commitNumber();number.blur();}});
}
field('#geometry-controls',{key:'h',label:'До узла',symbol:'h',unit:'см',min:10,max:45,step:.01,factor:100,digits:2});
field('#geometry-controls',{key:'l',label:'От узла до центра шарика',symbol:'ℓ',unit:'см',min:4,max:30,step:.01,factor:100,digits:2});
field('#geometry-controls',{key:'d',label:'Между отверстиями',symbol:'d',unit:'см',min:8,max:35,step:.5,factor:100,digits:1});
field('#motion-controls',{key:'ax',label:'Амплитуда по x',symbol:'Aₓ',unit:'см',min:0,max:2,step:.05,factor:100,digits:2});
field('#motion-controls',{key:'ay',label:'Амплитуда по y',symbol:'Aᵧ',unit:'см',min:0,max:3,step:.05,factor:100,digits:2});
field('#phase-control',{key:'phase',label:'Фаза по x',symbol:'δ',unit:'°',min:0,max:180,step:1,factor:180/Math.PI,digits:0});
field('#environment-controls',{key:'mass',label:'Масса шарика',symbol:'m',unit:'г',min:20,max:150,step:5,factor:1000,digits:0});
field('#environment-controls',{key:'beta',label:'Затухание',symbol:'β',unit:'с⁻¹',min:0,max:.12,step:.005,factor:1,digits:3});

function syncFields(){
 const maxX=Math.floor(amplitudeLimit(params)*100*100)/100;
 const maxY=Math.min(5,Math.floor((params.h+params.l)*.12*100*100)/100);
 for(const [key,max]of [['ax',maxX],['ay',maxY]]){
  const f=fields.get(key);f.max=max;f.range.max=max;f.number.max=max;f.wrap.querySelector('.max-bound').textContent=`${format(max,f.digits)} ${f.unit}`;
  params[key]=Math.min(params[key],max/100);
 }
 for(const [key,f]of fields){const value=params[key]*f.factor;f.number.value=value.toFixed(f.digits);f.range.value=value;f.range.style.setProperty('--progress',`${100*(value-f.min)/(f.max-f.min)}%`);}
 $('#launch').value=params.launch;
 const phaseDisabled=params.launch==='release';for(const node of [fields.get('phase').range,fields.get('phase').number])node.disabled=phaseDisabled;
 fields.get('phase').wrap.style.opacity=phaseDisabled?'.4':'1';
 $$('[data-model]').forEach(b=>{b.classList.toggle('selected',b.dataset.model===params.model);b.setAttribute('aria-pressed',String(b.dataset.model===params.model));});
 $('#model-hint').textContent=params.model==='nonlinear'?'Геометрия подвеса и взаимодействие колебаний.':'Аналитическое решение для малых отклонений.';
 const pr=properties(params);
 $('#geometry-note').textContent=`Верхние ветви: ${format(pr.s*100,2)} см · Подвес: ${format(pr.L*100,1)} см`;
 $('#amplitude-note').textContent=`Амплитуды задают запуск. Предел Aₓ: ${format(maxX,2)} см — с запасом до ослабления нитей.`;
 $('#tx').innerHTML=`${format(pr.tx)} <em>с</em>`;$('#ty').innerHTML=`${format(pr.ty)} <em>с</em>`;
 let ratioName='';for(const [r,name]of [[2,'2:1'],[1.5,'3:2'],[3,'3:1'],[4/3,'4:3']])if(Math.abs(pr.ratio-r)<.002)ratioName=`≈ ${name}`;
 $('#ratio').innerHTML=`${format(pr.ratio)} <em>${ratioName}</em>`;
 $$('[data-preset]').forEach(b=>b.classList.toggle('active',Math.abs(pr.ratio-Number(b.dataset.preset))<.002&&Math.abs(pr.L-.4)<.001));
 $('#physics-summary').textContent=params.model==='nonlinear'?'Нити нерастяжимы, узел невесом, опора неподвижна. Численный шаг 1/480 с.':'Малые углы, независимые координаты. Аналитическое решение без пошагового интегрирования.';
}
function changeParameter(key,value){params[key]=value;syncFields();reset();}
function reset(){sim.reset(params);points=[];steps=0;accumulator=0;lastStamp=null;scene?.setup(params);scene?.appendTrail(sim.point);points.push({...sim.point,t:0});$('#warning').hidden=true;updateUI();draw();}
function setRunning(value){running=value;$('#play-symbol').textContent=running?'Ⅱ':'▶';$('#play-btn').setAttribute('aria-label',running?'Поставить на паузу':'Продолжить симуляцию');$('#status-label').textContent=running?'Симуляция идёт':'На паузе';$('.status-dot').style.background=running?'var(--mint)':'#818e76';accumulator=0;lastStamp=null;}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),2600);}
$('#play-btn').addEventListener('click',()=>{if(sim.stopped)reset();setRunning(!running);});
$('#restart-btn').addEventListener('click',()=>{reset();setRunning(true);});
$('#defaults-btn').addEventListener('click',()=>{params={...DEFAULTS};$('#speed').value='1';syncFields();reset();setRunning(true);toast('Исходная установка восстановлена');});
$('#clear-btn').addEventListener('click',()=>{points=[{...sim.point,t:sim.t}];scene?.clearTrail();scene?.appendTrail(sim.point);draw();toast('След очищен');});
$('#launch').addEventListener('change',e=>changeParameter('launch',e.target.value));
$('#speed').addEventListener('change',e=>{params.speed=Number(e.target.value);sim.p.speed=params.speed;accumulator=0;});
$$('[data-model]').forEach(b=>b.addEventListener('click',()=>{params.model=b.dataset.model;syncFields();reset();}));
$$('[data-preset]').forEach(b=>b.addEventListener('click',()=>{const r=Number(b.dataset.preset);params.l=.4/(r*r);params.h=.4-params.l;params.d=.2;params.ax=Math.min(.01,amplitudeLimit(params)*.6);params.ay=.01;params.phase=0;params.launch='center';params.beta=0;syncFields();reset();setRunning(true);toast(`Настроено отношение частот ${b.querySelector('small').textContent}`);}));
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>{$$('[data-view]').forEach(x=>x.classList.toggle('selected',x===b));scene?.setView(b.dataset.view);}));
$('#dimensions-btn').addEventListener('click',()=>{const visible=scene?.toggleDimensions();$('#dimensions-btn').setAttribute('aria-pressed',String(visible));});
const dialog=$('#about-dialog');for(const id of ['about-btn','details-btn'])$('#'+id).addEventListener('click',()=>dialog.showModal());for(const id of ['close-dialog','dialog-done'])$('#'+id).addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
$('#export-btn').addEventListener('click',()=>{
 const rows=['# Y Lab — all values below in SI units',`# model=${params.model}; h=${params.h}; l=${params.l}; d=${params.d}; m=${params.mass}; g=${params.g}; beta=${params.beta}; Ax=${params.ax}; Ay=${params.ay}; phase=${params.phase}; launch=${params.launch}`,'t_s,x_m,y_m,z_relative_to_anchors_m',...points.map(pt=>[pt.t,pt.x,pt.y,pt.z].map(v=>v.toFixed(9)).join(','))];
 download('y-lab-trajectory.csv',rows.join('\n'),'text/csv;charset=utf-8');toast('Координаты сохранены в CSV');
});
$('#save-svg').addEventListener('click',()=>{download('y-lab-lissajous.svg',trajectorySVG(points,params),'image/svg+xml');toast('Фигура сохранена в SVG');});
function updateUI(){
 const t=sim.t;$('#clock').textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}.${String(Math.floor((t%1)*100)).padStart(2,'0')}`;
 if(params.model==='linear'){$('#energy-title').textContent='Метод решения';$('#energy').innerHTML='Аналитический';}
 else if(params.beta>0){$('#energy-title').textContent='Энергия от начальной';$('#energy').innerHTML=sim.e0>0?`${format(energy(sim.q,sim.p)/sim.e0*100,1)} <em>%</em>`:'0 <em>мкДж</em>';}
 else{$('#energy-title').textContent='Дрейф энергии RK4';$('#energy').innerHTML=sim.e0>0?`${(sim.maxDrift*100).toExponential(1).replace('.',',')} <em>%</em>`:'0 <em>мкДж</em>';}
 $('#trace-count').textContent=`${Math.min(points.length,2400)} точек`;
 if(sim.stopped){setRunning(false);$('#warning').textContent=sim.reason;$('#warning').hidden=false;$('#status-label').textContent='Требуется изменить запуск';}
}
function draw(){scene?.update(sim.point);drawXY($('#xy-chart'),points,params);drawTime($('#time-chart'),points,params,sim.t);}
syncFields();
try{scene=createScene($('#scene'),$('#scene-labels'));scene.setup(params);}catch(error){console.error(error);$('#scene').innerHTML='<div class="loading-message">3D требует WebGL. Включите аппаратное ускорение.<br>Графики и расчёт продолжают работать.</div>';toast('WebGL недоступен: графики работают без 3D');}
reset();setRunning(running);
function frame(stamp){
 const elapsed=lastStamp===null?0:Math.min((stamp-lastStamp)/1000,.1);lastStamp=stamp;
 if(running&&!document.hidden){accumulator+=elapsed*params.speed;let frameSteps=0;while(accumulator>=STEP&&frameSteps<120&&!sim.stopped){sim.step();accumulator-=STEP;steps++;frameSteps++;if(steps%4===0){points.push({...sim.point,t:sim.t});if(points.length>18000)points.shift();if(steps%8===0)scene?.appendTrail(sim.point);}}}
 scene?.update(sim.point);
 if(stamp-lastUI>40){updateUI();drawXY($('#xy-chart'),points,params);drawTime($('#time-chart'),points,params,sim.t);lastUI=stamp;}
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange',()=>{lastStamp=null;accumulator=0;});
new ResizeObserver(()=>{drawXY($('#xy-chart'),points,params);drawTime($('#time-chart'),points,params,sim.t);}).observe($('.charts'));
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!dialog.open&&!['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName)){e.preventDefault();setRunning(!running);}});
// Stable, read-only diagnostics for numerical and integration checks.
window.yLab={get snapshot(){return {params:{...params},time:sim.t,position:{...sim.point},running,stopped:sim.stopped,energy:energy(sim.q,sim.p),drift:sim.maxDrift,tensions:tensions(sim.q,sim.p),samples:points.length,webgl:!!scene};}};
