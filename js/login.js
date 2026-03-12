document.addEventListener("DOMContentLoaded", () => {

const form = document.getElementById("loginForm")
const message = document.getElementById("loginMessage")

form.addEventListener("submit", async (e) => {

e.preventDefault()

const email = document.getElementById("email").value
const password = document.getElementById("password").value

message.innerHTML = "Verificando acesso..."

try{

const { data, error } = await supabase.auth.signInWithPassword({

email: email,
password: password

})

if(error){

message.innerHTML = "<div class='alert error'>Email ou senha inválidos</div>"

return

}

message.innerHTML = "<div class='alert success'>Login realizado com sucesso</div>"

setTimeout(()=>{

window.location.href = "dashboard.html"

},1000)

}catch(err){

console.error(err)

message.innerHTML = "<div class='alert error'>Erro ao conectar com servidor</div>"

}

})

})