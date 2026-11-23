/* Neon Play: chat em tempo real direto no Supabase Realtime, sem bibliotecas externas.
   Protocolo Phoenix v1.0.0 / JSON. Sala pública efêmera, somente demonstração. */
(() => {
  'use strict';
  const PROJECT_URL = 'https://plcyaarsfzmjoqkbqlid.supabase.co';
  const PUBLIC_KEY = 'sb_publishable_WDGTdqGJnGQqhkTo6jYw2g_Ic-EIc7a';
  const ROOM = 'neon-play-demo-lobby-2026-v1';
  const TOPIC = 'realtime:' + ROOM;
  const $ = id => document.getElementById(id);
  const panel = $('np-chat-panel');
  const log = $('np-chat-log');
  const form = $('np-chat-form');
  const input = $('np-chat-text');
  const name = $('np-chat-name');
  const send = $('np-chat-send');
  const statusText = $('np-chat-status');
  const dot = $('np-chat-indicator');
  const online = $('np-chat-online');
  const retry = $('np-chat-retry');
  if (!panel || !log || !form || !name || !input || !send) return;
  const nicknameKey = 'np_demo_chat_nickname_v1';
  const safeRead = (store,key) => {try{return store.getItem(key)}catch{return null}};
  const safeWrite = (store,key,value) => {try{store.setItem(key,value)}catch{}};
  const newId = () => globalThis.crypto?.randomUUID?.() || (Date.now()+'-'+Math.random().toString(36).slice(2));
  const identity = safeRead(sessionStorage,'np_demo_chat_identity') || newId();
  safeWrite(sessionStorage,'np_demo_chat_identity',identity);
  const cleanName = val => String(val || '').replace(/[<>\r\n\t]/g,'').replace(/\s+/g,' ').trim().slice(0,18) || 'Jogador';
  name.value = cleanName(safeRead(localStorage,nicknameKey) || ('Jogador '+(1000+Math.floor(Math.random()*9000))));
  let ws=null, connected=false, seq=0, joinRef=null, attempt=0, heartbeat=null, reconnect=null, joinTimeout=null, retryCount=0, lastSent=0;
  let presence=Object.create(null);
  const seen=new Set();
  const setStatus=(active,label)=>{
    connected=active;
    statusText.textContent=label;
    dot.classList.toggle('is-online',active);
    send.disabled=!active;
    document.querySelectorAll('.np-chat-emoji button').forEach(b=>b.disabled=!active);
    retry.hidden=active||label==='Conectando...';
  };
  const note=message=>{
    const item=document.createElement('div');
    item.className='np-chat-note';
    item.textContent=message;
    log.appendChild(item);
    log.scrollTop=log.scrollHeight;
  };
  const renderMessage=item=>{
    if(!item || typeof item!=='object')return;
    const content=typeof item.text==='string'?item.text.trim().slice(0,160):'';
    const id=typeof item.id==='string'?item.id.slice(0,100):'';
    if(!content || !id || seen.has(id))return;
    seen.add(id);
    if(seen.size>200)seen.delete(seen.values().next().value);
    const mine=item.sender===identity;
    const bubble=document.createElement('div');
    bubble.className='np-chat-bubble'+(mine?' np-chat-mine':'');
    const author=document.createElement('div');
    author.className='np-chat-author';
    const authorName=document.createElement('span');
    authorName.textContent=mine?'Você':cleanName(item.nickname);
    const time=document.createElement('time');
    time.textContent=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    const body=document.createElement('div');
    body.className='np-chat-content';
    body.textContent=content;
    author.append(authorName,time);
    bubble.append(author,body);
    log.appendChild(bubble);
    while(log.childElementCount>70)log.removeChild(log.firstElementChild);
    log.scrollTop=log.scrollHeight;
  };
  const showPresence=()=>{
    const total=Object.values(presence).reduce((n,entry)=>n+(Array.isArray(entry?.metas)?entry.metas.length:0),0);
    online.textContent=total+' '+(total===1?'pessoa online':'pessoas online');
  };
  const emit=(topic,event,payload,explicitRef)=>{
    if(!ws || ws.readyState!==WebSocket.OPEN)throw Error('Socket fechado');
    const ref=explicitRef??String(++seq);
    ws.send(JSON.stringify({topic,event,payload,ref,join_ref:topic===TOPIC?joinRef:null}));
    return ref;
  };
  const track=()=>{
    if(connected)try{emit(TOPIC,'presence',{type:'presence',event:'track',payload:{nickname:cleanName(name.value)}})}catch{}
  };
  name.addEventListener('change',()=>{
    name.value=cleanName(name.value);
    safeWrite(localStorage,nicknameKey,name.value);
    track();
  });
  function resetTransport(){
    if(heartbeat){clearInterval(heartbeat);heartbeat=null}
    if(joinTimeout){clearTimeout(joinTimeout);joinTimeout=null}
    if(reconnect){clearTimeout(reconnect);reconnect=null}
    if(ws){const old=ws;ws=null;old.onclose=null;old.onerror=null;old.onmessage=null;old.onopen=null;try{old.close()}catch{}}
    setStatus(false,'Conectando...');
    online.textContent='Sala pública';
    presence=Object.create(null);
  }
  function scheduleReconnect(reason){
    setStatus(false,reason||'Desconectado');
    online.textContent='Sem conexão';
    if(reconnect)clearTimeout(reconnect);
    const delay=Math.min(30000,2500*Math.pow(2,Math.min(3,retryCount++)));
    reconnect=setTimeout(connect,delay);
  }
  function connect(){
    const mine=++attempt;
    resetTransport();
    if(!('WebSocket' in globalThis)){
      setStatus(false,'Navegador incompatível');
      note('Este navegador não suporta chat ao vivo. Abra no Chrome.');
      return;
    }
    try{
      const url=PROJECT_URL.replace(/^https:/,'wss:')+'/realtime/v1/websocket?apikey='+encodeURIComponent(PUBLIC_KEY)+'&vsn=1.0.0';
      ws=new WebSocket(url);
      ws.onopen=()=>{
        if(mine!==attempt)return;
        joinRef=String(++seq);
        emit(TOPIC,'phx_join',{config:{broadcast:{self:true,ack:true},presence:{enabled:true,key:identity},private:false,postgres_changes:[]}},joinRef);
        joinTimeout=setTimeout(()=>{if(mine===attempt&&!connected)try{ws.close()}catch{}},12000);
        heartbeat=setInterval(()=>{
          if(mine===attempt&&ws?.readyState===WebSocket.OPEN)try{emit('phoenix','heartbeat',{})}catch{}
        },20000);
      };
      ws.onmessage=event=>{
        if(mine!==attempt)return;
        let data;
        try{data=JSON.parse(event.data)}catch{return}
        if(!data || typeof data!=='object')return;
        if(data.event==='phx_reply' && data.ref===joinRef){
          if(data.payload?.status==='ok'){
            if(joinTimeout){clearTimeout(joinTimeout);joinTimeout=null}
            retryCount=0;
            setStatus(true,'Ao vivo');
            track();
            showPresence();
          }else{
            note('O servidor recusou o chat. Toque em Reconectar.');
            try{ws.close()}catch{}
          }
        }else if(data.topic===TOPIC&&data.event==='broadcast'&&data.payload?.event==='message'){
          renderMessage(data.payload.payload);
        }else if(data.topic===TOPIC&&data.event==='presence_state'){
          presence=(data.payload && typeof data.payload==='object')?data.payload:Object.create(null);
          showPresence();
        }else if(data.topic===TOPIC&&data.event==='presence_diff'){
          for(const [key,value] of Object.entries(data.payload?.joins||{}))presence[key]=value;
          for(const key of Object.keys(data.payload?.leaves||{}))delete presence[key];
          showPresence();
        }else if(data.topic===TOPIC&&(data.event==='phx_error'||data.event==='phx_close')){
          try{ws.close()}catch{}
        }
      };
      ws.onclose=()=>{
        if(mine!==attempt)return;
        if(heartbeat){clearInterval(heartbeat);heartbeat=null}
        if(joinTimeout){clearTimeout(joinTimeout);joinTimeout=null}
        scheduleReconnect('Desconectado');
      };
      ws.onerror=()=>{if(mine===attempt)setStatus(false,'Falha de conexão')};
    }catch{
      if(mine===attempt){
        note('Não foi possível abrir o chat. Tente reconectar.');
        scheduleReconnect('Falha de conexão');
      }
    }
  }
  const publish=text=>{
    const message=String(text||'').trim().slice(0,160);
    if(!message||!connected)return;
    if(Date.now()-lastSent<1800){note('Envie no máximo uma mensagem a cada 2 segundos.');return}
    const packet={id:newId(),sender:identity,nickname:cleanName(name.value),text:message};
    try{
      emit(TOPIC,'broadcast',{type:'broadcast',event:'message',payload:packet});
      lastSent=Date.now();
      renderMessage(packet);
      input.value='';
    }catch{
      setStatus(false,'Desconectado');
      note('Mensagem não enviada. Toque em Reconectar.');
    }
  };
  form.addEventListener('submit',event=>{event.preventDefault();publish(input.value)});
  document.querySelectorAll('.np-chat-emoji button').forEach(button=>button.addEventListener('click',()=>publish(button.dataset.emoji)));
  retry.addEventListener('click',()=>{retryCount=0;connect()});
  window.addEventListener('pagehide',()=>{attempt++;resetTransport()});
  setStatus(false,'Conectando...');
  connect();
})();
