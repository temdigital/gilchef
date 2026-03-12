function toggleMenu(){

document.querySelector(".sidebar").classList.toggle("open")

}

document.addEventListener("click", function(e){

const sidebar = document.querySelector(".sidebar")
const btn = document.querySelector(".menu-btn")

if(!sidebar.contains(e.target) && !btn.contains(e.target)){

sidebar.classList.remove("open")

}

})

document.querySelectorAll(".sidebar a").forEach(link=>{

link.addEventListener("click",()=>{

document.querySelector(".sidebar").classList.remove("open")

})

})