async function agendar(){

const cliente =
document.getElementById("cliente").value

const telefone =
document.getElementById("telefone").value

const data =
document.getElementById("data").value

const evento =
document.getElementById("evento").value

await supabase.from("agenda").insert({

cliente:cliente,
telefone:telefone,
data:data,
evento:evento

})

alert("Agendamento solicitado!")

}