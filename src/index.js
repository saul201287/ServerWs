const WebSocket = require("ws");
const mqtt = require("mqtt");

const WS_PORT = 8090;
const MQTT_BROKER_URL = "mqtt://174.129.39.244:1883";

const wss = new WebSocket.Server({ port: WS_PORT });

const clients = {
  "/alertas": new Set(),
  "/controles": new Set(),
};

wss.on("connection", (ws) => {
  console.log("Cliente WebSocket conectado");

  ws.on("message", (message) => {
    const msg = message.toString();
    console.log(`Mensaje recibido del cliente: ${msg}`);

    if (msg === "subscribe:/alertas") {
      clients["/alertas"].add(ws);
      ws.send("Suscrito a /alertas");
    } else if (msg === "subscribe:/controles") {
      clients["/controles"].add(ws);
      ws.send("Suscrito a /controles");
    } else {
      ws.send(`Eco: ${msg}`);
    }
  });

  ws.on("close", () => {
    console.log("Cliente WebSocket desconectado");
    clients["/alertas"].delete(ws);
    clients["/controles"].delete(ws);
  });
});

console.log(`Servidor WebSocket corriendo en ws://localhost:${WS_PORT}`);

function setupMQTTConsumer() {
  const client = mqtt.connect(MQTT_BROKER_URL);

  client.on("connect", () => {
    console.log("Conectado al broker MQTT de RabbitMQ");

    client.subscribe("prueba.alerta", (err) => {
      if (!err) console.log("Suscrito a prueba.alerta");
      else console.error("Error al suscribirse a prueba.alerta:", err);
    });

    client.subscribe("prueba.control", (err) => {
      if (!err) console.log("Suscrito a prueba.control");
      else console.error("Error al suscribirse a prueba.control:", err);
    });
  });

  client.on("message", (topic, message) => {
    const msgString = message.toString();
    console.log(`Mensaje MQTT recibido en ${topic}: ${msgString}`);

    if (topic === "prueba.alerta") {
      clients["/alertas"].forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(`Alerta: ${msgString}`);
        }
      });
    } else if (topic === "prueba.control") {
      clients["/controles"].forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(`Control: ${msgString}`);
        }
      });
    }
  });

  client.on("error", (error) => {
    console.error("Error en MQTT:", error);
  });
}

setupMQTTConsumer();
