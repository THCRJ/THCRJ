window.neonBoard=function(ctx){
'use strict';
const $=id=>document.getElementById(id);let lastBoard='';
function initialBoard(){
 const b=Array(64).fill(0);
 for(let i=0;i<64;i++){const row=i>>3,col=i%8;if((row+col)%2===1)b[i]=row<3?-1:row>4?1:0}
 return b;
}
const inside=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
function captures(b,ix){
 const p=Number(b[ix]||0),r=Math.floor(ix/8),c=ix%8,out=[];
 if(!p)return out;
 for(const dr of [-1,1])for(const dc of [-1,1]){
  const r1=r+dr,c1=c+dc,r2=r+dr*2,c2=c+dc*2;
  if(inside(r2,c2)&&b[r1*8+c1]*p<0&&b[r2*8+c2]===0)out.push(r2*8+c2)
 }
 return out;
}
function available(b,ix,side,forced){
 const p=Number(b[ix]||0),color=side==='w'?1:-1;
 if(p*color<=0||(forced!==null&&forced!==undefined&&ix!==forced))return [];
 const jumps=captures(b,ix),mustJump=b.some((v,j)=>v*color>0&&captures(b,j).length>0);
 if(mustJump)return jumps;
 const out=[],r=Math.floor(ix/8),c=ix%8;
 for(const dr of [-1,1]){
  if(Math.abs(p)===1&&dr!==-color)continue;
  for(const dc of [-1,1])if(inside(r+dr,c+dc)&&b[(r+dr)*8+c+dc]===0)out.push((r+dr)*8+c+dc)
 }
 return out;
}
function destinations(){
 const g=ctx.state?.game,selected=ctx.selected;
 if(!g||g.status!=='active'||g.you!==g.turn||selected===null)return new Set();
 return new Set(available(g.board,selected,g.you,g.forced_from))
}
function renderBoard(){
 const state=ctx.state,busy=ctx.busy,selected=ctx.selected;
 const g=state?.game,b=Array.isArray(g?.board)&&g.board.length===64?g.board:initialBoard();
 const flipped=g?.you==='b',allowed=destinations(),playable=g?.status==='active'&&g.you===g.turn&&!busy;
 const signature=JSON.stringify([g?.id,g?.board,g?.turn,g?.forced_from,g?.last_move,g?.status,g?.you,selected,busy]);
 if(signature===lastBoard)return;
 lastBoard=signature;
 const frag=document.createDocumentFragment();
 for(let slot=0;slot<64;slot++){
  const ix=flipped?63-slot:slot,r=Math.floor(ix/8),c=ix%8;
  const sq=document.createElement('button');
  sq.type='button';sq.className='square '+((r+c)%2?'dark':'light');
  if(selected===ix)sq.classList.add('selected');
  if(allowed.has(ix))sq.classList.add('target');
  if(g?.last_move?.type==='move'&&(g.last_move.from===ix||g.last_move.to===ix))sq.classList.add('last');
  sq.disabled=!playable||((r+c)%2===0);
  const piece=Number(b[ix]||0);
  let accessible='Linha '+(r+1)+', coluna '+(c+1);
  if(piece!==0){
   const disc=document.createElement('span');
   disc.className='piece '+(piece>0?'white':'black')+(Math.abs(piece)===2?' king':'');
   disc.setAttribute('aria-hidden','true');
   sq.append(disc);accessible+=piece>0?', peça clara':', peça escura';
   if(Math.abs(piece)===2)accessible+=', dama';
  }
  sq.setAttribute('aria-label',accessible);
  sq.onclick=()=>selectSquare(ix);
  frag.append(sq)
 }
 $('board').replaceChildren(frag);
}
function selectSquare(ix){
 const g=ctx.state?.game,selected=ctx.selected,busy=ctx.busy;
 if(!g||g.status!=='active'||g.turn!==g.you||busy)return;
 const b=g.board,color=g.you==='w'?1:-1;
 if(selected!==null&&destinations().has(ix)){ctx.act('move',{from:selected,to:ix});return}
 if(Number(b[ix]||0)*color>0){
  const opts=available(b,ix,g.you,g.forced_from);
  if(opts.length){ctx.selected=selected===ix?null:ix;lastBoard='';renderBoard();return}
 }
 if(selected!==null)ctx.note('Movimento inválido. Toque em uma casa destacada.');
}

return renderBoard;
};
