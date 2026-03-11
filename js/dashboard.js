async function carregarDashboard(){

let { data: pedidos } =
await supabase.from("pedidos").select("*")

let { data: agenda } =
await supabase.from("agenda").select("*")

let { data: marmitas } =
await supabase.from("marmitas").select("*")

document.getElementById("totalPedidos").innerText = pedidos.length
document.getElementById("totalAgenda").innerText = agenda.length
document.getElementById("totalMarmitas").innerText = marmitas.length

const lista = document.getElementById("listaPedidos")

pedidos.forEach(p=>{

lista.innerHTML += `
<div>
<strong>${p.cliente}</strong>
- ${p.produto}
</div>
`

})

}

carregarDashboard()