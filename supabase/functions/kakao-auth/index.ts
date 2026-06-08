import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const KAKAO_REST_API_KEY = Deno.env.get('KAKAO_REST_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const isSafeRedirectUri = (value: string | null) => {
  if (!value) return false

  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.hostname === 'localhost'
  } catch {
    return false
  }
}

const normalizeProvider = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null

const summarizeAuthUser = (user: any) => {
  if (!user) return null

  const identityProviders = Array.isArray(user.identities)
    ? user.identities
        .map((identity: any) => ({
          id: identity.identity_id,
          provider: normalizeProvider(identity.provider),
          user_id: identity.user_id,
        }))
        .filter((identity: { provider: string | null }) => Boolean(identity.provider))
    : []

  const providerCandidates = Array.from(
    new Set(
      [
        normalizeProvider(user.app_metadata?.provider),
        normalizeProvider(user.user_metadata?.provider),
        ...(Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers.map(normalizeProvider) : []),
        ...identityProviders.map((identity: { provider: string | null }) => identity.provider),
      ].filter((provider): provider is string => Boolean(provider)),
    ),
  )

  return {
    id: user.id,
    email: user.email ?? null,
    appProvider: normalizeProvider(user.app_metadata?.provider),
    userProvider: normalizeProvider(user.user_metadata?.provider),
    providerCandidates,
    hasKakaoIdentity: providerCandidates.includes('kakao'),
    identities: identityProviders,
  }
}

const logDebug = (stage: string, payload: Record<string, unknown>) => {
  console.log(`[kakao-auth:${stage}]`, JSON.stringify(payload))
}

const findExistingUser = async (supabaseAdmin: ReturnType<typeof createClient>, email: string, kakaoId: string) => {
  const { data: profileByEmail, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('user_id, provider')
    .eq('email', email)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (profileByEmail?.user_id) {
    const { data: authUserByProfile, error: authUserByProfileError } = await supabaseAdmin.auth.admin.getUserById(profileByEmail.user_id)

    if (authUserByProfileError) {
      logDebug('profile-auth-fetch-error', {
        email,
        profileUserId: profileByEmail.user_id,
        error: authUserByProfileError.message,
      })
    }

    if (authUserByProfile?.user) {
      return {
        profileByEmail,
        authUser: authUserByProfile.user,
        matchedBy: 'profile-email',
      }
    }
  }

  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })

    if (error) {
      throw error
    }

    const matchedUser =
      data.users.find((user) => user.user_metadata?.kakao_id === kakaoId) ??
      data.users.find((user) => user.email === email)

    if (matchedUser) {
      return {
        profileByEmail,
        authUser: matchedUser,
        matchedBy: matchedUser.user_metadata?.kakao_id === kakaoId ? 'auth-kakao-id' : 'auth-email',
      }
    }

    if (data.users.length < perPage) {
      return {
        profileByEmail,
        authUser: null,
        matchedBy: 'none',
      }
    }

    page += 1
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!KAKAO_REST_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_PUBLISHABLE_KEY) {
    return jsonResponse({ error: '카카오 로그인 설정이 완료되지 않았습니다.' }, 500)
  }

  if (req.method === 'GET') {
    const redirectUri = new URL(req.url).searchParams.get('redirect_uri')

    if (!isSafeRedirectUri(redirectUri)) {
      return jsonResponse({ error: '유효한 redirect_uri가 필요합니다.' }, 400)
    }

    const kakaoAuthUrl = new URL('https://kauth.kakao.com/oauth/authorize')
    kakaoAuthUrl.searchParams.set('client_id', KAKAO_REST_API_KEY)
    kakaoAuthUrl.searchParams.set('redirect_uri', redirectUri)
    kakaoAuthUrl.searchParams.set('response_type', 'code')

    return Response.redirect(kakaoAuthUrl.toString(), 302)
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: '허용되지 않은 메서드입니다.' }, 405)
  }

  try {
    const body = await req.json()
    const { code, redirect_uri, is_native, request_type } = body ?? {}

    if (typeof redirect_uri !== 'string' || !isSafeRedirectUri(redirect_uri)) {
      return jsonResponse({ error: '유효한 redirect_uri가 필요합니다.' }, 400)
    }

    // Native flow step 1: return the Kakao authorize URL for the in-app browser to open
    if (request_type === 'authorize_url' || !code) {
      if (request_type === 'authorize_url' || (!code && is_native)) {
        const kakaoAuthUrl = new URL('https://kauth.kakao.com/oauth/authorize')
        kakaoAuthUrl.searchParams.set('client_id', KAKAO_REST_API_KEY)
        kakaoAuthUrl.searchParams.set('redirect_uri', redirect_uri)
        kakaoAuthUrl.searchParams.set('response_type', 'code')
        return jsonResponse({ url: kakaoAuthUrl.toString() })
      }
    }

    if (typeof code !== 'string' || !code) {
      return jsonResponse({ error: 'code와 redirect_uri가 필요합니다.' }, 400)
    }

    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KAKAO_REST_API_KEY,
        redirect_uri,
        code,
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
      console.error('Kakao token error:', tokenData)
      return jsonResponse(
        { error: '카카오 토큰 교환 실패', details: tokenData.error_description ?? tokenData.error ?? 'unknown_error' },
        400,
      )
    }

    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const kakaoUser = await userRes.json()

    if (!userRes.ok || !kakaoUser?.id) {
      console.error('Kakao user fetch error:', kakaoUser)
      return jsonResponse({ error: '카카오 사용자 정보 조회 실패', details: kakaoUser?.msg ?? 'unknown_error' }, 400)
    }

    const kakaoId = String(kakaoUser.id)
    const email = kakaoUser.kakao_account?.email || `kakao_${kakaoId}@kakao.local`
    const nickname = kakaoUser.kakao_account?.profile?.nickname || `카카오유저${kakaoId.slice(-4)}`
    const rawAvatarUrl = kakaoUser.kakao_account?.profile?.profile_image_url || null
    const avatarUrl = rawAvatarUrl && rawAvatarUrl.startsWith('http://')
      ? 'https://' + rawAvatarUrl.slice('http://'.length)
      : rawAvatarUrl

    logDebug('request', {
      email,
      kakaoId,
      currentProvider: 'kakao',
      redirectUri: redirect_uri,
    })

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const existingUser = await findExistingUser(supabaseAdmin, email, kakaoId)
    const authSummary = summarizeAuthUser(existingUser.authUser)
    const profileProvider = normalizeProvider(existingUser.profileByEmail?.provider)
    const resolvedProvider = authSummary?.hasKakaoIdentity
      ? 'kakao'
      : authSummary?.providerCandidates.find((provider) => provider !== 'email') ??
        authSummary?.appProvider ??
        authSummary?.userProvider ??
        profileProvider

    logDebug('existing-user-check', {
      email,
      currentProvider: 'kakao',
      existingAuthUserExists: Boolean(existingUser.authUser),
      authUserId: authSummary?.id ?? null,
      authUserEmail: authSummary?.email ?? null,
      existingIdentities: authSummary?.identities ?? [],
      authProviderCandidates: authSummary?.providerCandidates ?? [],
      profileUserId: existingUser.profileByEmail?.user_id ?? null,
      profileProvider,
      matchedBy: existingUser.matchedBy,
      resolvedProvider,
    })

    if ((existingUser.authUser || existingUser.profileByEmail) && resolvedProvider && resolvedProvider !== 'kakao') {
      logDebug('conflict', {
        email,
        reason: 'existing-non-kakao-provider',
        currentProvider: 'kakao',
        resolvedProvider,
        existingAuthUserExists: Boolean(existingUser.authUser),
        existingIdentities: authSummary?.identities ?? [],
        profileProvider,
        matchedBy: existingUser.matchedBy,
      })
      return jsonResponse(
        { error: '이미 다른 로그인 방식으로 가입된 이메일입니다. 기존 로그인 방식을 이용해주세요.' },
        409,
      )
    }

    logDebug('branch', {
      email,
      branch: existingUser.authUser ? 'reuse-existing-user' : 'create-new-user',
      currentProvider: 'kakao',
      resolvedProvider: resolvedProvider ?? 'none',
    })

    let userId = existingUser.authUser?.id ?? existingUser.profileByEmail?.user_id ?? null

    const userPayload = {
      email,
      email_confirm: true,
      user_metadata: {
        full_name: nickname,
        name: nickname,
        avatar_url: avatarUrl,
        picture: avatarUrl,
        kakao_id: kakaoId,
        provider: 'kakao',
      },
      app_metadata: { provider: 'kakao' },
    }

    if (userId) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, userPayload)

      if (updateError) {
        console.error('User update error:', updateError)
        return jsonResponse({ error: '사용자 정보 갱신 실패', details: updateError.message }, 500)
      }
    } else {
      const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser(userPayload)

      if (createError || !createdUser.user) {
        console.error('User creation error:', createError)
        return jsonResponse({ error: '사용자 생성 실패', details: createError?.message ?? 'unknown_error' }, 500)
      }

      userId = createdUser.user.id
    }

    const timestamp = new Date().toISOString()

    await supabaseAdmin.from('profiles').upsert(
      {
        id: userId,
        user_id: userId,
        email,
        nickname,
        avatar_url: avatarUrl,
        provider: 'kakao',
        updated_at: timestamp,
      },
      { onConflict: 'user_id' },
    )

    await supabaseAdmin.from('privacy_settings').upsert({ user_id: userId }, { onConflict: 'user_id' })

    const { data: persistedUserData, error: persistedUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
    const { data: persistedProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, provider')
      .eq('user_id', userId)
      .maybeSingle()

    logDebug('persisted-state', {
      email,
      currentProvider: 'kakao',
      authUserId: userId,
      persistedAuthUser: persistedUserError ? { error: persistedUserError.message } : summarizeAuthUser(persistedUserData.user),
      persistedProfile,
      userMetadataProvider: normalizeProvider(persistedUserData.user?.user_metadata?.provider),
      appMetadataProvider: normalizeProvider(persistedUserData.user?.app_metadata?.provider),
    })

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: redirect_uri },
    })

    if (linkError || !linkData.properties?.email_otp) {
      console.error('Session generation error:', linkError)
      return jsonResponse({ error: '세션 생성 실패', details: linkError?.message ?? 'email_otp_missing' }, 500)
    }

    const { data: verifyData, error: verifyError } = await supabaseClient.auth.verifyOtp({
      email,
      token: linkData.properties.email_otp,
      type: 'magiclink',
    })

    if (verifyError || !verifyData.session?.access_token || !verifyData.session?.refresh_token) {
      console.error('OTP verify error:', verifyError)
      return jsonResponse({ error: '인증 확인 실패', details: verifyError?.message ?? 'session_missing' }, 500)
    }

    logDebug('session-issued', {
      email,
      authUserId: userId,
      currentProvider: 'kakao',
      sessionUserId: verifyData.user?.id ?? null,
    })

    return jsonResponse({ session: verifyData.session })
  } catch (err) {
    console.error('Kakao auth error:', err)
    return jsonResponse({ error: '카카오 로그인 처리 중 오류가 발생했습니다.' }, 500)
  }
})
