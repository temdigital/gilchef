async function criarPedido(){

const cliente =
document.getElementById("cliente").value

const telefone =
document.getElementById("telefone").value

const produto =
document.getElementById("produto").value

await supabase.from("pedidos").insert({

cliente:cliente,
telefone:telefone,
produto:produto

})

alert("Pedido enviado!")

}