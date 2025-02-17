require("dotenv").config();

const dgram = require("dgram");
const { Client, GatewayIntentBits } = require("discord.js");

const serverIP = process.env.SERVER_IP;
const serverPort = process.env.SERVER_PORT;
const client = dgram.createSocket("udp4");

const discordToken = process.env.DISCORD_TOKEN;
const channelId = process.env.CHANNEL_ID;
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let playerCount = 0;

function getChallenge() {
  const message = Buffer.from([
    0xff, 0xff, 0xff, 0xff, 0x55, 0xff, 0xff, 0xff, 0xff,
  ]);
  client.send(message, serverPort, serverIP, (err) => {
    if (err) console.error("Błąd podczas wysyłania:", err);
  });
}

client.on("message", (msg) => {
  if (msg[4] === 0x41) {
    const challenge = msg.readInt32LE(5);
    getPlayers(challenge);
  } else if (msg[4] === 0x44) {
    parsePlayers(msg);
    updateDiscordChannel();
  }
});

function getPlayers(challenge) {
  const buffer = Buffer.alloc(9);
  buffer.writeUInt32LE(0xffffffff, 0);
  buffer.writeUInt8(0x55, 4);
  buffer.writeInt32LE(challenge, 5);

  client.send(buffer, serverPort, serverIP, (err) => {
    if (err) console.error("Błąd przy wysyłaniu zapytania o graczy:", err);
  });
}

function parsePlayers(msg) {
  let offset = 5;
  playerCount = msg.readUInt8(offset++);
}

function updateDiscordChannel() {
  discordClient.channels
    .fetch(channelId)
    .then((channel) => {
      channel.setName(`Online: ${playerCount}/100`); // Zmienia nazwę kanału
    })
    .catch((err) => {
      console.error("Błąd podczas aktualizacji kanału:", err);
    });
}

discordClient.login(discordToken).then(() => {
  getChallenge();
  setInterval(() => {
    getChallenge();
  }, 1000 * 60);
});
