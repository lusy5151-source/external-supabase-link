-- Fix: profiles 테이블에 SELECT 권한이 없어서 RLS 정책이 통과해도 403이 발생함
-- authenticated/anon 역할에 SELECT 권한을 부여 (RLS는 그대로 적용됨)
GRANT SELECT ON public.profiles TO authenticated, anon;