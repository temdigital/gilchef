document.addEventListener("DOMContentLoaded",()=>{

const sidebar=document.querySelector(".sidebar")
const overlay=document.getElementById("overlay")
const hamburger=document.querySelector(".hamburger")

hamburger.addEventListener("click",()=>{

sidebar.classList.toggle("active")
overlay.classList.toggle("active")

})

overlay.addEventListener("click",()=>{

sidebar.classList.remove("active")
overlay.classList.remove("active")

})

document.querySelectorAll(".sidebar a")
.forEach(link=>{

link.addEventListener("click",()=>{

sidebar.classList.remove("active")
overlay.classList.remove("active")

})

})

})