CREATE POLICY "Users can update own notifications"
ON public.plan_notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);