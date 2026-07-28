import admin from "firebase-admin";
import fs from "fs";
import { env } from "../utils/env";

let app: admin.app.App | null = null;

function normalizePrivateKey(raw: string) {
  return raw.replace(/\\n/g, "\n").trim();
}

function loadServiceAccount(): any | null {
  try {
    let serviceAccount: any = null;

    if (env.FCM_SERVICE_ACCOUNT_JSON_B64) {
      const raw = Buffer.from(env.FCM_SERVICE_ACCOUNT_JSON_B64, "base64").toString("utf-8");
      serviceAccount = JSON.parse(raw);
    } else if (env.FCM_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON);
    } else if (env.FCM_SERVICE_ACCOUNT_PATH) {
      const raw = fs.readFileSync(env.FCM_SERVICE_ACCOUNT_PATH, "utf-8");
      serviceAccount = JSON.parse(raw);
    }

    if (serviceAccount && typeof serviceAccount.private_key === "string") {
      serviceAccount.private_key = normalizePrivateKey(serviceAccount.private_key);
    }

    return serviceAccount;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[fcm] error loading service account credentials:", err);
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
    console.error("[fcm] failed to initialize Firebase Admin:", err);
    return null;
  }
}
