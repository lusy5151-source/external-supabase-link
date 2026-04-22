import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KAKAO_REST_API_KEY = Deno.env.get("KAKAO_REST_API_KEY");

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, redirect_uri } = await req.json();

    if (!code || !redirect_uri) {
      return new Response(
        JSON.stringify({ error: "code와 redirect_uri가 필요합니다." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Exchange code for access token
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: KAKAO_REST_API_KEY,
        redirect_uri,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      console.error("Kakao token error:", tokenData);
      return new Response(
        JSON.stringify({ error: "카카오 토큰 교환 실패", details: tokenData.error_description }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get user info
    const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const kakaoUser = await userRes.json();

    const kakaoId = String(kakaoUser.id);
    const email = kakaoUser.kakao_account?.email || `kakao_${kakaoId}@kakao.local`;
    const nickname = kakaoUser.kakao_account?.profile?.nickname || `카카오유저${kakaoId.slice(-4)}`;
    const avatarUrl = kakaoUser.kakao_account?.profile?.profile_image_url || null;

    // 3. Create/sign in user via Supabase Admin API
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user exists by email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email === email || u.user_metadata?.kakao_id === kakaoId
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      // Update metadata
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name: nickname,
          avatar_url: avatarUrl,
          kakao_id: kakaoId,
          provider: "kakao",
        },
        app_metadata: { provider: "kakao" },
      });
    } else {
      // Create new user
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          full_name: nickname,
          avatar_url: avatarUrl,
          kakao_id: kakaoId,
          provider: "kakao",
        },
        app_metadata: { provider: "kakao" },
      });

      if (createError) {
        console.error("User creation error:", createError);
        return new Response(
          JSON.stringify({ error: "사용자 생성 실패", details: createError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = newUser.user!.id;
    }

    // 4. Generate session tokens
    const { data: sessionData, error: sessionError } =
      await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });

    if (sessionError) {
      console.error("Session generation error:", sessionError);
      return new Response(
        JSON.stringify({ error: "세션 생성 실패", details: sessionError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the OTP to verify and get a real session
    const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
      email,
      token: sessionData.properties?.hashed_token!,
      type: "email",
    });

    if (verifyError) {
      console.error("OTP verify error:", verifyError);
      return new Response(
        JSON.stringify({ error: "인증 확인 실패", details: verifyError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ session: verifyData.session }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error("Kakao auth error:", err);
    return new Response(
      JSON.stringify({ error: "카카오 로그인 처리 중 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
