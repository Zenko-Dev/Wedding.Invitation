/* Frontend app (vanilla JS). Ajusta GAS_URL y datos del evento.
 * Zona horaria: America/Mexico_City (UTC-6 actualmente).
 */
(function(){
  'use strict';

  // CONFIGURA AQUÍ tu Web App URL de Apps Script (termina en /exec)
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbxVq_R29C1KtAgWWRA6lP0h7j7hKwFafx1accebzNgOZm0R7UQTt6pGTDmntDionGDA/exec';
  const TIME_ZONE = 'America/Mexico_City';

  // Fechas del evento en hora local de CDMX (UTC-6)
  const EVENT = {
    title: 'Boda Suleydy & Angel',
    ceremony: {
      start: new Date('2025-11-22T17:00:00-06:00'),
      end:   new Date('2025-11-22T18:00:00-06:00'),
      location: 'Templo Parroquial, Ciudad',
      details: 'Ceremonia religiosa',
    },
    reception: {
      start: new Date('2025-11-22T19:30:00-06:00'),
      end:   new Date('2025-11-23T02:00:00-06:00'),
      location: 'Salón de Eventos, Ciudad',
      details: 'Recepción y fiesta',
    },
  };
  const COUNTDOWN_TARGET = new Date('2025-11-22T17:00:00-06:00');

  const els = {
    cdDays: document.getElementById('cd-days'),
    cdHours: document.getElementById('cd-hours'),
    cdMins: document.getElementById('cd-mins'),
    cdSecs: document.getElementById('cd-secs'),
    btnCalendar: document.getElementById('btn-calendar'),
    linkCeremony: document.getElementById('link-calendar-ceremony'),
    linkReception: document.getElementById('link-calendar-reception'),
    guestGreeting: document.getElementById('guest-greeting'),
    form: document.getElementById('rsvp-form'),
    btnSubmit: document.getElementById('btn-submit'),
    rowGuests: document.getElementById('row-guests'),
    guests: document.getElementById('guests'),
    guestsHelp: document.getElementById('guests-help'),
    status: document.getElementById('form-status'),
  };

  // Smooth scroll para anclas internas
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if(id.length > 1){ e.preventDefault(); document.querySelector(id)?.scrollIntoView({behavior:'smooth'}); }
    });
  });

  // Aparición con IntersectionObserver
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting){ entry.target.classList.add('in'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('[data-animate]').forEach(el => io.observe(el));

  // Modal (lluvia de sobres)
  document.querySelectorAll('[data-open-modal]')?.forEach(btn => {
    btn.addEventListener('click', () => {
      const sel = btn.getAttribute('data-open-modal');
      const m = document.querySelector(sel);
      if(m){ openModal(m, btn); }
    });
  });
  document.querySelectorAll('[data-close-modal]')?.forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.closest('.modal')));
  });

  // Modal accesible: focus trap + ESC
  let lastFocusedBeforeModal = null;
  function getFocusable(container){
    return Array.from(container.querySelectorAll('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'))
      .filter(el => !el.hasAttribute('disabled'));
  }
  function openModal(modal, trigger){
    lastFocusedBeforeModal = trigger || document.activeElement;
    modal.setAttribute('aria-hidden','false');
    const dialog = modal.querySelector('.modal__dialog');
    dialog && dialog.focus();
    function onKey(e){
      if(e.key === 'Escape'){ e.preventDefault(); closeModal(modal); }
      if(e.key === 'Tab'){
        const focusables = getFocusable(dialog||modal);
        if(focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length-1];
        if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    }
    modal._onKey = onKey; // store handler
    document.addEventListener('keydown', onKey);
  }
  function closeModal(modal){
    if(!modal) return;
    modal.setAttribute('aria-hidden','true');
    document.removeEventListener('keydown', modal._onKey || (()=>{}));
    const toFocus = lastFocusedBeforeModal;
    setTimeout(() => { try{ toFocus && toFocus.focus(); }catch(_){} }, 0);
  }

  // Countdown
  function pad(n){ return n.toString().padStart(2,'0'); }
  function updateCountdown(){
    const now = new Date();
    const diff = Math.max(0, COUNTDOWN_TARGET - now);
    const s = Math.floor(diff/1000);
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    if(els.cdDays) els.cdDays.textContent = String(days);
    if(els.cdHours) els.cdHours.textContent = pad(hours);
    if(els.cdMins) els.cdMins.textContent = pad(mins);
    if(els.cdSecs) els.cdSecs.textContent = pad(secs);
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // Calendar helpers
  function toGoogleDate(dt){
    const y = dt.getFullYear();
    const m = (dt.getMonth()+1).toString().padStart(2,'0');
    const d = dt.getDate().toString().padStart(2,'0');
    const hh = dt.getHours().toString().padStart(2,'0');
    const mm = dt.getMinutes().toString().padStart(2,'0');
    const ss = '00';
    return `${y}${m}${d}T${hh}${mm}${ss}`;
  }
  function googleCalLink({title, start, end, location, details}){
    const dates = `${toGoogleDate(start)}/${toGoogleDate(end)}`;
    const params = new URLSearchParams({ action:'TEMPLATE', text:title, dates, location, details });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }
  function buildICS({title, start, end, location, details}){
    function fmt(dt){
      const y = dt.getUTCFullYear();
      const m = (dt.getUTCMonth()+1).toString().padStart(2,'0');
      const d = dt.getUTCDate().toString().padStart(2,'0');
      const hh = dt.getUTCHours().toString().padStart(2,'0');
      const mm = dt.getUTCMinutes().toString().padStart(2,'0');
      const ss = dt.getUTCSeconds().toString().padStart(2,'0');
      return `${y}${m}${d}T${hh}${mm}${ss}Z`;
    }
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AA Wedding//RSVP//ES',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${(details||'').replace(/\n/g,'\\n')}`,
      `LOCATION:${location||''}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    return new Blob([lines.join('\r\n')], {type:'text/calendar'});
  }
  function downloadBlob(blob, filename){ const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 1000); }

  if(els.btnCalendar){
    els.btnCalendar.addEventListener('click', () => {
      const ics = buildICS({ title: EVENT.title, start: EVENT.ceremony.start, end: EVENT.reception.end, location: EVENT.reception.location, details: 'Acompáñanos a celebrar nuestra boda.' });
      downloadBlob(ics, 'boda-aa.ics');
    });
  }
  if(els.linkCeremony){ els.linkCeremony.href = googleCalLink({ title:`${EVENT.title} — Ceremonia`, start:EVENT.ceremony.start, end:EVENT.ceremony.end, location:EVENT.ceremony.location, details:EVENT.ceremony.details }); }
  if(els.linkReception){ els.linkReception.href = googleCalLink({ title:`${EVENT.title} — Recepción`, start:EVENT.reception.start, end:EVENT.reception.end, location:EVENT.reception.location, details:EVENT.reception.details }); }

  // Token handling & RSVP
  function getTokenFromUrl(){
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get('id');
    if(fromQuery) return fromQuery.trim();
    const hash = url.hash || '';
    const m = hash.match(/id=([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
  }
  function rememberToken(token){ try{ localStorage.setItem('inviteToken', token); }catch(_){} }
  function loadToken(){ try{ return localStorage.getItem('inviteToken'); }catch(_){ return null; } }

  // Parallax suave en hero flourish
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const flourish = document.querySelector('.hero__flourish');
  if(flourish && !reduceMotion){
    let ticking = false;
    function onScroll(){
      if(ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY * 0.15; // efecto sutil
        flourish.style.transform = `translate(-50%, ${y}px)`;
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive:true });
    onScroll();
  }

  // Helper: fetch con timeout para evitar esperas largas en GAS
  async function fetchWithTimeout(url, options={}, timeoutMs=8000){
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort('timeout'), timeoutMs);
    try{
      const res = await fetch(url, { ...options, signal: ctrl.signal });
      clearTimeout(id);
      return res;
    }catch(err){
      clearTimeout(id);
      throw err;
    }
  }

  async function requestJsonWithRetry(url, options={}, timeouts=[10000, 15000, 20000]){
    let lastErr;
    for(let i=0;i<timeouts.length;i++){
      try{
        const res = await fetchWithTimeout(url, options, timeouts[i]);
        if(!res.ok) throw new Error('HTTP '+res.status);
        return await res.json();
      }catch(err){
        lastErr = err;
        // breve espera antes de reintentar
        await new Promise(r => setTimeout(r, 300));
      }
    }
    throw lastErr || new Error('request_failed');
  }

  async function validateToken(token){
    if(!GAS_URL){ console.warn('GAS_URL no definido'); return null; }
    try{
      const url = `${GAS_URL}?endpoint=guest&id=${encodeURIComponent(token)}`;
      return await requestJsonWithRetry(url, { mode:'cors' }, [10000, 15000, 20000]);
    }catch(err){ console.error('validateToken error', err); return null; }
  }

  function setGreeting(guest){
    if(!guest){ if(els.guestGreeting) els.guestGreeting.textContent = 'Ingresa desde tu link personal para confirmar.'; return; }
    const name = guest.name || 'Invitado(a)';
    if(els.guestGreeting) els.guestGreeting.textContent = `Hola, ${name}. ¡Gracias por acompañarnos!`;
  }
  function setGuestsLimit(max){
    const m = Math.max(1, Number(max || 1));
    if(els.guests){ els.guests.max = String(m); els.guests.value = '1'; }
    if(els.guestsHelp){ els.guestsHelp.textContent = `Tu invitación es válida para ${m} ${m>1?'personas':'persona'}.`; }
  }
  function setFormEnabled(enabled){
    if(els.btnSubmit) els.btnSubmit.disabled = !enabled;
    els.form?.querySelectorAll('input, textarea, button').forEach(el => { if(el.id !== 'btn-submit') el.disabled = !enabled; });
  }

  // Mostrar invitados solo si asiste
  els.form?.addEventListener('change', () => {
    const attending = els.form.querySelector('input[name="attending"]:checked')?.value;
    if(els.rowGuests) els.rowGuests.hidden = attending !== 'si';
  });

  els.form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(els.status) els.status.textContent = '';
    const token = loadToken();
    if(!token){ if(els.status) els.status.textContent = 'No se encontró tu invitación. Abre tu enlace personal.'; return; }
    const attendingVal = els.form.querySelector('input[name="attending"]:checked')?.value;
    if(!attendingVal){ if(els.status) els.status.textContent = 'Selecciona si asistirás.'; return; }
    const attending = attendingVal === 'si';
    const guests = attending ? Math.min(Number(els.guests?.value||1), Number(els.guests?.max||1)) : 0;
    const message = (document.getElementById('message')?.value || '').trim();

    setFormEnabled(false);
    if(els.status) els.status.textContent = 'Enviando…';
    try{
      const res = await fetch(GAS_URL, { method:'POST', mode:'cors', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'rsvp', token, attending, guests, message }) });
      const data = await res.json();
      if(data && data.ok){
        if(els.status) els.status.textContent = attending ? '¡Gracias! Confirmación recibida.' : 'Lamentamos que no puedas asistir. ¡Gracias por avisar!';
        if(els.btnSubmit) els.btnSubmit.disabled = true;
      }else{
        if(els.status) els.status.textContent = data?.error || 'No fue posible guardar tu respuesta.';
        setFormEnabled(true);
      }
    }catch(err){
      console.error(err);
      if(els.status) els.status.textContent = 'Error de conexión. Intenta de nuevo.';
      setFormEnabled(true);
    }
  });

  async function initRSVP(){
    const token = getTokenFromUrl() || loadToken();
    if(token){ rememberToken(token); }
    if(!token){ setGreeting(null); setFormEnabled(false); return; }
    setFormEnabled(false);
    if(els.status) els.status.textContent = 'Cargando tu invitación…';
    const data = await validateToken(token);
    if(!data || data.status !== 'ok'){ setGreeting(null); if(els.status) els.status.textContent = (data && data.status==='not_found')?'Invitación no encontrada. Revisa tu enlace.':'No pudimos validar tu invitación.'; return; }
    setGreeting({ name: data.guestName });
    setGuestsLimit(data.maxPasses || 1);
    if(els.status) els.status.textContent = '';
    setFormEnabled(true);

    // Prefill si ya respondió
    if(typeof data.attending === 'boolean'){
      const radio = els.form.querySelector(`input[name="attending"][value="${data.attending?'si':'no'}"]`);
      if(radio){ radio.checked = true; }
      if(els.rowGuests) els.rowGuests.hidden = !data.attending;
    }
    if(data.guestsCount && els.guests){ els.guests.value = String(data.guestsCount); }
    if(data.message){ const m = document.getElementById('message'); if(m){ m.value = data.message; } }
  }

  initRSVP();
})();
/* Frontend app (vanilla JS). Ajusta GAS_URL y datos del evento.
 * Zona horaria: America/Mexico_City.
 */
(function(){
  'use strict';

  // URL del Web App de Apps Script (termina en /exec)
  // URL del Web App de Apps Script (termina en /exec)
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbxZ0uwN4d733AsB49MUbP2skA31tD7CGuQDhcLPvzG-v91g3x9QyBPtfV2Q3XiSc-CN/exec';

  // Fechas del evento en hora local de CDMX
  const EVENT = {
    title: 'Boda Ángel & Andrea',
    ceremony: {
      start: new Date('2025-11-22T17:00:00-06:00'),
      end:   new Date('2025-11-22T18:00:00-06:00'),
      location: 'Templo Parroquial, Ciudad',
      details: 'Ceremonia religiosa',
    },
    reception: {
      start: new Date('2025-11-22T19:30:00-06:00'),
      end:   new Date('2025-11-23T02:00:00-06:00'),
      location: 'Salón de Eventos, Ciudad',
      details: 'Recepción y fiesta',
    },
  };
  const COUNTDOWN_TARGET = new Date('2025-11-22T17:00:00-06:00');

  const els = {
    cdDays: document.getElementById('cd-days'),
    cdHours: document.getElementById('cd-hours'),
    cdMins: document.getElementById('cd-mins'),
    cdSecs: document.getElementById('cd-secs'),
    btnCalendar: document.getElementById('btn-calendar'),
    linkCeremony: document.getElementById('link-calendar-ceremony'),
    linkReception: document.getElementById('link-calendar-reception'),
    guestGreeting: document.getElementById('guest-greeting'),
    form: document.getElementById('rsvp-form'),
    btnSubmit: document.getElementById('btn-submit'),
    rowGuests: document.getElementById('row-guests'),
    guests: document.getElementById('guests'),
    guestsHelp: document.getElementById('guests-help'),
    status: document.getElementById('form-status'),
    guestName: document.getElementById('guest-name'),
    passes: document.getElementById('passes'),
    guestNotes: document.getElementById('guest-notes'),
    toast: document.getElementById('toast'),
  };

  // Smooth scroll para anclas internas
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if(id.length > 1){ e.preventDefault(); document.querySelector(id)?.scrollIntoView({behavior:'smooth'}); }
    });
  });

  // Aparición con IntersectionObserver
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting){ entry.target.classList.add('in'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('[data-animate]').forEach(el => io.observe(el));

  // Modales (lluvia de sobres)
  document.querySelectorAll('[data-open-modal]')?.forEach(btn => {
    btn.addEventListener('click', () => {
      const sel = btn.getAttribute('data-open-modal');
      const m = document.querySelector(sel);
      if(m){ m.setAttribute('aria-hidden','false'); }
    });
  });
  document.querySelectorAll('[data-close-modal]')?.forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.modal')?.setAttribute('aria-hidden','true'));
  });

  // Countdown
  function pad(n){ return n.toString().padStart(2,'0'); }
  function updateCountdown(){
    const now = new Date();
    const diff = Math.max(0, COUNTDOWN_TARGET - now);
    const s = Math.floor(diff/1000);
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    if(els.cdDays) els.cdDays.textContent = String(days);
    if(els.cdHours) els.cdHours.textContent = pad(hours);
    if(els.cdMins) els.cdMins.textContent = pad(mins);
    if(els.cdSecs) els.cdSecs.textContent = pad(secs);
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // Calendar helpers
  function toGoogleDate(dt){
    const y = dt.getFullYear();
    const m = (dt.getMonth()+1).toString().padStart(2,'0');
    const d = dt.getDate().toString().padStart(2,'0');
    const hh = dt.getHours().toString().padStart(2,'0');
    const mm = dt.getMinutes().toString().padStart(2,'0');
    const ss = '00';
    return `${y}${m}${d}T${hh}${mm}${ss}`;
  }
  function googleCalLink({title, start, end, location, details}){
    const dates = `${toGoogleDate(start)}/${toGoogleDate(end)}`;
    const params = new URLSearchParams({ action:'TEMPLATE', text:title, dates, location, details });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }
  function buildICS({title, start, end, location, details}){
    function fmt(dt){
      const y = dt.getUTCFullYear();
      const m = (dt.getUTCMonth()+1).toString().padStart(2,'0');
      const d = dt.getUTCDate().toString().padStart(2,'0');
      const hh = dt.getUTCHours().toString().padStart(2,'0');
      const mm = dt.getUTCMinutes().toString().padStart(2,'0');
      const ss = dt.getUTCSeconds().toString().padStart(2,'0');
      return `${y}${m}${d}T${hh}${mm}${ss}Z`;
    }
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AA Wedding//RSVP//ES',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${(details||'').replace(/\n/g,'\\n')}`,
      `LOCATION:${location||''}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    return new Blob([lines.join('\r\n')], {type:'text/calendar'});
  }
  function downloadBlob(blob, filename){ const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 1000); }

  if(els.btnCalendar){
    els.btnCalendar.addEventListener('click', () => {
      const ics = buildICS({ title: EVENT.title, start: EVENT.ceremony.start, end: EVENT.reception.end, location: EVENT.reception.location, details: 'Acompáñanos a celebrar nuestra boda.' });
      downloadBlob(ics, 'boda-aa.ics');
    });
  }
  if(els.linkCeremony){ els.linkCeremony.href = googleCalLink({ title:`${EVENT.title} — Ceremonia`, start:EVENT.ceremony.start, end:EVENT.ceremony.end, location:EVENT.ceremony.location, details:EVENT.ceremony.details }); }
  if(els.linkReception){ els.linkReception.href = googleCalLink({ title:`${EVENT.title} — Recepción`, start:EVENT.reception.start, end:EVENT.reception.end, location:EVENT.reception.location, details:EVENT.reception.details }); }

  // Token handling & RSVP
  function getTokenFromUrl(){
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get('id');
    if(fromQuery) return fromQuery.trim();
    const hash = url.hash || '';
    const m = hash.match(/id=([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
  }
  function rememberToken(token){ try{ localStorage.setItem('inviteToken', token); }catch(_){} }
  function loadToken(){ try{ return localStorage.getItem('inviteToken'); }catch(_){ return null; } }

  async function validateToken(token){
    if(!GAS_URL){ console.warn('GAS_URL no definido'); return null; }
    try{
      const res = await fetch(`${GAS_URL}?action=validate&token=${encodeURIComponent(token)}`, { mode:'cors' });
      if(!res.ok) throw new Error('HTTP '+res.status);
      return await res.json();
    }catch(err){ console.error('validateToken error', err); return null; }
  }

  function setGreeting(guest){
    if(!guest){ if(els.guestGreeting) els.guestGreeting.textContent = 'Ingresa desde tu link personal para confirmar.'; return; }
    const name = guest.name || 'Invitado(a)';
    if(els.guestGreeting) els.guestGreeting.textContent = `Hola, ${name}. ¡Gracias por acompañarnos!`;
    if(els.guestName) els.guestName.value = name;
  }
  function setGuestsLimit(max){
    const m = Math.max(1, Number(max || 1));
    if(els.guests){ els.guests.max = String(m); els.guests.value = '1'; }
    if(els.guestsHelp){ els.guestsHelp.textContent = `Tu invitación es válida para ${m} ${m>1?'personas':'persona'}.`; }
    if(els.passes){ els.passes.value = String(m); }
  }
  function setFormEnabled(enabled){
    if(els.btnSubmit) els.btnSubmit.disabled = !enabled;
    els.form?.querySelectorAll('input, textarea, button').forEach(el => { if(el.id !== 'btn-submit') el.disabled = !enabled; });
  }
  function showToast(msg){
    if(!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    setTimeout(() => els.toast.classList.remove('show'), 2400);
  }

  // Mostrar invitados solo si asiste
  els.form?.addEventListener('change', () => {
    const attending = els.form.querySelector('input[name="attending"]:checked')?.value;
    if(els.rowGuests) els.rowGuests.hidden = attending !== 'si';
  });

  els.form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(els.status) els.status.textContent = '';
    const token = loadToken();
    if(!token){ if(els.status) els.status.textContent = 'No se encontró tu invitación. Abre tu enlace personal.'; return; }
    const attendingVal = els.form.querySelector('input[name="attending"]:checked')?.value;
    if(!attendingVal){ if(els.status) els.status.textContent = 'Selecciona si asistirás.'; return; }
    const attending = attendingVal === 'si';
    const guests = attending ? Math.min(Number(els.guests?.value||1), Number(els.guests?.max||1)) : 0;
    const message = (document.getElementById('message')?.value || '').trim();

    setFormEnabled(false);
    if(els.status) els.status.textContent = 'Enviando…';
    try{
      const postUrl = `${GAS_URL}?endpoint=rsvp`;
      const data = await requestJsonWithRetry(postUrl, { method:'POST', mode:'cors', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: token, attending, guestsCount: guests, message }) }, [12000, 18000]);
      if(data && data.status === 'ok'){
        if(els.status) els.status.textContent = attending ? '¡Gracias! Confirmación recibida.' : 'Lamentamos que no puedas asistir. ¡Gracias por avisar!';
        if(els.btnSubmit) els.btnSubmit.disabled = true;
        showToast('RSVP guardado correctamente');
      }else{
        if(els.status) els.status.textContent = data?.error || 'No fue posible guardar tu respuesta.';
        setFormEnabled(true);
        showToast('No se pudo guardar el RSVP');
      }
    }catch(err){
      console.error(err);
      if(els.status) els.status.textContent = 'Error de conexión. Intenta de nuevo.';
      setFormEnabled(true);
      showToast('Error de conexión');
    }
  });

  async function initRSVP(){
    const token = getTokenFromUrl() || loadToken();
    if(token){ rememberToken(token); }
    if(!token){ setGreeting(null); setFormEnabled(false); return; }
    setFormEnabled(false);
    if(els.status) els.status.textContent = 'Cargando tu invitación…';
    const data = await validateToken(token);
    if(!data || data.ok !== true){ setGreeting(null); if(els.status) els.status.textContent = 'No pudimos validar tu invitación. Revisa tu enlace.'; return; }
    setGreeting({ name: data.name });
    setGuestsLimit(data.maxGuests || 1);
    if(els.status) els.status.textContent = '';
    setFormEnabled(true);

    // Prefill si ya respondió
    if(typeof data.attending === 'boolean'){
      const radio = els.form.querySelector(`input[name="attending"][value="${data.attending?'si':'no'}"]`);
      if(radio){ radio.checked = true; }
      if(els.rowGuests) els.rowGuests.hidden = !data.attending;
    }
    if((data.guestsCount!=null) && els.guests){ els.guests.value = String(data.guestsCount); }
    if(data.message){ const m = document.getElementById('message'); if(m){ m.value = data.message; } }
    if(typeof data.notes === 'string' && data.notes.trim().length > 0 && els.guestNotes){
      els.guestNotes.textContent = data.notes.trim();
      els.guestNotes.hidden = false;
    }
  }

  // Copiar CLABE en modal
  document.getElementById('btn-copy-clabe')?.addEventListener('click', async () => {
    const clabe = document.getElementById('clabe')?.textContent?.trim() || '';
    try{ await navigator.clipboard.writeText(clabe); showToast('CLABE copiada'); }
    catch(_){ showToast('No se pudo copiar'); }
  });

  initRSVP();
})();
