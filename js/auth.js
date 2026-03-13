/*
==================================================
AUTENTICAÇÃO GLOBAL
==================================================
*/

async function login(email, senha){

    try{

        const { data, error } = await db.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if(error){

            alertaErro("Email ou senha inválidos");
            return;

        }

        const usuarioEmail = data.user.email;

        const { data:perfil } = await db
        .from("usuarios")
        .select("*")
        .eq("email", usuarioEmail)
        .single();

        if(!perfil){

            alertaErro("Usuário não encontrado na tabela usuarios");
            return;

        }

        localStorage.setItem("usuario_nome", perfil.nome);
        localStorage.setItem("usuario_role", perfil.role);

        alertaSucesso("Login realizado");

        setTimeout(()=>{
            window.location.href="dashboard.html";
        },600);

    }
    catch(e){

        console.error(e);
        alertaErro("Erro ao conectar com servidor");

    }

}



async function verificarSessao(){

    const { data } = await db.auth.getSession();

    if(!data.session){

        window.location.href="login.html";

    }

}



async function logout(){

    await db.auth.signOut();

    localStorage.clear();

    window.location.href="index.html";

}



/*
==================================================
CONTROLE DE ACESSO POR ROLE
==================================================
*/

function aplicarControleAcesso(){

    const role = localStorage.getItem("usuario_role");

    if(!role) return;

    if(role === "cliente"){

        document.querySelectorAll(".admin-area").forEach(el=>{

            el.style.display="none";

        });

    }

}