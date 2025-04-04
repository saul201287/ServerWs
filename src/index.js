const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mqtt = require("mqtt");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["*"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const MQTT_BROKER_URL = "mqtt://174.129.39.244:1883";

// 🚀 Conectar con RabbitMQ vía MQTT
const mqttClient = mqtt.connect(MQTT_BROKER_URL);

mqttClient.on("connect", () => {
  console.log("✅ Conectado a RabbitMQ (MQTT)");

  mqttClient.subscribe("prueba.alerta", (err) => {
    if (!err) console.log("📡 Suscrito a prueba.alerta");
  });

  mqttClient.subscribe("prueba.control", (err) => {
    if (!err) console.log("📡 Suscrito a prueba.control");
  });
});

mqttClient.on("message", (topic, message) => {
  const msg = message.toString();
  console.log(`📥 [${topic}] ${msg}`);

  if (topic === "prueba.alerta") {
    io.to("alertas").emit("alerta", msg);
  } else if (topic === "prueba.control") {
    io.to("controles").emit("control", msg);
  }
});

mqttClient.on("error", (error) => {
  console.error("❌ Error MQTT:", error);
});

// 🧠 Manejamos conexiones de clientes con socket.io
io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado:", socket.id);

  socket.emit("connected", "Conectado al servidor Socket.IO");

  socket.on("auth", (token) => {
    console.log("🔐 Token recibido:", token);
    // Aquí validarías el token si lo deseas
    socket.join("alertas"); // Ejemplo: unirlo a la sala "alertas"
    socket.emit("subscribed", "Suscrito a alertas por defecto");
  });

  socket.on("subscribe", (room) => {
    if (["alertas", "controles"].includes(room)) {
      socket.join(room);
      socket.emit("subscribed", `Te suscribiste a ${room}`);
      console.log(`📥 Cliente ${socket.id} suscrito a ${room}`);
    } else {
      socket.emit("error", `Sala inválida: ${room}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});

// 🚀 Iniciar servidor
const PORT = 8090;
server.listen(PORT, () => {
  console.log(`🚀 Servidor Socket.IO en http://localhost:${PORT}`);
});
