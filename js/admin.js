document.addEventListener("DOMContentLoaded",()=>{

carregarUsuario()

})

async function carregarUsuario(){

const { data } = await db.auth.getUser()

if(!data.user){

alert("Sessão expirada")
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

if(usuario.role!="SuperAdmin" && usuario.role!="Chef"){

const menuUsuarios=document.getElementById("menuUsuarios")

if(menuUsuarios) menuUsuarios.style.display="none"

}

carregarCards()

}

async function carregarCards(){

const {count:pedidos}=await db
.from("pedidos")
.select("*",{count:"exact",head:true})

const {count:usuarios}=await db
.from("usuarios")
.select("*",{count:"exact",head:true})

if(document.getElementById("cardPedidos"))
document.getElementById("cardPedidos").innerText=pedidos

if(document.getElementById("cardUsuarios"))
document.getElementById("cardUsuarios").innerText=usuarios

}