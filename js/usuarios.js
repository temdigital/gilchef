document.addEventListener("DOMContentLoaded",()=>{

carregarUsuarios()

})

async function carregarUsuarios(){

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

</tr>

`

})

document.getElementById("listaUsuarios").innerHTML=html

}