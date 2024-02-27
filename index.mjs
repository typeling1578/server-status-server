import osUtils from "os-utils";
import si from "systeminformation";

import Fastify from "fastify";
import FastifyWebsocket from "@fastify/websocket";

const fastify = Fastify({
    logger: true,
});
fastify.register(FastifyWebsocket, {
    options: { maxPayload: 1024 }
});

fastify.register(async (fastify) => {
    fastify.get("/", { websocket: false }, (req, res) => {
        res.send("It works!");
    });
    fastify.get("/ws", { websocket: true }, (connection, req) => {
        connection.socket.on("message", (data) => {
            try {
                const message = JSON.parse(data.toString());

                switch (message.type) {
                    case "ping":
                        connection.socket.send(JSON.stringify({
                            type: "pong",
                            id: message.id,
                        }));
                        break;
                    default:
                        break;
                }
            } catch (e) {}
        });
    });
});

fastify.listen({ port: 8000, host: "0.0.0.0" }, (err, address) => {
    if (err) throw err;
});

setInterval(async () => {
    const cpu_used = await new Promise((resolve) => {
        osUtils.cpuUsage((percentage) => {
            resolve(percentage)
        });
    });
    const mem_stats = await si.mem();

    fastify.websocketServer.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(JSON.stringify({
                type: "stats",
                cpu: {
                    used: cpu_used,
                },
                mem: {
                    total: mem_stats.total,
                    active: mem_stats.active,
                },
            }));
        }
    });
}, 2000);
