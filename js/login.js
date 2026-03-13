/*
==================================================
CONTROLE DA TELA DE LOGIN
==================================================
*/

document.addEventListener("DOMContentLoaded", ()=>{

    const form = document.getElementById("formLogin");

    form.addEventListener("submit", function(e){

        e.preventDefault();

        const email = document.getElementById("email").value;
        const senha = document.getElementById("senha").value;

        login(email, senha);

    });

});