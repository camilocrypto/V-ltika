'use strict';
(() => {
  const M=window.Voltika, $=id=>document.getElementById(id);
  const shapes={
    person:'<circle cx="12" cy="8" r="3.5"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    route:'<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 6h6a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6"/>',
    history:'<path d="M3 11a9 9 0 1 1 2.4 7M3 4v7h7M12 7v5l3 2"/>',
    pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0z"/><circle cx="12" cy="10" r="2.2"/>',
    map:'<path d="m3 5 6-2 6 2 6-2v15l-6 3-6-3-6 3zM9 3v15M15 5v16"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',distance:'<path d="m4 18 14-14 3 3L7 21zM14 8l2 2M10 12l2 2M7 15l2 2"/>',
    saving:'<path d="M3 6l6 6 4-4 8 9M15 17h6v-6"/>',
    stellar:'<path d="m2.7 16 18.7-9.4M3.4 19 21 10.2M5.4 12a7.4 7.4 0 0 1 11.8-6.2M18.8 12a7.3 7.3 0 0 1-11.6 6.3"/>',
    cash:'<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M5 12h.1M19 12h.1"/>',
    bike:'<circle cx="4.7" cy="16" r="3.2"/><circle cx="19.2" cy="16" r="3.2"/><path d="m3 9 4 1 3 4h4l3-5-3-1-3 2H8M14 5h2.3l3.3 10.8M2 12l5-1"/>',
    chevron:'<path d="m7 10 5 5 5-5"/>',check:'<path d="m4 12 5 5L20 6"/>',cancel:'<path d="m6 6 12 12M18 6 6 18"/>',
    receipt:'<path d="M5 3l3 2 4-2 4 2 3-2v18l-3-2-4 2-4-2-3 2zM8 9h8M8 13h6"/>'
  };
  const icon=(key)=>'<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">'+(shapes[key]||'')+'</svg>';
  document.querySelectorAll('[data-icon]').forEach(el=>el.outerHTML=icon(el.dataset.icon));
  const key='voltika.passenger.v1',duration=18000;
  function load(){try{return JSON.parse(localStorage.getItem(key))||{};}catch{return {};}}
  const eraseKey='voltika.eraseEpoch';
  function epoch(){try{return localStorage.getItem(eraseKey)||'';}catch{return '';}}
  let currentEpoch=epoch();
  const data=load();
  let from=M.places[data.from]?data.from:'baq',to=M.places[data.to]?data.to:'cost',method=data.method==='clp'?'clp':'xlm';
  let trips=Array.isArray(data.trips)?data.trips.filter(t=>M.places[t.from]&&M.places[t.to]&&t.quote&&typeof t.id==='string'):[], activeId=data.activeId;
  let service=data.service==='parcel'?'parcel':'ride',parcel=['Sobre','Caja pequeña'].includes(data.parcel)?data.parcel:'Sobre';
  let view='ride',zoom=1,busy=false,detailId=null,storageWarning=false;
  function persist(){
    try{if(currentEpoch!==epoch())return false;localStorage.setItem(key,JSON.stringify({from,to,method,service,parcel,trips,activeId}));return true;}
    catch{storageWarning=true;return false;}
  }
  const announce=t=>{$('announcer').textContent=t;};
  const active=()=>trips.find(t=>t.id===activeId);
  const name=p=>M.places[p][0], val=(t)=>t.method==='xlm'?M.dec(t.quote.xlm,2)+' XLM':M.clp(t.quote.base);
  const esc=v=>String(v).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const prettyTime=v=>new Date(v).toLocaleString('es-CL',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  const stateName=s=>({offered:'Oferta al motociclista',handoff:'Pendiente de entrega',declined:'Oferta rechazada',matching:'Buscando moto',ready:'Moto asignada',moving:'En recorrido',done:'Finalizado',cancelled:'Cancelado'}[s]||'Demo');
  function options(selected){return Object.entries(M.places).map(([k,v])=>'<option value="'+k+'" '+(selected===k?'selected':'')+'>'+v[0]+'</option>').join('');}
  function field(id,title,p,ending){
    return '<div class="field"><span class="point '+(ending?'end':'')+'"></span><label for="'+id+'"><span class="lbl">'+title+'</span><span class="selected-value">'+name(p)+'</span></label><select aria-label="'+title+'" id="'+id+'">'+options(p)+'</select>'+icon('chevron')+'</div>';
  }
  function heading(i,t){return '<div class="heading"><span class="title-icon">'+icon(i)+'</span><h2>'+t+'</h2></div>';}
  function payOption(id,label,symbol,price){
    return '<button class="pay" data-pay="'+id+'" aria-pressed="'+(method===id)+'"><span class="pay-top">'+icon(symbol)+label+(id==='xlm'?'<b>−20%</b>':'')+'</span><strong>'+price+'</strong></button>';
  }
  const isParcel=t=>t.service==='parcel';
  const serviceName=t=>isParcel(t)?'Envío pequeño':'Viaje en moto';
  const row=(k,v)=>'<div class="receipt-line"><span>'+k+'</span><b>'+v+'</b></div>';
  function quoteLines(q,method){
    const base=q.baseCharge??1150, distance=q.distanceCharge??Math.round(q.km*440), adjustment=q.base-base-distance;
    const chosen=method==='xlm';
    return row('Base',M.clp(base))+row('Distancia · '+M.dec(q.km,2)+' km',M.clp(distance))+
      row('Ajuste al múltiplo de $50',(adjustment<0?'−':'')+M.clp(Math.abs(adjustment)))+
      row('Recargos y cargos adicionales','$0')+row('Tarifa estándar',M.clp(q.base))+
      (chosen?row('Promoción VÓLTIKA · 20%','−'+M.clp(q.saved)):'')+
      row('Total simulado',M.clp(chosen?q.reduced:q.base)+' CLP')+
      (chosen?row('Equivalencia de prueba',M.dec(q.xlm,2)+' XLM')+row('Cambio fijo de ejemplo','1 XLM = '+M.clp(q.rate??200)+' CLP'):'');
  }
  function randomHex(bytes){
    return Array.from(crypto.getRandomValues(new Uint8Array(bytes)),n=>n.toString(16).padStart(2,'0')).join('');
  }
  function renderPlan(){
    const q=M.route(from,to), pkg=service==='parcel';
    const owner=requesterRole(service);
    const pick=(id,label)=>'<button data-service="'+id+'" aria-pressed="'+(service===id)+'">'+label+'</button>';
    $('planner').innerHTML=heading('route','Planifica tu servicio')+
      '<div class="service-pick" role="group" aria-label="Tipo de servicio">'+pick('ride','Viaje en moto')+pick('parcel','Envío pequeño')+'</div>'+
      profileLink(owner,'Perfil de '+profiles.roles[owner].label.toLowerCase()+' · '+profiles.review(owner).label)+
      '<div class="fields">'+field('origin',pkg?'Retiro':'Origen',from,false)+field('destination',pkg?'Entrega':'Destino',to,true)+'</div>'+
      (pkg?'<label class="field-legend" for="parcelType">Paquete de práctica</label><select class="pkg-input" id="parcelType"><option '+(parcel==='Sobre'?'selected':'')+'>Sobre</option><option '+(parcel==='Caja pequeña'?'selected':'')+'>Caja pequeña</option></select>':'')+
      '<div class="field-legend">Medio de pago simulado</div><div class="pay-grid">'+
      payOption('xlm','Stellar XLM','stellar',q?M.dec(q.xlm,2)+' XLM':'—')+payOption('clp','Pesos chilenos','cash',q?M.clp(q.base):'—')+'</div>'+
      (q?'<div class="pay-info">Total <b>'+M.clp(method==='xlm'?q.reduced:q.base)+' CLP</b>'+(method==='xlm'?' · Ahorras '+M.clp(q.saved)+'.':' · Precio estándar.')+'</div>':'<p class="notice error" role="alert">Elige dos puntos diferentes.</p>')+
      '<button class="cta" data-do="book" '+(!q?'disabled':'')+'>'+icon('receipt')+'Revisar cotización</button><div class="rate-note">Simulación gratuita · Sin despacho de motos ni cobros reales.</div>';
  }
  function reviewQuote(){
    const q=M.route(from,to);if(!q||active())return;
    openModal('Revisa tu cotización','<p class="order-type">'+serviceName({service})+' · '+name(from)+' → '+name(to)+'</p>'+quoteLines(q,method)+
      '<p class="notice">La tarifa de práctica queda fija al confirmar. Puedes cancelar antes de iniciar por $0. Los puntos, la cotización y los estados se guardarán en este dispositivo.</p><div class="actions">'+
      button('confirmQuote','Confirmar simulación',true)+button('close','Volver a editar')+'</div>');
  }
  function lines(t){
    return '<div class="journey-lines"><span><b class="point"></b>'+name(t.from)+'</span><span><b class="point end"></b>'+name(t.to)+'</span></div>';
  }
  const button=(action,title,primary=false)=>'<button class="'+(primary?'cta':'secondary')+'" data-do="'+action+'">'+title+'</button>';
  const profiles = window.VoltikaProfiles;
  const requesterRole = s => s === 'parcel' ? 'sender' : 'passenger';
  let profileRole = 'passenger', profileChallenge = null;
  function profileLink(role, label) {
    return '<button class="profile-link" data-profile="'+role+'">'+icon('person')+label+'</button>';
  }
  function renderProfiles() {
    const role = profileRole, person = profiles.roles[role], state = profiles.review(role);
    $('profileRoles').innerHTML = Object.entries(profiles.roles).map(([id,item]) =>
      '<button data-profile="'+id+'" aria-pressed="'+(role===id)+'">'+item.label+'</button>').join('');
    const status = state.rejected ? 'issue' : state.ready ? 'approved' : '';
    const badge = (label,style) => '<span class="review-state '+style+'">'+label+'</span>';
    const checks = state.rows.map(check => '<li><div><b>'+check.label+'</b><small>'+
      (state.checked ? check.note : 'Espera la revisión de la ficha.')+'</small></div>'+
      badge(state.checked ? (check.ok ? 'Coincide en demo' : 'Observado') : 'Pendiente',state.checked ? (check.ok ? 'approved' : 'issue') : '')+'</li>').join('');
    const choices = profiles.scenarios(role).map(id => '<option value="'+id+'" '+(id===(state.record?.sample || 'valid')?'selected':'')+'>'+profiles.cases[id]+'</option>').join('');
    $('profileBody').innerHTML = '<div class="profile-layout"><section class="panel profile-card"><div class="identity-head">'+
      '<span class="monogram">'+person.initials+'</span><div><span>'+person.label+' · Perfil ficticio</span><h2>'+person.name+'</h2></div></div>'+
      row('Ficha de práctica',person.id)+(role==='sender'?row('Remitente','Contacto de Comercio Norte'):'')+(role==='carrier'?row('Moto asignada','Moto urbana · VT–07'):'')+
      '<p class="profile-status" role="status">Estado del perfil '+badge(state.label,status)+'</p>'+
      '<p>Esta revisión usa datos de ejemplo. Para acreditar una identidad real se necesita un proveedor de verificación y revisión de documentos.</p>'+
      (state.ready?'':button('focusReview','Ir a las comprobaciones'))+button('backToService',active()?'Volver al servicio':'Volver a la cotización')+'</section>'+
      '<section class="panel review-card"><h2 id="checksTitle" tabindex="-1">Comprobaciones</h2><div class="contact-block"><div><h3>Control del teléfono</h3>'+
      badge(state.contact ? 'Confirmado en demo' : 'Pendiente',state.contact?'approved':'')+'</div>'+
      '<p>Prueba un código de seis dígitos en un buzón ficticio. En un registro real, un SMS comprueba el acceso al número declarado.</p>'+
      (state.contact?'':button('profilePhone','Verificar teléfono demo'))+'</div>'+
      '<h3>Revisión de la ficha</h3><p>Elige un expediente ficticio para probar los controles. La demo simula la respuesta del verificador.</p>'+
      '<label for="profileSample">Expediente de prueba</label><select class="pkg-input" id="profileSample">'+choices+'</select>'+
      button('profileReview','Revisar expediente demo')+'<ul class="review-list">'+checks+'</ul></section></div>'+
      '<p class="profile-foot">El PIN de recogida o entrega valida ese paso del servicio. Stellar Testnet permite comprobar el pago. La identidad y los resultados del perfil permanecen en este dispositivo.</p>';
  }
  function openProfile(role) {
    if (!profiles.roles[role]) return;
    closeModal();
    profileRole=role;
    go('profiles');
    $('profileTitle').focus();
  }
  function openPhone(renew=false) {
    if (!profileChallenge || profileChallenge.role!==profileRole || renew)
      profileChallenge={role:profileRole, code:String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0'),
        expires:Date.now()+300000, attempts:0};
    const c=profileChallenge, locked=c.attempts>=3 || Date.now()>=c.expires;
    openModal('Verificar teléfono demo','<p>Buzón de práctica de '+profiles.roles[profileRole].name+' · El código dura cinco minutos y admite tres intentos.</p>'+
      (locked?'<p class="error">El código caducó o agotó los intentos.</p>'+button('newPhoneCode','Generar otro código',true):
      '<details class="fine-details"><summary>Abrir buzón ficticio</summary><p class="pin-box">'+c.code+'</p></details>'+
      '<form id="profilePhoneForm"><label for="phoneCode">Código del buzón</label><input id="phoneCode" class="pin-input" type="text" inputmode="numeric" minlength="6" maxlength="6" pattern="[0-9]{6}" required autocomplete="off">'+
      '<p class="error" id="phoneError" role="status"></p><button class="cta" type="submit">Confirmar teléfono demo</button></form>'));
  }
  function submitPhone() {
    const c=profileChallenge;
    if(!c || c.role!==profileRole || c.attempts>=3 || Date.now()>=c.expires){openPhone();return;}
    if($('phoneCode').value!==c.code){
      c.attempts++;
      if(c.attempts>=3)openPhone();else $('phoneError').textContent='Código incorrecto. Intentos restantes: '+(3-c.attempts)+'.';
      return;
    }
    profiles.recordContact(profileRole);profileChallenge=null;closeModal();renderProfiles();announce('Teléfono confirmado en demo.');
  }
  function requireProfile(role) {
    const state=profiles.review(role);
    if(state.ready)return true;
    openModal('Completa el perfil de '+profiles.roles[role].label.toLowerCase(),
      '<p>'+profiles.roles[role].name+' · '+state.label+'. Para continuar con este rol, confirma el teléfono demo y revisa un expediente válido.</p>'+
      '<div class="actions">'+profileLink(role,'Abrir perfil de '+profiles.roles[role].label.toLowerCase())+button('close','Volver')+'</div>');
    return false;
  }
  function renderTrip(t){
    const status=t.state,pkg=isParcel(t),q=t.quote;
    const titles={offered:'Oferta para el motociclista',matching:'Buscando tu moto…',ready:'Lista para la recogida',moving:'Recorrido en curso',handoff:'Confirma la entrega',done:pkg?'Paquete entregado':'Llegaste a destino',cancelled:'Servicio cancelado',declined:'Oferta rechazada'};
    let context='',actions='';
    if(status==='offered'){
      const commission=Math.round(q.base*0.10);
      context='<p class="demo-scope">Vista de motociclista · Oferta de práctica en este dispositivo.</p>'+
        row('Solicitante',pkg?'Comercio Norte (ficticio)':'Vale M. (ficticia)')+
        profileLink(requesterRole(t.service),'Ver perfil del solicitante')+profileLink('carrier','Perfil de transportista · '+profiles.review('carrier').label)+
        (pkg?row('Paquete',t.parcel==='Caja pequeña'?'Caja pequeña':'Sobre'):'')+
        row('Medio elegido',t.method==='xlm'?'XLM de prueba':'Pesos simulados')+
        row('Duración y distancia',q.minutes+' min · '+M.dec(q.km,2)+' km')+
        row('Comisión de ejemplo · 10%',M.clp(commission))+row('Neto previsto del motociclista',M.clp(q.base-commission)+' CLP')+
        '<p class="notice">La promoción se asigna a VÓLTIKA. Este desglose es ilustrativo. Acepta con la moto detenida. Puedes rechazar sin penalización.</p>';
      actions=button('acceptOffer','Aceptar oferta demo',true)+button('decline','Rechazar oferta')+button('cancel','Cancelar solicitud');
    }else if(status==='ready'||status==='moving'||status==='handoff'){
      context='<div class="driver"><span class="avatar">'+icon('bike')+'</span><div><b>Alex R. · Perfil ficticio</b><small>Moto urbana · Identificador demo VT–07</small></div></div>'+profileLink('carrier','Ver perfil del transportista');
      if(status==='ready'){
        context+='<p class="notice">Revisa el punto de retiro y valida el código de práctica antes de iniciar.</p>';
        actions=button('start','Validar recogida',true)+button('cancel','Cancelar servicio');
      }else if(status==='moving'){
        const pct=progress(t);
        context+='<div class="progress" role="progressbar" aria-label="Progreso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(pct*100)+'"><b style="width:'+pct*100+'%"></b></div><p class="notice">Recorrido simulado en 18 segundos.</p>';
        actions=button('arrive','Llegar al destino',true);
      }else{
        context+='<p class="notice">El paquete sigue pendiente hasta que el destinatario confirme el código de entrega.</p>';
        actions=button('deliver','Validar entrega',true);
      }
    }else if(status==='matching'){actions=button('cancel','Cancelar solicitud');}
    else{actions=button('receipt','Ver comprobante',true)+button('new','Planificar otro servicio');}
    $('planner').innerHTML='<span class="state-label">'+serviceName(t)+' · Demo</span><h2 class="state-title">'+titles[status]+'</h2>'+lines(t)+context+
      '<div class="total-line"><span>Total simulado</span><b>'+(status==='declined'||status==='cancelled'?'$0':val(t))+'</b></div><div class="actions">'+actions+'</div>'+
      '<button class="link-action" data-do="guide">Seguridad y privacidad</button>';
  }
  function pinChallenge(t,stage,renew=false){
    let c=t.challenge;
    if(!c||c.stage!==stage||renew){
      const old=t.pickupPin;
      let code;
      do{code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0');}while(code===old);
      c=t.challenge={stage,code,expires:Date.now()+300000,attempts:0};
      if(stage==='pickup')t.pickupPin=code;
      persist();
    }
    const locked=Date.now()>=c.expires||c.attempts>=3;
    const who=stage==='delivery'?'destinatario':(isParcel(t)?'remitente':'pasajero');
    openModal(stage==='delivery'?'Validar entrega':'Validar recogida',
      '<p class="notice">Práctica de los dos roles en este dispositivo. El '+who+' muestra su código al motociclista. El código dura cinco minutos y admite tres intentos.</p>'+
      (locked?'<p class="error">Este código venció o agotó los intentos.</p><div class="actions">'+button('renewPin','Generar otro código',true)+'</div>':
        '<details class="fine-details"><summary>Ver código del '+who+' ficticio</summary><p class="pin-box">'+c.code+'</p></details>'+
        '<form id="pinForm"><label for="pinEntry">Código recibido por el motociclista</label><input class="pin-input" id="pinEntry" type="text" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" required autocomplete="off">'+
        '<p id="pinError" class="error" role="status"></p><button class="cta" type="submit">Confirmar código</button></form>'));
  }
  function arrive(t){
    if(t.state!=='moving')return;
    setState(t,isParcel(t)?'handoff':'done');
  }
  function progress(t){return ['handoff','done'].includes(t?.state)?1:t?.state==='moving'?Math.min(1,Math.max(0,(Date.now()-t.started)/duration)):0;}
  if(location.hostname==='app.voltika.invalid')$('androidDownload').hidden=true;
  function drawMap(){
    const t=active(), a=t?.from||from,b=t?.to||to,q=t?.quote||M.route(a,b),svg=$('routeMap');
    const pts=M.route(a,b)?.pts||[M.coords[a]], xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
    const canvas=$('mapCanvas').getBoundingClientRect();if(!canvas.width)return;
    const ratio=canvas.width/canvas.height;
    const cx=(Math.max(...xs)+Math.min(...xs))/2,cy=(Math.max(...ys)+Math.min(...ys))/2-1;
    const w=Math.max(350,Math.max(...xs)-Math.min(...xs)+145,(Math.max(...ys)-Math.min(...ys)+107)*ratio)/zoom,h=w/ratio;
    svg.setAttribute('viewBox',[cx-w/2,cy-h/2,w,h].join(' '));
    const base='<image href="assets/santiago.svg" x="-260" y="-192" width="1470" height="850"/>';
    const roads=M.edges.map(([x,y])=>'M'+M.coords[x].join(' ')+'L'+M.coords[y].join(' ')).join('');
    let html=base+'<path d="'+roads+'" fill="none" stroke="#111718" stroke-width="9"/><path d="'+roads+'" fill="none" stroke="#38403f" stroke-width="5"/>';
    if(q){
      const points=pts.map(p=>p.join(',')).join(' ');
      html+='<polyline id="path" points="'+points+'" fill="none" stroke="#c1fa51" stroke-opacity=".13" stroke-width="12" stroke-linejoin="round"/><polyline points="'+points+'" fill="none" stroke="#c1fa51" stroke-width="3.7" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    function marker(p,origin){
      const [x,y]=p,col=origin?'#c1fa51':'#f393ef',label=origin?'ORIGEN':'DESTINO',tw=origin?61:68;
      return '<g transform="translate('+x+' '+y+')"><circle r="13" fill="'+col+'" fill-opacity=".16"/><circle r="7.5" fill="#151a16" stroke="'+col+'" stroke-width="2.5"/><circle r="3" fill="'+col+'"/><g transform="translate('+(-tw/2)+',-32)"><rect width="'+tw+'" height="18" rx="4" fill="#171b1a" stroke="'+col+'" stroke-opacity=".65"/><text x="'+tw/2+'" y="12.5" text-anchor="middle" font-size="9" font-family="monospace" letter-spacing="1.5" fill="'+col+'">'+label+'</text></g></g>';
    }
    html+=marker(pts[0],true);if(q)html+=marker(pts[pts.length-1],false);
    if(t?.state==='moving')html+='<g id="bikePin"><circle r="11" fill="#c1fa51" stroke="#111914" stroke-width="2"/><path d="m-3 5 2-5-3-1 7-5-2 5 3 1z" fill="#172207"/></g>';
    svg.innerHTML=html;
    if(t?.state==='moving')movePin(t);
    const metric=(ic,title,value)=>'<div class="metric"><small>'+icon(ic)+title+'</small><strong>'+value+'</strong></div>';
    $('metrics').innerHTML=metric('distance','Distancia',q?M.dec(q.km)+' km':'—')+metric('clock','Duración est.',q?q.minutes+' min':'—')+metric('saving','Ahorro '+((t?.method||method)==='xlm'?'XLM':'CLP'),q?M.clp((t?.method||method)==='xlm'?q.saved:0):'—');
    $('zoomIn').disabled=zoom>=1.6;$('zoomOut').disabled=zoom<=.8;
  }
  function movePin(t){const path=$('path'),mark=$('bikePin');if(!path||!mark)return;const p=path.getPointAtLength(path.getTotalLength()*progress(t));mark.setAttribute('transform','translate('+p.x+' '+p.y+')');}
  function render(){
    const t=active();
    $('home').hidden=view!=='ride';$('historyView').hidden=view!=='history';$('guideView').hidden=view!=='guide';$('profileView').hidden=view!=='profiles';
    $('navProfile').classList.toggle('active',view==='profiles');$('navProfile').setAttribute('aria-current',view==='profiles'?'page':'false');
    if(view==='profiles')renderProfiles();
    $('navRide').classList.toggle('active',view==='ride');$('navHistory').classList.toggle('active',view==='history');
    $('navRide').setAttribute('aria-current',view==='ride'?'page':'false');$('navHistory').setAttribute('aria-current',view==='history'?'page':'false');
    if(view==='ride'){t?renderTrip(t):renderPlan();drawMap();}
    else if(view==='history') $('historyRows').innerHTML=trips.length?trips.map(t=>'<button class="trip-row" data-record="'+esc(t.id)+'"><span class="status-circle">'+icon(t.state==='done'?'check':'bike')+'</span><span><b>'+name(t.from)+' → '+name(t.to)+'</b><small>'+serviceName(t)+' · '+prettyTime(t.created)+' · '+stateName(t.state)+'</small></span><b class="total">'+(['cancelled','declined'].includes(t.state)?'$0':val(t))+'</b></button>').join(''):'<div class="panel empty">'+heading('bike','Aún no tienes viajes')+'<p>Tu primer recorrido aparecerá aquí cuando solicites una moto.</p><button class="cta" data-do="goRide">Planificar un viaje</button></div>';
    if(storageWarning && !$('storageNote')){const msg=document.createElement('p');msg.id='storageNote';msg.className='notice';msg.textContent='El dispositivo no permite guardar el historial al cerrar la demo.';$('main').appendChild(msg);}
  }
  function go(v,top=true){view=v;
    const wanted=v==='profiles'?'#perfiles/'+profileRole:'';
    if(wanted || location.hash.startsWith('#perfiles'))history.replaceState(null,'',location.pathname+location.search+wanted);
    render();if(top)window.scrollTo(0,0);}
  function newPlan(){activeId=null;zoom=1;persist();go('ride',false);$('planner').scrollIntoView({block:'center'});}
  function begin(){
    if(active()||!requireProfile(requesterRole(service)))return;
    const quote=M.route(from,to);if(!quote)return;
    const id='VM-'+randomHex(8).toUpperCase();
    const t={id,state:'offered',requiresProfiles:true,from,to,method,service,parcel:service==='parcel'?parcel:null,created:Date.now(),quote};
    trips.unshift(t);activeId=id;persist();render();announce('Oferta de práctica lista para el motociclista.');
  }
  function setState(t,next){
    t.state=next;delete t.challenge;if(['done','cancelled','declined'].includes(next))delete t.pickupPin;if(next==='moving')t.started=Date.now();if(next==='done')t.finished=Date.now();
    persist();render();announce(stateName(next));
  }
  function openModal(title,body){document.body.classList.remove('export-open');const dlg=$('modal');$('modalBody').innerHTML='<div class="modal-title"><h2 id="modalTitle">'+title+'</h2><button class="close" data-do="close" aria-label="Cerrar">'+icon('cancel')+'</button></div>'+body;if(!dlg.open)dlg.showModal();}
  function closeModal(){document.body.classList.remove('export-open');detailId=null;if($('modal').open)$('modal').close();}
  function chainKey(t){return 'voltika.testnet.'+t.id;}
  function refreshChain(t){
    try {const saved=localStorage.getItem(chainKey(t));if(saved!==null)t.chain=JSON.parse(saved);}catch{/* Offline receipts are still available. */}
  }
  function receipt(t){
    refreshChain(t);
    detailId=t.id;
    let body='<p class="subtle">'+esc(t.id)+' · '+prettyTime(t.created)+'</p>'+lines(t)+row('Servicio',serviceName(t))+row('Estado',stateName(t.state));
    if(t.state==='done'){
      body+=quoteLines(t.quote,t.method)+row('Pago',t.method==='clp'?'Simulado · $0 cobrados':t.chain?.paid?'Confirmado en Testnet':t.chain?.xdr?'Pendiente en Testnet':'Prueba opcional sin confirmar')+'<p class="notice">Comprobante de simulación. El pago de prueba usa una cuenta receptora demo. Carece de valor tributario.</p>';
      if(t.method==='xlm')body+='<div class="chain"><b>Stellar Testnet</b>'+(t.chain?.paid?'<p>Pago de prueba confirmado.</p><a rel="noopener" target="_blank" href="'+TestPayment.api+'/transactions/'+esc(t.chain.hash)+'">Ver transacción en Horizon</a><small class="ledger">'+esc(t.chain.hash)+'</small>':'<p>Prueba el pago con una billetera temporal y XLM de prueba. Requiere conexión.</p><button class="secondary" data-do="testnet" '+(busy?'disabled':'')+'>'+icon('stellar')+(t.chain?.xdr?'Verificar intento anterior':'Probar pago en Testnet')+'</button><p class="notice" role="status" id="chainMsg"></p>')+'</div>';
    }else if(['cancelled','declined'].includes(t.state))body+='<p class="notice">Solicitud cancelada. Total cobrado $0.</p>';
    else body+='<div class="actions">'+button('resume','Volver al viaje',true)+'</div>';
    openModal(t.state==='done'?'Comprobante de viaje':'Detalle del viaje',body);
  }
  async function testPayment(t){
    if(busy||!t||t.method!=='xlm'||t.state!=='done'||t.chain?.paid)return;
    busy=true;receipt(t);
    const msg=s=>{if(detailId===t.id && $('chainMsg'))$('chainMsg').textContent=s;};
    try{
      const run=async()=>{
        refreshChain(t);
        const save=()=>{
          try {if(currentEpoch!==epoch()||!load().trips?.some(item=>item.id===t.id))throw new Error();localStorage.setItem(chainKey(t),JSON.stringify(t.chain||null));}
          catch {throw new Error('Habilita el almacenamiento local para guardar el estado del pago de prueba.');}
          persist();
        };
        save();
        await TestPayment.pay(t,save,msg);
      };
      if(navigator.locks)await navigator.locks.request(chainKey(t),run);
      else await run();
      if(detailId===t.id)receipt(t);announce('Pago de prueba confirmado.');
    }catch(e){msg(e.name==='AbortError'?'La red de pruebas tardó en responder. Puedes volver a intentarlo.':e instanceof TypeError?'No se pudo conectar con Stellar Testnet. Puedes reintentar cuando tengas conexión.':e.message);}
    finally{busy=false;const b=$('modal').querySelector('[data-do="testnet"]');if(b)b.disabled=false;}
  }
  function tick(){
    const t=active();if(!t)return;
    if(t.state==='matching' && Date.now()-t.created>=1600){setState(t,'ready');return;}
    if(t.state!=='moving')return;
    if(progress(t)>=1){arrive(t);return;}
    const p=document.querySelector('.progress');if(p){p.firstElementChild.style.width=progress(t)*100+'%';p.setAttribute('aria-valuenow',Math.round(progress(t)*100));}movePin(t);
  }
  function requestPublication(t){
    detailId=t.id;
    openModal('Publicar pago de prueba',row('Red','Stellar Testnet')+row('Pago de práctica',M.dec(t.quote.xlm,2)+' XLM')+
      '<p>Se usará una cuenta temporal con fondos de Friendbot y una cuenta receptora de demostración. La prueba puede usar fondos adicionales de la red para activar la cuenta receptora y cubrir comisiones. Tu costo real es $0 CLP.</p>'+
      '<p>Quedarán públicos el monto, las cuentas y la referencia de la operación. Los datos del recorrido y los códigos se mantienen en este dispositivo. Un intento firmado en una versión anterior conserva su referencia original.</p>'+
      '<p class="notice">La simulación se puede completar sin publicar. El borrado local no elimina un registro ya enviado a la red.</p><div class="actions">'+button('publishTest','Confirmar en Stellar Testnet',true)+button('close','Volver sin publicar')+'</div>');
  }
  function clearMemory(){
    trips=[];activeId=null;detailId=null;from='baq';to='cost';method='xlm';service='ride';parcel='Sobre';
    profileChallenge=null;profileRole='passenger';profiles.clearSession();currentEpoch=epoch();TestPayment.forgetAccount();closeModal();
  }
  function forgetLocal(){
    if(busy){openModal('Prueba Stellar en curso','<p>Cuando termine el intento podrás borrar la copia local.</p>');return;}
    try{
      localStorage.setItem(eraseKey,randomHex(8));
      Object.keys(localStorage).filter(k=>k===key||k.startsWith(profiles.prefix)||k.startsWith('voltika.testnet.')).forEach(k=>localStorage.removeItem(k));
    }catch{openModal('No se pudo borrar','<p>Abre los ajustes de almacenamiento del navegador o de la app y borra los datos de VÓLTIKA.</p>');return;}
    clearMemory();render();openModal('Datos locales borrados','<p>Se eliminó el historial de esta instalación.</p>');announce('Datos locales borrados.');
  }
  function showExport(){
    const records=trips.map(t=>{
      refreshChain(t);
      return {referencia:t.id,servicio:serviceName(t),paquete:isParcel(t)?t.parcel:null,origen:name(t.from),destino:name(t.to),estado:stateName(t.state),
        creado:new Date(t.created).toISOString(),inicio:t.started?new Date(t.started).toISOString():null,fin:t.finished?new Date(t.finished).toISOString():null,
        medio:t.method,tarifaCLP:t.quote.base,totalCotizadoCLP:t.method==='xlm'?t.quote.reduced:t.quote.base,
        totalCobradoRealCLP:0,xlmDePrueba:t.method==='xlm'?t.quote.xlm:null,consentimientoTestnet:!!t.publicationConsent,
        hashTestnet:t.chain?.hash||null,estadoTestnet:t.chain?.paid?'confirmado':t.chain?.xdr?'pendiente':'sin operación'};
    });
    const perfiles=Object.entries(profiles.roles).reduce((out,[id,role])=>{
      const state=profiles.review(id);out[role.label]={estado:state.label,telefonoDemo:state.contact,expedienteDemo:state.record?.sample||null,revisado:state.record?new Date(state.record.reviewed).toISOString():null};return out;
    },{});
    const report={version:'0.3.0',instalacion:'local',perfiles,preferencias:{servicio:serviceName({service}),origen:name(from),destino:name(to),medio:method},servicios:records};
    openModal('Copia de mis datos','<p class="notice">Copia de preferencias y servicios locales. Los códigos de práctica y sobres firmados se excluyen de esta copia.</p><pre class="local-report">'+esc(JSON.stringify(report,null,2))+'</pre><div class="actions">'+button('printData','Imprimir o guardar PDF',true)+'</div>');
    document.body.classList.add('export-open');
  }
  document.addEventListener('submit',e=>{
    if(e.target.id==='profilePhoneForm'){e.preventDefault();submitPhone();return;}
    if(e.target.id!=='pinForm')return;
    e.preventDefault();
    const t=active(),c=t?.challenge;
    if(!c||!['ready','handoff'].includes(t.state))return;
    if(Date.now()>=c.expires||c.attempts>=3){pinChallenge(t,c.stage);return;}
    if($('pinEntry').value!==c.code){
      c.attempts++;persist();
      if(c.attempts>=3){pinChallenge(t,c.stage);return;}
      $('pinError').textContent='Código incorrecto. Intentos restantes: '+(3-c.attempts)+'.';return;
    }
    closeModal();
    if(c.stage==='pickup'&&t.requiresProfiles&&(!requireProfile(requesterRole(t.service))||!requireProfile('carrier')))return;
    setState(t,c.stage==='pickup'?'moving':'done');
  });
  document.addEventListener('change',e=>{
    if(e.target.id==='parcelType'){parcel=e.target.value;return;}
    if(e.target.id==='origin'||e.target.id==='destination'){
      if(e.target.id==='origin')from=e.target.value;else to=e.target.value;
      const id=e.target.id;zoom=1;persist();render();$(id)?.focus();
    }
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('button,a.brand');if(!b)return;
    if(b.matches('.brand')||b.id==='navRide'){e.preventDefault();go('ride');return;}
    if(b.id==='navProfile'){openProfile(profileRole);return;}
    if(b.dataset.profile){openProfile(b.dataset.profile);return;}
    if(b.id==='navHistory'){go('history');return;}
    if(b.id==='zoomIn'||b.id==='zoomOut'){zoom=Math.min(1.6,Math.max(.8,Math.round((zoom+(b.id==='zoomIn'?.2:-.2))*10)/10));drawMap();return;}
    if(b.dataset.service){service=b.dataset.service==='parcel'?'parcel':'ride';render();return;}
    if(b.dataset.pay){method=b.dataset.pay;persist();render();document.querySelector('[data-pay="'+method+'"]')?.focus();return;}
    if(b.dataset.record){const t=trips.find(t=>t.id===b.dataset.record);if(t)receipt(t);return;}
    const action=b.dataset.do,t=active();
    if(action==='focusReview'){const target=$('checksTitle');target.focus();target.scrollIntoView({block:'start'});return;}
    if(action==='backToService'){go('ride',false);$('planner').scrollIntoView({block:'start'});return;}
    if(action==='profileReview'&&view==='profiles'){
      profiles.recordReview(profileRole,$('profileSample').value);renderProfiles();
      const msg=profiles.review(profileRole);announce(msg.rejected?'El expediente requiere corrección.':'Expediente aprobado en demo.');
      $('profileSample').focus();return;
    }
    if(action==='profilePhone'&&view==='profiles'){openPhone();return;}
    if(action==='newPhoneCode'&&view==='profiles'){openPhone(true);return;}
    if(action==='book')reviewQuote();
    if(action==='confirmQuote'){closeModal();begin();}
    if(action==='acceptOffer'&&t?.state==='offered'&&(!t.requiresProfiles||requireProfile(requesterRole(t.service)))&&requireProfile('carrier'))setState(t,'ready');
    if(action==='decline'&&t?.state==='offered')setState(t,'declined');
    if(action==='close')closeModal();
    if(action==='goRide')go('ride');
    if(action==='new'&&['done','declined','cancelled'].includes(t?.state))newPlan();
    if(action==='start'&&t?.state==='ready'&&(!t.requiresProfiles||(requireProfile(requesterRole(t.service))&&requireProfile('carrier'))))pinChallenge(t,'pickup');
    if(action==='deliver'&&t?.state==='handoff')pinChallenge(t,'delivery');
    if(action==='renewPin'&&t?.challenge&&['ready','handoff'].includes(t.state))pinChallenge(t,t.state==='ready'?'pickup':'delivery',true);
    if(action==='arrive'&&t)arrive(t);
    if(action==='receipt'&&t)receipt(t);
    if(action==='resume'){closeModal();go('ride');$('planner').scrollIntoView({block:'center'});}
    if(action==='cancel'&&t&&['matching','offered','ready'].includes(t.state))openModal('¿Cancelar el viaje?','<p class="notice">Se cancelará la solicitud de esta moto demo.</p><div class="actions">'+button('close','Mantener viaje',true)+button('confirmCancel','Sí, cancelar viaje')+'</div>');
    if(action==='confirmCancel'&&t&&['matching','offered','ready'].includes(t.state)){t.state='cancelled';delete t.challenge;delete t.pickupPin;closeModal();newPlan();announce('Viaje cancelado.');}
    if(action==='testnet'){
      const item=trips.find(t=>t.id===detailId);if(item)requestPublication(item);
    }
    if(action==='publishTest'){
      const item=trips.find(t=>t.id===detailId);
      if(item && !busy){
        item.publicationConsent=true;
        if(!item.publicRef)item.publicRef='V-'+randomHex(10);
        if(persist())testPayment(item);
        else openModal('Almacenamiento no disponible','<p>Para evitar repetir un pago, habilita el almacenamiento local antes de iniciar la prueba.</p>');
      }
    }
    if(action==='guide'){closeModal();go('guide');$('guideTitle').focus();}
    if(action==='copyData')showExport();
    if(action==='printData'){
      if(location.hostname==='app.voltika.invalid')location.href='https://app.voltika.invalid/imprimir';
      else window.print();
    }
    if(action==='forget')openModal('¿Borrar el historial local?','<p>Se eliminarán los perfiles de práctica, pedidos, estados, preferencias y referencias guardadas en esta instalación. Perderás el seguimiento local de pagos pendientes. Las transacciones que ya salieron a Testnet pueden seguir públicas.</p><div class="actions">'+button('close','Conservar datos',true)+button('confirmForget','Borrar ahora')+'</div>');
    if(action==='confirmForget')forgetLocal();
  });
  $('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
  $('modal').addEventListener('close',()=>{detailId=null;});
  window.voltikaBack=()=>{if($('modal').open){closeModal();return true;}if(view!=='ride'){go('ride');return true;}return false;};
  window.addEventListener('resize',()=>{if(view==='ride')drawMap();});
  window.addEventListener('storage',e=>{
    if(e.key===eraseKey||e.key===null||(e.key===key&&!e.newValue)){
      clearMemory();go('ride');return;
    }
    if(e.key?.startsWith(profiles.prefix)){render();return;}
    if(e.key!==key||!e.newValue)return;
    const next=load();
    if(!Array.isArray(next.trips))return;
    trips=next.trips;activeId=next.activeId;service=next.service==='parcel'?'parcel':'ride';parcel=next.parcel==='Caja pequeña'?'Caja pequeña':'Sobre';
    if(M.places[next.from])from=next.from;
    if(M.places[next.to])to=next.to;
    method=next.method==='clp'?'clp':'xlm';
    render();
  });
  window.addEventListener('pageshow',tick);
  function readProfileLink(){
    if(!/^#perfiles(?:\/|$)/.test(location.hash))return;
    const role=location.hash.split('/')[1];
    profileRole=Object.prototype.hasOwnProperty.call(profiles.roles,role)?role:'passenger';
    view='profiles';render();
  }
  window.addEventListener('hashchange',readProfileLink);
  readProfileLink();render();tick();setInterval(tick,450);
})();
