(()=>{
'use strict';
const $=id=>document.getElementById(id),API='https://plcyaarsfzmjoqkbqlid.supabase.co/functions/v1/neon-damas-guest',KEY='sb_publishable_WDGTdqGJnGQqhkTo6jYw2g_Ic-EIc7a';
let guest,epoch=0,updating=false,connecting=false,chatBusy=false,chatSig='';
const c={state:null,busy:false,selected:null,note:(t,e=false)=>{$('board-hint').textContent=t;$('board-hint').classList.toggle('error',e)},act};
c.board=window.neonBoard(c);const {render,stakeAmount}=window.neonView(c);
function session(){
 const key='neon-damas-guest-v1';let g;try{g=JSON.parse(localStorage.getItem(key))}catch{}
 if(!g?.id||!g?.token){g={id:crypto.randomUUID(),token:Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('')};localStorage.setItem(key,JSON.stringify(g))}
 return g
}
async function req(action,values={}){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),16000);
 try{const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY},body:JSON.stringify({action,...values,guest_id:guest.id,guest_token:guest.token}),signal:ctl.signal});
 const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'Não foi possível conectar');return d}finally{clearTimeout(timer)}
}
async function act(action,values={}){
 if(c.busy||!c.state)return;c.busy=true;const e=++epoch;render();
 try{const d=await req(action,values);if(e!==epoch)return;c.state=d;c.selected=null;if(!['offer','accept','cancel'].includes(action)){try{const n=await req('state');if(e===epoch)c.state=n}catch{}}}
 catch(err){if(e===epoch){c.busy=false;render();c.note(err.message,true)}return}
 finally{if(e===epoch)c.busy=false}
 if(e===epoch)render()
}
async function refresh(){
 if(updating||c.busy||!c.state||document.hidden)return;updating=true;const e=epoch;
 try{const n=await req('state');if(e!==epoch||!c.state)return;if(c.state.game?.id!==n.game?.id||JSON.stringify(c.state.game?.board)!==JSON.stringify(n.game?.board))c.selected=null;c.state=n;render()}catch{if(e===epoch)c.note('Conexão instável. Tente atualizar.',true)}finally{updating=false}
}
async function chat(){
 if(!c.state||chatBusy)return;chatBusy=true;const e=epoch;
 try{const d=await req('chat_read');if(!c.state||e!==epoch)return;const a=(d.messages||[]).slice().reverse(),sig=JSON.stringify(a);$('chat-status').textContent='Chat público · conectado';if(sig===chatSig)return;chatSig=sig;
 const root=$('chat-messages'),f=document.createDocumentFragment();for(const m of a){const row=document.createElement('article'),name=document.createElement('strong'),body=document.createElement('div');row.className='chat-message'+(m.user_id===guest.id?' self':'');name.textContent=m.user_id===guest.id?'Você':m.nickname;body.className='chat-bubble';body.textContent=m.message;row.append(name,body);f.append(row)}root.replaceChildren(f);root.scrollTop=root.scrollHeight}catch{$('chat-status').textContent='Reconectando chat…'}finally{chatBusy=false}
}
async function enter(){
 if(connecting||c.state)return;connecting=true;$('login-btn').disabled=true;$('login-status').textContent='Conectando ao jogo…';
 try{guest=session();c.state=await req('bootstrap');$('app').hidden=false;$('login-gate').hidden=true;$('user-email').textContent='Modo convidado';render();chat()}catch(e){$('login-status').textContent=e.message||'Não foi possível conectar. Tente novamente.'}finally{connecting=false;$('login-btn').disabled=false}
}
$('login-btn').onclick=enter;$('login-retry').onclick=enter;$('btn-logout').onclick=()=>{if(c.busy)return;epoch++;c.state=null;c.selected=null;chatSig='';$('app').hidden=true;$('login-gate').hidden=false;$('login-status').textContent='Seu perfil está salvo neste navegador.'};
$('btn-create').onclick=()=>{const n=stakeAmount();if(n&&c.state&&n<=c.state.player.balance)act('offer',{stake:n})};$('btn-cancel').onclick=()=>act('cancel');$('btn-refresh').onclick=refresh;$('btn-leave').onclick=()=>act('leave');$('btn-draw').onclick=()=>act('offer_draw');$('btn-accept-draw').onclick=()=>act('accept_draw');$('btn-decline-draw').onclick=()=>act('decline_draw');$('btn-timeout').onclick=()=>act('timeout');$('btn-resign').onclick=()=>{if(confirm('Desistir da partida?'))act('resign')};$('btn-nick').onclick=()=>act('rename',{nickname:$('nick-input').value.trim()});
$('stake-input').oninput=render;document.querySelectorAll('.stake-option').forEach(x=>x.onclick=()=>{$('stake-input').value=x.dataset.amount;render()});
document.querySelectorAll('.emoji-shortcut').forEach(x=>x.onclick=()=>{$('chat-text').value=($('chat-text').value+' '+x.dataset.emoji).trim().slice(0,180)});
$('chat-form').onsubmit=async e=>{e.preventDefault();const input=$('chat-text'),message=input.value.trim();if(!message||!c.state)return;$('chat-send').disabled=true;try{await req('chat_send',{message});input.value='';await chat()}catch(e){$('chat-status').textContent=e.message}finally{$('chat-send').disabled=false}};
setInterval(refresh,3200);setInterval(chat,4500);window.addEventListener('focus',refresh);enter();
})();
