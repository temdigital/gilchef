document.addEventListener("DOMContentLoaded", iniciar)

async function iniciar(){

const { data } = await db.auth.getUser()

if(!data.user){

window.location="login.html"
return

}

const email=data.user.email

const { data:usuario } = await db
.from("usuarios")
.select("*")
.eq("email",email)
.single()

document.getElementById("usuarioInfo").innerText=
`Usuário: ${usuario.nome} | Perfil: ${usuario.role}`

/* CONTROLE MENU */

if(usuario.role!=="SuperAdmin" && usuario.role!=="Chef"){

const menuUsuarios=document.getElementById("menuUsuarios")

if(menuUsuarios) menuUsuarios.style.display="none"

}

if(usuario.role!=="SuperAdmin"){

const menuClientes=document.getElementById("menuClientes")

if(menuClientes) menuClientes.style.display="none"

}

}

function logout(){

db.auth.signOut()

window.location="login.html"

}