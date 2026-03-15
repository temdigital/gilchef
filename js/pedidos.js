document.addEventListener("DOMContentLoaded",()=>{

carregarPedidos()

})

async function carregarPedidos(){

const {data}=await db
.from("pedidos")
.select("*")

let html=""

data.forEach(p=>{

html+=`

<tr>

<td>${p.cliente}</td>
<td>${p.telefone}</td>
<td>${p.status}</td>

</tr>

`

})

document.getElementById("listaPedidos").innerHTML=html

}