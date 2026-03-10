/*
-----------------------------------------
DASHBOARD DATA
-----------------------------------------
Busca estatísticas do banco
*/

async function carregarDados(){

let { data: pedidos } =
await supabase.from("pedidos").select("*");

document.getElementById("totalPedidos")
.innerText = pedidos.length;

let { data: marmitas } =
await supabase.from("marmitas").select("*");

document.getElementById("totalMarmitas")
.innerText = marmitas.length;

}

carregarDados();