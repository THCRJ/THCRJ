/* Neon Play: carteira demonstrativa independente, sem Pix real. */
(()=>{
'use strict';
const API='https://plcyaarsfzmjoqkbqlid.supabase.co/functions/v1/neon-wallet-demo';
const STORE='neon_wallet_demo_2026_v1';
const $=id=>document.getElementById(id);
const panel=$('wallet-panel'),buy=$('wallet-buy-amount'),sell=$('wallet-sell-credits');
if(!panel||!buy||!sell)return;
const brl=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const integer=new Intl.NumberFormat('pt-BR');
let credentials=null, wallet=null,busy=false;
function feedback(message,error=false){
 const el=$('wallet-message');
 el.textContent=message;
 el.classList.toggle('wallet-error',error);
}
function loadAuth(){try{return JSON.parse(localStorage.getItem(STORE)||'null')}catch{return null}}
function saveAuth(auth){try{localStorage.setItem(STORE,JSON.stringify(auth))}catch{}}
function discardAuth(){try{localStorage.removeItem(STORE)}catch{}}
function parseCredits(input){
 const raw=input.value.trim();
 const value=Number(raw);
 return /^\d+$/.test(raw)&&Number.isSafeInteger(value)&&value>=1&&value<=100000?value:null;
}
function parseCents(input){
 const raw=input.value.trim().replace(',','.');
 const value=Number(raw);
 const cents=Math.round(value*100);
 if(!raw||!Number.isFinite(value)||value<0.01||value>1000||
    Math.abs(value*100-cents)>0.00001)return null;
 return cents;
}
async function send(action,additional={}){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(API,{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   cache:'no-store',
   body:JSON.stringify({action,...(credentials||{}),...additional}),
   signal:controller.signal,
  });
  let result;
  try{result=await response.json()}catch{throw new Error('Resposta inesperada do servidor')}
  if(!response.ok||!result?.ok)throw new Error(result?.error||'Não foi possível executar a operação');
  return result;
 }catch(error){
  if(error?.name==='AbortError')throw new Error('Conexão com a carteira demorou demais');
  if(error instanceof TypeError)throw new Error('A carteira está sem conexão. Verifique a internet.');
  throw error;
 }finally{clearTimeout(timer)}
}
function updateHistory(){
 const list=$('wallet-history-list');
 list.replaceChildren();
 const items=Array.isArray(wallet?.history)?wallet.history:[];
 if(!items.length){
  const empty=document.createElement('p');
  empty.textContent='Nenhuma movimentação de demonstração ainda.';
  empty.className='wallet-empty';
  list.appendChild(empty);
  return;
 }
 for(const item of items){
  const purchased=item.direction==='buy_demo';
  const row=document.createElement('div');
  row.className='wallet-history-row';
  const detail=document.createElement('div');
  const title=document.createElement('strong');
  title.textContent=purchased?'Compra simulada':'Venda simulada';
  const when=document.createElement('small');
  const date=new Date(item.created_at);
  when.textContent=(Number.isNaN(date.getTime())?'Sem data':date.toLocaleString('pt-BR'))+' · Nenhum Pix real';
  detail.append(title,when);
  const value=document.createElement('div');
  value.className='wallet-history-values';
  const credits=document.createElement('strong');
  credits.className=purchased?'wallet-positive':'wallet-negative';
  credits.textContent=(purchased?'+':'−')+integer.format(item.credits||0)+' créditos';
  const reais=document.createElement('small');
  reais.textContent=brl.format((item.brl_cents||0)/100)+' · SIMULADO';
  value.append(credits,reais);
  row.append(detail,value);
  list.appendChild(row);
 }
}
function render(){
 const balance=wallet?.account?.balance_credits||0;
 $('wallet-balance').textContent=integer.format(balance);
 $('wallet-account').textContent=wallet?.account?.label||'Visitante';
 const cents=parseCents(buy),num=parseCredits(sell);
 $('wallet-buy-credits').textContent=cents===null?'Valor inválido':integer.format(cents)+' créditos de demonstração';
 $('wallet-sell-value').textContent=num===null?'Valor inválido':brl.format(num/100)+' (simulado)';
 $('wallet-buy-btn').disabled=busy||!wallet||cents===null;
 $('wallet-sell-btn').disabled=busy||!wallet||num===null||num>balance;
 $('wallet-refresh').disabled=busy;
 updateHistory();
}
async function perform(action,credits){
 if(busy||!credentials||!wallet)return;
 busy=true;render();
 try{
  wallet=await send(action,{credits});
  feedback(action==='buy_demo'
   ?'Compra simulada registrada. Nenhum Pix foi cobrado.'
   :'Venda simulada registrada. Nenhum Pix foi transferido.');
 }catch(error){
  feedback(error.message||'Não foi possível executar a operação',true);
 }finally{busy=false;render()}
}
async function refresh(){
 if(busy||!credentials)return;
 busy=true;render();
 try{
  wallet=await send('state');
  feedback('Carteira de demonstração atualizada.');
 }catch(error){feedback(error.message||'Falha de conexão',true)}
 finally{busy=false;render()}
}
async function start(){
 busy=true;render();
 credentials=loadAuth();
 try{
  const response=await send('bootstrap',{label:'Jogador Neon Play'});
  if(response.auth){credentials=response.auth;saveAuth(credentials)}
  wallet=response;
  feedback('Carteira de demonstração pronta. Compras e vendas não movimentam dinheiro.');
 }catch(error){
  if(/Sessão/i.test(error.message)){discardAuth();credentials=null}
  feedback(error.message||'Não foi possível abrir a carteira de teste',true);
 }finally{busy=false;render()}
}
$('wallet-buy-btn').addEventListener('click',()=>{
 const cents=parseCents(buy);
 if(cents===null){feedback('Digite um valor válido.',true);return}
 perform('buy_demo',cents);
});
$('wallet-sell-btn').addEventListener('click',()=>{
 const credits=parseCredits(sell);
 if(credits===null){feedback('Digite uma quantidade inteira de créditos.',true);return}
 if(credits>(wallet?.account?.balance_credits||0)){feedback('Saldo insuficiente.',true);return}
 perform('sell_demo',credits);
});
$('wallet-refresh').addEventListener('click',refresh);
document.querySelectorAll('[data-wallet-buy]').forEach(chip=>{
 chip.addEventListener('click',()=>{buy.value=chip.dataset.walletBuy;render()});
});
buy.addEventListener('input',render);
sell.addEventListener('input',render);
const open=$('wallet-open');
if(open)open.addEventListener('click',()=>document.querySelector('[data-tab="wallet"]')?.click());
start();
})();