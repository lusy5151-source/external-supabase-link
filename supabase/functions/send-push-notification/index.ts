import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id, title, body, data } = await req.json();
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 유저 디바이스 토큰 조회
    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", user_id)
      .eq("platform", "ios");

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ error: "토큰 없음" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID")!;
    const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID")!;
    const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID")!;
    const APNS_PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY")!;

    // JWT 생성 (APNs 인증)
    const header = btoa(JSON.stringify({ alg: "ES256", kid: APNS_KEY_ID }));
    const now = Math.floor(Date.now() / 1000);
    const payload = btoa(JSON.stringify({ iss: APNS_TEAM_ID, iat: now }));
    
    const keyData = APNS_PRIVATE_KEY
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\s/g, "");

    const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
    const privateKey = await crypto.subtle.importKey(
      "pkcs8", binaryKey,
      { name: "ECDSA", namedCurve: "P-256" },
      false, ["sign"]
    );

    const signingInput = `${header}.${payload}`;
    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privateKey,
      new TextEncoder().encode(signingInput)
    );
    const jwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

    // 각 디바이스에 알림 전송
    const results = await Promise.all(tokens.map(async ({ token }) => {
      const response = await fetch(
        `https://api.push.apple.com/3/device/${token}`,
        {
          method: "POST",
          headers: {
            "authorization": `bearer ${jwt}`,
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
        }
      );
      return { token, status: response.status };
    }));

    // 로그 저장
    await supabase.from("push_notification_logs").insert({
      user_id, title, body, status: "sent"
    });

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
