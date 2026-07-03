// Optional direct-submit backend.
// Leave empty to use the public-safe GitHub issue confirmation flow.
// Set this to a deployed backend URL when direct issue creation is configured.
window.HOME_SEARCH_SUBMIT_ENDPOINT = "";

// Optional Supabase auth/database backend for the Home-Finding Buddy MVP.
// These values are safe browser-side Supabase project values, not service-role secrets.
// Leave empty to keep the app local-first with browser storage only.
window.HOME_SEARCH_SUPABASE_URL = "https://lqqancjtxsurfqxremcs.supabase.co";
window.HOME_SEARCH_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxcWFuY2p0eHN1cmZxeHJlbWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxODIxMzAsImV4cCI6MjA5Nzc1ODEzMH0.GYHSuVK_soIF-HL3NX9LQVlgdGOngowZl9ObMfY9IvA";
window.HOME_SEARCH_AUTH_REDIRECT_URL = window.location.origin + window.location.pathname;

// Optional server-side AI evaluation endpoint.
// This should point to the Supabase Edge Function deployed from
// supabase/functions/evaluate-home. Keep OpenAI keys server-side only.
window.HOME_SEARCH_AI_EVALUATION_ENDPOINT = "";
