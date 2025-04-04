const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mqtt = require("mqtt");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["*", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const MQTT_BROKER_URL = "mqtt://174.129.39.244:1883";

const mqttClient = mqtt.connect(MQTT_BROKER_URL);

// Almacenar sockets suscritos a cada tipo de evento
const alertaSubscribers = new Set();
const controlSubscribers = new Set();

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
    alertaSubscribers.forEach((socket) => socket.emit("alerta", msg));
  } else if (topic === "prueba.control") {
    controlSubscribers.forEach((socket) => socket.emit("control", msg));
  }
});

mqttClient.on("error", (error) => {
  console.error("❌ Error MQTT:", error);
});

io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado:", socket.id);

  socket.emit("connected", "Conectado al servidor Socket.IO");

  socket.on("subscribe_alerta", () => {
    alertaSubscribers.add(socket);
    socket.emit("subscribed", "Te suscribiste al canal alerta");
    console.log(`📥 Cliente ${socket.id} suscrito a ALERTA`);
  });

  socket.on("subscribe_control", () => {
    controlSubscribers.add(socket);
    socket.emit("subscribed", "Te suscribiste al canal control");
    console.log(`📥 Cliente ${socket.id} suscrito a CONTROL`);
  });

  socket.on("disconnect", () => {
    alertaSubscribers.delete(socket);
    controlSubscribers.delete(socket);
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});

// 🚀 Iniciar servidor
const PORT = 8090;
server.listen(PORT, () => {
  console.log(`🚀 Servidor Socket.IO en http://localhost:${PORT}`);
});
