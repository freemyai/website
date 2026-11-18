import qrcode from './vendor/qrcode-generator-2.0.4.mjs';

export function buildQrMatrix(url){
  let parsed;
  try{parsed=new URL(url);}catch{throw new Error('Invalid QR URL');}
  if(parsed.origin!=='https://freemy.ai'||parsed.username||parsed.password||parsed.port||parsed.search||parsed.hash||parsed.href!==url||!/^\/(?:zh\/)?[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(parsed.pathname))throw new Error('Invalid QR URL');
  const code=qrcode(0,'M');code.addData(url,'Byte');code.make();
  const size=code.getModuleCount();
  return {size,quietZone:4,modules:Array.from({length:size},(_,row)=>Array.from({length:size},(_,col)=>code.isDark(row,col)))};
}

export function drawQr(canvas,url){
  const {size,quietZone,modules}=buildQrMatrix(url),scale=6;
  canvas.width=canvas.height=(size+2*quietZone)*scale;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#000';
  for(let row=0;row<size;row++)for(let col=0;col<size;col++)if(modules[row][col])ctx.fillRect((col+quietZone)*scale,(row+quietZone)*scale,scale,scale);
}
