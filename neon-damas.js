/* Neon Play — Damas online 8×8. O servidor valida movimentos, carteira e prêmios. */
(()=>{
'use strict';
const API='https://plcyaarsfzmjoqkbqlid.supabase.co/functions/v1/neon-damas';
const STORE='np_damas_guest_credentials_v1';
const $=id=>document.getElementById(id);
const boardEl=$('np-damas-board'),notice=$('np-damas-hint'),credits=$('np-damas-balance'),nameEl=$('np-damas-nickname');
if(!boardEl || !notice || !credits || !nameEl)return;
const fmt=new Intl.NumberFormat('pt-BR');
const stakeInput=$('np-damas-stake-value');
if(!stakeInput)return;
let auth=null,state=null,stake=100,selected=null,busy=false,lastDraw='',lastGameId='',lastStatus='',lastTurn='',serverOnline=false;
let heartbeat=null,lastResponseAt=0,pollInFlight=false,actionEpoch=0,bootPending=false,lastOffersSig=null;
function text(id,value){const el=$(id);if(el)el.textContent=String(value);}
function note(message,kind=''){
  notice.textContent=message;
  notice.className='np-damas-hint'+(kind?' '+kind:'');
}
function readAuth(){try {return JSON.parse(localStorage.getItem(STORE)||'null')}catch{return null}}
function writeAuth(a){try{localStorage.setItem(STORE,JSON.stringify(a))}catch{}}
function clearAuth(){try{localStorage.removeItem(STORE)}catch{}}
async function request(action,values={},timeout=13000){
 const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),timeout);
 try{
  const body={action,...(auth||{}),...values};
  const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctl.signal,cache:'no-store'});
  let data;try{data=await response.json()}catch{throw new Error('O servidor retornou uma resposta inválida')}
  if(!response.ok||!data?.ok)throw new Error(data?.error||'Falha na comunicação com o servidor');
  lastResponseAt=Date.now();serverOnline=true;
  return data;
 }catch(e){
  if(e?.name==='AbortError')throw new Error('Conexão com as damas demorou demais. Toque em Reconectar.');
  if(e instanceof TypeError)throw new Error('Servidor de damas indisponível. Verifique sua conexão e toque em Reconectar.');
  throw e;
 }finally{clearTimeout(timer)}
}
function initialBoard(){
 const b=Array(64).fill(0);
 for(let i=0;i<64;i++){
  const r=Math.floor(i/8),c=i%8;
  if((r+c)%2===1){if(r<3)b[i]=-1;else if(r>4)b[i]=1}
 }
 return b;
}
function inside(r,c){return r>=0&&r<8&&c>=0&&c<8}
function captures(b,i){
 const piece=Number(b[i]||0),out=[],r=Math.floor(i/8),c=i%8;
 if(!piece)return out;
 for(const dr of [-1,1])for(const dc of [-1,1]){
  const r1=r+dr,c1=c+dc,r2=r+dr*2,c2=c+dc*2;
  if(inside(r2,c2)&&b[r1*8+c1]*piece<0&&b[r2*8+c2]===0)out.push(r2*8+c2)
 }
 return out;
}
function moves(b,i,side,forced){
 const piece=Number(b[i]||0),color=side==='w'?1:-1;
 if(piece*color<=0 || (forced!==null&&forced!==undefined&&forced!==i))return [];
 const captured=captures(b,i);
 const globalCapture=b.some((v,ix)=>v*color>0&&captures(b,ix).length>0);
 if(globalCapture)return captured;
 const out=[],r=Math.floor(i/8),c=i%8;
 for(const dr of [-1,1]){
  if(Math.abs(piece)===1&&dr!==-color)continue;
  for(const dc of [-1,1]){
   const rr=r+dr,cc=c+dc;
   if(inside(rr,cc)&&b[rr*8+cc]===0)out.push(rr*8+cc);
  }
 }
 return out;
}
function legalSet(){
 const g=state?.game;
 if(!g || g.status!=='active'||g.you!==g.turn||selected===null)return new Set();
 return new Set(moves(g.board,selected,g.you,g.forced_from));
}
function renderBoard(){
 const g=state?.game;
 const b=Array.isArray(g?.board)&&g.board.length===64?g.board:initialBoard();
 const flipped=g?.you==='b',allowed=legalSet();
 const canPlay=g?.status==='active'&&g?.you===g?.turn&&!busy;
 boardEl.setAttribute('aria-busy',String(busy));
 const frag=document.createDocumentFragment();
 for(let display=0;display<64;display++){
  const i=flipped?63-display:display;
  const r=Math.floor(i/8),c=i%8;
  const sq=document.createElement('button');sq.type='button';
  sq.className='np-damas-square '+((r+c)%2===1?'dark':'light');
  if(i===selected)sq.classList.add('selected');
  if(allowed.has(i))sq.classList.add('legal');
  if(g?.last_move?.type==='move'&&g.last_move.from===i)sq.classList.add('last-from');
  if(g?.last_move?.type==='move'&&g.last_move.to===i)sq.classList.add('last-to');
  sq.dataset.square=String(i);
  sq.disabled=!(canPlay && (r+c)%2===1);
  sq.setAttribute('aria-label', 'Casa '+(r+1)+','+(c+1));
  const piece=Number(b[i]||0);
  if(piece){
   const mark=document.createElement('span');
   mark.className='np-damas-piece '+(piece>0?'white':'black')+(Math.abs(piece)===2?' king':'');
   mark.setAttribute('aria-hidden','true');
   sq.appendChild(mark);
   sq.setAttribute('aria-label',sq.getAttribute('aria-label')+', '+(piece>0?'peça clara':'peça escura')+(Math.abs(piece)===2?', dama':''));
  }
  sq.addEventListener('click',()=>clickSquare(i));
  frag.appendChild(sq);
 }
 boardEl.replaceChildren(frag);
}
function waitingList(){
 const offers=Array.isArray(state?.offers)?state.offers:[];
 const list=$('np-damas-waiting-list');
 const signature=JSON.stringify({offers:offers.map(x=>[x.player_id,x.nickname,x.stake]),balance:state?.player?.balance,playing:!!state?.game,busy});
 if(signature===lastOffersSig)return;
 lastOffersSig=signature;
 list.replaceChildren();
 if(!offers.length){
   const empty=document.createElement('div');
   empty.className='np-damas-empty';
   empty.textContent='Nenhum desafio aberto neste momento. Publique o seu e convide um amigo!';
   list.appendChild(empty);
   return;
 }
 for(const item of offers.slice(0,40)){
   const value=Number(item.stake);
   if(!Number.isInteger(value)||value<1||!item.player_id)continue;
   const row=document.createElement('div');
   row.className='np-damas-offer';
   const info=document.createElement('div');
   info.className='np-damas-offer-info';
   const username=document.createElement('strong');
   username.textContent=item.nickname||'Jogador';
   const amount=document.createElement('span');
   amount.textContent=fmt.format(value)+' créditos por jogador';
   info.append(username,amount);
   const button=document.createElement('button');
   button.type='button';
   button.className='np-damas-accept';
   button.textContent=(state?.player?.balance??0)<value?'Saldo insuficiente':'Aceitar';
   button.disabled=busy||!!state?.game||(state?.player?.balance??0)<value;
   button.setAttribute('aria-label','Aceitar desafio de '+username.textContent+', valendo '+fmt.format(value)+' créditos fictícios');
   button.addEventListener('click',()=>act('accept',{target:item.player_id}));
   row.append(info,button);
   list.append(row);
 }
}
function stakeValue(){
 const raw=stakeInput.value.trim();
 const number=Number(raw);
 return /^\d+$/.test(raw)&&Number.isSafeInteger(number)&&number>=1&&number<=100000000 ? number : null;
}
function render(){
 if(!state)return;
 const stamp=lastResponseAt?new Date(lastResponseAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
 text('np-damas-updated','Lista atualizada às '+stamp+' • atualização automática');
 $('np-damas-refresh').disabled=busy||pollInFlight||bootPending;
 credits.textContent=fmt.format(state.player?.balance??0);
 text('np-damas-player-name',state.player?.nickname||'Jogador');
 text('np-damas-queue-count',Array.isArray(state.offers)?state.offers.length:0);
 waitingList();
 const game=state.game,queue=state.queue;
 const inGame=!!game,active=game?.status==='active',finished=game?.status==='finished';
 $('np-damas-find').hidden=inGame||!!queue;
 $('np-damas-waiting').hidden=!queue;
 $('np-damas-match').hidden=!inGame;
 $('np-damas-play-actions').hidden=!active;
 $('np-damas-finished-actions').hidden=!finished;
 if(queue)text('np-damas-wait-stake',fmt.format(queue.stake||0));
 const proposed=stakeValue();
 document.querySelectorAll('.np-damas-stake').forEach(btn=>{
   const value=Number(btn.dataset.stake);
   btn.classList.toggle('selected',value===proposed);
   btn.disabled=busy||(state.player.balance<value);
 });
 $('np-damas-start').disabled=busy||!!state.game||!!state.queue||proposed===null||state.player.balance<proposed;
 $('np-damas-start').textContent='📣 Publicar desafio'+(proposed!==null?' de '+fmt.format(proposed)+' créditos':'');
 if(inGame){
  const opponent=game.you==='w'?game.black_name:game.white_name;
  text('np-damas-opponent',opponent||'Adversário');
  text('np-damas-pot',fmt.format(game.stake*2));
  text('np-damas-your-color',game.you==='w'?'Claras':'Escuras');
  text('np-damas-moves',String(game.moves||0));
  $('np-damas-offer-draw').disabled=busy||!!game.draw_offer;
  $('np-damas-accept-draw').hidden=!(game.draw_offer&&game.draw_offer!==game.you);
  $('np-damas-decline-draw').hidden=!(game.draw_offer&&game.draw_offer!==game.you);
  $('np-damas-claim-timeout').hidden=!(active && game.you!==game.turn && new Date(game.updated_at).getTime()<Date.now()-5*60*1000);
  if(finished){
   if(game.winner_id===null)note('🤝 Empate! Cada jogador recebeu sua aposta de volta.','ok');
   else if(game.winner_id===state.player.id)note('🏆 Você venceu! '+fmt.format(game.stake*2)+' créditos de prêmio total.','ok');
   else note('Partida encerrada. O adversário venceu a aposta.','');
  }else if(game.draw_offer&&game.draw_offer!==game.you){
   note('🤝 O adversário propôs empate. Aceitar devolve a aposta aos dois.','');
  }else if(game.you===game.turn){
   note(game.forced_from!==null&&game.forced_from!==undefined?'⚡ Continue capturando com a mesma peça.':'✅ Sua vez! Toque na sua peça e depois na casa de destino.','ok');
  }else{
   note('⏳ Vez de '+opponent+'. A partida atualiza automaticamente.','');
  }
 }else if(queue)note('📣 Seu desafio está publicado. Outro jogador poderá aceitar pela lista de desafios.','ok');
 else note('Defina o valor e publique seu desafio. Ou aceite um desafio da lista para jogar agora.','');
 const boardSig=JSON.stringify([game?.id,game?.status,game?.turn,game?.forced_from,game?.board,game?.last_move,busy,selected]);
 if(lastDraw!==boardSig){lastDraw=boardSig;renderBoard()}
}
async function act(action,values={}){
 if(busy||!auth)return;
 actionEpoch++;
 busy=true;
 renderBoard();
 let errorMessage=null;
 try{
  const data=await request(action,values);
  state=data;
  if(['move','leave','accept','offer'].includes(action))selected=null;
  lastDraw='';
 }catch(e){
  errorMessage=e.message||'Não foi possível concluir a ação';
 }finally{
  busy=false;
  lastDraw='';
  if(state)render();
  if(errorMessage)note(errorMessage,'error');
 }
}
function clickSquare(i){
 const g=state?.game;
 if(!g||g.status!=='active'||g.turn!==g.you||busy)return;
 const b=g.board,color=g.you==='w'?1:-1;
 if(selected!==null && legalSet().has(i)){act('move',{from:selected,to:i});return}
 if(b[i]*color>0){
   const allowed=moves(b,i,g.you,g.forced_from);
   if(!allowed.length){
     note(g.forced_from!==null?'Continue com a peça que está capturando.':'Esta peça não tem jogadas permitidas. Verifique as capturas obrigatórias.','');
     return;
   }
   selected=selected===i?null:i;lastDraw='';renderBoard();
 }else if(selected!==null){
   note('Movimento inválido. Escolha uma das casas destacadas.','');
 }
}
async function bootstrap(){
 bootPending=true;
 const saved=readAuth();
 if(saved?.id&&saved?.token)auth=saved;
 note('Conectando ao salão de damas...','');
 try{
  const d=await request('bootstrap',{nickname:document.querySelector('#np-chat-name')?.value||'Jogador'},14000);
  if(d.auth){auth=d.auth;writeAuth(auth)}
  state=d;nameEl.value=d.player.nickname;stake=100;stakeInput.value='100';selected=null;render();
 }catch(e){
  note(e.message,'error');
  $('np-damas-retry').hidden=false;
  if(/Sessão/.test(e.message)){
    clearAuth();auth=null;
    note('Sua sessão antiga não foi aceita. Toque em Reconectar para criar outro perfil.','error');
  }
 }finally{bootPending=false}
}
$('np-damas-retry').addEventListener('click',()=>{ $('np-damas-retry').hidden=true;bootstrap() });
document.querySelectorAll('.np-damas-stake').forEach(btn=>btn.addEventListener('click',()=>{
 stakeInput.value=btn.dataset.stake;
 stake=Number(btn.dataset.stake);
 if(state)render();
}));
stakeInput.addEventListener('input',()=>{if(state)render()});
$('np-damas-start').addEventListener('click',()=>{
 const value=stakeValue();
 if(value===null){note('Digite um valor inteiro positivo de créditos virtuais.','error');return}
 if(!state||value>state.player.balance){note('Seu saldo não cobre esse desafio.','error');return}
 act('offer',{stake:value});
});
$('np-damas-cancel').addEventListener('click',()=>act('cancel'));
$('np-damas-resign').addEventListener('click',()=>{
 if(window.confirm('Desistir da partida? Seu adversário receberá o prêmio de '+fmt.format(state.game.stake*2)+' créditos fictícios.'))act('resign')
});
$('np-damas-offer-draw').addEventListener('click',()=>act('offer_draw'));
$('np-damas-accept-draw').addEventListener('click',()=>act('accept_draw'));
$('np-damas-decline-draw').addEventListener('click',()=>act('decline_draw'));
$('np-damas-claim-timeout').addEventListener('click',()=>act('timeout'));
$('np-damas-leave').addEventListener('click',()=>act('leave'));
$('np-damas-name-save').addEventListener('click',async()=>{
 const nickname=nameEl.value.replace(/[<>\r\n\t]/g,'').replace(/\s+/g,' ').trim().slice(0,18);
 if(nickname.length<2){note('Apelido muito curto','error');return}
 await act('rename',{nickname});
 if(state?.player?.nickname===nickname){
   const input=document.querySelector('#np-chat-name');
   if(input){input.value=nickname;input.dispatchEvent(new Event('change'))}
 }
});
$('np-damas-reset').addEventListener('click',()=>{
 if(state?.game?.status==='active'||state?.queue){note('Cancele sua busca ou termine a partida antes de reiniciar.','error');return}
 if(window.confirm('Criar novo perfil? O saldo anterior de damas ficará neste perfil antigo e não poderá ser recuperado sem suas credenciais.')){
  clearAuth();auth=null;state=null;selected=null;$('np-damas-retry').hidden=true;bootstrap();
 }
});
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.tab==='checkers'&&state)render()}));
async function refreshLobby(){
 if(!auth||busy||bootPending||pollInFlight||document.visibilityState==='hidden')return;
 pollInFlight=true;
 const currentEpoch=actionEpoch;
 try{
  const latest=await request('state',{},12000);
  if(currentEpoch!==actionEpoch)return;
  const changed=JSON.stringify([latest.game?.id,latest.game?.board,latest.game?.turn,latest.game?.status,latest.game?.forced_from])
    !==JSON.stringify([state?.game?.id,state?.game?.board,state?.game?.turn,state?.game?.status,state?.game?.forced_from]);
  state=latest;
  if(changed){selected=null;lastDraw=''}
 }catch(e){
  serverOnline=false;
  if(Date.now()-lastResponseAt>12000)note('Conexão com a lista interrompida. Toque em Atualizar lista.','error');
 }finally{
  pollInFlight=false;
  if(state)render();
 }
}
$('np-damas-refresh').addEventListener('click',refreshLobby);
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible')refreshLobby();
});
window.addEventListener('focus',refreshLobby);
heartbeat=setInterval(refreshLobby,2800);
bootstrap();
})();