/* Neon Play chat: sala pública temporária. Mensagens NÃO são persistidas. */
(() => {
  'use strict';
  const PROJECT_URL = 'https://plcyaarsfzmjoqkbqlid.supabase.co';
  const PUBLIC_KEY = 'sb_publishable_WDGTdqGJnGQqhkTo6jYw2g_Ic-EIc7a';
  const ROOM = 'neon-play-demo-lobby-2026-v1';
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
  if (!panel || !form) return;

  let channel = null, client = null, connected = false, lastSend = 0;
  let lastSending = false;
  const seen = new Set();
  const nicknameKey = 'np_demo_chat_nickname_v1';
  const read = (key, store) => { try { return store.getItem(key); } catch { return null; } };
  const write = (key, value, store) => { try { store.setItem(key, value); } catch {} };
  const uid = () => globalThis.crypto?.randomUUID?.() || String(Date.now()) + '-' + Math.random().toString(36).slice(2);
  const identity = read('np_demo_chat_identity',sessionStorage) || uid();
  write('np_demo_chat_identity',identity,sessionStorage);
  const filterName = value => String(value || '').replace(/[<>\n\r\t]/g, '').replace(/\s+/g,' ').trim().slice(0,18) || 'Jogador';
  const defaultName = 'Jogador ' + String(Math.floor(Math.random()*8999)+1000);
  name.value = filterName(read(nicknameKey,localStorage) || defaultName);
  name.addEventListener('change', () => {
    name.value = filterName(name.value);
    write(nicknameKey, name.value, localStorage);
    if (connected) channel.track({nickname: name.value}).catch(()=>{});
  });
  const setStatus = (connectedNow, label) => {
    connected = connectedNow;
    statusText.textContent = label;
    dot.classList.toggle('is-online', connectedNow);
    send.disabled = !connectedNow;
    document.querySelectorAll('.np-chat-emoji button').forEach(btn=>btn.disabled=!connectedNow);
    retry.hidden = connectedNow || label === 'Conectando...';
  };
  const note = message => {
    const item = document.createElement('div');
    item.className = 'np-chat-note';
    item.textContent = message;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
  };
  const renderMessage = item => {
    if (!item || typeof item !== 'object') return;
    const message = typeof item.text === 'string' ? item.text.slice(0,160).trim() : '';
    if (!message) return;
    const id = typeof item.id === 'string' ? item.id.slice(0,100) : '';
    if (!id || seen.has(id)) return;
    seen.add(id);
    if (seen.size > 200) seen.delete(seen.values().next().value);
    const mine = item.sender === identity;
    const bubble = document.createElement('div');
    bubble.className = 'np-chat-bubble' + (mine ? ' np-chat-mine' : '');
    const author = document.createElement('div'); author.className = 'np-chat-author';
    const label = document.createElement('span'); label.textContent = mine ? 'Você' : filterName(item.nickname);
    const timestamp = document.createElement('time');
    timestamp.textContent = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    author.append(label,timestamp);
    const content = document.createElement('div'); content.className = 'np-chat-content'; content.textContent = message;
    bubble.append(author,content);
    log.appendChild(bubble);
    while (log.childElementCount > 70) log.removeChild(log.firstElementChild);
    log.scrollTop = log.scrollHeight;
  };
  function presenceCount() {
    if (!channel) return;
    try {
      const state = channel.presenceState();
      const people = Object.values(state).reduce((sum,items)=>sum + (Array.isArray(items)?items.length:0),0);
      online.textContent = String(people) + (people === 1?' pessoa online':' pessoas online');
    } catch { online.textContent = 'Sala pública'; }
  }
  const connect = () => {
    if (client && channel) {
      client.removeChannel(channel).catch(()=>{});
      channel=null;
    }
    setStatus(false,'Conectando...');
    online.textContent = 'Sala pública';
    if (!globalThis.supabase?.createClient) {
      setStatus(false,'Chat indisponível');
      note('Não foi possível carregar a conexão. Verifique sua internet e tente novamente.');
      return;
    }
    try {
      client = globalThis.supabase.createClient(PROJECT_URL,PUBLIC_KEY,{
        auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
      });
      channel=client.channel(ROOM,{config:{
        broadcast:{self:true},
        presence:{key:identity}
      }});
      channel
        .on('broadcast',{event:'message'},data=>renderMessage(data?.payload))
        .on('presence',{event:'sync'},presenceCount)
        .on('presence',{event:'join'},presenceCount)
        .on('presence',{event:'leave'},presenceCount)
        .subscribe(async status => {
          if (status === 'SUBSCRIBED') {
            setStatus(true,'Ao vivo');
            try { await channel.track({nickname:name.value}); } catch {}
            presenceCount();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setStatus(false,'Desconectado');
            online.textContent = 'Sem conexão';
          }
        });
    } catch (error) {
      setStatus(false,'Chat indisponível');
      note('Falha ao conectar. Toque em reconectar.');
    }
  };
  async function publish(text) {
    const value = String(text || '').trim().slice(0,160);
    if (!value || !connected || lastSending) return;
    const now = Date.now();
    if (now - lastSend < 1800) { note('Envie uma mensagem a cada 2 segundos.'); return; }
    lastSend = now;
    lastSending = true;
    send.disabled = true;
    const payload = {id:uid(),sender:identity,nickname:filterName(name.value),text:value};
    try {
      const outcome = await channel.send({type:'broadcast',event:'message',payload});
      if (outcome !== 'ok') throw new Error('Não entregue');
      renderMessage(payload);
      input.value = '';
    } catch {
      note('Mensagem não enviada. Confira a conexão e tente novamente.');
    } finally {
      lastSending = false;
      send.disabled = !connected;
    }
  }
  form.addEventListener('submit', event=>{event.preventDefault();publish(input.value);});
  document.querySelectorAll('.np-chat-emoji button').forEach(button=>
    button.addEventListener('click',()=>publish(button.dataset.emoji))
  );
  retry.addEventListener('click',connect);
  setStatus(false,'Conectando...');
  connect();
})();