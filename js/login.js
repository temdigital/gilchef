/*
=====================================
LOGIN DO SISTEMA
Autenticação Supabase
=====================================
*/

document.addEventListener("DOMContentLoaded", () => {

const form = document.getElementById("loginForm")
const message = document.getElementById("loginMessage")

if(!form){
console.error("Formulário de login não encontrado")
return
}

form.addEventListener("submit", async (event) => {

event.preventDefault()

const email = document.getElementById("email").value.trim()
const password = document.getElementById("password").value.trim()

message.innerHTML = `
<div style="
background:#222;
color:#fff;
padding:10px;
border-radius:6px;
margin-top:10px;
">
Verificando acesso...
</div>
`

try{

const { data, error } = await window.supabaseClient.auth.signInWithPassword({

email: email,
password: password

})

if(error){

message.innerHTML = `
<div style="
background:#ffe6e6;
color:#c0392b;
padding:10px;
border-radius:6px;
margin-top:10px;
">
Email ou senha inválidos
</div>
`

console.error(error)

return
}

message.innerHTML = `
<div style="
background:#e8fff1;
color:#1e8449;
padding:10px;
border-radius:6px;
margin-top:10px;
">
Login realizado com sucesso
</div>
`

setTimeout(() => {

window.location.href = "dashboard.html"

}, 1200)

}catch(err){

console.error("Erro de conexão:", err)

message.innerHTML = `
<div style="
background:#fff3cd;
color:#856404;
padding:10px;
border-radius:6px;
margin-top:10px;
">
Erro ao conectar com servidor
</div>
`

}

})

})