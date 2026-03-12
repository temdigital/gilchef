const menuToggle = document.getElementById("menuToggle")
const navMenu = document.getElementById("navMenu")

menuToggle.addEventListener("click", function(e){

e.stopPropagation()
navMenu.classList.toggle("active")

})

/* fechar menu ao clicar no link */

document.querySelectorAll("#navMenu a").forEach(link=>{

link.addEventListener("click",()=>{

navMenu.classList.remove("active")

})

})

/* fechar menu clicando fora */

document.addEventListener("click",function(event){

if(!navMenu.contains(event.target) && !menuToggle.contains(event.target)){

navMenu.classList.remove("active")

}

})