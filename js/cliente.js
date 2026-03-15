document.addEventListener("DOMContentLoaded",listarClientes)

document.getElementById("formCliente")
.addEventListener("submit",async(e)=>{

e.preventDefault()

const nome=document.getElementById("nome").value
const telefone=document.getElementById("telefone").value
const email=document.getElementById("email").value

if(!nome){

alert("Informe o nome")
return

}

await db
.from("clientes")
.insert({nome,telefone,email})

alert("Cliente cadastrado")

listarClientes()

})

async function listarClientes(){

const {data}=await db
.from("clientes")
.select("*")

let html=""

data.forEach(c=>{

html+=`

<tr>

<td>${c.nome}</td>

<td>${c.telefone}</td>

<td>${c.email}</td>

<td>

<button class="btn btn-danger btn-sm"
onclick="excluir('${c.id}')">

Excluir

</button>

</td>

</tr>

`

})

document.getElementById("listaClientes").innerHTML=html

}

async function excluir(id){

if(!confirm("Excluir cliente?")) return

await db
.from("clientes")
.delete()
.eq("id",id)

alert("Cliente removido")

listarClientes()

}