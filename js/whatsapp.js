const telefone = "5561999289239";

function agendarChef(){

let msg = encodeURIComponent(
"Olá! Gostaria de agendar o serviço de Personal Chef do Gil Buffet & Congelados."
);

window.open(`https://wa.me/${telefone}?text=${msg}`);

}

function encomendarMarmita(){

let msg = encodeURIComponent(
"Olá! Gostaria de encomendar marmitas saudáveis do Gil Buffet & Congelados."
);

window.open(`https://wa.me/${telefone}?text=${msg}`);

}