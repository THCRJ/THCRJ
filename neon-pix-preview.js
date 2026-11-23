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
 status.textContent='Valor selecionado: '+fmt.format(Number(amount.value))+'. Integração com Mercado Pago aguardando aprovação; não há pagamento ativo.';
}));
amount.addEventListener('input',render);
button.addEventListener('click',()=>{
 const raw=amount.value.trim();
 const n=Number(raw);
 if(!raw||!Number.isFinite(n)||n<0.1||n>10000||Math.round(n*100)!==n*100){
   status.textContent='Informe um valor válido entre R$ 0,10 e R$ 10.000, com até duas casas decimais.';
   return;
 }
 status.textContent='Simulação Mercado Pago: '+fmt.format(n)+'. Nenhum Pix é gerado. Antes da ativação, precisamos da aprovação do provedor para damas com premiações resgatáveis, da validação jurídica e das condições para cobranças de baixo valor.';
});
render();
})();