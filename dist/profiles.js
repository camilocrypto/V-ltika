'use strict';
window.VoltikaProfiles = (() => {
  const prefix = 'voltika.profile.v1.';
  const roles = {
    passenger: {label: 'Pasajero', name: 'Vale M.', initials: 'VM', id: 'P-01'},
    sender: {label: 'Remitente', name: 'Nico S.', initials: 'NS', id: 'E-02'},
    carrier: {label: 'Transportista', name: 'Alex R.', initials: 'AR', id: 'T-07'}
  };
  const cases = {
    valid: 'Ficha vigente y coincidente',
    mismatch: 'Documento de otra persona',
    expired: 'Licencia vencida',
    vehicle: 'Moto distinta a la registrada'
  };
  const memory = new Map();
  function read(key) {
    try {
      const value = localStorage.getItem(prefix + key);
      if (value) return JSON.parse(value);
    } catch { /* Use the session copy when storage is unavailable. */ }
    return memory.get(key);
  }
  function write(key, value) {
    try {localStorage.setItem(prefix + key, JSON.stringify(value)); memory.delete(key);}
    catch {memory.set(key, value);}
  }
  function scenarios(role) {return role === 'carrier' ? Object.keys(cases) : ['valid','mismatch'];}
  function recordReview(role, sample, now = Date.now()) {
    if (!roles[role] || !scenarios(role).includes(sample)) return;
    write(role + '.review', {sample, reviewed:now});
  }
  function recordContact(role) {
    if (roles[role]) write(role + '.contact', true);
  }
  function review(role, now = Date.now()) {
    const record = read(role + '.review');
    const checked = record && scenarios(role).includes(record.sample) && Number.isFinite(record.reviewed);
    const day = 86400000;
    const expiry = checked ? record.reviewed + 365 * day : 0;
    const date = value => new Date(value).toLocaleDateString('es-CL');
    const identityMatch = checked && record.sample !== 'mismatch';
    const rows = [
      {label:'Documento de identidad', ok:identityMatch, note:identityMatch ? 'Titular y ficha coinciden.' : 'El documento corresponde a otro titular.'},
      {label:'Selfie y prueba de vida', ok:identityMatch, note:identityMatch ? 'Resultado positivo de ejemplo.' : 'La identidad del ejemplo no coincide.'}
    ];
    if (role === 'carrier') {
      const licenseExpiry = checked && record.sample === 'expired' ? record.reviewed - day : expiry;
      const sameBike = checked && record.sample !== 'vehicle';
      rows.push({label:'Licencia para motocicleta',ok:licenseExpiry > now,note:'Vencimiento de ejemplo: ' + date(licenseExpiry) + '.'},
        {label:'Moto y padrón',ok:sameBike,note:sameBike ? 'Ficha y moto coinciden: VT–07.' : 'La ficha indica VT–09 y la moto asignada es VT–07.'},
        {label:'Seguro de la moto',ok:expiry > now && sameBike,note:'Constancia de ejemplo para VT–07. Vigencia hasta ' + date(expiry) + '.'});
    }
    const contact = read(role + '.contact') === true;
    const rejected = checked && rows.some(item => !item.ok);
    const ready = !!(contact && checked && !rejected);
    return {contact, checked:!!checked, ready, rejected:!!rejected, rows, record:checked ? record : null,
      label:rejected ? 'Requiere corrección' : ready ? 'Aprobado en demo' : 'Pendiente'};
  }
  return {roles,cases,scenarios,recordReview,recordContact,review,prefix,clearSession:()=>memory.clear()};
})();
