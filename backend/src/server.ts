import { createApp } from "./app";
import { env } from "./utils/env";
import { createServer } from "http";
import { initRealtime } from "./realtime/realtime";

import os from "os";

const app = createApp();

const server = createServer(app);
initRealtime(server);

server.listen(env.PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`\n==================================================`);
  // eslint-disable-next-line no-console
  console.log(`🚀 [api] Servidor corriendo exitosamente:`);
  // eslint-disable-next-line no-console
  console.log(`👉 Localhost URL: http://localhost:${env.PORT}`);
  
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        // eslint-disable-next-line no-console
        console.log(`👉 LAN (Wi-Fi) URL: http://${net.address}:${env.PORT}`);
      }
    }
  }
  // eslint-disable-next-line no-console
  console.log(`==================================================\n`);
});
