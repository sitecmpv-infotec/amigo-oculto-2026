"use strict";
// Somente dados criptografados ficam neste site. As chaves nunca são publicadas.
const form = document.getElementById('reveal-form');
const formView = document.getElementById('form-view');
const resultView = document.getElementById('result-view');
const nameInput = document.getElementById('nome');
const pinInput = document.getElementById('codigo');
const button = document.getElementById('reveal-button');
const message = document.getElementById('message');
const toggle = document.getElementById('toggle-pin');
let encrypted = null;

const decode = (s) => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
const normalizeCode = (s) => s.replace(/[\s-]/g, '').toUpperCase();

async function loadEncryptedData() {
  if (encrypted !== null) return encrypted;
  const response = await fetch('./sorteio-criptografado.json', {cache: 'no-store'});
  if (!response.ok) throw new Error('Não foi possível abrir o sorteio. Tente novamente.');
  encrypted = await response.json();
  return encrypted;
}

async function revealName(player, code) {
  const records = await loadEncryptedData();
  const record = Object.hasOwn(records, player) ? records[player] : null;
  if (!record || !/^[A-HJ-NP-Z2-9]{20}$/.test(code)) throw new Error('Código incorreto. Confira a mensagem recebida.');
  const imported = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    {name:'PBKDF2', salt: decode(record.salt), iterations: 310000, hash:'SHA-256'},
    imported, {name:'AES-GCM', length:256}, false, ['decrypt']);
  try {
    const plain = await crypto.subtle.decrypt({name:'AES-GCM', iv: decode(record.iv)}, key, decode(record.data));
    return new TextDecoder().decode(plain).split('|', 1)[0];
  } catch (_) {
    throw new Error('Código incorreto. Confira a mensagem recebida.');
  }
}

function conceal() {
  document.getElementById('chosen-person').textContent = '';
  pinInput.value = '';
  pinInput.type = 'password';
  toggle.textContent = 'Mostrar';
  toggle.setAttribute('aria-pressed','false');
  formView.hidden = false;
  resultView.hidden = true;
  message.textContent = '';
}

document.getElementById('hide-button').addEventListener('click', () => { conceal(); nameInput.focus(); });
toggle.addEventListener('click', () => {
  const visible = pinInput.type === 'password';
  pinInput.type = visible ? 'text' : 'password';
  toggle.textContent = visible ? 'Ocultar' : 'Mostrar';
  toggle.setAttribute('aria-pressed', String(visible));
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = nameInput.value;
  const code = normalizeCode(pinInput.value);
  message.textContent = '';
  button.disabled = true;
  button.textContent = 'Abrindo seu segredo...';
  try {
    if (!window.crypto || !crypto.subtle) throw new Error('Abra pelo link seguro (HTTPS).');
    const chosen = await revealName(name, code);
    document.getElementById('chosen-person').textContent = chosen;
    pinInput.value = '';
    formView.hidden = true;
    resultView.hidden = false;
    document.getElementById('hide-button').focus();
  } catch (error) {
    message.textContent = error.message || 'Não foi possível revelar o resultado.';
  } finally {
    button.disabled = false;
    button.textContent = '🎁  Revelar meu amigo oculto';
  }
});
