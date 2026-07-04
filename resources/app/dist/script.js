const { ipcRenderer } = require('electron');

let currentPayload = 'sense';

// Elements
const body = document.body;
const cardSense = document.getElementById('card-sense');
const cardLose = document.getElementById('card-lose');
const launchText = document.getElementById('launch-text');

const btnLaunch = document.getElementById('btn-launch');
const btnKill = document.getElementById('btn-kill');
const btnClean = document.getElementById('btn-clean');
const btnMinimize = document.getElementById('btn-minimize');
const btnClose = document.getElementById('btn-close');
const btnAutoupdate = document.getElementById('btn-autoupdate');

const btnLuasSense = document.getElementById('btn-luas-sense');
const btnLuasLose = document.getElementById('btn-luas-lose');
const btnConfigsLose = document.getElementById('btn-configs-lose');
const consoleOutput = document.getElementById('console-output');

// Switch Payload
function setPayload(payload) {
  currentPayload = payload;
  
  if (payload === 'sense') {
    body.className = 'theme-sense';
    cardSense.classList.add('active');
    cardLose.classList.remove('active');
    launchText.textContent = 'INJECT MADRILLASENSE';
  } else {
    body.className = 'theme-lose';
    cardLose.classList.add('active');
    cardSense.classList.remove('active');
    launchText.textContent = 'INJECT MADRILLALOSE';
  }
}

// Click Listeners
cardSense.addEventListener('click', (e) => {
  if (e.target.closest('.action-link')) return;
  setPayload('sense');
});

cardLose.addEventListener('click', (e) => {
  if (e.target.closest('.action-link')) return;
  setPayload('lose');
});

// Window Controls
btnMinimize.addEventListener('click', () => ipcRenderer.send('window-minimize'));
btnClose.addEventListener('click', () => ipcRenderer.send('window-close'));

// Auto Update Toggle
btnAutoupdate.addEventListener('click', () => ipcRenderer.send('toggle-autoupdate'));
ipcRenderer.send('get-autoupdate-state');

// Launch Button
btnLaunch.addEventListener('click', () => {
  appendLog(`[*] INITIATING LAUNCH SEQUENCE: MADRILLA${currentPayload.toUpperCase()}`, 'system');
  btnLaunch.disabled = true;
  launchText.textContent = 'EXECUTING...';
  
  ipcRenderer.send('launch-payload', currentPayload);
  
  setTimeout(() => {
    btnLaunch.disabled = false;
    launchText.textContent = `INJECT MADRILLA${currentPayload.toUpperCase()}`;
  }, 3000);
});

// Utility Buttons
btnKill.addEventListener('click', () => {
  appendLog('[!] Terminating game processes...', 'system');
  ipcRenderer.send('kill-game');
});

btnClean.addEventListener('click', () => {
  appendLog('[*] Running No User Logon Fix...', 'system');
  ipcRenderer.send('clean-steam');
});

// Folders
btnLuasSense.addEventListener('click', () => {
  appendLog('[*] Opening MadrillaSense LUAS directory...', 'system');
  ipcRenderer.send('open-luas-folder', 'sense');
});

btnLuasLose.addEventListener('click', () => {
  appendLog('[*] Opening MadrillaLose LUAS directory...', 'system');
  ipcRenderer.send('open-luas-folder', 'lose');
});

btnConfigsLose.addEventListener('click', () => {
  appendLog('[*] Opening MadrillaLose CONFIGS directory...', 'system');
  ipcRenderer.send('open-configs-folder', 'lose');
});

// Console Logger
function appendLog(text, type = 'normal') {
  const line = document.createElement('div');
  line.className = 'log-line';
  if (type === 'error') line.classList.add('log-error');
  if (type === 'success') line.classList.add('log-success');
  if (type === 'system') line.classList.add('log-system');
  
  line.textContent = text;
  consoleOutput.appendChild(line);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// IPC Listeners
ipcRenderer.on('injector-log', (event, msg) => {
  let type = 'normal';
  if (msg.includes('[OK]') || msg.includes('COMPLETE')) type = 'success';
  if (msg.includes('[System]') || msg.includes('[*]')) type = 'system';
  appendLog(msg, type);
});

ipcRenderer.on('injector-error', (event, msg) => {
  appendLog(msg, 'error');
});

ipcRenderer.on('injector-exit', (event, code) => {
  const type = code === 0 ? 'success' : 'error';
  appendLog(`[*] Injector process exited with code ${code}`, type);
});

ipcRenderer.on('autoupdate-state', (event, isEnabled) => {
  btnAutoupdate.style.opacity = isEnabled ? '1' : '0.4';
  btnAutoupdate.title = isEnabled ? 'Auto-Update: ON' : 'Auto-Update: OFF';
});
