/* Neon Play · Damas Google · créditos 100% fictícios e persistidos no servidor */
(()=>{
'use strict';
const API='https://plcyaarsfzmjoqkbqlid.supabase.co/functions/v1/neon-damas-google';
const SUPA='https://plcyaarsfzmjoqkbqlid.supabase.co';
const KEY='sb_publishable_WDGTdqGJnGQqhkTo6jYw2g_Ic-EIc7a';
const REDIRECT='https://raw.githack.com/THCRJ/THCRJ/neon-play-teste/index.html';
const $=id=>document.getElementById(id);
const fmt=new Intl.NumberFormat('pt-BR');
const sb=window.supabase?.createClient?.(SUPA,KEY,{
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}
});
const colors={w:'claras',b:'escuras'};
let currentUser=null,loginEpoch=0,state=null,busy=false,updating=false,changeEpoch=0,selected=null,lastBoard='',lastOffers='',lastChatRead=0,chatReady=false,chatMessages=new Map(),chatChannel=null,lastSent=0,lastLobbyRefresh=0;
const onScreen=()=>!!currentUser&&!$('app').hidden;
const note=(message,error=false)=>{const el=$('board-hint');el.textContent=message;el.classList.toggle('error',error)};
const chatNote=message=>{$('chat-status').textContent=message};
function loggedOut(message){
 loginEpoch++;currentUser=null;state=null;chatReady=false;chatMessages.clear();lastBoard='';lastOffers='';
 if(chatChannel&&sb){sb.removeChannel(chatChannel);chatChannel=null}
 $('app').hidden=true;$('login-gate').hidden=false;
 $('login-status').textContent=message||'Entre com Google para jogar damas online.';
 $('login-retry').hidden=!sb;$('login-btn').disabled=!sb;
}
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
 const g=state?.game;
 if(!g||g.status!=='active'||g.you!==g.turn||selected===null)return new Set();
 return new Set(available(g.board,selected,g.you,g.forced_from))
}
function renderBoard(){
 const g=state?.game,b=Array.isArray(g?.board)&&g.board.length===64?g.board:initialBoard();
 const flipped=g?.you==='b',allowed=destinations(),playable=g?.status==='active'&&g.you===g.turn&&!busy;
 const signature=JSON.stringify([g?.id,g?.board,g?.turn,g?.forced_from,g?.last_move,g?.status,selected,busy]);
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
 const g=state?.game;
 if(!g||g.status!=='active'||g.turn!==g.you||busy)return;
 const b=g.board,color=g.you==='w'?1:-1;
 if(selected!==null&&destinations().has(ix)){act('move',{from:selected,to:ix});return}
 if(Number(b[ix]||0)*color>0){
  const opts=available(b,ix,g.you,g.forced_from);
  if(opts.length){selected=selected===ix?null:ix;lastBoard='';renderBoard();return}
 }
 if(selected!==null)note('Movimento inválido. Toque em uma casa destacada.');
}
function stateMessage(){
 const g=state?.game;
 if(!g){
  if(state?.queue)return ['Seu desafio está publicado. Aguarde outro jogador aceitar.',false];
  return ['Crie um desafio ou aceite o convite de outro jogador para começar.',false]
 }
 const other=g.you==='w'?g.black_name:g.white_name;
 if(g.status==='finished'){
  if(g.winner_id===null)return ['Partida empatada! Os créditos fictícios foram devolvidos.',false];
  if(g.winner_id===state.player.id)return ['🏆 Você venceu! '+fmt.format(g.stake*2)+' créditos fictícios de prêmio.',false];
  return ['Partida encerrada. '+(other||'Seu adversário')+' venceu.',false]
 }
 if(g.draw_offer&&g.draw_offer!==g.you)return ['O adversário propôs um empate. Você pode aceitar ou recusar.',false];
 if(g.turn===g.you)return [g.forced_from!==null&&g.forced_from!==undefined?'Continue capturando com a mesma peça.':'Sua vez! Toque em uma peça e depois em uma casa destacada.',false];
 return ['Aguarde a jogada de '+(other||'seu adversário')+'.',false]
}
function renderOffers(){
 const arr=Array.isArray(state?.offers)?state.offers:[];
 const sig=JSON.stringify([arr.map(a=>[a.player_id,a.nickname,a.stake]),state?.player?.balance,!!state?.game,busy]);
 $('offers-count').textContent=String(arr.length);
 if(sig===lastOffers)return;
 lastOffers=sig;
 const root=$('offers');root.replaceChildren();
 if(!arr.length){
  const item=document.createElement('div');item.className='empty';item.textContent='Nenhum desafio aberto. Crie um e convide um amigo!';
  root.append(item);return
 }
 arr.slice(0,25).forEach(item=>{
  const amount=Number(item.stake);
  if(!Number.isInteger(amount)||amount<1||!item.player_id)return;
  const line=document.createElement('div');line.className='offer';
  const info=document.createElement('div'),name=document.createElement('strong'),small=document.createElement('small');
  name.textContent=item.nickname||'Jogador';small.textContent=fmt.format(amount)+' créditos por jogador';
  info.append(name,small);
  const btn=document.createElement('button');btn.type='button';
  btn.textContent='Aceitar';
  btn.disabled=busy||!!state.game||!!state.queue||state.player.balance<amount;
  btn.onclick=()=>act('accept',{target:item.player_id});
  line.append(info,btn);root.append(line)
 })
}
function stakeAmount(){
 const txt=$('stake-input').value.trim();
 const n=Number(txt);
 return /^\d+$/.test(txt)&&Number.isSafeInteger(n)&&n>0&&n<=100000?n:null
}
function render(){
 if(!state||!currentUser)return;
 const player=state.player,game=state.game,queue=state.queue;
 $('credits').textContent=fmt.format(player.balance);
 $('own-name').textContent=player.nickname;
 $('player-name-top').textContent=player.nickname;
 if(document.activeElement!==$('nick-input'))$('nick-input').value=player.nickname;
 $('opponent-name').textContent=game?(game.you==='w'?game.black_name:game.white_name):'Aguardando rival';
 $('game-stake').textContent=game?'Prêmio total: '+fmt.format(game.stake*2)+' créditos':'Partidas com créditos fictícios';
 const active=game?.status==='active',finished=game?.status==='finished';
 $('turn-status').textContent=active?(game.turn===game.you?'Sua vez':'Vez do rival'):finished?'Encerrada':queue?'Procurando rival':'Disponível';
 $('turn-status').classList.toggle('wait',!!queue||(active&&game.turn!==game.you));
 $('match-actions').hidden=!active;
 $('finished-actions').hidden=!finished;
 $('btn-accept-draw').hidden=!(active&&game.draw_offer&&game.draw_offer!==game.you);
 $('btn-decline-draw').hidden=!(active&&game.draw_offer&&game.draw_offer!==game.you);
 $('btn-draw').disabled=busy||!!game?.draw_offer;
 $('btn-timeout').hidden=!(active&&game.turn!==game.you&&Date.now()-new Date(game.updated_at).getTime()>5*60*1000);
 $('create-area').hidden=!!game||!!queue;
 $('queue-area').hidden=!queue;
 $('queue-amount').textContent=queue?fmt.format(queue.stake):'';
 const amount=stakeAmount();
 $('btn-create').disabled=busy||amount===null||amount>player.balance;
 document.querySelectorAll('.stake-option').forEach(btn=>{
  const n=Number(btn.dataset.amount);
  btn.classList.toggle('selected',n===amount);
  btn.disabled=busy||n>player.balance
 });
 $('btn-nick').disabled=busy;
 renderOffers();
 const [label,error]=stateMessage();note(label,error);
 renderBoard();
}
async function request(action,values={}){
 if(!sb)throw Error('Não foi possível abrir o login Google.');
 const session=(await sb.auth.getSession()).data.session;
 if(!session||session.user?.app_metadata?.provider!=='google')throw Error('Sua sessão Google expirou. Entre novamente.');
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),15500);
 try{
  const result=await fetch(API,{
   method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,apikey:KEY},
   body:JSON.stringify({action,...values}),signal:ctl.signal,cache:'no-store'
  });
  const data=await result.json().catch(()=>null);
  if(!result.ok||!data?.ok)throw Error(data?.error||'Não foi possível concluir a operação.');
  return data;
 }catch(e){
  if(e.name==='AbortError')throw Error('A conexão demorou. Toque em Atualizar.');
  if(e instanceof TypeError)throw Error('Sem conexão com o servidor. Verifique sua internet.');
  throw e;
 }finally{clearTimeout(timer)}
}
async function act(action,values={}){
 if(busy||!currentUser)return;
 busy=true;changeEpoch++;lastBoard='';renderBoard();
 try{
  const result=await request(action,values);
  state=result;
  if(['move','accept','offer','leave','cancel'].includes(action))selected=null;
  if(['rename','move','resign','offer_draw','accept_draw','decline_draw','timeout','leave'].includes(action)){
    try{const extra=await request('state');state=extra}catch{}
  }
  lastBoard='';lastOffers='';render();
 }catch(e){
  note(e.message||'Falha na operação',true);
 }finally{busy=false;lastBoard='';lastOffers='';if(state)render()}
}
async function refresh(initial=false){
 if(updating||busy||!currentUser||(!initial&&document.hidden))return;
 updating=true;const epoch=changeEpoch;
 try{
  const result=await request(initial?'bootstrap':'state');
  if(epoch!==changeEpoch)return;
  const oldGame=state?.game;
  const newGame=result?.game;
  if(oldGame?.id!==newGame?.id||JSON.stringify(oldGame?.board)!==JSON.stringify(newGame?.board))selected=null;
  state=result;lastLobbyRefresh=Date.now();render();
 }catch(e){
  if(initial)note(e.message||'Falha de conexão',true);
  else if(Date.now()-lastLobbyRefresh>16000)note('Conexão instável. Toque em Atualizar.',true)
 }finally{updating=false}
}
function messageNode(item){
 const node=document.createElement('article');node.className='chat-message'+(item.user_id===currentUser?.id?' self':'');
 const meta=document.createElement('div');meta.className='chat-meta';
 const author=document.createElement('strong');author.textContent=item.user_id===currentUser?.id?'Você':item.nickname||'Jogador';
 const time=document.createElement('time');const when=new Date(item.created_at);
 time.textContent=Number.isNaN(when.getTime())?'':when.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
 meta.append(author,time);
 const bubble=document.createElement('div');bubble.className='chat-bubble';bubble.textContent=item.message||'';
 node.append(meta,bubble);return node
}
function renderChat(){
 const root=$('chat-messages');const nearBottom=root.scrollHeight-root.scrollTop-root.clientHeight<90;
 root.replaceChildren();
 const list=[...chatMessages.values()].sort((a,b)=>Number(a.id)-Number(b.id)).slice(-45);
 if(!list.length){
  const p=document.createElement('div');p.className='empty';p.textContent='A conversa começa aqui. Diga um oi para os outros jogadores!';
  root.append(p)
 }else for(const item of list)root.append(messageNode(item));
 if(nearBottom||chatMessages.size<=4)root.scrollTop=root.scrollHeight;
}
function addMessage(item){
 if(!item||!item.id||chatMessages.has(Number(item.id)))return;
 chatMessages.set(Number(item.id),item);
 if(chatMessages.size>60){
  const ids=[...chatMessages.keys()].sort((a,b)=>a-b);
  ids.slice(0,chatMessages.size-50).forEach(id=>chatMessages.delete(id))
 }
 renderChat()
}
async function fetchChat(){
 if(!currentUser||!sb)return;
 const id=currentUser.id;
 const {data,error}=await sb.from('neon_damas_chat_messages')
  .select('id,user_id,nickname,message,created_at').order('id',{ascending:false}).limit(45);
 if(error){chatNote('Chat indisponível. Atualize a página.');return}
 if(!currentUser||currentUser.id!==id)return;
 for(const item of (data||[]).reverse())addMessage(item);
 if(!chatReady){chatReady=true;chatNote('Chat público · mensagens recentes')}
}
function startChat(){
 if(!sb||!currentUser||chatChannel)return;
 fetchChat().catch(()=>{});
 chatChannel=sb.channel('neon-damas-google-'+Math.random().toString(36).slice(2))
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'neon_damas_chat_messages'},payload=>{
   if(currentUser&&payload.new)addMessage(payload.new)
  }).subscribe((status)=>{
    if(status==='SUBSCRIBED')chatNote('Chat ao vivo · conectado');
    else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')chatNote('Atualizando chat periodicamente…')
  });
}
$('chat-form').addEventListener('submit',async ev=>{
 ev.preventDefault();
 if(!currentUser||!state)return;
 const input=$('chat-text'),body=input.value.replace(/[\r\n\t]+/g,' ').trim().slice(0,180);
 if(!body)return;
 if(Date.now()-lastSent<2200){chatNote('Aguarde um instante entre mensagens.');return}
 $('chat-send').disabled=true;
 try{
  const {error}=await sb.from('neon_damas_chat_messages').insert({
   user_id:currentUser.id,nickname:state.player.nickname,message:body
  });
  if(error)throw error;
  lastSent=Date.now();input.value='';chatNote('Enviado');
  await fetchChat()
 }catch(e){chatNote('Não foi possível enviar. Tente novamente.')}
 finally{$('chat-send').disabled=false}
});
document.querySelectorAll('.emoji-shortcut').forEach(btn=>btn.addEventListener('click',()=>{
 const input=$('chat-text');input.value=(input.value+' '+btn.dataset.emoji).trim().slice(0,180);input.focus()
}));
$('stake-input').addEventListener('input',()=>{if(state)render()});
document.querySelectorAll('.stake-option').forEach(btn=>btn.addEventListener('click',()=>{
 $('stake-input').value=btn.dataset.amount;if(state)render()
}));
$('btn-create').onclick=()=>{
 const n=stakeAmount();
 if(n===null||!state||n>state.player.balance){note('Informe um valor inteiro que caiba no seu saldo.',true);return}
 act('offer',{stake:n})
};
$('btn-cancel').onclick=()=>act('cancel');
$('btn-refresh').onclick=()=>refresh();
$('btn-nick').onclick=()=>{
 const nickname=$('nick-input').value.trim().replace(/[<>\r\n\t]/g,'').replace(/\s+/g,' ').slice(0,18);
 if(nickname.length<2){note('Use um apelido de 2 a 18 caracteres.',true);return}
 act('rename',{nickname})
};
$('btn-resign').onclick=()=>{if(state?.game&&confirm('Desistir? O adversário receberá os créditos fictícios da partida.'))act('resign')};
$('btn-draw').onclick=()=>act('offer_draw');
$('btn-accept-draw').onclick=()=>act('accept_draw');
$('btn-decline-draw').onclick=()=>act('decline_draw');
$('btn-timeout').onclick=()=>act('timeout');
$('btn-leave').onclick=()=>act('leave');
$('btn-logout').onclick=async()=>{
 if(sb){await sb.auth.signOut()}loggedOut('Você saiu da sua conta Google.')
};
$('login-btn').onclick=async()=>{
 if(!sb)return;
 $('login-btn').disabled=true;
 $('login-status').textContent='Abrindo a conta Google…';
 try{
  const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{
   redirectTo:REDIRECT,queryParams:{prompt:'select_account'}
  }});
  if(error)throw error
 }catch(e){
  $('login-btn').disabled=false;$('login-status').textContent='Não foi possível entrar com Google. Tente novamente.'
 }
};
async function authenticate(session){
 const epoch=++loginEpoch;
 if(!session?.user||session.user.app_metadata?.provider!=='google'){loggedOut();return}
 $('login-status').textContent='Confirmando sua conta Google…';
 try{
  const {data,error}=await sb.auth.getUser();
  if(epoch!==loginEpoch)return;
  if(error||data?.user?.app_metadata?.provider!=='google')throw Error('Conta Google não confirmada');
  const user=data.user,old=currentUser?.id;
  currentUser=user;$('login-gate').hidden=true;$('app').hidden=false;
  $('user-email').textContent=user.email||'Conta Google';
  if(old!==user.id){state=null;chatMessages.clear();lastOffers='';lastBoard='';await refresh(true);startChat()}
 }catch(e){if(epoch===loginEpoch)loggedOut('Não foi possível confirmar seu Google. Tente novamente.')}
}
async function recover(){
 if(!sb)return;
 const {data,error}=await sb.auth.getSession();
 if(!error&&data?.session)await authenticate(data.session);
 else if(!currentUser)loggedOut('Entre com sua conta Google para jogar.')
}
$('login-retry').onclick=recover;
if(!sb){loggedOut('Não foi possível carregar o login Google. Abra no Chrome.');return}
sb.auth.onAuthStateChange((event,session)=>{
 if(event==='SIGNED_OUT'){loggedOut('Você saiu da sua conta Google.');return}
 if(session&&session.user?.app_metadata?.provider==='google')setTimeout(()=>authenticate(session),0)
});
recover().catch(()=>loggedOut('Não foi possível restaurar sua sessão.'));
setInterval(()=>{if(onScreen())refresh()},3200);
setInterval(()=>{if(onScreen())fetchChat().catch(()=>{})},9000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&onScreen()){refresh();fetchChat().catch(()=>{})}});
window.addEventListener('focus',()=>{if(onScreen())refresh()});
})();
