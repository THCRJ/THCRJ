const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('neon-auth-app.js','utf8');
const elements=new Map();
function el(id){
 if(!elements.has(id))elements.set(id,{
  id,hidden:id==='site'||id==='session-retry',disabled:false,textContent:'',value:'',
  classList:{toggle(){}},replaceChildren(){this.children=[]},append(x){(this.children??=[]).push(x)},
  prepend(x){(this.children??=[]).unshift(x)}
 });
 return elements.get(id);
}
let eventHandler=null,sessionValue=null,lastRedirect='',validations=0;
const googleUser={id:'demo-google-qa',email:'test@example.org',app_metadata:{provider:'google'}};
const googleSession={user:googleUser,access_token:'local-test-token'};
const client={
 auth:{
  onAuthStateChange(cb){eventHandler=cb;return{data:{subscription:{unsubscribe(){}}}}},
  async getSession(){return{data:{session:sessionValue},error:null}},
  async getUser(){validations++;return{data:{user:googleUser},error:null}},
  async signInWithOAuth(arg){lastRedirect=arg.options.redirectTo;return{error:null}},
  async signOut(){sessionValue=null;eventHandler('SIGNED_OUT',null);return{error:null}}
 },
 from(table){
  assert.equal(table,'neon_real_wallet_accounts');
  return{
   async insert(data){assert.equal(data.user_id,googleUser.id);return{error:null}},
   select(){return{eq(){return{async single(){return{data:{balance_cents:0,currency:'BRL'},error:null}}}}}}
  }
 }
};
const context={
 window:{supabase:{createClient:()=>client},HorseRace3D:null},
 document:{getElementById:el,querySelectorAll(){return[]},createElement(tag){return el('generated-'+tag+'-'+elements.size)}},
 localStorage:{removeItem(){}},location:{search:''},setTimeout,crypto:require('node:crypto').webcrypto,
 Intl,Date,URLSearchParams,console
};
vm.runInNewContext(code,context,{filename:'neon-auth-app.js'});
const tick=()=>new Promise(resolve=>setTimeout(resolve,25));
(async()=>{
 await tick();
 assert.equal(el('site').hidden,true,'sem sessão deve mostrar login');
 assert.equal(el('gate').hidden,false);
 await el('google-login').onclick();
 assert.equal(lastRedirect,'https://raw.githack.com/THCRJ/THCRJ/neon-play-teste/index.html');
 sessionValue=googleSession;
 eventHandler('INITIAL_SESSION',null);
 eventHandler('SIGNED_IN',googleSession);
 await tick();
 assert.equal(el('site').hidden,false,'login Google deve abrir a área');
 assert.equal(el('gate').hidden,true,'login não deve permanecer na tela');
 assert.equal(el('balance').textContent,'R$ 0,00','carteira de usuário autenticado deve exibir zero BRL');
 eventHandler('INITIAL_SESSION',null);
 await tick();
 assert.equal(el('site').hidden,false,'INITIAL_SESSION nulo não pode derrubar login válido');
 assert.ok(validations>0,'Google deve ser validado no backend');
 eventHandler('SIGNED_OUT',null);
 await tick();
 assert.equal(el('site').hidden,true,'logout precisa bloquear acesso');
 await el('session-retry').onclick();
 await tick();
 assert.equal(el('site').hidden,false,'recuperação manual deve restaurar sessão existente');
 console.log('Fluxo Google: redirect fixo, login válido, sem corrida, logout e recuperação OK');
})().catch(e=>{console.error(e);process.exit(1)});
