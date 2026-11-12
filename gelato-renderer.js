/* Shared preview/card compositor. All coordinates are relative to the unchanged flavor photo. */
(function(root){
'use strict';
const RECIPES=[
 {name:'Jelly beans',count:12,size:[.041,.056],squash:.86},
 {name:'Chocolate shards',count:14,size:[.037,.063],squash:.76},
 {name:'Star sprinkles',count:34,size:[.014,.024],squash:.78},
 {name:'Chocolate buttons',count:12,size:[.034,.048],squash:.8},
 {name:'Twisted candy',count:8,size:[.040,.062],squash:.83},
 {name:'Wafer pieces',count:5,size:[.067,.092],squash:.87},
 {name:'Rainbow candy',count:7,size:[.045,.065],squash:.77},
 {name:'Mini marshmallows',count:11,size:[.036,.054],squash:.94},
 {name:'Pretzel pieces',count:9,size:[.046,.067],squash:.82},
 {name:'Mint leaves',count:5,size:[.051,.073],squash:.75}
];
// Conservative photographic surface contours: excludes cup rim and background.
const SURFACES=[
 [[.20,.48],[.22,.33],[.32,.23],[.43,.19],[.48,.12],[.59,.17],[.68,.24],[.76,.33],[.80,.46],[.72,.56],[.52,.61],[.34,.57]],
 [[.20,.47],[.24,.31],[.34,.22],[.47,.18],[.52,.12],[.63,.19],[.72,.27],[.79,.40],[.77,.51],[.62,.59],[.43,.60],[.28,.55]],
 [[.21,.48],[.24,.33],[.34,.24],[.43,.17],[.51,.13],[.61,.19],[.71,.27],[.78,.38],[.79,.48],[.67,.57],[.48,.61],[.31,.56]],
 [[.20,.47],[.24,.31],[.34,.22],[.46,.16],[.53,.13],[.65,.20],[.73,.28],[.79,.40],[.77,.50],[.66,.58],[.45,.60],[.29,.55]],
 [[.21,.46],[.26,.30],[.36,.22],[.46,.17],[.53,.13],[.65,.20],[.73,.29],[.80,.42],[.76,.53],[.62,.59],[.43,.60],[.28,.54]],
 [[.20,.47],[.24,.32],[.34,.23],[.46,.17],[.52,.12],[.64,.19],[.72,.28],[.79,.40],[.77,.51],[.64,.58],[.44,.60],[.28,.55]],
 [[.20,.47],[.24,.32],[.35,.23],[.46,.17],[.53,.12],[.64,.19],[.73,.29],[.80,.42],[.76,.53],[.62,.59],[.43,.60],[.28,.54]],
 [[.21,.47],[.25,.31],[.35,.23],[.47,.17],[.53,.12],[.64,.20],[.74,.29],[.79,.42],[.76,.53],[.62,.59],[.43,.60],[.28,.55]],
 [[.20,.47],[.24,.32],[.34,.23],[.46,.17],[.53,.12],[.64,.20],[.73,.29],[.80,.42],[.77,.53],[.62,.59],[.43,.60],[.28,.55]],
 [[.21,.47],[.25,.32],[.35,.24],[.47,.18],[.53,.13],[.64,.20],[.73,.29],[.79,.41],[.76,.52],[.62,.59],[.43,.60],[.29,.55]]
];
function random(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}
function inside(x,y,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit}
function buildPlan(flavor,selected){
 if(!Number.isInteger(flavor)||flavor<0||flavor>9)throw Error('Invalid flavor');
 const ids=[...new Set(selected)].sort((a,b)=>a-b);if(ids.length>3||ids.some(i=>!Number.isInteger(i)||!RECIPES[i]))throw Error('Choose at most three valid toppings');
 const poly=SURFACES[flavor],pieces=[];
 // Round-robin placement gives both ingredients access to the whole surface.
 const generators=ids.map(id=>random(911+id*4729+flavor*97));
 const requests=ids.map(id=>RECIPES[id].count);
 for(let n=0;n<Math.max(0,...requests);n++)for(let slot=0;slot<ids.length;slot++){
 const id=ids[slot],r=generators[slot],recipe=RECIPES[id];if(n>=recipe.count)continue;
 let piece;
 for(let attempt=0;attempt<500;attempt++){
 const quadrant=n%4;
 const stratified=n<4&&attempt<200;
 const x=stratified?((quadrant===0||quadrant===3)?.27:.58)+r()*.15:.20+r()*.60;
 const y=stratified?((quadrant===0||quadrant===2)?.27:.43)+r()*.12:.15+r()*.45;
 const depth=Math.max(0,Math.min(1,(y-.16)/.44));
 const size=(recipe.size[0]+r()*(recipe.size[1]-recipe.size[0]))*(.84+.20*depth);
 const radius=size*.62;
 if(![[x-radius,y-radius],[x+radius,y-radius],[x-radius,y+radius],[x+radius,y+radius]].every(p=>inside(...p,poly)))continue;
 // Prevent intersections, including mixed-size sprinkles, without forcing a grid.
 if(pieces.some(p=>Math.hypot(x-p.x,(y-p.y)*1.12)<(size+p.size)*.43))continue;
 piece={id,x,y,size,angle:(r()-.5)*Math.PI*1.8+(x-.5)*.35,squash:recipe.squash*(.78+.21*depth),embed:.06+r()*.15,variant:Math.floor(r()*6),light:.91+r()*.08,depth};break;
 }
 if(!piece)throw Error('Surface too crowded');pieces.push(piece);
 }
 return pieces.sort((a,b)=>a.y-b.y||a.id-b.id);
}
let loading;
let heroLoading;let pairLoading;const singlePhotos=new Map();const deltaPhotos=new Map();
function hero(){return heroLoading||(heroLoading=image('assets/strawberry-hope-dignity-v1.png'))}
function pair(){return pairLoading||(pairLoading=image('assets/flavors-hope-dignity-v1.png'))}
function singlePhoto(id){if(!singlePhotos.has(id))singlePhotos.set(id,image(`assets/topping-photo-${id}.png`));return singlePhotos.get(id)}
async function deltaPhoto(id,base){if(deltaPhotos.has(id))return deltaPhotos.get(id);const build=(async()=>{const photo=await singlePhoto(id),w=base.naturalWidth,h=base.naturalHeight,b=canvas(w,h),p=canvas(w,h);const bc=b.getContext('2d',{willReadFrequently:true}),pc=p.getContext('2d',{willReadFrequently:true});bc.drawImage(base,0,0);pc.drawImage(photo,0,0);const source=bc.getImageData(0,0,w,h).data,part=pc.getImageData(0,0,w,h),out=part.data,cw=w/5,ch=h/2;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const ix=(y*w+x)*4,fx=(x%cw)/cw,fy=(y%ch)/ch,ellipse=((fx-.5)/.46)**2+((fy-.34)/.34)**2;const d=Math.max(Math.abs(out[ix]-source[ix]),Math.abs(out[ix+1]-source[ix+1]),Math.abs(out[ix+2]-source[ix+2]));out[ix+3]=ellipse<=1&&fy<.64?Math.round(Math.max(0,Math.min(1,(d-20)/45))*255):0;}pc.putImageData(part,0,0);return p})();deltaPhotos.set(id,build);return build}
function canvas(w,h=w){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function image(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Could not load '+src));i.src=src})}
async function assets(){if(!loading)loading=Promise.all([image('assets/flavors-editorial-v2.png'),image('assets/topping-pieces-cutout-v3.png')]).then(([base,atlas])=>{
 const sprites=[];for(let id=0;id<10;id++){
 const cw=atlas.naturalWidth/5,ch=atlas.naturalHeight/2,c=canvas(Math.floor(cw),Math.floor(ch)),ctx=c.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(atlas,id%5*cw,Math.floor(id/5)*ch,cw,ch,0,0,c.width,c.height);
 const data=ctx.getImageData(0,0,c.width,c.height).data;let l=c.width,t=c.height,r=0,b=0;
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>80){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y)}
 if(r<=l||b<=t)throw Error('Missing topping sprite '+id);
 const cut=canvas(r-l+5,b-t+5);cut.getContext('2d').drawImage(c,l-2,t-2,cut.width,cut.height,0,0,cut.width,cut.height);sprites.push(cut);
 }return {base,sprites};});return loading}
const pieceCache=new Map();
const frameCache=new Map();
function preparedSprite(source,p){
 const key=`${p.id}:${p.variant}:${Math.round(p.embed*25)}:${Math.round(p.light*15)}`;if(pieceCache.has(key))return pieceCache.get(key);
 const w=192,h=Math.max(40,Math.round(w*source.height/source.width)),c=canvas(w,h),ctx=c.getContext('2d');ctx.drawImage(source,0,0,w,h);
 // Depth occlusion fades only the lowermost edge, as if pressed into soft gelato.
 ctx.globalCompositeOperation='destination-out';const g=ctx.createLinearGradient(0,h*(1-p.embed),0,h);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.68,'rgba(0,0,0,.13)');g.addColorStop(1,'rgba(0,0,0,.86)');ctx.fillStyle=g;ctx.fillRect(0,h*(1-p.embed),w,h*p.embed);
 ctx.globalCompositeOperation='source-atop';
 // Bean and mallow color variants preserve photographed highlights and texture.
 if(p.id===0){ctx.filter=`hue-rotate(${[0,38,78,174,298,346][p.variant]}deg)`;const copy=canvas(w,h);copy.getContext('2d').drawImage(c,0,0);ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation='source-over';ctx.drawImage(copy,0,0);ctx.filter='none'}
 if(p.id===7&&p.variant%3===1){ctx.fillStyle='rgba(236,145,168,.22)';ctx.fillRect(0,0,w,h)}
 ctx.globalCompositeOperation='source-atop';ctx.fillStyle=`rgba(25,17,12,${1-p.light})`;ctx.fillRect(0,0,w,h);
 pieceCache.set(key,c);return c;
}
async function draw(target,flavor,selected){
 const {base,sprites}=await assets(),ctx=target.getContext('2d'),size=target.width;
 if(target.height!==size)throw Error('Gelato canvas must be square');
 const frameKey=`${flavor}:${size}`;
 if(!frameCache.has(frameKey)){
 const frame=canvas(size),fctx=frame.getContext('2d',{willReadFrequently:true}),cw=base.naturalWidth/5,ch=base.naturalHeight/2;
 fctx.drawImage(base,flavor%5*cw,Math.floor(flavor/5)*ch,cw,ch,0,0,size,size);
 frameCache.set(frameKey,fctx.getImageData(0,0,size,size));
 }
 // Reuse identical base pixels: avoids browser image-resampling changes after drawing shadows.
 ctx.putImageData(frameCache.get(frameKey),0,0);
 const plan=buildPlan(flavor,selected);
 if(selected.length===2&&selected.includes(1)&&selected.includes(2)){
 const finished=flavor===0?await hero():await pair();
 if(flavor===0)ctx.drawImage(finished,0,0,size,size);
 else {const pw=finished.naturalWidth/5,ph=finished.naturalHeight/2;ctx.drawImage(finished,flavor%5*pw,Math.floor(flavor/5)*ph,pw,ph,0,0,size,size)}
 target.dataset.flavor=flavor;target.dataset.toppings=selected.join(',');target.dataset.pieces=plan.length;target.dataset.ready='true';target.dataset.renderMode='photograph';return plan;
 }
 if(selected.length){try{
 const ids=[...new Set(selected)].sort((a,b)=>a-b),first=await singlePhoto(ids[0]),fw=first.naturalWidth/5,fh=first.naturalHeight/2;
 ctx.drawImage(first,flavor%5*fw,Math.floor(flavor/5)*fh,fw,fh,0,0,size,size);
 for(const id of ids.slice(1)){const layer=await deltaPhoto(id,base),lw=layer.width/5,lh=layer.height/2;ctx.drawImage(layer,flavor%5*lw,Math.floor(flavor/5)*lh,lw,lh,0,0,size,size)}
 target.dataset.flavor=flavor;target.dataset.toppings=selected.join(',');target.dataset.pieces=plan.length;target.dataset.ready='true';target.dataset.renderMode=ids.length===1?'photograph':'photo-blend';return plan;
 }catch(error){/* Keep the previous compositor as an offline fallback. */}}
 ctx.save();ctx.beginPath();SURFACES[flavor].forEach(([x,y],i)=>i?ctx.lineTo(x*size,y*size):ctx.moveTo(x*size,y*size));ctx.closePath();ctx.clip();
 for(const p of plan){
 const sprite=preparedSprite(sprites[p.id],p),w=p.size*size,h=w*sprite.height/sprite.width*p.squash;
 ctx.save();ctx.translate(p.x*size,p.y*size);ctx.rotate(p.angle);
 // Tight directional contact shadow (same upper-left light as the source photo).
 ctx.shadowColor='rgba(67,35,19,.29)';ctx.shadowBlur=Math.max(.5,size*.0018);ctx.shadowOffsetX=size*.0012;ctx.shadowOffsetY=size*.0024;
 ctx.drawImage(sprite,-w/2,-h/2,w,h);ctx.restore();
 }
 ctx.restore();target.dataset.flavor=flavor;target.dataset.toppings=selected.join(',');target.dataset.pieces=plan.length;target.dataset.ready='true';target.dataset.renderMode='composite';return plan;
}
const api={RECIPES,SURFACES,buildPlan,inside,draw,assets};root.PeaceCreamRenderer=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
