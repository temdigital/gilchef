const SUPABASE_URL = "https://lsaalnektrjhrcdylbll.supabase.co"
const SUPABASE_KEY = "sb_publishable_57YTUbwht34cT1C70Y4e5A_UBpnFnmy"

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

async function verificarUsuario(){

const {data:{session}} = await supabase.auth.getSession()

if(!session){

window.location.href="login.html"
return

}

const user = session.user.email

const {data}=await supabase
.from("usuarios")
.select("*")
.eq("email",user)
.single()

if(data.role !== "admin"){

document.querySelectorAll(".admin").forEach(el=>{

el.style.display="none"

})

}

}

async function logout(){

await supabase.auth.signOut()

window.location.href="login.html"

}

verificarUsuario()