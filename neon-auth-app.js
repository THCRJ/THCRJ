/* Neon Play: login obrigatório Google e carteira monetária bloqueada para transações. */
(()=>{'use strict';
const $=id=>document.getElementById(id),fmt=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const sb=window.supabase?.createClient?.('https://plcyaarsfzmjoqkbqlid.supabase.co','sb_publishable_WDGTdqGJnGQqhkTo6jYw2g_Ic-EIc7a',{
 auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true,flowType:'pkce'}
});
const gate=$('gate'),site=$('site'),login=$('google-login'),msg=$('auth-message');
let owner=null,nonce=0,game='race',pick='1',busy=false,plays=0,wins=0,raceEngine=null;
const horses=['Relâmpago','Cometa','Ventania','Furacão','Eclipse','Trovão'],weights=[46,28,14,7,3,2],faces=['⚀','⚁','⚂','⚃','⚄','⚅'],symbols=['🍒','🍋','🔔','⭐','💎','🍀'];
for(const k of ['neonplay_demo_v1','np_damas_guest_credentials_v1','neon_wallet_demo_2026_v1'])try{localStorage.removeItem(k)}catch{}
function rand(max){const a=new Uint32Array(1),cut=Math.floor(4294967296/max)*max;do{crypto.getRandomValues(a)}while(a[0]>=cut);return a[0]%max}
function google(user){return user?.app_metadata?.provider==='google'}
function tab(v){if(site.hidden)return;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===v));['wallet','games','checkers','history','rules'].forEach(n=>$(n+'-panel').hidden=n!==v);if(v==='games')initRace()}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
/* A autenticação PKCE ocorre ao retornar do Google.
   Eventos INITIAL_SESSION sem sessão não podem desfazer um SIGNED_IN válido. */
const REDIRECT_URL='https://raw.githack.com/THCRJ/THCRJ/neon-play-teste/index.html';
let logoutEpoch=0,verificationCount=0;
function signedOut(t){
 ++logoutEpoch;owner=null;site.hidden=true;gate.hidden=false;
 msg.textContent=t||'Entre com Google para continuar.';
 login.disabled=!sb;
 $('balance').textContent='—';
 const retry=$('session-retry');if(retry)retry.hidden=!sb;
}
async function signedIn(session){
 if(!session?.user)return;
 const epoch=logoutEpoch;
 const check=++verificationCount;
 msg.textContent='Verificando sua conta Google…';
 try{
  const {data,error}=await sb.auth.getUser();
  if(epoch!==logoutEpoch||check!==verificationCount)return;
  if(error)throw error;
  const user=data?.user;
  if(!user||!google(user)){
   signedOut('Esta sessão não pertence a uma conta Google. Entre com Google.');return;
  }
  gate.hidden=true;site.hidden=false;
  $('google-email').textContent=user.email||'Conta Google';
  const retry=$('session-retry');if(retry)retry.hidden=true;
  if(owner!==user.id){owner=user.id;tab('wallet');await loadBalance(user.id)}
 }catch(e){
  if(epoch===logoutEpoch&&check===verificationCount){
   signedOut('Não foi possível validar a sessão. Toque em "Verificar acesso" ou entre novamente.');
  }
 }
}
async function recoverSession(){
 if(!sb)return;
 msg.textContent='Recuperando sessão Google…';
 const retry=$('session-retry');if(retry)retry.disabled=true;
 try{
  const {data,error}=await sb.auth.getSession();
  if(error)throw error;
  if(data.session)await signedIn(data.session);
  else if(site.hidden){
   const params=new URLSearchParams(location.search);
   const providerError=params.get('error_description')||params.get('error');
   signedOut(providerError?'O Google não concluiu a entrada. Tente novamente.':'Sessão não encontrada neste navegador. Abra o Neon Play no Chrome e entre novamente.');
  }
 }catch(e){
  signedOut('Não foi possível recuperar o acesso. Confira sua conexão e tente novamente.');
 }finally{if(retry)retry.disabled=false}
}
async function loadBalance(id){
 $('balance').textContent='Consultando…';
 try{
  const inserted=await sb.from('neon_real_wallet_accounts').insert({user_id:id});
  if(inserted.error&&inserted.error.code!=='23505')throw inserted.error;
  const result=await sb.from('neon_real_wallet_accounts').select('balance_cents,currency').eq('user_id',id).single();
  if(result.error)throw result.error;if(owner!==id)return;
  const cents=Number(result.data.balance_cents);
  if(!Number.isSafeInteger(cents)||cents<0||result.data.currency!=='BRL')throw Error('Saldo inválido');
  $('balance').textContent=fmt.format(cents/100);
  $('balance-note').textContent='Valor confirmado no banco, sem transações habilitadas.';
 }catch(e){if(owner===id){$('balance').textContent='Indisponível';$('balance-note').textContent='Falha na consulta. Não houve movimentação.'}}
}
login.onclick=async()=>{
 if(!sb)return;login.disabled=true;msg.textContent='Abrindo a seleção de conta Google…';
 try{
  const result=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:REDIRECT_URL,queryParams:{prompt:'select_account'}}});
  if(result.error)throw result.error;
 }catch(e){login.disabled=false;msg.textContent='Não foi possível abrir o Google. Confira sua conexão e tente novamente.'}
};
const retryButton=$('session-retry');if(retryButton)retryButton.onclick=recoverSession;
$('logout').onclick=async()=>{if(sb)await sb.auth.signOut();signedOut('Você saiu do Neon Play.')};
function initRace(){if(raceEngine||!window.HorseRace3D)return;try{raceEngine=new window.HorseRace3D($('race-canvas'),horses.map((name,i)=>({id:String(i+1),name})));raceEngine.selectHorse(pick)}catch(e){$('race-caption').textContent='A animação 3D não está disponível neste aparelho.'}}
$('camera-button').onclick=()=>{if(raceEngine)raceEngine.toggleCamera()};
function chooseGame(next){
 if(busy)return;game=next;pick=next==='race'?'1':next==='dice'?'low':'spin';
 document.querySelectorAll('[data-game]').forEach(x=>x.classList.toggle('active',x.dataset.game===next));
 ['race','dice','slots'].forEach(x=>$(x+'-stage').hidden=x!==next);
 $('game-title').textContent={race:'Corrida de cavalos 3D',dice:'Dados',slots:'Caça-níquel de símbolos'}[next];
 $('choice-label').textContent=next==='race'?'ESCOLHA SEU CAVALO':next==='dice'?'ADIVINHE A SOMA':'SEM ESCOLHA NECESSÁRIA';
 const choices=$('game-options');choices.replaceChildren();
 const opts=next==='race'?horses.map((h,i)=>[String(i+1),(i+1)+'. '+h]):next==='dice'?[['low','Até 7'],['high','Acima de 7']]:[];
 for(const [value,title] of opts){
  const btn=document.createElement('button');btn.type='button';btn.textContent=title;btn.className=value===pick?'chosen':'';
  btn.onclick=()=>{if(busy)return;pick=value;choices.querySelectorAll('button').forEach(b=>b.classList.toggle('chosen',b===btn));raceEngine?.selectHorse(pick)};
  choices.append(btn)
 }
 $('game-result').textContent='Pronto para jogar sem valores.';if(next==='race')initRace()
}
async function raceRun(winner){
 initRace();$('race-status').textContent='🏇 CORRENDO';const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?750:4300;
 const targets=horses.map((_,i)=>i===winner?1:.74+rand(18)/100);
 return new Promise(resolve=>{
  const start=performance.now();
  function frame(now){const t=Math.min(1,(now-start)/duration),ease=t*t*(3-2*t);
   raceEngine?.setPositions(targets.map(v=>ease*v),String(winner+1),t<1);
   if(t<1)requestAnimationFrame(frame);else{$('race-status').textContent='🏆 CHEGADA';$('race-caption').textContent='Venceu: '+horses[winner];resolve()}}
  requestAnimationFrame(frame)
 })
}
async function play(){
 if(busy||site.hidden)return;busy=true;const button=$('free-play');button.disabled=true;
 try{
 let text='',hit=false;
 if(game==='race'){let ticket=rand(100),idx=0;for(let i=0;i<weights.length;i++){ticket-=weights[i];if(ticket<0){idx=i;break}}await raceRun(idx);hit=pick===String(idx+1);text=horses[idx]+' venceu. '+(hit?'Você acertou!':'Tente novamente.')}
 else if(game==='dice'){const a=rand(6)+1,b=rand(6)+1;$('die-1').textContent=faces[a-1];$('die-2').textContent=faces[b-1];hit=pick==='low'?a+b<=7:a+b>7;text='Dados: '+a+' + '+b+' = '+(a+b)+(hit?' · Você acertou!':' · Tente novamente.')}
 else {const a=Array.from({length:3},()=>symbols[rand(symbols.length)]);a.forEach((v,i)=>$('symbol-'+(i+1)).textContent=v);hit=a.every(v=>v===a[0]);text=a.join(' ')+' · '+(hit?'Três iguais!':'Nova combinação.')}
 $('game-result').textContent=text;plays++;if(hit)wins++;$('plays').textContent=String(plays);$('wins').textContent=String(wins);
 const row=document.createElement('div');row.className='activity-entry';const label=document.createElement('b');label.textContent=text;
 const time=document.createElement('small');time.textContent=new Date().toLocaleTimeString('pt-BR');row.append(label,time);
 if(plays===1)$('game-history').replaceChildren();$('game-history').prepend(row)
 }finally{busy=false;button.disabled=false}
}
document.querySelectorAll('[data-game]').forEach(x=>x.onclick=()=>chooseGame(x.dataset.game));
$('free-play').onclick=play;chooseGame('race');
if(!sb){signedOut('Não foi possível carregar o login seguro. Atualize a página.');return}
msg.textContent='Verificando seu acesso Google…';
sb.auth.onAuthStateChange((event,session)=>{
 if(event==='SIGNED_OUT'){signedOut('Você saiu do Neon Play.');return;}
 if(session&&google(session.user)){
  /* Evita bloqueio de inicialização do cliente Supabase pelo callback de auth. */
  setTimeout(()=>signedIn(session),0);
 }
 /* INITIAL_SESSION sem sessão não cancela um login PKCE em andamento. */
});
recoverSession();
})();
