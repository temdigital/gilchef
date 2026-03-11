const botao = document.getElementById("btnLogin")

botao.addEventListener("click", login)

async function login(){

const email = document.getElementById("email").value
const senha = document.getElementById("senha").value
const msg = document.getElementById("msg")

msg.innerText = "Entrando..."

const { data, error } = await supabaseClient.auth.signInWithPassword({

email: email,
password: senha

})

if(error){

msg.innerText = "Email ou senha inválidos"

return

}

msg.innerText = "Login realizado com sucesso!"

setTimeout(()=>{

window.location.href="dashboard.html"

},1000)

}