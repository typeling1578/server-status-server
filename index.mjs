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
    fastify.get("/ws", { websocket: true }, (socket, req) => {
        socket.on("message", (data) => {
            if (socket.lastMessageReceived &&
                (Date.now() - socket.lastMessageReceived) < 1000
            ) {
                socket.close();
                setTimeout(() => {
                    if (socket.readyState !== 3 /* CLOSED */) {
                        socket.terminate();
                    }
                }, 500);
                return;
            }
            socket.lastMessageReceived = Date.now();
            try {
                const message = JSON.parse(data.toString());

                switch (message.type) {
                    case "ping":
                        socket.send(JSON.stringify({
                            type: "pong",
                            id: message.id,
                        }));
                        break;
                    default:
                        break;
                }
            } catch (e) {
                socket.close();
                setTimeout(() => {
                    if (socket.readyState !== 3 /* CLOSED */) {
                        socket.terminate();
                    }
                }, 500);
            }
        });
        socket.on("error", (e) => {
            socket.close();
            setTimeout(() => {
                if (socket.readyState !== 3 /* CLOSED */) {
                    socket.terminate();
                }
            }, 500);
        });
    });
});

fastify.listen({ port: Number(process.env.PORT ?? "8000"), host: process.env.HOST ?? "127.0.0.1" }, (err, address) => {
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
        if (client.readyState === 1 /* OPEN */) {
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
