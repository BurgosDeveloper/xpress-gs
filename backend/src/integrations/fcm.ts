import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { env } from "../utils/env";

let app: admin.app.App | null = null;

function normalizePrivateKey(raw: string) {
  if (!raw) return "";
  return raw.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
}

function loadServiceAccount(): any | null {
  try {
    // 1. Opciones por separado (FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY)
    if (env.FCM_PROJECT_ID && env.FCM_CLIENT_EMAIL && env.FCM_PRIVATE_KEY) {
      return {
        type: "service_account",
        project_id: env.FCM_PROJECT_ID,
        client_email: env.FCM_CLIENT_EMAIL,
        private_key: normalizePrivateKey(env.FCM_PRIVATE_KEY),
      };
    }

    let serviceAccount: any = null;

    // 2. Base64 encoded JSON
    if (env.FCM_SERVICE_ACCOUNT_JSON_B64) {
      const raw = Buffer.from(env.FCM_SERVICE_ACCOUNT_JSON_B64, "base64").toString("utf-8");
      serviceAccount = JSON.parse(raw);
    }
    // 3. JSON plano en string
    else if (env.FCM_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON);
    }
    // 4. Ruta por variable de entorno
    else if (env.FCM_SERVICE_ACCOUNT_PATH && fs.existsSync(env.FCM_SERVICE_ACCOUNT_PATH)) {
      const raw = fs.readFileSync(env.FCM_SERVICE_ACCOUNT_PATH, "utf-8");
      serviceAccount = JSON.parse(raw);
    }
    // 5. Fallback automático a archivo bundled en backend/firebase-service-account.json
    else {
      const bundledPath = path.resolve(process.cwd(), "firebase-service-account.json");
      if (fs.existsSync(bundledPath)) {
        const raw = fs.readFileSync(bundledPath, "utf-8");
        serviceAccount = JSON.parse(raw);
      }
    }

    if (serviceAccount && typeof serviceAccount.private_key === "string") {
      serviceAccount.private_key = normalizePrivateKey(serviceAccount.private_key);
    }

    return serviceAccount;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[fcm] error al cargar credenciales de Firebase:", err);
    return null;
  }
}

export function getFCMOrNull() {
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) return null;

  try {
    if (!app) {
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });
    }

    return admin.messaging(app);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[fcm] error al inicializar Firebase Admin:", err);
    return null;
  }
}
