async function login(){

const email = document.getElementById("email").value
const senha = document.getElementById("senha").value

const { data, error } = await supabase.auth.signInWithPassword({

email: email,
password: senha

})

if(error){

alert("Login inválido")

}else{

window.location.href="dashboard.html"

}

}