function emvField(id, value) {
  const text = String(value || '');
  return `${id}${String(text.length).padStart(2, '0')}${text}`;
}

function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function normalizePixText(value, max) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/gi, '')
    .toUpperCase().slice(0, max);
}

function generatePixCode({ key, name, city, amount, txid = 'GILCHEF' }) {
  if (!key) throw new Error('Cadastre a chave Pix nas configurações.');
  const merchantAccount = emvField('00', 'BR.GOV.BCB.PIX') + emvField('01', key);
  let payload = '';
  payload += emvField('00', '01');
  payload += emvField('26', merchantAccount);
  payload += emvField('52', '0000');
  payload += emvField('53', '986');
  if (Number(amount) > 0) payload += emvField('54', Number(amount).toFixed(2));
  payload += emvField('58', 'BR');
  payload += emvField('59', normalizePixText(name, 25));
  payload += emvField('60', normalizePixText(city, 15));
  payload += emvField('62', emvField('05', normalizePixText(txid, 25) || '***'));
  payload += '6304';
  return payload + crc16(payload);
}

window.GilPix = { generatePixCode };
