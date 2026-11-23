(()=>{
'use strict';
const amount=document.getElementById('np-pix-amount');
const status=document.getElementById('np-pix-status');
const button=document.getElementById('np-pix-show');
if(!amount || !status || !button)return;
const fmt=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const preset=[...document.querySelectorAll('[data-pix-amount]')];
function render(){
 const n=Number(amount.value);
 preset.forEach(b=>b.classList.toggle('active',Number(b.dataset.pixAmount)===n));
}
preset.forEach(b=>b.addEventListener('click',()=>{
 amount.value=b.dataset.pixAmount;
 render();
 status.textContent='Valor selecionado: '+fmt.format(Number(amount.value))+'. Pix de verdade ainda não está habilitado.';
}));
amount.addEventListener('input',render);
button.addEventListener('click',()=>{
 const raw=amount.value.trim();
 const n=Number(raw);
 if(!raw||!Number.isFinite(n)||n<0.1||n>10000||Math.round(n*100)!==n*100){
   status.textContent='Informe um valor válido entre R$ 0,10 e R$ 10.000, com até duas casas decimais.';
   return;
 }
 status.textContent='Prévia: '+fmt.format(n)+'. O QR Code e o Pix Copia e Cola continuam desativados. Nenhum crédito será comprado ou liberado até a integração com provedor aprovado.';
});
render();
})();