const WebSocket = require("ws");
const mqtt = require("mqtt");
const http = require("http");

const WS_PORT = 8090;
const MQTT_BROKER_URL = "mqtt://174.129.39.244:1883";

const server = http.createServer((req, res) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "*",
    "http://localhost:5173",
    "http://localhost:5173/"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.end();
});

const wss = new WebSocket.Server({ server });

const clients = {
  "/alertas": new Set(),
  "/controles": new Set(),
};

wss.on("connection", (ws) => {
  console.log("Cliente WebSocket conectado");

  ws.on("message", (message) => {
    const msg = message.toString();
    console.log(`Mensaje recibido del cliente: ${msg}`);

    try {
      const jsonMsg = JSON.parse(msg);

      if (jsonMsg.type === "auth") {
        console.log("Autenticación recibida con token:", jsonMsg.token);
        // Here you would validate the token
        // For now, we'll just subscribe them to alertas by default
        clients["/alertas"].add(ws);
        ws.send("Autenticado y suscrito a /alertas");
      } else if (jsonMsg.subscribe) {
        const topic = jsonMsg.subscribe;
        if (clients[topic]) {
          clients[topic].add(ws);
          ws.send(`Suscrito a ${topic}`);
        } else {
          ws.send(`Tema no válido: ${topic}`);
        }
      }
    } catch (e) {
      if (msg === "subscribe:/alertas") {
        clients["/alertas"].add(ws);
        ws.send("Suscrito a /alertas");
      } else if (msg === "subscribe:/controles") {
        clients["/controles"].add(ws);
        ws.send("Suscrito a /controles");
      } else {
        ws.send(`Eco: ${msg}`);
      }
    }
  });

  ws.on("close", () => {
    console.log("Cliente WebSocket desconectado");
    clients["/alertas"].delete(ws);
    clients["/controles"].delete(ws);
  });

  ws.send("Conectado al servidor WebSocket. Por favor suscríbase a un tema.");
});

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

server.listen(WS_PORT, () => {
  console.log(`Servidor WebSocket corriendo en ws://0.0.0.0:${WS_PORT}`);
});

setupMQTTConsumer();
