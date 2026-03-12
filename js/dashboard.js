const alertBox=document.getElementById("alertBox")

function alerta(msg,tipo="success"){

const div=document.createElement("div")
div.className="alert "+tipo
div.innerText=msg

alertBox.appendChild(div)

setTimeout(()=>div.remove(),3000)

}

document.getElementById("menuToggle").onclick=()=>{
document.getElementById("sidebar").classList.toggle("active")
}

document.querySelectorAll("#sidebar li").forEach(btn=>{
btn.onclick=()=>{
document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"))
document.getElementById(btn.dataset.page).classList.add("active")
}
})

document.getElementById("logoutBtn").onclick=async()=>{
await window.supabaseClient.auth.signOut()
location="login.html"
}

async function carregarAgenda(){

const {data}=await window.supabaseClient.from("agenda").select("*")

const lista=document.getElementById("agendaLista")

lista.innerHTML=""

data.forEach(e=>{

const li=document.createElement("li")

li.innerHTML=`
${e.titulo} - ${e.data}
<button onclick="excluirAgenda(${e.id})">Excluir</button>
`

lista.appendChild(li)

})

document.getElementById("totalAgenda").innerText=data.length

}

document.getElementById("agendaForm").onsubmit=async e=>{
e.preventDefault()

const titulo=document.getElementById("agendaTitulo").value
const data=document.getElementById("agendaData").value

await window.supabaseClient.from("agenda").insert([{titulo,data}])

alerta("Evento salvo")

carregarAgenda()
}

async function excluirAgenda(id){

await window.supabaseClient.from("agenda").delete().eq("id",id)

alerta("Evento removido")

carregarAgenda()

}

async function carregarClientes(){

const {data}=await window.supabaseClient.from("clientes").select("*")

const lista=document.getElementById("clienteLista")

lista.innerHTML=""

data.forEach(c=>{

const li=document.createElement("li")

li.innerHTML=`
${c.nome} - ${c.telefone}
<button onclick="excluirCliente(${c.id})">Excluir</button>
`

lista.appendChild(li)

})

document.getElementById("totalClientes").innerText=data.length

}

document.getElementById("clienteForm").onsubmit=async e=>{
e.preventDefault()

const nome=document.getElementById("clienteNome").value
const telefone=document.getElementById("clienteTelefone").value

await window.supabaseClient.from("clientes").insert([{nome,telefone}])

alerta("Cliente cadastrado")

carregarClientes()
}

async function excluirCliente(id){

await window.supabaseClient.from("clientes").delete().eq("id",id)

alerta("Cliente removido")

carregarClientes()

}

async function carregarVideos(){

const {data}=await window.supabaseClient.from("videos").select("*")

const area=document.getElementById("videoLista")

area.innerHTML=""

data.forEach(v=>{

const iframe=document.createElement("iframe")

iframe.src=v.link.replace("watch?v=","embed/")

area.appendChild(iframe)

})

document.getElementById("totalVideos").innerText=data.length

}

document.getElementById("videoForm").onsubmit=async e=>{
e.preventDefault()

const link=document.getElementById("videoLink").value

await window.supabaseClient.from("videos").insert([{link}])

alerta("Vídeo adicionado")

carregarVideos()

}

carregarAgenda()
carregarClientes()
carregarVideos()