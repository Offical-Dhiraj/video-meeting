import http from "http";

import app from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/db.js";

const server = http.createServer(app);

const startServer = async () => {
    await connectDatabase();

    server.listen(env.PORT, () => {
        console.log(`
MeetFlow backend started

Environment: ${env.NODE_ENV}
Port:        ${env.PORT}
URL:         http://localhost:${env.PORT}
Health:      http://localhost:${env.PORT}/api/health
    `);
    });
};

const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    server.close(async () => {
        console.log("HTTP server closed.");

        process.exit(0);
    });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

startServer().catch((error) => {
    console.error("Server startup failed:", error);
    process.exit(1);
});