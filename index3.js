const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('[BOOT] Schluck-o-Mat wird gestartet...');

try {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    }
  });

  console.log('[INFO] Client initialisiert.');

  client.on('qr', (qr) => {
    console.log('[QR] QR-Code generiert – bitte mit WhatsApp Web scannen:');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', () => {
    console.log('[AUTH] Authentifizierung erfolgreich!');
  });

  client.on('auth_failure', msg => {
    console.error('[ERROR] Authentifizierung fehlgeschlagen:', msg);
  });

  client.on('ready', () => {
    console.log('[READY] ✅ Schluck-o-Mat läuft!');
  });

  client.on('disconnected', (reason) => {
    console.log('[DISCONNECTED] Verbindung getrennt:', reason);
  });

  client.on('change_state', state => {
    console.log('[STATE] Zustand geändert:', state);
  });

  client.initialize().catch((err) => {
    console.error('[FATAL] Fehler beim Initialisieren des Clients:', err);
  });

} catch (err) {
  console.error('[FATAL] Fehler im Hauptcode:', err);
}

