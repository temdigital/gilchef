/*
=====================================
SUPABASE CLIENT GLOBAL
Arquitetura segura para SaaS
=====================================
*/

const SUPABASE_URL = "https://lsaalnektrjhrcdylbll.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_57YTUbwht34cT1C70Y4e5A_UBpnFnmy"

if (!window.supabase) {
    console.error("Biblioteca Supabase não carregou.")
}

window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
)

console.log("Supabase conectado com sucesso")