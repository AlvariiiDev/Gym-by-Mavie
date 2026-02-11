import { supabase } from "@/integrations/supabase/client";

export async function signUpUser(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signInUser(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOutUser() {
  return supabase.auth.signOut();
}

export async function createProfile(userId: string, username: string, avatarId: number) {
  return supabase.from("profiles").insert({ user_id: userId, username, avatar_id: avatarId });
}

export async function getProfile(userId: string) {
  return supabase.from("profiles").select("*").eq("user_id", userId).single();
}

export async function getProfileByUsername(username: string) {
  return supabase.from("profiles").select("*").eq("username", username).maybeSingle();
}
