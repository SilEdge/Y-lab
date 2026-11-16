const MINT='#b8e88c',PURPLE='#b8a1e7';
function context(canvas){const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);ctx.font='9px Arial';return {ctx,w:rect.width,h:rect.height};}
function text(ctx,s,x,y,align='center',color='#71845f'){ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(s,x,y);}
export function drawXY(canvas,points,p){
 const {ctx,w,h}=context(canvas),left=29,right=w-14,top=14,bottom=h-24,cx=(left+right)/2,cy=(top+bottom)/2,side=Math.min(right-left,bottom-top),limit=Math.max(p.ax,p.ay,.003)*1.32,scale=side/(2*limit);
 ctx.strokeStyle='#2d3a25';ctx.lineWidth=.7;
 for(let n=-2;n<=2;n++){const v=n*limit/2,px=cx+v*scale,py=cy-v*scale;ctx.beginPath();ctx.moveTo(px,top);ctx.lineTo(px,bottom);ctx.moveTo(left,py);ctx.lineTo(right,py);ctx.stroke();if(n!==0){text(ctx,(v*100).toFixed(1).replace('.',','),px,bottom+14);text(ctx,(v*100).toFixed(1).replace('.',','),left-6,py+3,'right');}}
 ctx.strokeStyle='#506640';ctx.beginPath();ctx.moveTo(cx,top);ctx.lineTo(cx,bottom);ctx.moveTo(left,cy);ctx.lineTo(right,cy);ctx.stroke();text(ctx,'x, см',right,bottom+14,'right');text(ctx,'y',left,8,'left');
 ctx.save();ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();
 const visible=points.slice(-2400);ctx.beginPath();for(let i=0;i<visible.length;i++){const pt=visible[i],x=cx+pt.x*scale,y=cy-pt.y*scale;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.strokeStyle=MINT;ctx.lineWidth=1.15;ctx.globalAlpha=.8;ctx.stroke();
 if(visible.length){const pt=visible.at(-1);ctx.globalAlpha=1;ctx.fillStyle='#e5fbcf';ctx.shadowColor=MINT;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(cx+pt.x*scale,cy-pt.y*scale,3,0,Math.PI*2);ctx.fill();}ctx.restore();
}
export function drawTime(canvas,points,p,time){
 const {ctx,w,h}=context(canvas),left=30,right=w-9,top=14,bottom=h-24,mid=(top+bottom)/2,limit=Math.max(p.ax,p.ay,.003)*1.35,scale=(bottom-top)/(2*limit),start=Math.max(0,time-6),end=start+6;
 ctx.lineWidth=.7;
 for(let n=-2;n<=2;n++){const y=mid-n*(bottom-top)/4;ctx.strokeStyle=n===0?'#506640':'#2d3a25';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();text(ctx,(n*limit*50).toFixed(1).replace('.',','),left-6,y+3,'right');}
 for(let i=0;i<=3;i++){const x=left+(right-left)*i/3;ctx.strokeStyle='#2d3a25';ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();if(i<3)text(ctx,(start+i*2).toFixed(0),x,bottom+14);}text(ctx,'t, с',right,bottom+14,'right');text(ctx,'см',left,8,'left');
 ctx.save();ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();
 const visible=points.filter(pt=>pt.t>=start&&pt.t<=end);
 for(const [key,color] of [['x',MINT],['y',PURPLE]]){ctx.beginPath();for(let i=0;i<visible.length;i++){const pt=visible[i],x=left+(pt.t-start)/6*(right-left),y=mid-pt[key]*scale;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.strokeStyle=color;ctx.lineWidth=1.35;ctx.stroke();}ctx.restore();
}
export function trajectorySVG(points,p){
 const limit=Math.max(p.ax,p.ay,.003)*1.2,scale=430/(2*limit),path=points.slice(-2400).map((pt,i)=>`${i?'L':'M'}${(250+pt.x*scale).toFixed(3)},${(250-pt.y*scale).toFixed(3)}`).join(' ');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="550" viewBox="0 0 500 550"><rect width="500" height="550" fill="#161d12"/><path d="M35 250H465M250 35V465" stroke="#3d5030"/><path d="${path}" fill="none" stroke="#b8e88c" stroke-width="1.4"/><text x="35" y="510" font-family="Arial" font-size="14" fill="#c3d3b6">Y Lab · h=${(p.h*100).toFixed(1)} cm · l=${(p.l*100).toFixed(1)} cm</text><text x="35" y="534" font-family="Arial" font-size="11" fill="#849975">${p.model==='linear'?'Linear':'Nonlinear'} · beta=${p.beta.toFixed(3)} /s</text></svg>`;
}
