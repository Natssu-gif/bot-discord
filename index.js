require("dotenv").config();

const fs = require("fs");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const prefix = "?";
const canalApuestasId = "1289710742852993138";

const archivoApuestas = "./apuestas.json";
const archivoPanel = "./panel.json";
const horasExpiracion = 24;

// Cargar apuestas
function cargarApuestas() {
  if (!fs.existsSync(archivoApuestas)) {
    fs.writeFileSync(archivoApuestas, JSON.stringify([]));
  }

  const data = fs.readFileSync(archivoApuestas, "utf8");
  return JSON.parse(data);
}

// Guardar apuestas
function guardarApuestas(apuestas) {
  fs.writeFileSync(archivoApuestas, JSON.stringify(apuestas, null, 2));
}

// Cargar panel
function cargarPanel() {
  if (!fs.existsSync(archivoPanel)) {
    fs.writeFileSync(archivoPanel, JSON.stringify({}));
  }

  return JSON.parse(fs.readFileSync(archivoPanel, "utf8"));
}

// Guardar panel
function guardarPanel(data) {
  fs.writeFileSync(archivoPanel, JSON.stringify(data, null, 2));
}

// Crear embed del panel
function crearEmbedApuestas(apuestas) {
  if (apuestas.length === 0) {
    return new EmbedBuilder()
      .setTitle("🎰 Apuestas vigentes")
      .setColor("Red")
      .setDescription("📭 No hay apuestas vigentes por ahora.")
      .setFooter({ text: "Betaninho • Sistema de apuestas" })
      .setTimestamp();
  }

  let descripcion = "";

  apuestas.forEach((apuesta, index) => {
    descripcion += `**${index + 1}. ${apuesta.nombre || "Apuesta sin nombre"}**\n`;
    descripcion += `🔗 [Ver apuesta](${apuesta.link})\n`;
    descripcion += `👤 Enviada por: **${apuesta.autor}**\n`;
    descripcion += `🕒 Fecha: ${apuesta.fecha}\n\n`;
  });

  return new EmbedBuilder()
    .setTitle("🎰 Apuestas vigentes")
    .setDescription(descripcion)
    .setColor("Red")
    .setFooter({ text: "Betaninho • Sistema de apuestas" })
    .setTimestamp();
}

// Actualizar panel fijo
async function actualizarPanel(channel, apuestas) {
  const panel = cargarPanel();
  const embed = crearEmbedApuestas(apuestas);

  try {
    if (panel.messageId) {
      const mensaje = await channel.messages.fetch(panel.messageId);
      await mensaje.edit({ embeds: [embed] });

      if (!mensaje.pinned) {
        await mensaje.pin();
      }
    } else {
      const nuevo = await channel.send({ embeds: [embed] });
      await nuevo.pin();
      guardarPanel({ messageId: nuevo.id, channelId: channel.id });
    }
  } catch (error) {
    const nuevo = await channel.send({ embeds: [embed] });
    await nuevo.pin();
    guardarPanel({ messageId: nuevo.id, channelId: channel.id });
  }
}

// Revisar apuestas expiradas
async function revisarApuestasExpiradas() {
  const apuestas = cargarApuestas();
  const ahora = Date.now();

  const vigentes = apuestas.filter((apuesta) => {
    if (!apuesta.timestamp) return true;

    const diferenciaHoras = (ahora - apuesta.timestamp) / 1000 / 60 / 60;
    return diferenciaHoras < horasExpiracion;
  });

  if (vigentes.length !== apuestas.length) {
    guardarApuestas(vigentes);

    const panel = cargarPanel();

    if (panel.channelId) {
      const channel = await client.channels.fetch(panel.channelId).catch(() => null);

      if (channel) {
        await actualizarPanel(channel, vigentes);
        await channel.send(
          `⏰ Se eliminaron **${apuestas.length - vigentes.length}** apuestas expiradas.`
        );
      }
    }
  }
}

client.once("clientReady", () => {
  console.log(`Bot conectado como ${client.user.tag}`);

  revisarApuestasExpiradas();
  setInterval(revisarApuestasExpiradas, 60 * 60 * 1000);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.channel.id !== canalApuestasId) {
    return;
  }

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // PING
  if (command === "ping") {
    return message.reply("🏓 Pong!");
  }

  // HOLA
  if (command === "hola") {
    return message.reply("Hola bro 😎");
  }

  // AVATAR
  if (command === "avatar") {
    return message.reply(message.author.displayAvatarURL());
  }

  // TULA
  if (command === "tula") {
  const numero = Math.floor(Math.random() * 30) + 5;
  return message.reply(`😏 La tula te mide **${numero} cm**`);
}

  // AGREGAR APUESTA
  if (command === "addapuesta") {
    const contenido = args.join(" ");
    const partes = contenido.split("-");
    if (partes.length < 2) {
    return message.reply("❌ Usa el formato: `?addapuesta Nombre - https://link`");    }

    const nombre = partes[0].trim();
    const link = partes[1].trim();

    if (!nombre) {
      return message.reply("❌ Debes ponerle un nombre a la apuesta.");
    }

    if (!link || !link.startsWith("http")) {
      return message.reply("❌ Debes mandar un link válido.");
    }

    const apuestas = cargarApuestas();

    const yaExiste = apuestas.some((a) => a.link === link);

    if (yaExiste) {
      return message.reply("⚠️ Esa apuesta ya está en las vigentes.");
    }

    apuestas.push({
      nombre: nombre,
      link: link,
      autor: message.author.username,
      fecha: new Date().toLocaleString("es-CL"),
      timestamp: Date.now()
    });

    guardarApuestas(apuestas);

    await message.reply(
      `🔔 **${message.author.username}** agregó una nueva apuesta: **${nombre}**`
    );

    return actualizarPanel(message.channel, apuestas);
  }

  // VER APUESTAS
  if (command === "apuestas") {
    const apuestas = cargarApuestas();
    const embed = crearEmbedApuestas(apuestas);

    return message.reply({ embeds: [embed] });
  }

  // BORRAR UNA APUESTA
  if (command === "borrarapuesta") {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply("🔒 Solo un administrador puede borrar apuestas.");
    }

    const numero = parseInt(args[0]);
    const apuestas = cargarApuestas();

    if (!numero) {
      return message.reply("❌ Debes indicar el número. Ejemplo: `?borrarapuesta 1`");
    }

    if (numero < 1 || numero > apuestas.length) {
      return message.reply("❌ Ese número de apuesta no existe.");
    }

    const eliminada = apuestas.splice(numero - 1, 1);
    guardarApuestas(apuestas);

    const embed = new EmbedBuilder()
      .setTitle("🗑️ Apuesta eliminada")
      .setColor("DarkRed")
      .setDescription(
        `Se eliminó la siguiente apuesta:\n\n**${eliminada[0].nombre || "Apuesta sin nombre"}**\n🔗 ${eliminada[0].link}`
      )
      .setFooter({ text: `Eliminada por ${message.author.username}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });

    return actualizarPanel(message.channel, apuestas);
  }

  // LIMPIAR TODAS LAS APUESTAS
  if (command === "limpiarapuestas" || command === "limpiapuestas") {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply("🔒 Solo un administrador puede limpiar apuestas.");
    }

    const apuestas = cargarApuestas();

    if (apuestas.length === 0) {
      return message.reply("📭 No hay apuestas para limpiar.");
    }

    guardarApuestas([]);

    const embed = new EmbedBuilder()
      .setTitle("🧹 Apuestas limpiadas")
      .setColor("Red")
      .setDescription(`Se eliminaron **${apuestas.length}** apuestas vigentes.`)
      .setFooter({ text: `Acción realizada por ${message.author.username}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });

    return actualizarPanel(message.channel, []);
  }

  // AYUDA
  if (command === "ayuda") {
    const embed = new EmbedBuilder()
      .setTitle("📌 Comandos del bot")
      .setColor("Red")
      .setDescription(`
<nombre> - <link>
Agrega una apuesta vigente.
Ejemplo: \`${prefix}addapuesta Champions | https://lat.betano.com/bookingcode/XXXXX\`

**${prefix}apuestas**
Muestra todas las apuestas vigentes.

**${prefix}borrarapuesta <número>**
Borra una apuesta específica. Solo administradores.

**${prefix}limpiarapuestas**
Borra todas las apuestas vigentes. Solo administradores.

**${prefix}ping**
Prueba si el bot responde.

**${prefix}avatar**
Muestra tu avatar.
      `)
      .setFooter({ text: "Betaninho • Comandos" });

    return message.reply({ embeds: [embed] });
  }
});

client.login(process.env.TOKEN);