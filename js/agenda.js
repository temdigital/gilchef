async function reservar(){

const data = document.getElementById("data").value;

const cliente = document.getElementById("cliente").value;

await supabase.from("agendamentos").insert({

cliente:cliente,
data:data,
status:"pendente"

});

alert("Agendamento solicitado!");

}