const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
  authStrategy: new LocalAuth()
});

const users = {}; // Zählt die Schlucke pro Person

client.on('qr', (qr) => {
  console.log('QR-Code scannen mit WhatsApp:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ Schluck-o-Mat läuft!');
});

client.on('message', msg => {
  const chatId = msg.from;
  const sender = msg._data.notifyName || 'Unbekannt';
  const text = msg.body.toLowerCase();

  if (text === '!shot') {
    // Zufällig jemanden auswählen
    client.getChatById(chatId).then(chat => {
      chat.fetchParticipants().then(participants => {
        const others = participants.filter(p => p.id._serialized !== msg.author && !p.isMe);

        if (others.length === 0) {
          msg.reply('❌ Keine anderen Teilnehmer gefunden.');
          return;
        }

        const random = others[Math.floor(Math.random() * others.length)];
        const name = random.name || random.id.user;

        users[name] = (users[name] || 0) + 1;
        msg.reply(`🥃 ${name} bekommt einen Schluck! (gesamt: ${users[name]})`);
      });
    });
  }

  if (text === '!status') {
    if (Object.keys(users).length === 0) {
      msg.reply('📊 Noch keine Schlucke vergeben!');
    } else {
      const stats = Object.entries(users)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => `- ${name}: ${count} Schlucke`)
        .join('\n');
      msg.reply(`📈 Schluck-Statistik:\n${stats}`);
    }
  }

  if (text === '!hilfe') {
    msg.reply(`🤖 *Schluck-o-Mat Befehle:*\n` +
      `!shot – Zufällig jemanden trinken lassen\n` +
      `!status – Zeigt die Rangliste\n` +
      `!hilfe – Zeigt diese Nachricht`);
  }
});

