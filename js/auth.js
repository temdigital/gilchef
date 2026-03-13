/*
========================================
AUTENTICAÇÃO DO SISTEMA
========================================
*/


async function login(email, senha){

try{

const { data, error } = await db.auth.signInWithPassword({

email:email,
password:senha

});

if(error){

alert("Email ou senha inválidos");
return;

}


const usuario = data.user;


/* BUSCAR PERFIL NA TABELA */

const { data:perfil } = await db
.from("usuarios")
.select("*")
.eq("email",usuario.email)
.single();


if(!perfil){

alert("Perfil não encontrado na tabela usuarios");
return;

}


/* SALVAR DADOS */

localStorage.setItem("usuario_nome",perfil.nome);
localStorage.setItem("usuario_role",perfil.role);


/* REDIRECIONAR */

window.location.href="dashboard.html";

}

catch(e){

console.error(e);
alert("Erro ao conectar com servidor");

}

}



/*
========================================
LOGOUT
========================================
*/

async function logout(){

await db.auth.signOut();

localStorage.clear();

window.location.href="index.html";

}