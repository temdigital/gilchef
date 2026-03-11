// conexão com supabase

const SUPABASE_URL = "https://lsaalnektrjhrcdylbll.supabase.co"
const SUPABASE_KEY = "sb_publishable_57YTUbwht34cT1C70Y4e5A_UBpnFnmy"

const supabaseClient = supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
)