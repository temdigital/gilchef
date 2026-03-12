function alerta(tipo, mensagem){

const div = document.createElement("div")

div.className = "alert "+tipo

div.innerText = mensagem

document.body.appendChild(div)

setTimeout(()=>{
div.classList.add("show")
},50)

setTimeout(()=>{
div.classList.remove("show")
setTimeout(()=>div.remove(),400)
},3000)

}