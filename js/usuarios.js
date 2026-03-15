document.addEventListener("DOMContentLoaded",()=>{

listarUsuarios()

})

document.getElementById("formUsuario")
.addEventListener("submit",async(e)=>{

e.preventDefault()

const nome=document.getElementById("nome").value
const email=document.getElementById("email").value
const role=document.getElementById("role").value

await db
.from("usuarios")
.insert({nome,email,role})

listarUsuarios()

})

async function listarUsuarios(){

const {data}=await db
.from("usuarios")
.select("*")

let html=""

data.forEach(u=>{

html+=`

<tr>

<td>${u.nome}</td>
<td>${u.email}</td>
<td>${u.role}</td>

<td>

<button onclick="editar('${u.id}')">Editar</button>

<button onclick="excluir('${u.id}')">Excluir</button>

</td>

</tr>

`

})

document.getElementById("listaUsuarios").innerHTML=html

}

async function excluir(id){

if(!confirm("Excluir usuário?")) return

await db
.from("usuarios")
.delete()
.eq("id",id)

listarUsuarios()

}