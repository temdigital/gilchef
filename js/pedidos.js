document.addEventListener("DOMContentLoaded",()=>{

listarPedidos()

})

document.getElementById("formPedido")
.addEventListener("submit",async(e)=>{

e.preventDefault()

const cliente=document.getElementById("cliente").value
const telefone=document.getElementById("telefone").value
const servico=document.getElementById("servico").value
const status=document.getElementById("status").value

if(!cliente){

alert("Informe o cliente")
return

}

await db
.from("pedidos")
.insert({

cliente,
telefone,
servico,
status

})

alert("Pedido cadastrado com sucesso")

listarPedidos()

})

async function listarPedidos(){

const {data}=await db
.from("pedidos")
.select("*")

let html=""

data.forEach(p=>{

html+=`

<tr>

<td>${p.cliente}</td>

<td>${p.telefone}</td>

<td>${p.servico}</td>

<td>${p.status}</td>

<td>

<button class="btn btn-danger btn-sm"
onclick="excluir('${p.id}')">

Excluir

</button>

</td>

</tr>

`

})

document.getElementById("listaPedidos").innerHTML=html

}

async function excluir(id){

if(!confirm("Excluir pedido?")) return

await db
.from("pedidos")
.delete()
.eq("id",id)

alert("Pedido excluído")

listarPedidos()

}