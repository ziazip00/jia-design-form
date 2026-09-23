// Pad instead of stretching to an API-supported aspect ratio, then crop back.
export async function removeImageText(source: HTMLCanvasElement, signal: AbortSignal) {
  const wide = source.width / source.height;
  const [w,h] = wide > 1.2 ? [1536,1024] : wide < .83 ? [1024,1536] : [1024,1024];
  const padded = document.createElement('canvas'); padded.width=w; padded.height=h;
  const ctx=padded.getContext('2d')!;
  const scale=Math.min(w/source.width,h/source.height);
  const sw=Math.round(source.width*scale), sh=Math.round(source.height*scale);
  const x=Math.floor((w-sw)/2), y=Math.floor((h-sh)/2);
  ctx.fillStyle='#808080'; ctx.fillRect(0,0,w,h); ctx.drawImage(source,x,y,sw,sh);
  let input=padded.toDataURL('image/png');
  if(input.length>5_000_000) input=padded.toDataURL('image/jpeg',.92);
  const response=await fetch('/api/images',{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({
    mode:'edit', image:input, size:`${w}x${h}`, quality:'medium',
    prompt:'Remove ALL text, letters, numbers, captions and typography inside the image. Reconstruct each removed area naturally from surrounding textures, lighting and background. Preserve every non-text subject, object, color, composition and exact placement. Do not replace text with white boxes or transparent holes. Do not add any text. Preserve the gray padding and image boundaries exactly.'
  })});
  const data=await response.json();
  if(!response.ok) throw new Error(data.error || '글자 제거에 실패했습니다.');
  const image=new Image(); image.src=data.src; await image.decode();
  if(signal.aborted) throw new DOMException('Aborted','AbortError');
  const result=document.createElement('canvas'); result.width=source.width; result.height=source.height;
  result.getContext('2d')!.drawImage(image,x*image.width/w,y*image.height/h,sw*image.width/w,sh*image.height/h,0,0,result.width,result.height);
  return result.toDataURL('image/png');
}
