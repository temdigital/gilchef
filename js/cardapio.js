async function carregarCardapio(){

const { data } = await supabase
.from("marmitas")
.select("*");

const div = document.getElementById("cardapio");

data.forEach(item=>{

div.innerHTML += `

<div class="marmita">

<img src="${item.imagem}">

<h3>${item.nome}</h3>

<p>${item.descricao}</p>

<strong>R$ ${item.preco}</strong>

</div>

`;

});

}