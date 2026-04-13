
-- 1. summits
CREATE TABLE public.summits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mountain_id INTEGER NOT NULL,
  summit_name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  elevation INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.summits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read summits" ON public.summits FOR SELECT USING (true);

-- 2. summit_claims
CREATE TABLE public.summit_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mountain_id INTEGER NOT NULL,
  summit_id UUID NOT NULL REFERENCES public.summits(id) ON DELETE CASCADE,
  group_id UUID,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  photo_url TEXT,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.summit_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read summit_claims" ON public.summit_claims FOR SELECT USING (true);
CREATE POLICY "Users can insert own claims" ON public.summit_claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own claims" ON public.summit_claims FOR DELETE USING (auth.uid() = user_id);

-- 3. user_mountains
CREATE TABLE public.user_mountains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mountain_id INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  photo_url TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, mountain_id)
);
ALTER TABLE public.user_mountains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read user_mountains" ON public.user_mountains FOR SELECT USING (true);
CREATE POLICY "Users can insert own mountains" ON public.user_mountains FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mountains" ON public.user_mountains FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own mountains" ON public.user_mountains FOR DELETE USING (auth.uid() = user_id);

-- 4. plan_applications
CREATE TABLE public.plan_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.plan_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read applications" ON public.plan_applications FOR SELECT USING (true);
CREATE POLICY "Users can insert own applications" ON public.plan_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update applications" ON public.plan_applications FOR UPDATE USING (true);
CREATE POLICY "Users can delete own applications" ON public.plan_applications FOR DELETE USING (auth.uid() = user_id);

-- 5. group_invitations
CREATE TABLE public.group_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  inviter_id UUID NOT NULL,
  invitee_id UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Related users can read invitations" ON public.group_invitations FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);
CREATE POLICY "Users can insert invitations" ON public.group_invitations FOR INSERT WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY "Invitee can update invitation" ON public.group_invitations FOR UPDATE USING (auth.uid() = invitee_id);
CREATE POLICY "Related users can delete invitations" ON public.group_invitations FOR DELETE USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- 6. user_blocks
CREATE TABLE public.user_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own blocks" ON public.user_blocks FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can insert own blocks" ON public.user_blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can delete own blocks" ON public.user_blocks FOR DELETE USING (auth.uid() = blocker_id);

-- 7. plan_messages
CREATE TABLE public.plan_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.plan_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plan messages" ON public.plan_messages FOR SELECT USING (true);
CREATE POLICY "Users can insert own messages" ON public.plan_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON public.plan_messages FOR DELETE USING (auth.uid() = user_id);

-- 8. account_deletion_requests
CREATE TABLE public.account_deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own deletion requests" ON public.account_deletion_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deletion requests" ON public.account_deletion_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('summit-photos', 'summit-photos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('club-logos', 'club-logos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('mountain-images', 'mountain-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('magazine-images', 'magazine-images', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for public buckets
CREATE POLICY "Public read summit-photos" ON storage.objects FOR SELECT USING (bucket_id = 'summit-photos');
CREATE POLICY "Auth upload summit-photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'summit-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Auth update avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read club-logos" ON storage.objects FOR SELECT USING (bucket_id = 'club-logos');
CREATE POLICY "Auth upload club-logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'club-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read mountain-images" ON storage.objects FOR SELECT USING (bucket_id = 'mountain-images');
CREATE POLICY "Auth upload mountain-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'mountain-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read magazine-images" ON storage.objects FOR SELECT USING (bucket_id = 'magazine-images');
CREATE POLICY "Auth upload magazine-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'magazine-images' AND auth.uid()::text = (storage.foldername(name))[1]);
