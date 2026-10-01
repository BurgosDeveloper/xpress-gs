import "dotenv/config";
import { sendPushBroadcast } from "../modules/notifications/notifications.service";
import { env } from "../utils/env";
import { prisma } from "../db/prisma";

async function main() {
  console.log("Iniciando envío de notificación push masiva sobre actualización...");
  const res = await sendPushBroadcast({
    title: env.APP_UPDATE_TITLE,
    body: env.APP_UPDATE_MESSAGE,
    soundName: "notification",
    data: {
      type: "APP_UPDATE",
      latestVersion: env.LATEST_APP_VERSION,
      playStoreUrl: env.PLAY_STORE_URL,
      appStoreUrl: env.APP_STORE_URL,
    },
  });

  console.log("Resultado del broadcast:", res);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error enviando broadcast:", err);
  process.exit(1);
});
