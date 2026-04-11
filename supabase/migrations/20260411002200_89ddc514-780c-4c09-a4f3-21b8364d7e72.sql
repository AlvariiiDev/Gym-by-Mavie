-- Fix friendships UPDATE policy to prevent privilege escalation
DROP POLICY "Users can update friendships addressed to them" ON public.friendships;

CREATE POLICY "Users can update friendships addressed to them"
ON public.friendships
FOR UPDATE
TO authenticated
USING (auth.uid() = addressee_id)
WITH CHECK (
  auth.uid() = addressee_id
  AND status IN ('accepted', 'rejected')
);