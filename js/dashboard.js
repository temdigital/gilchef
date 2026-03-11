async function carregarStats(){

let { data: pedidos } =
await supabase.from("pedidos").select("*");

document.getElementById("pedidos").innerText =
pedidos.length;

}

carregarStats();