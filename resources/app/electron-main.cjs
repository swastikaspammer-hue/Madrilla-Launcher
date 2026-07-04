const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const https = require('https');

// Dynamically resolve Steam install path via Windows registry
function getSteamPath() {
  try {
    const raw = execSync('reg query "HKCU\\SOFTWARE\\Valve\\Steam" /v SteamPath', { encoding: 'utf8' });
    const match = raw.match(/SteamPath\s+REG_SZ\s+(.+)/);
    if (match) return match[1].trim().replace(/\//g, '\\');
  } catch (_) {}
  try {
    const raw = execSync('reg query "HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam" /v InstallPath', { encoding: 'utf8' });
    const match = raw.match(/InstallPath\s+REG_SZ\s+(.+)/);
    if (match) return match[1].trim();
  } catch (_) {}
  try {
    const raw = execSync('reg query "HKLM\\SOFTWARE\\Valve\\Steam" /v InstallPath', { encoding: 'utf8' });
    const match = raw.match(/InstallPath\s+REG_SZ\s+(.+)/);
    if (match) return match[1].trim();
  } catch (_) {}
  // Fallback to default path
  return 'C:\\Program Files (x86)\\Steam';
}

function getCSGOPath() {
  const steamPath = getSteamPath();
  const defaultCsgo = path.join(steamPath, 'steamapps', 'common', 'Counter-Strike Global Offensive');
  if (fs.existsSync(defaultCsgo)) return defaultCsgo;

  // Check libraryfolders.vdf for additional Steam library locations
  try {
    const vdf = fs.readFileSync(path.join(steamPath, 'steamapps', 'libraryfolders.vdf'), 'utf8');
    const pathMatches = [...vdf.matchAll(/"path"\s+"([^"]+)"/g)];
    for (const m of pathMatches) {
      const candidate = path.join(m[1].replace(/\\\\/g, '\\'), 'steamapps', 'common', 'Counter-Strike Global Offensive');
      if (fs.existsSync(candidate)) return candidate;
    }
  } catch (_) {}

  return defaultCsgo; // Return default even if not found, let the user deal with it
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 700,
    height: 450,
    frame: false,
    transparent: true,
    resizable: false,
    backgroundMaterial: 'acrylic',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simplicity in this local tool
    },
  });

  // Load the Vite dev server in development, or the built index.html in production.
  const devUrl = 'http://localhost:5173';
  
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    mainWindow.loadURL(devUrl);
  }
}

function updateLuaScript() {
  try {
    const injectorDir = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'Release');
    const noUpdatePath = path.join(injectorDir, 'nl_cloud', 'no_update.txt');
    if (fs.existsSync(noUpdatePath)) {
      console.log('Auto-update disabled by user.');
      return;
    }
    
    const scriptPath = path.join(injectorDir, 'nl_cloud', 'scripts', '76_madrilla_recode_pure_hud.lua');
    const url = 'https://raw.githubusercontent.com/swastikaspammer-hue/mdrecode-assets/main/nl/madrilla_recode.lua?t=' + Date.now();
    
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        const file = fs.createWriteStream(scriptPath);
        res.pipe(file);
        file.on('finish', () => file.close());
      }
    }).on('error', (err) => console.error('Failed to update lua:', err));
  } catch (err) {
    console.error('Update failed:', err);
  }
}

app.whenReady().then(() => {
  createWindow();
  updateLuaScript();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Window Controls
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

const { shell } = require('electron');

ipcMain.on('open-luas-folder', (event, cheatType) => {
  const csgoPath = getCSGOPath();
  
  // Dynamically find the nl_cloud folder based on where the launcher resources are
  const injectorDir = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'Release');
  const nlCloudScriptsPath = path.join(injectorDir, 'nl_cloud', 'scripts');
  
  const folderPath = cheatType === 'lose' ? nlCloudScriptsPath : csgoPath;
  
  shell.openPath(folderPath).then((errorMessage) => {
    if (errorMessage) {
      console.error('Error opening folder:', errorMessage);
      event.reply('injector-error', `Failed to open folder: ${errorMessage}`);
    } else {
      event.reply('injector-log', `Opened ${cheatType === 'sense' ? 'MadrillaSense' : 'MadrillaLose'} luas folder.`);
    }
  });
});

ipcMain.on('open-configs-folder', (event, cheatType) => {
  const injectorDir = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'Release');
  const nlCloudConfigsPath = path.join(injectorDir, 'nl_cloud', 'configs');
  
  if (cheatType === 'lose') {
    shell.openPath(nlCloudConfigsPath).then((errorMessage) => {
      if (errorMessage) {
        console.error('Error opening configs folder:', errorMessage);
        event.reply('injector-error', `Failed to open configs folder: ${errorMessage}`);
      } else {
        event.reply('injector-log', `Opened MadrillaLose configs folder.`);
      }
    });
  }
});

ipcMain.on('toggle-autoupdate', (event) => {
  const injectorDir = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'Release');
  const noUpdatePath = path.join(injectorDir, 'nl_cloud', 'no_update.txt');
  
  if (fs.existsSync(noUpdatePath)) {
    fs.unlinkSync(noUpdatePath);
    event.reply('autoupdate-state', true);
    event.reply('injector-log', '[*] Auto-Updates ENABLED');
  } else {
    fs.writeFileSync(noUpdatePath, '1');
    event.reply('autoupdate-state', false);
    event.reply('injector-log', '[*] Auto-Updates DISABLED');
  }
});

ipcMain.on('get-autoupdate-state', (event) => {
  const injectorDir = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'Release');
  const noUpdatePath = path.join(injectorDir, 'nl_cloud', 'no_update.txt');
  event.reply('autoupdate-state', !fs.existsSync(noUpdatePath));
});

// Helper functions to prevent 'No user logon' issues
function removeSteamAppId() {
  try {
    const csgoPath = getCSGOPath();
    if (fs.existsSync(csgoPath)) {
      const rootAppId = path.join(csgoPath, 'steam_appid.txt');
      if (fs.existsSync(rootAppId)) {
        fs.unlinkSync(rootAppId);
      }
      
      const cs2BinPath = path.join(csgoPath, 'game', 'bin', 'win64');
      if (fs.existsSync(cs2BinPath)) {
        const binAppId = path.join(cs2BinPath, 'steam_appid.txt');
        if (fs.existsSync(binAppId)) {
          fs.unlinkSync(binAppId);
        }
      }
    }
  } catch (err) {
    console.error('Failed to clean up steam_appid.txt:', err);
  }
}

function checkSteamStatus(event) {
  try {
    const stdout = execSync('tasklist /FI "IMAGENAME eq steam.exe" /NH', { encoding: 'utf8' });
    const isRunning = stdout.toLowerCase().includes('steam.exe');
    
    if (!isRunning) {
      event.reply('injector-log', `[*] Steam is not running. Attempting to start Steam...`);
      const steamPath = getSteamPath();
      const steamExe = path.join(steamPath, 'steam.exe');
      if (fs.existsSync(steamExe)) {
        spawn(steamExe, [], { detached: true, stdio: 'ignore' }).unref();
        event.reply('injector-log', `[OK] Launched Steam. Please log in before injecting.`);
      } else {
        event.reply('injector-error', `[!] Steam installation not found. Please launch Steam manually.`);
      }
    }
  } catch (err) {
    console.error('Error checking Steam status:', err);
  }
}

function checkPrivileges(event) {
  try {
    execSync('net session', { stdio: 'ignore' });
    event.reply('injector-log', `[*] Launcher running as Administrator.`);
    event.reply('injector-log', `[!] IMPORTANT: Ensure Steam is also running as Administrator to avoid 'No user logon' errors.`);
  } catch (_) {
    event.reply('injector-log', `[*] Launcher running in standard user mode.`);
  }
}

// Launcher Logic
ipcMain.on('launch-payload', (event, payloadType) => {
  const resourcesDir = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'Release');
  const injectorPath = path.join(resourcesDir, 'steam.exe');
  const dllPath = path.join(resourcesDir, payloadType === 'sense' ? 'skeet.dll' : 'neverlose.dll');

  event.reply('injector-log', `[Debug] Resources dir: ${resourcesDir}`);
  event.reply('injector-log', `[Debug] Injector: ${injectorPath}`);
  event.reply('injector-log', `[Debug] DLL: ${dllPath}`);

  // Run compatibility checks
  checkPrivileges(event);
  checkSteamStatus(event);
  removeSteamAppId();

  // Pre-flight: check if files exist (AV may have deleted them)
  if (!fs.existsSync(injectorPath)) {
    event.reply('injector-error', `[!] steam.exe NOT FOUND at ${injectorPath}`);
    event.reply('injector-error', `[!] Likely deleted by antivirus. Add folder exclusion in Windows Security.`);
    event.reply('injector-exit', -1);
    return;
  }
  event.reply('injector-log', `[OK] steam.exe found`);

  if (!fs.existsSync(dllPath)) {
    event.reply('injector-error', `[!] ${payloadType === 'sense' ? 'skeet.dll' : 'neverlose.dll'} NOT FOUND at ${dllPath}`);
    event.reply('injector-error', `[!] Likely quarantined by antivirus. Check Windows Security > Protection History.`);
    event.reply('injector-exit', -1);
    return;
  }
  event.reply('injector-log', `[OK] DLL found`);

  if (payloadType === 'lose') {
    const serverPath = path.join(resourcesDir, 'neverlose-server.exe');
    if (!fs.existsSync(serverPath)) {
      event.reply('injector-error', `[!] neverlose-server.exe NOT FOUND at ${serverPath}`);
      event.reply('injector-error', `[!] Likely quarantined by antivirus. Check Windows Security > Protection History.`);
      event.reply('injector-exit', -1);
      return;
    }
    event.reply('injector-log', `[OK] neverlose-server.exe found`);
  }

  event.reply('injector-log', `[*] Spawning injector with INJECTOR_HEADLESS=2...`);

  console.log(`Launching: ${injectorPath} --payload ${payloadType}`);

  let injector;
  try {
    injector = spawn(injectorPath, ['--payload', payloadType], {
      cwd: resourcesDir,
      windowsHide: false,
      env: { ...process.env, INJECTOR_HEADLESS: '2' },
    });
  } catch (err) {
    event.reply('injector-error', `[!] Failed to spawn injector: ${err.message}`);
    event.reply('injector-error', `[!] Error code: ${err.code} — This may be AV blocking execution.`);
    event.reply('injector-exit', -1);
    return;
  }

  injector.on('error', (err) => {
    event.reply('injector-error', `[!] Injector spawn error: ${err.message} (code: ${err.code})`);
    if (err.code === 'EACCES') event.reply('injector-error', `[!] EACCES: AV or permissions blocking execution. Run as admin & add folder exclusion.`);
    if (err.code === 'ENOENT') event.reply('injector-error', `[!] ENOENT: steam.exe was deleted after launch check. AV quarantined it.`);
    event.reply('injector-exit', -1);
  });

  injector.stdout.on('data', (data) => {
    const text = data.toString().trim();
    if (text) {
      console.log('STDOUT:', text);
      event.reply('injector-log', text);
    }
  });

  injector.stderr.on('data', (data) => {
    const text = data.toString().trim();
    if (text) {
      console.error('STDERR:', text);
      event.reply('injector-error', text);
    }
  });

  injector.on('close', (code) => {
    console.log(`Injector exited with code ${code}`);
    event.reply('injector-exit', code);
  });
});

ipcMain.on('kill-game', (event) => {
  try {
    execSync('taskkill /f /im csgo.exe', { stdio: 'ignore' });
  } catch (_) {}
  try {
    execSync('taskkill /f /im cs2.exe', { stdio: 'ignore' });
  } catch (_) {}
  event.reply('injector-log', '[System] Terminated game processes (csgo.exe/cs2.exe).');
});

ipcMain.on('clean-steam', (event) => {
  try {
    // 1. Kill any running games
    try { execSync('taskkill /f /im csgo.exe', { stdio: 'ignore' }); } catch (_) {}
    try { execSync('taskkill /f /im cs2.exe', { stdio: 'ignore' }); } catch (_) {}
    
    // 2. Force Kill Steam (to restart it with inherited Admin privileges)
    try { execSync('taskkill /f /im steam.exe', { stdio: 'ignore' }); } catch (_) {}
    event.reply('injector-log', '[System] Terminated Steam client.');

    // 3. Clean up the bypass files
    removeSteamAppId();
    event.reply('injector-log', '[System] Wiped steam_appid.txt cache files.');
    
    // 4. Restart Steam
    const steamExe = path.join(getSteamPath(), 'steam.exe');
    if (fs.existsSync(steamExe)) {
      spawn(steamExe, [], { detached: true, stdio: 'ignore' }).unref();
      event.reply('injector-log', '[System] Restarted Steam. (Inherited Admin Privileges)');
      event.reply('injector-log', '[System] NO USER LOGON FIX COMPLETE. Launch your game from Steam now.');
    }
  } catch (err) {
    event.reply('injector-error', `[System] Cleanup failed: ${err.message}`);
  }
});
