/**
 * Google Apps Script backend para RSVP con Google Sheets
 *
 * Endpoints:
 *  - GET  /guest?id=<TOKEN>
 *  - POST /rsvp  (JSON body: { id, attending, guestsCount, message, notes })
 *
 * Hoja: "Invitados"
 * Columnas (orden recomendado):
 *  A: token
 *  B: guestName
 *  C: maxPasses
 *  D: notes
 *  E: attending
 *  F: guestsCount
 *  G: message
 *  H: updatedAt
 */

const SHEET_NAME = 'Invitados';
const REQUIRED_HEADERS = ['token','guestName','maxPasses','notes','attending','guestsCount','message','updatedAt'];

// Cache: acelera búsquedas y respuestas
const CACHE_TTL_ROWSEC = 3600; // 1 hora (índice de fila por token)
const CACHE_TTL_GUESTSEC = 300; // 5 minutos (payload invitado)
function cache_(){ return CacheService.getScriptCache(); }
function cacheGet_(k){ try{ return cache_().get(k); }catch(e){ return null; } }
function cachePut_(k,v,ttl){ try{ cache_().put(k, v, ttl); }catch(e){} }
function cacheRemove_(k){ try{ cache_().remove(k); }catch(e){} }

function getSheet_(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  const lastCol = sh.getLastColumn();
  if(lastCol < REQUIRED_HEADERS.length){
    sh.getRange(1,1,1,REQUIRED_HEADERS.length).setValues([REQUIRED_HEADERS]);
  } else {
    // Si la cabecera no coincide, la normalizamos
    const current = sh.getRange(1,1,1,lastCol).getValues()[0].map(v => String(v||'').trim());
    let needsNormalize = false;
    for (let i=0;i<REQUIRED_HEADERS.length;i++) if(current[i] !== REQUIRED_HEADERS[i]) { needsNormalize = true; break; }
    if(needsNormalize){
      sh.getRange(1,1,1,REQUIRED_HEADERS.length).setValues([REQUIRED_HEADERS]);
    }
  }
  return sh;
}

function getHeaderMap_(){
  const sh = getSheet_();
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  const map = {};
  for(let c=0;c<headers.length;c++){
    const key = String(headers[c]||'').trim();
    if(key) map[key] = c+1; // 1-based
  }
  return map;
}

function findRowByToken_(token){
  const key = 'tok:'+String(token||'').trim();
  const cached = cacheGet_(key);
  if(cached){ const n = Number(cached); if(n>0) return n; }
  const sh = getSheet_();
  const map = getHeaderMap_();
  const tokenCol = map['token'] || 1;
  const last = Math.max(0, sh.getLastRow()-1);
  if(last <= 0) return -1;
  const values = sh.getRange(2, tokenCol, last, 1).getValues();
  for(let i=0;i<values.length;i++){
    if(String(values[i][0]).trim() === String(token).trim()){
      const rowIndex = 2+i;
      cachePut_(key, String(rowIndex), CACHE_TTL_ROWSEC);
      return rowIndex; // row index
    }
  }
  return -1;
}

function guestPayload_(rowIndex, id){
  const sh = getSheet_();
  const map = getHeaderMap_();
  const row = sh.getRange(rowIndex, 1, 1, sh.getLastColumn()).getValues()[0];
  function val(h){ return row[(map[h]-1)] }
  return {
    status: 'ok',
    id: id,
    guestName: String(val('guestName')||''),
    maxPasses: Number(val('maxPasses')||1),
    notes: String(val('notes')||''),
    attending: val('attending') === true,
    guestsCount: Number(val('guestsCount')||0),
    message: String(val('message')||''),
    updatedAt: String(val('updatedAt')||'')
  };
}

function jsonOutput_(obj){
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function route_(e){
  const path = (e && e.pathInfo) ? (''+e.pathInfo).replace(/^\//,'').toLowerCase() : '';
  // Fallbacks por si no llega pathInfo
  const p = (e && e.parameter) || {};
  const action = (p.action||p.endpoint||'').toLowerCase();
  return path || action || '';
}

function doOptions(){
  // Responder 200 OK a preflights simples
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e){
  try{
    const r = route_(e);
    if(r === 'guest'){
      const id = (e.parameter && e.parameter.id) ? (''+e.parameter.id).trim() : '';
      if(!id) return jsonOutput_({ status:'error', error:'missing_id' });
      const cacheKey = 'guest:'+id;
      const cached = cacheGet_(cacheKey);
      if(cached){ return jsonOutput_(JSON.parse(cached)); }
      const rowIndex = findRowByToken_(id);
      if(rowIndex < 0) return jsonOutput_({ status:'not_found' });
      const payload = guestPayload_(rowIndex, id);
      cachePut_(cacheKey, JSON.stringify(payload), CACHE_TTL_GUESTSEC);
      return jsonOutput_(payload);
    }
    return jsonOutput_({ status:'error', error:'unknown_endpoint' });
  }catch(err){
    return jsonOutput_({ status:'error', error: String(err) });
  }
}

function doPost(e){
  try{
    const r = route_(e);
    const body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    if(r === 'rsvp'){
      const id = (body.id||'').trim();
      if(!id) return jsonOutput_({ status:'error', error:'missing_id' });
      const rowIndex = findRowByToken_(id);
      if(rowIndex < 0) return jsonOutput_({ status:'not_found' });

      const sh = getSheet_();
      const map = getHeaderMap_();
      const attending = !!body.attending;
      const guestsCount = attending ? Number(body.guestsCount||0) : 0;
      const message = String(body.message||'');
      const notes = String(body.notes||'');
      const now = new Date();

      if(map['attending']) sh.getRange(rowIndex, map['attending']).setValue(attending);
      if(map['guestsCount']) sh.getRange(rowIndex, map['guestsCount']).setValue(guestsCount);
      if(map['message']) sh.getRange(rowIndex, map['message']).setValue(message);
      if(map['notes']) sh.getRange(rowIndex, map['notes']).setValue(notes);
      if(map['updatedAt']) sh.getRange(rowIndex, map['updatedAt']).setValue(now);
      // Invalida caché del invitado
      cacheRemove_('guest:'+id);

      return jsonOutput_({ status:'ok' });
    }
    return jsonOutput_({ status:'error', error:'unknown_endpoint' });
  }catch(err){
    return jsonOutput_({ status:'error', error: String(err) });
  }
}

/** Utilidad para generar tokens aleatorios (ejecutar manualmente en la consola de Apps Script) */
function generarTokens_(filaInicio, filaFin){
  const sh = getSheet_();
  const map = getHeaderMap_();
  const col = map['token'] || 1;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  function token(){ let s=''; for(let i=0;i<12;i++) s += alphabet[Math.floor(Math.random()*alphabet.length)]; return s; }
  for(let r=filaInicio; r<=filaFin; r++){
    const val = sh.getRange(r,col).getValue();
    if(!val){ sh.getRange(r,col).setValue(token()); }
  }
}

/** Menú personalizado en la hoja */
function onOpen(){
  SpreadsheetApp.getUi().createMenu('RSVP')
    .addItem('Generar tokens (filas 2-101)','menuGenerarTokens')
    .addToUi();
}
function menuGenerarTokens(){ generarTokens_(2, 101); }
