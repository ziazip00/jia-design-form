figma.showUI(__html__,{width:420,height:350});
const rgb=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
const hex=c=>'#'+[c.r,c.g,c.b].map(n=>Math.round(n*255).toString(16).padStart(2,'0')).join('');
const solid=h=>[{type:'SOLID',color:rgb(/^#[0-9a-f]{6}$/i.test(h)?h:'#000000')}];
const fillColor=n=>Array.isArray(n.fills)&&n.fills[0]?.type==='SOLID'?hex(n.fills[0].color):'#ffffff';
let busy=false;
figma.ui.onmessage=async m=>{
 if(busy)return;busy=true;let frame;
 try {
 if(m.type==='import') {
  const d=m.document;
  if(!d?.canvas||!Array.isArray(d.layers)||d.layers.length>500||![d.canvas.width,d.canvas.height].every(v=>Number.isFinite(v)&&v>0&&v<=8192))throw Error('지원하지 않는 문서입니다.');
  frame=figma.createFrame();frame.name=String(d.name||'지아디자인폼');frame.resize(d.canvas.width,d.canvas.height);frame.fills=solid(d.canvas.background);
  const fonts=await figma.listAvailableFontsAsync();let warnings=0;
  for(const l of d.layers){
   if(![l.x,l.y,l.width,l.height,l.rotation,l.opacity].every(Number.isFinite)||l.width<=0||l.height<=0)throw Error('잘못된 레이어 좌표입니다.');
   let n;
   if(l.type==='text'){
    n=figma.createText();const desired=l.fontWeight>=600?'Bold':'Regular';
    const font=fonts.find(f=>f.fontName.family===l.fontFamily&&f.fontName.style===desired)?.fontName||fonts.find(f=>f.fontName.family===l.fontFamily)?.fontName||{family:'Inter',style:desired};
    if(font.family!==l.fontFamily)warnings++;
    await figma.loadFontAsync(font);n.fontName=font;n.characters=String(l.text);n.fontSize=l.fontSize;n.fills=solid(l.color);n.textAutoResize='NONE';n.textAlignHorizontal=String(l.align||'left').toUpperCase();n.lineHeight={unit:'PERCENT',value:l.lineHeight*100};n.letterSpacing={unit:'PIXELS',value:l.letterSpacing};
   }else if(l.type==='image'){
    if(!/^data:image\/(png|jpeg|webp);base64,/.test(l.src))throw Error('PNG/JPG/WEBP 이미지가 필요합니다.');
    n=figma.createRectangle();const image=figma.createImage(figma.base64Decode(l.src.split(',')[1]));
    n.fills=[{type:'IMAGE',imageHash:image.hash,scaleMode:'STRETCH',imageTransform:[[l.flipX?-1:1,0,l.flipX?1:0],[0,l.flipY?-1:1,l.flipY?1:0]]}];
   }else if(l.type==='shape'){
    n=l.shape==='circle'?figma.createEllipse():figma.createRectangle();n.fills=solid(l.fill);n.strokes=l.strokeWidth>0?solid(l.stroke):[];n.strokeWeight=Math.max(0,l.strokeWidth||0);if('cornerRadius'in n)n.cornerRadius=Math.max(0,l.radius||0);
   }else if(l.type==='icon'){
    const paths={sparkle:'M50 0L62 38L100 50L62 62L50 100L38 62L0 50L38 38Z',star:'M50 0L62 35L100 35L70 58L82 95L50 73L18 95L30 58L0 35L38 35Z',heart:'M50 90C-35 35 10 -15 50 20C90 -15 135 35 50 90Z'};
    n=figma.createNodeFromSvg(`<svg width="100" height="100" viewBox="0 0 100 100"><path fill="${/^#[0-9a-f]{6}$/i.test(l.fill)?l.fill:'#000000'}" d="${paths[l.icon]||paths.sparkle}"/></svg>`);
   }else throw Error('지원하지 않는 레이어입니다.');
   frame.appendChild(n);n.resize(l.width,l.height);n.rotation=-l.rotation;n.x=l.x;n.y=l.y;n.opacity=Math.max(0,Math.min(1,l.opacity));n.visible=l.visible!==false;n.locked=l.locked===true;n.name=String(l.name||l.type);
   const effects=[];
   if(l.shadowEnabled)effects.push({type:'DROP_SHADOW',color:{...rgb(l.shadowColor||'#000000'),a:l.shadowOpacity??.3},offset:{x:l.shadowOffsetX||0,y:l.shadowOffsetY||0},radius:l.shadowBlur||0,spread:0,visible:true,blendMode:'NORMAL'});
   if(l.glowEnabled)effects.push({type:'DROP_SHADOW',color:{...rgb(l.glowColor||'#ffffff'),a:l.glowOpacity??.5},offset:{x:0,y:0},radius:l.glowBlur||10,spread:0,visible:true,blendMode:'NORMAL'});
   if(effects.length)n.effects=effects;
   if(l.outlineEnabled&&'strokes'in n){n.strokes=solid(l.outlineColor);n.strokeWeight=l.outlineWidth||1;}
  }
  figma.currentPage.selection=[frame];figma.viewport.scrollAndZoomIntoView([frame]);figma.ui.postMessage({message:`가져오기 완료. ${warnings}개 텍스트에 대체 글꼴을 사용했습니다. 효과 표현은 앱마다 다를 수 있습니다.`});
 }else if(m.type==='export'){
  const f=figma.currentPage.selection[0];if(figma.currentPage.selection.length!==1||f?.type!=='FRAME')throw Error('프레임 하나를 선택하세요.');
  const layers=[];let raster=0;
  for(const n of f.children){
   const b={id:n.id,name:n.name,x:n.x,y:n.y,width:n.width,height:n.height,rotation:-n.rotation,opacity:n.opacity,visible:n.visible,locked:n.locked,zIndex:layers.length};
   const simple=!n.effects?.length&&(!n.strokes?.length||n.type==='RECTANGLE'||n.type==='ELLIPSE');
   if(n.type==='TEXT'&&simple&&typeof n.fontSize==='number'&&typeof n.fontName==='object'&&typeof n.lineHeight==='object'&&typeof n.letterSpacing==='object'&&Array.isArray(n.fills)&&n.fills.length===1&&n.fills[0].type==='SOLID'){
    layers.push({...b,type:'text',text:n.characters,fontFamily:n.fontName.family,fontSize:n.fontSize,fontWeight:/bold/i.test(n.fontName.style)?700:400,color:fillColor(n),align:['LEFT','CENTER','RIGHT'].includes(n.textAlignHorizontal)?n.textAlignHorizontal.toLowerCase():'left',lineHeight:n.lineHeight.unit==='PERCENT'?n.lineHeight.value/100:n.lineHeight.unit==='PIXELS'?n.lineHeight.value/n.fontSize:1.2,letterSpacing:n.letterSpacing.unit==='PIXELS'?n.letterSpacing.value:n.letterSpacing.value*n.fontSize/100});
   }else if(['RECTANGLE','ELLIPSE'].includes(n.type)&&simple&&Array.isArray(n.fills)&&n.fills.length===1&&n.fills[0].type==='SOLID'&&typeof n.strokeWeight==='number'&&(n.type==='ELLIPSE'||typeof n.cornerRadius==='number')){
    layers.push({...b,type:'shape',shape:n.type==='ELLIPSE'?'circle':n.cornerRadius?'rounded':'rectangle',fill:fillColor(n),stroke:n.strokes?.[0]?.type==='SOLID'?hex(n.strokes[0].color):'#000000',strokeWidth:n.strokes?.length?n.strokeWeight:0,radius:n.cornerRadius||0});
   }else{
    // Export each unsupported node separately; rendered bounds already include rotation/effects.
    const bytes=await n.exportAsync({format:'PNG',constraint:{type:'SCALE',value:1}});const r=n.absoluteRenderBounds;const origin=f.absoluteTransform;
    if(Math.abs(origin[0][1])>.0001||Math.abs(origin[1][0])>.0001)throw Error('회전된 최상위 프레임은 회전을 0으로 만든 후 내보내세요.');
    layers.push({...b,type:'image',rotation:0,opacity:1,x:r?r.x-origin[0][2]:n.x,y:r?r.y-origin[1][2]:n.y,width:r?.width||n.width,height:r?.height||n.height,src:'data:image/png;base64,'+figma.base64Encode(bytes),flipX:false,flipY:false,keepRatio:true});raster++;
   }
  }
  figma.ui.postMessage({document:{id:f.id,name:f.name,canvas:{width:f.width,height:f.height,background:fillColor(f)},layers},message:`저장 완료. 복합 요소 ${raster}개는 각각 이미지로 변환했습니다.`});
 }
 }catch(e){if(frame&&!frame.removed)frame.remove();figma.ui.postMessage({message:e.message||'변환 실패'});}finally{busy=false;}
};
