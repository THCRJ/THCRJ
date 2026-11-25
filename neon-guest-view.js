window.neonView=function(ctx){
'use strict';
const $=id=>document.getElementById(id),fmt=new Intl.NumberFormat('pt-BR');let state,busy,lastOffers='';
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
 const sig=JSON.stringify([arr.map(a=>[a.player_id,a.nickname,a.stake]),state?.player?.balance,!!state?.game,!!state?.queue,busy]);
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
  btn.onclick=()=>ctx.act('accept',{target:item.player_id});
  line.append(info,btn);root.append(line)
 })
}
function stakeAmount(){
 const txt=$('stake-input').value.trim();
 const n=Number(txt);
 return /^\d+$/.test(txt)&&Number.isSafeInteger(n)&&n>0&&n<=100000?n:null
}
function render(){
 state=ctx.state;busy=ctx.busy;if(!state)return;
 const player=state.player,game=state.game,queue=state.queue;
 $('credits').textContent=fmt.format(player.balance);
 $('own-name').textContent=player.nickname;
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
 const [label,error]=stateMessage();ctx.note(label,error);
 ctx.board();
}

return {render,stakeAmount};
};
