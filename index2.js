const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('[BOOT] Schluck-o-Mat wird gestartet...');

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

client.initialize().catch((err) => {
  console.error('[FATAL] Fehler beim Initialisieren des Clients:', err);
});

console.log('[INFO] Client initialisiert.');

const users = {};
const schluckStatus = {}; // speichert Zeit & Schlucke pro User
const getraenke = ['Bier', 'Schnaps'];


client.on('qr', (qr) => {
  console.log('[QR] QR-Code generiert – bitte mit WhatsApp Web scannen:');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('[AUTH] Authentifizierung erfolgreich!');
});

client.on('auth_failure', (msg) => {
  console.error('[ERROR] Authentifizierungsfehler:', msg);
});

client.on('ready', () => {
  console.log('[READY] ✅ Schluck-o-Mat läuft! Bereit für Nachrichten.');
});

client.on('message', msg => {
  console.log(`[MESSAGE] Nachricht erhalten: ${msg.body} von ${msg.from}`);
  const chatId = msg.from;
  const sender = msg._data.notifyName || 'Unbekannt';
  const text = msg.body.toLowerCase();

  if (text === '!schluck') {
    const userId = msg.author || msg.from; // msg.author nur in Gruppen vorhanden
    const now = Date.now();

    if (!schluckStatus[userId]) {
      schluckStatus[userId] = {
        lastUsed: 0,
        stored: 0
      };
    }

    const status = schluckStatus[userId];
    const msSinceLast = status.lastUsed === 0 ? 60 * 60 * 1000 : Math.floor((now - status.lastUsed));

    console.log(`stundenSeitLetztem: ${msSinceLast}`)

    if (msSinceLast < 60 * 60 * 1000) {
      const naechsteMoeglichkeit = (60 * 60 * 1000 - Math.floor((now - status.lastUsed))) * 60;
      msg.reply(`⏳ Du kannst gerade keinen Schluck verteilen. Versuche es in ${naechsteMoeglichkeit/60/60/1000} min nochmal!`);
      return;
    } else {
      status.lastUsed = now;
    }

    client.getChatById(chatId).then(chat => {
      if (!chat.isGroup) {
        msg.reply('❌ Dieser Befehl funktioniert nur in Gruppen!');
        return;
      }

      const others = chat.participants.filter(p => p.id._serialized !== userId && !p.isMe);
      if (others.length === 0) {
        msg.reply('❌ Keine anderen Teilnehmer gefunden.');
        return;
      }

      const randomUser = others[Math.floor(Math.random() * others.length)];
      const randomGetraenk = getraenke[Math.floor(Math.random() * getraenke.length)];
      const name = randomUser.name || randomUser.id.user;

      users[randomUser.id._serialized] = (users[randomUser.id._serialized] || 0) + 1;
      status.stored--;

      const contactId = randomUser.id._serialized;

      client.getContactById(contactId).then(contact => {
        const displayName = contact.pushname || contact.name || contact.number;
        chat.sendMessage(`🍻 @${displayName} muss einen *${randomGetraenk}* trinken! (gesamt: ${users[randomUser.id._serialized]})`, {
          mentions: [contact]
        });
      }).catch(err => {
        console.error('[ERROR] Kontakt konnte nicht geladen werden:', err);
      });
      console.log(`[ACTION] ${name} trinkt ${randomGetraenk}.`);
    }).catch(err => {
      console.error('[ERROR] Fehler beim Verteilen des Schlucks:', err);
    });
  }

  if (text === '!status') {
  console.log(`[COMMAND] !status von ${sender}`);

  if (Object.keys(users).length === 0) {
    msg.reply('📊 Noch keine Schlucke vergeben!');
    return;
  }

  // Array aus [id, count]
  const entries = Object.entries(users);

  // Promise für alle Kontakte holen
  Promise.all(entries.map(([id, count]) =>
    client.getContactById(id).then(contact => {
      const displayName = contact.pushname || contact.name || contact.number;
      return { displayName, count };
    }).catch(() => {
      // Fallback falls Kontakt nicht geladen werden kann
      return { displayName: id, count };
    })
  )).then(results => {
    // Sortieren nach count absteigend
    results.sort((a, b) => b.count - a.count);

    // Formatieren der Status-Message
    const stats = results.map(r => `- ${r.displayName}: ${r.count} Schlucke`).join('\n');
    msg.reply(`📈 Schluck-Statistik:\n${stats}`);
    console.log('[INFO] Statistik gesendet.');
  }).catch(err => {
    console.error('[ERROR] Fehler beim Erstellen der Statistik:', err);
    msg.reply('❌ Fehler beim Abrufen der Statistik.');
  });
}


  if (text === '!hilfe') {
    console.log(`[COMMAND] !hilfe von ${sender}`);
    msg.reply(`🤖 *Schluck-o-Mat Befehle:*\n` +
      `!schluck – Zufällig jemanden trinken lassen\n` +
      `!status – Zeigt die Rangliste\n` +
      `!hilfe – Zeigt diese Nachricht`);
  }
});

