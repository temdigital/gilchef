document.addEventListener("DOMContentLoaded",()=>{

menuMobile()

carregarUsuario()

})

function menuMobile(){

const sidebar=document.querySelector(".sidebar")
const overlay=document.getElementById("overlay")
const btn=document.querySelector(".hamburger")

btn.onclick=()=>{

sidebar.classList.toggle("active")
overlay.classList.toggle("active")

}

overlay.onclick=()=>{

sidebar.classList.remove("active")
overlay.classList.remove("active")

}

document.querySelectorAll(".sidebar a").forEach(link=>{

link.onclick=()=>{

sidebar.classList.remove("active")
overlay.classList.remove("active")

}

})

}

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

document.getElementById("usuarioInfo")
.innerText=`Usuário: ${usuario.nome} | Perfil: ${usuario.role}`

carregarCards()

}

async function carregarCards(){

if(document.getElementById("cardPedidos")){

const {count}=await db
.from("pedidos")
.select("*",{count:"exact",head:true})

document.getElementById("cardPedidos").innerText=count

}

if(document.getElementById("cardUsuarios")){

const {count}=await db
.from("usuarios")
.select("*",{count:"exact",head:true})

document.getElementById("cardUsuarios").innerText=count

}

}