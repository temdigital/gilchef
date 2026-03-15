document.addEventListener("DOMContentLoaded",()=>{

carregarUsuario()
carregarCards()

})

async function carregarUsuario(){

const { data } = await db.auth.getUser()

if(!data.user){

window.location.href="login.html"
return

}

const email=data.user.email

const { data:usuario } = await db
.from("usuarios")
.select("*")
.eq("email",email)
.single()

document.getElementById("usuarioNome").innerText=usuario.nome

}

async function carregarCards(){

const {count:pedidos}=await db
.from("pedidos")
.select("*",{count:"exact",head:true})

document.getElementById("cardPedidos").innerText=pedidos

const {count:usuarios}=await db
.from("usuarios")
.select("*",{count:"exact",head:true})

document.getElementById("cardUsuarios").innerText=usuarios

}