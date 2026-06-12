import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function generateApnsJwt(keyId: string, teamId: string, rawBase64Key: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const headerB64 = btoa(JSON.stringify({ alg: "ES256", kid: keyId }))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify({ iss: teamId, iat: now }))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signingInput = `${headerB64}.${payloadB64}`;

  const clean = rawBase64Key.replace(/\s/g, "");
  const padded = clean + "=".repeat((4 - clean.length % 4) % 4);

  const keyBytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", keyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false, ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${signingInput}.${sig}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id, title, body, data } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tokens } = await supabase
      .from("push_tokens").select("token")
      .eq("user_id", user_id).eq("platform", "ios");

    if (!tokens || tokens.length === 0) {
      await supabase.from("push_notification_logs").insert({
        user_id, title, body, status: "no_token",
      });
      return new Response(JSON.stringify({ message: "토큰 없음" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jwt = await generateApnsJwt(
      Deno.env.get("APNS_KEY_ID")!,
      Deno.env.get("APNS_TEAM_ID")!,
      Deno.env.get("APNS_PRIVATE_KEY")!
    );

    // sandbox(개발 빌드) / production(TestFlight·App Store) 분기.
    // APNS_ENV 시크릿이 없으면 production(기존 동작) 유지.
    const apnsEnv = (Deno.env.get("APNS_ENV") || "production").toLowerCase();
    const apnsHost = apnsEnv === "sandbox"
      ? "https://api.sandbox.push.apple.com"
      : "https://api.push.apple.com";

    const results = await Promise.all(tokens.map(async ({ token }) => {
      const response = await fetch(`${apnsHost}/3/device/${token}`, {
        method: "POST",
        headers: {
          "authorization": `bearer ${jwt}`,
          "apns-topic": Deno.env.get("APNS_BUNDLE_ID")!,
          "apns-push-type": "alert",
          "apns-priority": "10",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          aps: { alert: { title, body }, sound: "default", badge: 1 },
          ...data,
        }),
      });
      const responseText = await response.text();
      console.log(`APNs[${apnsEnv}]: ${response.status} ${responseText}`);

      // 만료/잘못된 토큰은 정리해서 다음 호출부터 "no_token" 분기로 빠지게 함.
      if (response.status === 410 || response.status === 400) {
        try {
          await supabase.from("push_tokens").delete().eq("token", token);
        } catch (e) {
          console.error("token cleanup failed:", e);
        }
      }
      return { status: response.status, response: responseText };
    }));

    const overallStatus = results.every(r => r.status >= 200 && r.status < 300)
      ? "sent" : "partial_failure";

    await supabase.from("push_notification_logs").insert({
      user_id, title, body,
      status: `${overallStatus}:${results.map(r => r.status).join(",")}`,
    });
    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Push error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
