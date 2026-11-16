import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

export function createScene(container,labelLayer){
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(37,1,.005,20);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.4;
 container.replaceChildren(renderer.domElement);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=.25;controls.maxDistance=2.5;controls.maxPolarAngle=Math.PI*.495;controls.enablePan=false;
 scene.add(new THREE.HemisphereLight(0xdde9cd,0x31332a,2.5));
 const key=new THREE.DirectionalLight(0xf5f0d5,4.2);key.position.set(-.5,1.2,.7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-1;key.shadow.camera.right=1;key.shadow.camera.top=1;key.shadow.camera.bottom=-1;key.shadow.normalBias=.001;scene.add(key);
 const rim=new THREE.DirectionalLight(0xbdc6fc,2.4);rim.position.set(.6,.4,-.6);scene.add(rim);
 const glow=new THREE.PointLight(0xc4f59a,.16,.4);scene.add(glow);
 const matte=new THREE.MeshStandardMaterial({color:0x2c3528,metalness:.6,roughness:.4});
 const metal=new THREE.MeshStandardMaterial({color:0xb3baac,metalness:.9,roughness:.23});
 const darkMetal=new THREE.MeshStandardMaterial({color:0x464c40,metalness:.8,roughness:.3});
 const wood=new THREE.MeshStandardMaterial({color:0xb28c57,roughness:.57});
 const bobMat=new THREE.MeshStandardMaterial({color:0xc9e3aa,metalness:.75,roughness:.17,emissive:0x25351a,emissiveIntensity:.35});
 const stringMat=new THREE.MeshStandardMaterial({color:0xe1ddca,metalness:.15,roughness:.6});
 const floor=new THREE.Mesh(new THREE.CircleGeometry(.9,96),new THREE.MeshStandardMaterial({color:0x242c20,roughness:.95,transparent:true,opacity:.43}));floor.rotation.x=-Math.PI/2;floor.position.y=-.001;floor.receiveShadow=true;scene.add(floor);
 const grid=new THREE.GridHelper(1.5,30,0x4c5a3e,0x39432f);grid.material.transparent=true;grid.material.opacity=.28;scene.add(grid);
 const rig=new THREE.Group();scene.add(rig);
 const sphere=new THREE.Mesh(new THREE.SphereGeometry(.012,36,24),bobMat);sphere.castShadow=true;scene.add(sphere);
 const knot=new THREE.Mesh(new THREE.SphereGeometry(.0038,16,12),darkMetal);scene.add(knot);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.015,.00065,6,48),new THREE.MeshBasicMaterial({color:0xb9e88b,transparent:true,opacity:.45}));ring.rotation.x=Math.PI/2;scene.add(ring);
 const cylinder=new THREE.CylinderGeometry(1,1,1,9);
 function rod(a,b,r,mat,parent=rig){const mesh=new THREE.Mesh(cylinder,mat);mesh.castShadow=true;parent.add(mesh);updateRod(mesh,a,b,r);return mesh;}
 function updateRod(mesh,a,b,r){const d=new THREE.Vector3().subVectors(b,a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(r,d.length(),r);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());}
 const strings=[0,1,2].map(()=>rod(new THREE.Vector3(),new THREE.Vector3(0,.1,0),.0007,stringMat,scene));
 const dimMat=new THREE.LineDashedMaterial({color:0x698255,dashSize:.008,gapSize:.006,transparent:true,opacity:.7});
 const dims=[0,1,2].map(()=>{const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,1,0)]),dimMat);scene.add(line);return line;});
 const trailCap=2400,trailArray=new Float32Array(trailCap*3),trailGeo=new THREE.BufferGeometry();trailGeo.setAttribute('position',new THREE.BufferAttribute(trailArray,3));trailGeo.setDrawRange(0,0);
 const trail=new THREE.Line(trailGeo,new THREE.LineBasicMaterial({color:0xc2ed98,transparent:true,opacity:.72}));trail.frustumCulled=false;scene.add(trail);let trailPoints=[];
 let H=.5,params,showDimensions=true,view='perspective';
 const labels={};
 for(const [id,cls] of [['P',''],['Q',''],['K',''],['mass','mass'],['h','dimension'],['l','dimension'],['d','dimension'],['x','axis-x'],['y','axis-y']]){const el=document.createElement('span');el.className='scene-label '+cls;el.textContent=id;labelLayer.append(el);labels[id]=el;}
 function box(w,h,d,material,pos){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=true;rig.add(mesh);return mesh;}
 const sharedMaterials=new Set([matte,metal,darkMetal,wood]);
 function disposeRig(){for(const child of [...rig.children]){rig.remove(child);child.traverse(obj=>{if(obj.geometry&&obj.geometry!==cylinder)obj.geometry.dispose();if(obj.material&&!sharedMaterials.has(obj.material))obj.material.dispose();});}}
 function setup(p){
  params=p;H=Math.max(.5,p.h+p.l+.08);disposeRig();
  const post=-Math.max(.22,p.d/2+.07),width=Math.abs(post)+.12;
  box(width,.012,.19,matte,[post*.65,.007,-.035]);
  for(const xx of [post-.04,-.065])for(const zz of [-.105,.035])rod(new THREE.Vector3(xx,.008,zz),new THREE.Vector3(xx,.018,zz),.008,darkMetal);
  rod(new THREE.Vector3(post,.018,-.055),new THREE.Vector3(post,H+.045,-.055),.005,metal);
  rod(new THREE.Vector3(post,H+.015,-.055),new THREE.Vector3(0,H+.015,-.055),.0045,metal);
  box(.025,.035,.035,darkMetal,[post,H,-.055]);
  box(p.d+.07,.017,.05,wood,[0,H+.009,0]);
  rod(new THREE.Vector3(0,H+.015,-.055),new THREE.Vector3(0,H+.015,0),.0045,metal);
  for(const x of [-p.d/2,p.d/2]){
   const hole=new THREE.Mesh(new THREE.TorusGeometry(.004,.0013,8,20),darkMetal);hole.rotation.x=Math.PI/2;hole.position.set(x,H+.019,0);rig.add(hole);
   rod(new THREE.Vector3(x,H-.004,0),new THREE.Vector3(x,H+.022,0),.0014,darkMetal);
  }
  const axes=new THREE.Group();rig.add(axes);
  for(const [end,color] of [[new THREE.Vector3(.105,.003,0),0xa8cf85],[new THREE.Vector3(0,.003,.105),0xaa96ce]]){
   const arrow=new THREE.ArrowHelper(end.clone().setY(0).normalize(),new THREE.Vector3(0,.003,0),.105,color,.008,.004);axes.add(arrow);
  }
  labels.mass.textContent=`${Math.round(p.mass*1000)} г`;labels.h.textContent=`h = ${(p.h*100).toFixed(3).replace('.',',')} см`;labels.l.textContent=`ℓ = ${(p.l*100).toFixed(3).replace('.',',')} см`;labels.d.textContent=`d = ${(p.d*100).toFixed(3)} см`;
  clearTrail();setView(view);
 }
 function setView(next){view=next;const target=new THREE.Vector3(-.015,H*.48,0);controls.target.copy(target);
  const scale=Math.max(H/.5,(params.d+.16)/(.7*Math.max(container.clientWidth/container.clientHeight,.4)));
  wood.transparent=next==='top';wood.opacity=next==='top'?.25:1;wood.depthWrite=next!=='top';wood.needsUpdate=true;
  if(next==='top')camera.position.set(target.x,H+1.02*scale,target.z+.0001);
  else if(next==='front')camera.position.set(0,H*.52,1.1*scale);
  else camera.position.set(.62*scale,.60*scale,.9*scale);
  controls.update();
 }
 function label(id,point){const v=point.clone().project(camera);let x=(v.x*.5+.5)*container.clientWidth;const y=(-v.y*.5+.5)*container.clientHeight;if(['h','l','d'].includes(id)){const margin=labels[id].offsetWidth/2+7;x=THREE.MathUtils.clamp(x,margin,container.clientWidth-margin);}labels[id].style.left=`${x}px`;labels[id].style.top=`${y}px`;labels[id].style.display=v.z>1||v.z< -1?'none':'';}
 function line(line,a,b){line.geometry.setFromPoints([a,b]);line.computeLineDistances();line.visible=showDimensions;}
 function update(point){
  const P=new THREE.Vector3(-params.d/2,H,0),Q=new THREE.Vector3(params.d/2,H,0),K=new THREE.Vector3(0,H+point.kz,point.ky),C=new THREE.Vector3(point.x,H+point.z,point.y);
  updateRod(strings[0],P,K,.00075);updateRod(strings[1],Q,K,.00075);updateRod(strings[2],K,C,.00075);
  sphere.position.copy(C);knot.position.copy(K);glow.position.copy(C);ring.position.copy(C);ring.position.y-=.015;
  const dx=params.d/2+.035;line(dims[0],new THREE.Vector3(dx,H,0),new THREE.Vector3(dx,H-params.h,0));line(dims[1],new THREE.Vector3(dx,H-params.h,0),new THREE.Vector3(dx,H-params.h-params.l,0));line(dims[2],new THREE.Vector3(-params.d/2,H+.052,0),new THREE.Vector3(params.d/2,H+.052,0));
  controls.update();
  label('P',P.clone().add(new THREE.Vector3(-.012,.012,0)));label('Q',Q.clone().add(new THREE.Vector3(.012,.012,0)));label('K',K.clone().add(new THREE.Vector3(-.012,.004,0)));label('mass',C.clone().add(new THREE.Vector3(.03,-.005,0)));
  label('h',new THREE.Vector3(dx+.015,H-params.h/2,0));label('l',new THREE.Vector3(dx+.015,H-params.h-params.l/2,0));label('d',new THREE.Vector3(0,H+.064,0));label('x',new THREE.Vector3(.12,.004,0));label('y',new THREE.Vector3(0,.004,.125));
  for(const id of ['h','l','d'])if(!showDimensions||(view==='top'&&id!=='d'))labels[id].style.display='none';
  if(container.clientWidth<500&&view!=='top'){labels.d.style.display='none';dims[2].visible=false;}
  if(view==='top')for(const id of ['P','Q','K'])labels[id].style.display='none';
  renderer.render(scene,camera);
 }
 function appendTrail(point){trailPoints.push([point.x,H+point.z,point.y]);if(trailPoints.length>trailCap)trailPoints.shift();for(let i=0;i<trailPoints.length;i++)trailArray.set(trailPoints[i],i*3);trailGeo.attributes.position.needsUpdate=true;trailGeo.setDrawRange(0,trailPoints.length);}
 function clearTrail(){trailPoints=[];trailGeo.setDrawRange(0,0);}
 const observer=new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(params)setView(view);});observer.observe(container);
 return {setup,update,appendTrail,clearTrail,setView,toggleDimensions(){showDimensions=!showDimensions;return showDimensions;},dispose(){observer.disconnect();controls.dispose();renderer.dispose();}};
}
