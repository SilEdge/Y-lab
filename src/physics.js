/** SI throughout. An ideal massless Y junction with two taut upper branches.
 * q = [theta, alpha, thetaDot, alphaDot].
 * K=(0,h sin(alpha),-h cos(alpha)), rho=h+l cos(theta),
 * C=(l sin(theta),rho sin(alpha),-rho cos(alpha)).
 * Euler–Lagrange for T=m/2(l² thetaDot²+rho² alphaDot²),
 * V=mg(h+l-rho cos(alpha)); Rayleigh R=m beta |v|².
 * Positive tensions are required. Slack strings are explicitly unsupported.
 */
export const STEP = 1 / 480;
export const DEFAULTS = Object.freeze({h: .3, l: .1, d: .2, mass: .05, g: 9.81, ax: .01, ay: .01, phase: 0, launch: 'center', beta: 0, speed: 1, model: 'nonlinear'});
export const clamp = (x,a,b) => Math.min(b,Math.max(a,x));
export function properties(p) {
  const L=p.h+p.l, wx=Math.sqrt(p.g/p.l), wy=Math.sqrt(p.g/L);
  return {L,wx,wy,tx:2*Math.PI/wx,ty:2*Math.PI/wy,fx:wx/(2*Math.PI),fy:wy/(2*Math.PI),ratio:wx/wy,s:Math.hypot(p.h,p.d/2)};
}
export function amplitudeLimit(p) {
  // Reserve both a small-angle margin and a margin to the upper-string slack limit.
  return Math.min(p.l*.22,p.l*Math.sin(Math.atan(p.d/(2*p.h)))*.68);
}
export function validate(p) {
  for (const name of ['h','l','d','mass','g','ax','ay','phase','beta','speed']) if (!Number.isFinite(p[name])) throw new Error(`Invalid ${name}`);
  if(p.h<=0 || p.l<=0 || p.d<=0 || p.mass<=0 || p.g<=0 || p.ax<0 || p.ay<0 || p.beta<0) throw new Error('Invalid physical parameters');
  return p;
}
export function initialState(p) {
  validate(p);
  const {wx,wy}=properties(p), px=p.launch==='release'?Math.PI/2:p.phase, py=p.launch==='release'?Math.PI/2:0;
  const x=p.ax*Math.sin(px), y=p.ay*Math.sin(py), vx=p.ax*wx*Math.cos(px), vy=p.ay*wy*Math.cos(py);
  const theta=Math.asin(clamp(x/p.l,-.9,.9)), rho=p.h+p.l*Math.cos(theta), alpha=Math.asin(clamp(y/rho,-.9,.9));
  const td=vx/(p.l*Math.cos(theta)), ad=(vy+p.l*Math.sin(theta)*td*Math.sin(alpha))/(rho*Math.cos(alpha));
  return [theta,alpha,td,ad];
}
export function derivative(q,p) {
  const [th,al,td,ad]=q, rho=p.h+p.l*Math.cos(th);
  return [td,ad,-rho/p.l*Math.sin(th)*ad*ad-p.g/p.l*Math.sin(th)*Math.cos(al)-2*p.beta*td,
    2*p.l*Math.sin(th)/rho*td*ad-p.g/rho*Math.sin(al)-2*p.beta*ad];
}
export function rk4(q,p,dt=STEP) {
  const k1=derivative(q,p), k2=derivative(q.map((v,i)=>v+dt*k1[i]/2),p), k3=derivative(q.map((v,i)=>v+dt*k2[i]/2),p), k4=derivative(q.map((v,i)=>v+dt*k3[i]),p);
  return q.map((v,i)=>v+dt/6*(k1[i]+2*k2[i]+2*k3[i]+k4[i]));
}
export function position(q,p) {
  const [th,al]=q, rho=p.h+p.l*Math.cos(th);
  return {x:p.l*Math.sin(th),y:rho*Math.sin(al),z:-rho*Math.cos(al),kx:0,ky:p.h*Math.sin(al),kz:-p.h*Math.cos(al)};
}
export function energy(q,p) {
  const [th,al,td,ad]=q,rho=p.h+p.l*Math.cos(th);
  // Cancellation-resistant potential around the equilibrium.
  const potential=p.mass*p.g*(2*p.l*Math.sin(th/2)**2+rho*2*Math.sin(al/2)**2);
  return .5*p.mass*(p.l*p.l*td*td+rho*rho*ad*ad)+potential;
}
export function tensions(q,p) {
  const [th,al,td,ad]=q,rho=p.h+p.l*Math.cos(th),{s}=properties(p);
  // Lower tension is the surface-normal reaction; isotropic drag is tangent.
  const lower=p.mass*(p.g*Math.cos(th)*Math.cos(al)+p.l*td*td+rho*Math.cos(th)*ad*ad);
  const sum=lower*Math.cos(th)*s/p.h, diff=lower*Math.sin(th)*s/(p.d/2);
  return {lower,left:(sum+diff)/2,right:(sum-diff)/2};
}
export function linearSample(t,p) {
  const {wx,wy}=properties(p), px=p.launch==='release'?Math.PI/2:p.phase, py=p.launch==='release'?Math.PI/2:0;
  const wdX=Math.sqrt(Math.max(0,wx*wx-p.beta*p.beta)),wdY=Math.sqrt(Math.max(0,wy*wy-p.beta*p.beta));
  // Exact damped linear solution preserving the requested initial x and v.
  function at(w,wd,a,phi){
    const c=a*Math.sin(phi), v=a*w*Math.cos(phi), s=(v+p.beta*c)/wd;
    const ct=Math.cos(wd*t),st=Math.sin(wd*t),dec=Math.exp(-p.beta*t);
    return {x:dec*(c*ct+s*st),v:dec*((-c*wd*st+s*wd*ct)-p.beta*(c*ct+s*st))};
  }
  const x=at(wx,wdX,p.ax,px),y=at(wy,wdY,p.ay,py);
  return {x:x.x,y:y.x,vx:x.v,vy:y.v};
}
export function linearState(t,p) {
  const {x,y,vx,vy}=linearSample(t,p),theta=Math.asin(clamp(x/p.l,-.95,.95)),rho=p.h+p.l*Math.cos(theta),alpha=Math.asin(clamp(y/rho,-.95,.95));
  const td=vx/(p.l*Math.cos(theta)),ad=(vy+p.l*Math.sin(theta)*td*Math.sin(alpha))/(rho*Math.cos(alpha));
  return [theta,alpha,td,ad];
}
export class Simulation {
  constructor(p=DEFAULTS){this.reset(p);}
  reset(p){this.p={...p};validate(this.p);this.q=initialState(this.p);this.t=0;this.e0=energy(this.q,this.p);this.maxDrift=0;this.stopped=false;this.reason='';}
  step(dt=STEP){
    if(this.stopped)return;
    this.q=this.p.model==='linear'?linearState(this.t+dt,this.p):rk4(this.q,this.p,dt);this.t+=dt;
    if(!this.q.every(Number.isFinite)){this.stopped=true;this.reason='Расчёт остановлен: недопустимое состояние.';return;}
    const T=tensions(this.q,this.p);
    if(Math.min(T.lower,T.left,T.right)<=0){this.stopped=true;this.reason='Одна из нитей ослабла. Уменьшите амплитуду или увеличьте расстояние между отверстиями.';}
    if(this.p.beta===0 && this.p.model==='nonlinear' && this.e0>0)this.maxDrift=Math.max(this.maxDrift,Math.abs(energy(this.q,this.p)/this.e0-1));
  }
  get point(){return position(this.q,this.p);}
}
