import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,STEP,Simulation,properties,position,initialState,energy,rk4,tensions,linearSample,amplitudeLimit} from '../src/physics.js';
const near=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<=tol,`${a} differs from ${b} by ${Math.abs(a-b)}`);
test('Reference periods and ratio reproduce the report',()=>{const p=properties(DEFAULTS);near(p.tx,.6343739849219413);near(p.ty,1.2687479698438826);near(p.ratio,2);near(p.s,Math.sqrt(.1));});
test('Both upper branches and lower branch retain their lengths',()=>{
 for(const th of [-.18,-.05,0,.1,.18])for(const al of [-.1,0,.08]){const p=DEFAULTS,c=position([th,al,0,0],p);near(Math.hypot(c.kx+p.d/2,c.ky,c.kz),properties(p).s);near(Math.hypot(c.kx-p.d/2,c.ky,c.kz),properties(p).s);near(Math.hypot(c.x-c.kx,c.y-c.ky,c.z-c.kz),p.l);}
});
test('RK4 conserves energy over 60 seconds and keeps tensions positive',()=>{const s=new Simulation(DEFAULTS);for(let i=0;i<60/STEP;i++)s.step();assert.equal(s.stopped,false);assert.ok(s.maxDrift<2e-7,`drift=${s.maxDrift}`);assert.ok(Math.min(...Object.values(tensions(s.q,s.p)))>0);});
test('Mass does not change the ideal trajectory; energy and tension scale with mass',()=>{const a=new Simulation(DEFAULTS),b=new Simulation({...DEFAULTS,mass:.1});for(let i=0;i<4800;i++){a.step();b.step();}for(let i=0;i<4;i++)near(a.q[i],b.q[i]);near(energy(b.q,b.p),2*energy(a.q,a.p));near(tensions(b.q,b.p).lower,2*tensions(a.q,a.p).lower);});
test('Small-angle nonlinear trajectory approaches the linear analytical solution',()=>{const p={...DEFAULTS,ax:.00001,ay:.00001};const s=new Simulation(p);for(let i=0;i<4800;i++)s.step();const a=linearSample(s.t,p);near(s.point.x,a.x,5e-10);near(s.point.y,a.y,5e-10);});
test('The nonlinear integrator converges at fourth order',()=>{const p={...DEFAULTS,ax:.018,ay:.03};function calc(dt){let q=initialState(p);for(let i=0;i<Math.round(3/dt);i++)q=rk4(q,p,dt);return q;}const ref=calc(1/1920),coarse=calc(1/120),fine=calc(1/240);const err=q=>Math.hypot(...q.map((v,i)=>v-ref[i]));assert.ok(err(fine)<err(coarse)/12,`${err(coarse)} -> ${err(fine)}`);});
test('Damping removes rather than creates energy',()=>{const s=new Simulation({...DEFAULTS,beta:.03});let old=s.e0;for(let i=0;i<4800;i++){s.step();const e=energy(s.q,s.p);assert.ok(e<=old+1e-13);old=e;}assert.ok(old<s.e0*.65);assert.equal(s.stopped,false);});
test('A diagonal release has zero initial velocity',()=>{const q=initialState({...DEFAULTS,launch:'release'});near(q[2],0,1e-14);near(q[3],0,1e-14);});
test('The exact linear solution preserves initial velocities with damping',()=>{const p={...DEFAULTS,beta:.08,phase:.7};const a=linearSample(0,p),pr=properties(p);near(a.x,p.ax*Math.sin(p.phase));near(a.vx,p.ax*pr.wx*Math.cos(p.phase));near(a.vy,p.ay*pr.wy);});
test('An impossible taut-string state is detected',()=>{const s=new Simulation(DEFAULTS);s.q=[.6,0,0,0];s.step();assert.equal(s.stopped,true);assert.match(s.reason,/ослабла/);});
test('Preset lengths reproduce frequency ratios and stable launch limits',()=>{for(const ratio of [1.5,2,3]){const p={...DEFAULTS,l:.4/ratio**2,h:.4-.4/ratio**2};near(properties(p).ratio,ratio);p.ax=Math.min(.01,amplitudeLimit(p)*.6);const s=new Simulation(p);for(let i=0;i<4800;i++)s.step();assert.equal(s.stopped,false);}});
test('Zero amplitude is a stable equilibrium',()=>{const s=new Simulation({...DEFAULTS,ax:0,ay:0});for(let i=0;i<480;i++)s.step();near(s.e0,0);near(s.point.x,0);near(s.point.y,0);near(s.maxDrift,0);});
