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

const alertaSubscribers = new Set();
const estadoSubscribers = new Set();
const pesoSubscribers = new Set();
const estatusSubscribers = new Set();

mqttClient.on("connect", () => {
  console.log("✅ Conectado a RabbitMQ (MQTT)");

  mqttClient.subscribe("prueba.alerta", (err) => {
    if (!err) console.log("📡 Suscrito a prueba.alerta");
  });

  mqttClient.subscribe("prueba.estado", (err) => {
    if (!err) console.log("📡 Suscrito a prueba.estado");
  });

  mqttClient.subscribe("prueba.peso", (err) => {
    if (!err) console.log("📡 Suscrito a prueba.peso");
  });
  mqttClient.subscribe("prueba.activo", (err) => {
    if (!err) console.log("📡 Suscrito a prueba.activo");
  });
});

mqttClient.on("message", (topic, message) => {
  const msg = message.toString();
  console.log(`📥 [${topic}] ${msg}`);

  if (topic === "prueba/alerta") {
    alertaSubscribers.forEach((socket) =>
      socket.emit("alerta", msg == "verdadero" ? 1 : 0)
    );
  } else if (topic === "prueba/estado") {
    estadoSubscribers.forEach((socket) => socket.emit("estado", msg));
  } else if (topic === "prueba/peso") {
    pesoSubscribers.forEach((socket) => socket.emit("peso", msg));
  }else if (topic === "prueba/activo") {
    estatusSubscribers.forEach((socket) => socket.emit("estatus", msg));
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

  socket.on("subscribe_peso", () => {
    pesoSubscribers.add(socket);
    socket.emit("subscribed", "Te suscribiste al canal peso");
    console.log(`📥 Cliente ${socket.id} suscrito a PESO`);
  });

  socket.on("subscribe_estado", () => {
    estadoSubscribers.add(socket);
    socket.emit("subscribed", "Te suscribiste al canal estado");
    console.log(`📥 Cliente ${socket.id} suscrito a ESTADO`);
  });

  socket.on("subscribe_estatus", () => {
    estatusSubscribers.add(socket);
    socket.emit("subscribed", "Te suscribiste al canal estatus");
    console.log(`📥 Cliente ${socket.id} suscrito a estatus`);
  });

  socket.on("enviar_control", (mensaje) => {
    console.log(mensaje);

    mqttClient.publish("prueba/control", mensaje, (err) => {
      if (err) {
        console.error("❌ Error al publicar en MQTT:", err);
        socket.emit("error_control", "No se pudo publicar el mensaje");
      } else {
        console.log(`📤 [MQTT] Enviado a prueba.control: ${mensaje}`);
        socket.emit("control_enviado", mensaje);
      }
    });
  });

  socket.on("disconnect", () => {
    alertaSubscribers.delete(socket);
    estadoSubscribers.delete(socket);
    pesoSubscribers.delete(socket)
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});

const PORT = 8090;
server.listen(PORT, () => {
  console.log(`🚀 Servidor Socket.IO en http://localhost:${PORT}`);
});
