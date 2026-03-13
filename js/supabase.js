/*
========================================
CONEXÃO GLOBAL SUPABASE
========================================
*/

const SUPABASE_URL = "https://lsaalnektrjhrcdylbll.supabase.co";
const SUPABASE_KEY = "sb_publishable_57YTUbwht34cT1C70Y4e5A_UBpnFnmy";

if(!window.db){

const { createClient } = supabase;

window.db = createClient(
SUPABASE_URL,
SUPABASE_KEY
);

}