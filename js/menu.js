function toggleMenu(){

document.querySelector(".sidebar").classList.toggle("open")
document.querySelector(".overlay").classList.toggle("show")

}

function fecharMenu(){

document.querySelector(".sidebar").classList.remove("open")
document.querySelector(".overlay").classList.remove("show")

}