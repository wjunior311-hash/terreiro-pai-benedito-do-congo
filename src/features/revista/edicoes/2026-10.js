// Ẹ̀mí Ìlú · Outubro 2026 — conteúdo da edição.
// Blocos: p (parágrafo), forte, h (intertítulo), quote (frase de destaque), chips (toque para ler),
// veste, agenda (Agenda do app), pagar (cobranças do app), niver (aniversariantes do mês), livros, pergunta.
const IMG = import.meta.env.BASE_URL + "emi-ilu/2026-10/";
const P = (t) => ({ k: "p", texto: t }), F = (t) => ({ k: "forte", texto: t }), H = (t) => ({ k: "h", texto: t }), Q = (t) => ({ k: "quote", texto: t }), C = (t) => ({ k: "confirma", texto: t });

export const slug = "2026-10";
export const titulo = "Ẹ̀mí Ìlú · Outubro 2026";
export const mes = "OUTUBRO 2026";
export const capa = { img: IMG + "cachoeira.jpg", minutos: 14, chamadas: [
  { titulo: "A FORÇA DAS ÁGUAS", sub: "Cachoeira, matas e o que nos lava por dentro", cor: "#2aa3b8", grande: true },
  { titulo: "IBEJI E OS ERÊS", cor: "#f5c518" },
  { titulo: "BATIZADO: O CHÃO DA SUA EGBÉ", cor: "#e63a2e" },
  { titulo: "COMO SE VESTIR NO TERREIRO", cor: "#f4efe6" }
] };
// período que o calendário da revista mostra (inclui a Gira da Cachoeira em novembro)
export const agendaDe = "2026-10-01";
export const agendaAte = "2026-11-30";
export const mesAniversario = 10;

export const materias = [
  { n: '01', titulo: 'A FORÇA DAS ÁGUAS', sub: 'Cachoeira, matas e o que nos lava por dentro', cor: '#2aa3b8', corTxt: '#167384', corSoft: '#e3f3f5', secao: 'EM NOVEMBRO', foto: '#123b3a', img: IMG + 'cachoeira.jpg', pos: 'center 60%', fotoLabel: '[FOTO · CACHOEIRA NA MATA]',
    chips: [
      { nome: 'Cachoeira', texto: 'A água que desce da pedra não para. Ela lava, refresca, arrasta o que pesa e segue. Na cachoeira aprendemos que limpar não é apagar quem somos, é tirar o excesso para que a nossa força volte a correr.' },
      { nome: 'Mata', texto: 'A mata é casa dos espíritos das florestas e dos caboclos, morada das folhas e de quem conhece cada uma delas. Sem folha não há axé: é dela que vem o banho, o remédio e o assentamento.' },
      { nome: 'Pedra', texto: 'A pedra é a parte da cachoeira que fica, e é ali que está Xangô. Ela recebe a água há séculos e permanece. Lembra que firmeza e fluidez não são opostos: uma sustenta a outra.' },
      { nome: 'Rio', texto: 'O rio é caminho. Liga a nascente ao mar, a mata à cidade. É movimento com direção: a água não corre para qualquer lugar, ela segue seu leito. Nas suas margens vivem os Boiadeiros, ribeirinhos que conhecem o rio, a beira e a travessia.' }
    ],
    blocos: [
      P('Antes de existir terreiro, já existia a água correndo entre as pedras. Para os povos que trouxeram o culto aos Orixás de África e para os povos originários desta terra, rio, cachoeira e mata nunca foram paisagem: são lugares vivos, com dono, com fundamento e com respeito.'),
      P('A Gira da Cachoeira, em novembro, nos convida a voltar para esse lugar. Não para "relaxar na natureza", mas para lembrar que o nosso axé tem origem ali: na folha colhida com licença, na água que se pede antes de entrar, no silêncio de quem chega na mata sabendo que é visita.'),
      { k: 'chips', texto: 'Toque em cada elemento:' },
      Q('A ÁGUA NÃO BRIGA COM A PEDRA. ELA ENCONTRA O CAMINHO.'),
      H('QUEM MORA NA ÁGUA E NA MATA'),
      P('A cachoeira não é só água. É água, pedra, mata e margem, e cada parte tem quem more ali. Por isso, falar dessa gira é pensar no todo.'),
      P('Na água doce, saudamos Oxum, dona do ouro e do cuidado com aquilo que é precioso. Nas pedras por onde a água desce, está Xangô, com a sua firmeza e a sua justiça. Nas matas, Oxóssi, caçador que provê, e Ossaim, guardião das folhas e do segredo de cada uma delas. E Logunedé, que transita entre o rio e a mata.'),
      P('E não estamos sozinhos com os Orixás. Nas matas vivem os nossos caboclos, força ancestral indígena que chega para curar, orientar e firmar. Nas margens dos rios, os Boiadeiros: ribeirinhos, conhecedores das águas, da beira e da travessia, que sabem conduzir e reunir.'),
      H('COMO SE PREPARAR'),
      P('Chegue com o corpo e a cabeça limpos. Evite excessos nos dias anteriores, descanse e venha disposto a ouvir mais do que falar. Respeite o tempo da gira: na água e na mata, tudo tem seu momento.'),
      { k: 'pergunta', texto: 'O QUE VOCÊ PRECISA DEIXAR A ÁGUA LEVAR?' }
    ] },
  { n: '02', titulo: 'IBEJI E OS ERÊS', sub: 'A sabedoria que chega brincando', cor: '#f5c518', corTxt: '#9a6f00', corSoft: '#fff5d1', corChip: '#231c16', secao: 'APRENDIZADOS', foto: '#5a3d0c', img: IMG + 'eres.jpg', pos: 'center 25%', fotoLabel: '[FOTO · DOCES, BRINQUEDOS OU GÊMEOS]',
    chips: [
      { nome: 'Ibeji', texto: 'Orixá dos gêmeos na tradição iorubá. Representa a dualidade que se completa, a abundância e a proteção da infância. Para os iorubás, o nascimento de gêmeos é sinal de bênção e de responsabilidade.' },
      { nome: 'Taiwo e Kehinde', texto: 'Na tradição iorubá, o primeiro gêmeo a nascer é Taiwo, "o que provou o mundo", enviado para ver se a vida era boa. Kehinde, "o que chegou depois", é considerado o mais velho, porque mandou o irmão na frente.' },
      { nome: 'Erês', texto: 'Na nossa casa, os Erês são as crianças que chegam na gira. Trazem alegria, mas não são brincadeira: carregam pureza, verdade e uma sabedoria que desconcerta os adultos.' },
      { nome: 'Doce', texto: 'O doce é oferenda, partilha e afeto. Quando os Erês distribuem doces, lembram que o axé também se espalha pelo que é simples e dado de coração.' }
    ],
    blocos: [
      P('Ibeji é o Orixá dos gêmeos. Na tradição iorubá, gêmeos são sagrados: duas vidas que nascem juntas e se completam, sinal de prosperidade para a família e para a comunidade inteira.'),
      { k: 'chips', texto: 'Toque para conhecer:' },
      P('Muitas casas acabaram associando Ibeji a santos católicos com o passar do tempo. Aqui, olhamos para a raiz: Ibeji é Orixá, com história, fundamento e culto próprios, que vieram de África e atravessaram o mar com o nosso povo.'),
      Q('O ERÊ NÃO É A CRIANÇA QUE BRINCA. É A SABEDORIA QUE ESCOLHEU CHEGAR BRINCANDO.'),
      H('A LIGAÇÃO COM OS ERÊS'),
      P('Os Erês carregam a energia da infância: espontaneidade, verdade, leveza. Por trás da risada e do doce, existe cuidado. Um Erê fala o que ninguém tem coragem de dizer, aponta o que está escondido e muitas vezes cura sem que a gente perceba que foi curado.'),
      F('Respeitar um Erê é não tratá-lo como entretenimento. É ouvir.')
    ] },
  { n: '03', titulo: 'BATIZADO', sub: 'O chão da sua egbé', cor: '#e63a2e', corTxt: '#b8231a', corSoft: '#fde7e4', secao: 'FUNDAMENTO', foto: '#3b1410', img: IMG + 'batizado.jpg', pos: '58% 55%', fotoLabel: '[FOTO · ÁGUA, FOLHAS OU MÃOS NA CABEÇA]',
    blocos: [
      P('Quando se fala em batizado, muita gente pensa logo na igreja: a criança, a pia, o padrinho. No terreiro, a palavra é a mesma, mas o sentido é outro.'),
      P('No batizado católico, a pessoa é "limpa" de um pecado de origem e entra para a igreja. No nosso, ninguém nasce sujo. O batizado é o momento em que a sua cabeça, o seu Orí, é apresentada e firmada diante da casa, dos Orixás e dos ancestrais.'),
      Q('NÃO É ENTRAR PARA UMA RELIGIÃO. É SER RECONHECIDO POR UMA FAMÍLIA.'),
      H('EGBÉ: A COMUNIDADE QUE TE SUSTENTA'),
      P('Egbé é a comunidade de axé: quem caminha com você, quem cuida, quem aprende e quem ensina. A partir do batizado, existe um compromisso de mão dupla: a casa assume você, e você assume a casa.'),
      P('É por isso que o batizado não é uma formalidade nem um "evento". Ele marca pertencimento. Você passa a ter um lugar, uma responsabilidade e uma família espiritual que responde por você.'),
      H('PADRINHOS E MADRINHAS'),
      P('Os padrinhos são pessoas que assumem, diante da casa, o compromisso de acompanhar a sua caminhada. Não é título nem homenagem: é cuidado.'),
      H('COMO É NA NOSSA CASA'),
      P('Nenhum batizado aqui é igual ao outro. Antes de tudo, consultamos o Vô, Pai Benedito do Congo. É ele quem diz quais águas, quais folhas e quais elementos vão firmar aquela cabeça, sempre de acordo com a energia de quem está sendo batizado.'),
      Q('O BATIZADO NÃO É UM RITO PRONTO. ELE É FEITO SOB MEDIDA PARA A SUA CABEÇA.'),
      P('Os padrinhos e madrinhas são escolhidos pela própria pessoa ou, no caso das crianças pequenas, pelos pais. Escolha com o coração e com responsabilidade: é alguém que vai caminhar junto.')
    ] },
  { n: '04', titulo: 'COMO SE VESTIR NO TERREIRO', sub: 'Roupa também é fundamento', cor: '#231c16', corTxt: '#231c16', corSoft: '#ece6dc', secao: 'GUIA DA CASA', foto: '#2b2b2b', img: IMG + 'pes.jpg', pos: 'center 75%', fotoLabel: '[FOTO · ROUPAS DE RAÇÃO / PANOS]',
    blocos: [
      P('A roupa de gira não é uniforme nem figurino. É proteção, é igualdade e é respeito. Quando todos vestem o mesmo branco, ninguém é maior que ninguém diante do sagrado.'),
      { k: 'veste' },
      Q('A ROUPA BRANCA NÃO ESCONDE QUEM VOCÊ É. ELA TIRA DO CAMINHO O QUE NÃO PRECISA ESTAR ALI.'),
      H('E EM DIA DE FESTA?'),
      P('Nas festividades a orientação pode mudar. São bem-vindas roupas com tecido africano ou cores ligadas ao tema da festa, sempre com aviso antes. Na dúvida, siga o branco.'),
      P('Ficou com dúvida sobre algum item? Pergunte antes da gira. É sempre melhor perguntar do que chegar em dúvida.')
    ] },
  { n: '05', titulo: 'CALENDÁRIO', sub: 'O que vem por aí', cor: '#2f6b3a', corTxt: '#2f6b3a', corSoft: '#e6efe2', secao: 'AGENDA', foto: '#1d3a22', img: IMG + 'tambor.jpg', pos: 'center 55%', fotoLabel: '[FOTO · TERREIRO]',
    blocos: [
      P('Confirme sua presença aqui mesmo. A divisão de turnos e tarefas aparece na Agenda do app.'),
      { k: 'agenda' }
    ] },
  { n: '06', titulo: 'AVISOS', sub: 'Mensalidade, aniversariantes e leituras', cor: '#e63a2e', corTxt: '#b8231a', corSoft: '#fde7e4', secao: 'RECADOS', foto: '#000', img: IMG + 'vela.jpg', pos: 'center 30%', fotoLabel: '[FOTO · DETALHE DA CASA]',
    blocos: [
      { k: 'pagar' },
      P('Sabemos que imprevistos acontecem. Se houver dificuldade ou necessidade de ajustar a data, converse com a Gisele. O mais importante é manter a comunicação.'),
      H('DICA DE BANHO: ÂNIMO E DISPOSIÇÃO'),
      P('Para quando o corpo pesa e as coisas ficam para depois: um banho para combater a procrastinação e a indisposição física.'),
      { k: 'banho' },
      P('Depois de preparado e morno, tome o banho da cabeça para baixo, mentalizando ânimo, disposição e o corpo voltando a se mover.'),
      H('ANIVERSARIANTES DE OUTUBRO'),
      { k: 'niver' },
      H('DICAS DE LEITURA'),
      { k: 'livros' }
    ] },
  { n: '07', titulo: 'GENTE DO TERREIRO', sub: 'Pessoas, histórias e caminhos', cor: '#b38600', corTxt: '#8a6800', corSoft: '#fff5d1', secao: 'GENTE DO TERREIRO', foto: '#3a3020', img: IMG + 'aisha-3.jpg', pos: 'center 18%', fotoLabel: '[FOTO DA PESSOA]',
    blocos: [
      P('Nosso terreiro é feito de pessoas, histórias e caminhos que se cruzam. Este mês, duas pessoas da nossa egbé contam, com as próprias palavras, como chegaram até aqui.'),
      { k: 'perfil', nome: 'AISHA', sub: 'Filha de Xangô e Yemanjá', foto: IMG + 'aisha-rosto.jpg' },
      P('Meu nome é Aisha. Sou filha de Xangô e Yemanjá. Sou umbandista desde que nasci: nasci e cresci no axé e, inclusive, fui batizada em terreiro.'),
      P('Mas, na verdade? Eu não era tão participativa. No começo, meus pais eram de outra casa, e eu nem ligava para essas coisas. Com o tempo, começaram a surgir os trabalhos na nossa casa, que eram internos, e a comunidade, a egbé, foi crescendo aos poucos. Eu continuava nada participativa. Quer dizer, eu ia! Quando minha mãe chamava a mim e ao Yan no quarto para tomar um passe. Depois, eu voltava para o meu canto.'),
      P('Com o tempo, fui começando a participar das giras. Escutar e aprender sobre os Orixás e as entidades, sobre a religião em si, o sincretismo, a incorporação… E tudo me interessava. Eu queria saber cada vez mais: saber sobre mim, descobrir meus Orixás e até mesmo incorporar entidades. Mas, claro, hoje eu sei que cada um tem o seu tempo.'),
      P('Participar das giras me fez muito bem. Me aproximei da minha ancestralidade e do meu povo. Sempre senti muito a energia dos Orixás, mas principalmente a de Oyá. Eu chorava, tremia… A gente sabe como é, né? Por isso eu achava que fosse filha dela. E vocês acreditam que não? Quando descobri meus pais de verdade, me encontrei neles. Eu sinto eles comigo, sinto a energia e o axé deles.'),
      Q('CUIDANDO DO MEU POVO, ELES CUIDAM DE MIM.'),
      P('Cuidar da minha ancestralidade e do meu povo me faz muito bem. Mesmo com dificuldades, ainda estou aprendendo. Com o tempo, percebi a importância de cuidar do meu povo, e que, cuidando deles, eles cuidam de mim. Eles talvez sejam mais presentes na nossa vida do que imaginamos: cuidam da gente, mostram que nunca estamos sozinhos, nos protegem e mostram a saída das piores situações.'),
      P('Hoje sou muito grata por estar e participar dessa religião e, principalmente, dessa egbé, que eu já considero família. Não sei o que seria de mim sem os meus ancestrais e as nossas macumbinhas.'),
      { k: 'galeria', fotos: [IMG + 'aisha-1.jpg', IMG + 'aisha-2.jpg', IMG + 'aisha-3.jpg'] },
      C('Falta o segundo perfil (nome, Orixás, foto e texto).')
    ] }
];

export const vestimenta = [
  { ic: '✓', bg: '#2f6b3a', t: 'Roupa branca, limpa e passada', d: 'Tecido que não seja transparente. A roupa de gira é só para a gira: não venha com ela da rua.' },
  { ic: '✓', bg: '#2f6b3a', t: 'Homens: calça e camiseta', d: 'Brancas, confortáveis para se movimentar.' },
  { ic: '✓', bg: '#2f6b3a', t: 'Mulheres: saia comprida e camiseta', d: 'Com calça ou shorts por baixo da saia, para ficar à vontade durante toda a gira.' },
  { ic: '✓', bg: '#2f6b3a', t: 'Pés descalços', d: 'É o nosso contato direto com o chão sagrado. Só não vale para quem tem alguma questão maior que impeça.' },
  { ic: '○', bg: '#8a7f72', t: 'Pano de cabeça (opcional)', d: 'Protege o Orí. Em alguns rituais ele é obrigatório: quando for, a casa avisa antes.' },
  { ic: '○', bg: '#8a7f72', t: 'Fios de contas e guias (opcional)', d: 'Use os seus, se tiver. Não são obrigatórios para estar na gira.' },
  { ic: '✕', bg: '#b8231a', t: 'Decotes, roupas curtas ou justas', d: 'Durante a gira o corpo se movimenta e se entrega: a roupa precisa acompanhar sem expor.' },
  { ic: '✕', bg: '#b8231a', t: 'Estampas, acessórios e perfume forte', d: 'Nas giras do dia a dia. Brincos grandes, relógio, maquiagem pesada e cheiros fortes atrapalham a gira e as entidades.' }
];

export const banho = {
  ingredientes: ['Um punhado de folhas de levante', 'Um punhado de folhas de aroeira', 'Um maço de folhas de saião', 'Um punhado de boldo'],
  frescas: 'Macere as folhas e esquente a água sem deixar ferver.',
  secas: 'Se forem folhas secas de saquinho: macere, deixe ferver por 3 minutos e abafe por mais 10 minutos.'
};

export const livros = [
  { titulo: 'IFÁ LUCUMÍ: O RESGATE DA TRADIÇÃO', autor: 'Nei Lopes · Pallas', cor: '#1f4fb3', capa: 'https://pallaseditora.com.br/wp-content/uploads/2024/09/9788534705684.jpg', texto: 'Nei Lopes percorre o culto de Ifá como ele sobreviveu em Cuba, a tradição lucumí, e mostra o que ela revela sobre as nossas raízes iorubás deste lado do Atlântico.' },
  { titulo: 'FÉ NAS FOLHAS', autor: 'Sueide Kintê e Sueli Kintê · Companhia das Letras', cor: '#2f6b3a', capa: 'https://ciadasletras.vtexassets.com/arquivos/ids/185024/cdl-9786584954502.jpg', texto: 'Um livro sobre o saber das folhas: o cuidado, a cura e a fé que moram nas plantas. Leitura perfeita para o mês da gira das matas.' }
];
