document.addEventListener("DOMContentLoaded", carregarDashboard)

async function carregarDashboard(){

/* TOTAL PEDIDOS */

const {count:pedidos}=await db
.from("pedidos")
.select("*",{count:"exact",head:true})

document.getElementById("cardPedidos").innerText=pedidos

/* PEDIDOS PREPARO */

const {count:preparo}=await db
.from("pedidos")
.select("*",{count:"exact",head:true})
.eq("status","preparando")

document.getElementById("cardPreparo").innerText=preparo

/* USUÁRIOS */

const {count:usuarios}=await db
.from("usuarios")
.select("*",{count:"exact",head:true})

document.getElementById("cardUsuarios").innerText=usuarios

/* AGENDA */

const {count:agenda}=await db
.from("agenda")
.select("*",{count:"exact",head:true})

document.getElementById("cardAgenda").innerText=agenda

}