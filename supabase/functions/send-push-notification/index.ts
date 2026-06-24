import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PushToken = {
  token: string;
  platform: string | null;
};

function toBase64Url(input: ArrayBuffer | Uint8Array | string) {
  let binary = "";
  if (typeof input === "string") {
    binary = input;
  } else {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    for (const byte of bytes) binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function parseFirebaseServiceAccount() {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (raw) return JSON.parse(raw);

  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
  const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY")?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  return { project_id: projectId, client_email: clientEmail, private_key: privateKey };
}

async function getFirebaseAccessToken(serviceAccount: any) {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = toBase64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));

  const keyData = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(signingInput),
  );
  const assertion = `${signingInput}.${toBase64Url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(`FCM auth failed: ${JSON.stringify(json)}`);
  return json.access_token as string;
}

async function sendAndroidPush(token: string, title: string, body: string, data: Record<string, unknown> = {}) {
  const serviceAccount = parseFirebaseServiceAccount();
  if (!serviceAccount) {
    return { token, platform: "android", status: 500, error: "Firebase service account env missing" };
  }

  const accessToken = await getFirebaseAccessToken(serviceAccount);
  const projectId = serviceAccount.project_id;
  const stringData = Object.fromEntries(
    Object.entries(data || {}).map(([key, value]) => [key, String(value ?? "")]),
  );

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data: stringData,
        android: {
          priority: "HIGH",
          notification: {
            channel_id: "wandeung_default",
            default_vibrate_timings: true,
          },
        },
      },
    }),
  });

  const responseText = await response.text();
  return {
    token,
    platform: "android",
    status: response.status,
    ok: response.ok,
    response: responseText,
  };
}

async function createApnsJwt() {
  const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID");
  const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID");
  const APNS_PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY");
  if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_PRIVATE_KEY) return null;

  const header = toBase64Url(JSON.stringify({ alg: "ES256", kid: APNS_KEY_ID }));
  const now = Math.floor(Date.now() / 1000);
  const payload = toBase64Url(JSON.stringify({ iss: APNS_TEAM_ID, iat: now }));
  const keyData = APNS_PRIVATE_KEY
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0)),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${toBase64Url(signature)}`;
}

async function sendIosPush(token: string, title: string, body: string, data: Record<string, unknown> = {}) {
  const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID");
  const jwt = await createApnsJwt();
  if (!APNS_BUNDLE_ID || !jwt) {
    return { token, platform: "ios", status: 500, error: "APNs env missing" };
  }

  const response = await fetch(`https://api.push.apple.com/3/device/${token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": APNS_BUNDLE_ID,
      "apns-push-type": "alert",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      aps: {
        alert: { title, body },
        sound: "default",
        badge: 1,
      },
      ...data,
    }),
  });

  return { token, platform: "ios", status: response.status, ok: response.ok };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id, title, body, data = {} } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tokens, error } = await supabase
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", user_id)
      .in("platform", ["ios", "android"]);

    if (error) throw error;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ error: "토큰 없음" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await Promise.all((tokens as PushToken[]).map(({ token, platform }) => {
      if (platform === "android") return sendAndroidPush(token, title, body, data);
      return sendIosPush(token, title, body, data);
    }));

    const hasSuccess = results.some((result: any) => result.ok || (result.status >= 200 && result.status < 300));
    await supabase.from("push_notification_logs").insert({
      user_id,
      title,
      body,
      status: hasSuccess ? "sent" : "failed",
    });

    return new Response(JSON.stringify({ success: hasSuccess, results }), {
      status: hasSuccess ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
