CREATE OR REPLACE FUNCTION public.toggle_summit_claim(p_mountain_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_existing_id uuid;
  v_summit_id uuid;
  v_lat double precision;
  v_lng double precision;
  v_new_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_authenticated',
      'message', '로그인이 필요해요'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM mountains WHERE id = p_mountain_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'mountain_not_found',
      'message', '산 정보를 찾을 수 없어요'
    );
  END IF;

  SELECT id INTO v_existing_id
  FROM summit_claims
  WHERE user_id = v_user_id AND mountain_id = p_mountain_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    DELETE FROM summit_claims WHERE id = v_existing_id;
    RETURN jsonb_build_object(
      'success', true,
      'action', 'unmarked',
      'message', '완등 기록을 취소했어요'
    );
  END IF;

  SELECT
    (SELECT s.id
     FROM summits s
     WHERE s.mountain_id = p_mountain_id
     ORDER BY s.elevation DESC NULLS LAST
     LIMIT 1),
    m.lat,
    m.lng
  INTO v_summit_id, v_lat, v_lng
  FROM mountains m
  WHERE m.id = p_mountain_id;

  INSERT INTO summit_claims (
    user_id,
    mountain_id,
    summit_id,
    latitude,
    longitude,
    ai_verified,
    source
  )
  VALUES (
    v_user_id,
    p_mountain_id,
    v_summit_id,
    v_lat,
    v_lng,
    false,
    'manual'
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'marked',
    'claim_id', v_new_id,
    'has_summit', v_summit_id IS NOT NULL,
    'has_coords', v_lat IS NOT NULL,
    'message', '🎉 완등 기록!'
  );
END;
$function$;