document.addEventListener("DOMContentLoaded",()=>{

const sidebar=document.getElementById("sidebar")
const toggle=document.getElementById("menuToggle")

toggle.onclick=()=>{
sidebar.classList.toggle("active")
}

const pages=document.querySelectorAll(".page")

document.querySelectorAll("#sidebar li").forEach(btn=>{

btn.onclick=()=>{

pages.forEach(p=>p.classList.remove("active"))

document.getElementById(btn.dataset.page).classList.add("active")

}

})

verificarLogin()

carregarAgenda()
carregarClientes()
carregarVideos()

})

async function verificarLogin(){

const {data}=await window.supabaseClient.auth.getSession()

if(!data.session){

window.location="login.html"

}

}

document.getElementById("logoutBtn").onclick=async()=>{

await window.supabaseClient.auth.signOut()

window.location="login.html"

}

async function carregarAgenda(){

const {data}=await window.supabaseClient
.from("agenda")
.select("*")

const lista=document.getElementById("agendaLista")

lista.innerHTML=""

data.forEach(e=>{

const li=document.createElement("li")

li.innerHTML=`
${e.data} - ${e.titulo}
<button onclick="excluirAgenda(${e.id})">X</button>
`

lista.appendChild(li)

})

document.getElementById("totalAgenda").innerText=data.length+" eventos"

}

document.getElementById("agendaForm").onsubmit=async(e)=>{

e.preventDefault()

const data=document.getElementById("agendaData").value
const titulo=document.getElementById("agendaTitulo").value

await window.supabaseClient
.from("agenda")
.insert([{data,titulo}])

carregarAgenda()

}

async function excluirAgenda(id){

await window.supabaseClient
.from("agenda")
.delete()
.eq("id",id)

carregarAgenda()

}

async function carregarClientes(){

const {data}=await window.supabaseClient
.from("clientes")
.select("*")

const lista=document.getElementById("clienteLista")

lista.innerHTML=""

data.forEach(c=>{

const li=document.createElement("li")

li.innerHTML=`
${c.nome} - ${c.telefone}
<button onclick="excluirCliente(${c.id})">X</button>
`

lista.appendChild(li)

})

document.getElementById("totalClientes").innerText=data.length+" clientes"

}

document.getElementById("clienteForm").onsubmit=async(e)=>{

e.preventDefault()

const nome=document.getElementById("clienteNome").value
const telefone=document.getElementById("clienteTelefone").value

await window.supabaseClient
.from("clientes")
.insert([{nome,telefone}])

carregarClientes()

}

async function excluirCliente(id){

await window.supabaseClient
.from("clientes")
.delete()
.eq("id",id)

carregarClientes()

}

async function carregarVideos(){

const {data}=await window.supabaseClient
.from("videos")
.select("*")

const area=document.getElementById("videoLista")

area.innerHTML=""

data.forEach(v=>{

const iframe=document.createElement("iframe")

iframe.src=v.link.replace("watch?v=","embed/")

area.appendChild(iframe)

})

document.getElementById("totalVideos").innerText=data.length+" vídeos"

}

document.getElementById("videoForm").onsubmit=async(e)=>{

e.preventDefault()

const link=document.getElementById("videoLink").value

await window.supabaseClient
.from("videos")
.insert([{link}])

carregarVideos()

}