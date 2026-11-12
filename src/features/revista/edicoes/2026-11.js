// Ẹ̀mí Ìlú · Novembro 2026 — conteúdo da edição (mês da Consciência Negra).
// Blocos: p (parágrafo), forte, h (intertítulo), quote (frase de destaque), chips (toque para ler),
// agenda (Agenda do app), pagar (cobranças do app), niver (aniversariantes do mês), banho, pergunta, perfis.
const IMG = import.meta.env.BASE_URL + "emi-ilu/2026-11/";
const P = (t) => ({ k: "p", texto: t }), F = (t) => ({ k: "forte", texto: t }), H = (t) => ({ k: "h", texto: t }), Q = (t) => ({ k: "quote", texto: t });

// enquanto as fotos não chegam: um quadro na cor da matéria dizendo qual foto entra ali
const foto = (arquivo, rotulo, cor) => FOTOS[arquivo] ? IMG + arquivo : "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200"><rect width="900" height="1200" fill="${cor}"/><text x="450" y="600" fill="rgba(255,255,255,.55)" font-family="sans-serif" font-size="38" font-weight="700" text-anchor="middle">${rotulo}</text></svg>`);
// arquivos já colocados em public/emi-ilu/2026-11/ (marque true quando a foto chegar)
const FOTOS = {};

export const slug = "2026-11";
export const titulo = "Ẹ̀mí Ìlú · Novembro 2026";
export const mes = "NOVEMBRO 2026";
export const capa = { img: foto("capa.jpg", "FOTO DA CAPA", "#3b2412"), minutos: 16, chamadas: [
  { titulo: "O TERREIRO COMO QUILOMBO", sub: "Consciência Negra: fé, liberdade e memória", cor: "#e3a948", grande: true },
  { titulo: "A RAIZ BANTO DA CASA", cor: "#c4573a" },
  { titulo: "CANJICA DE OXALÁ", cor: "#f4efe6" },
  { titulo: "BANHO DE PROTEÇÃO", cor: "#2f6b3a" }
] };
// período que o calendário da revista mostra
export const agendaDe = "2026-11-01";
export const agendaAte = "2026-12-31";
export const mesAniversario = 11;

export const materias = [
  { n: '01', titulo: 'O TERREIRO COMO QUILOMBO', sub: 'Consciência Negra: fé, liberdade e memória', cor: '#e3a948', corTxt: '#8a5d10', corSoft: '#fbf0dc', corChip: '#231c16', secao: 'CONSCIÊNCIA NEGRA', foto: '#3b2412', img: foto('quilombo.jpg', 'FOTO · QUILOMBO', '#3b2412'), pos: 'center 45%',
    chips: [
      { nome: 'Zumbi', texto: 'Zumbi dos Palmares foi o último grande líder do Quilombo dos Palmares, na Serra da Barriga, em Alagoas. Morreu em 20 de novembro de 1695, depois de anos de resistência. Por isso, 20 de novembro é o Dia da Consciência Negra.' },
      { nome: 'Dandara', texto: 'Dandara lutou em Palmares ao lado de Zumbi, com quem teve filhos. Pegava em armas, plantava e defendia a comunidade. A história oficial quase apagou o seu nome, e lembrar dela também é resistência.' },
      { nome: 'Palmares', texto: 'O maior quilombo das Américas durou quase um século, no século XVII. Chegou a reunir milhares de pessoas: africanos escravizados que fugiram, seus filhos e também indígenas e brancos pobres que encontraram ali uma vida possível.' },
      { nome: 'Quilombo', texto: 'Quilombo é uma palavra de origem banto, da língua quimbundo, de Angola. Quer dizer acampamento, lugar de reunião. No Brasil, virou o nome dos territórios de liberdade criados por quem fugia da escravidão. Muitos existem até hoje.' }
    ],
    blocos: [
      P('Novembro é o mês da Consciência Negra. O 20 de novembro lembra a morte de Zumbi dos Palmares, em 1695, e lembra também tudo o que ele defendeu: a liberdade de um povo que foi arrancado da sua terra e se recusou a ser apagado.'),
      { k: 'chips', texto: 'Toque para conhecer:' },
      H('O QUE ERA UM QUILOMBO'),
      P('O quilombo não era só um esconderijo. Era um lugar de vida. Ali se plantava, se criava os filhos, se celebrava, se cuidava dos doentes e se cultuava o sagrado do jeito que se aprendeu em África. Quem chegava era recebido. Quem estava cansado encontrava abrigo.'),
      Q('O QUILOMBO ERA ONDE O POVO NEGRO PODIA SER O QUE ERA.'),
      H('E O TERREIRO COM ISSO?'),
      P('A fé que praticamos foi proibida por séculos. Os Orixás, os Inquices, os Voduns e os ancestrais foram cultuados escondidos, em senzalas, em matas e em quintais. Terreiros foram invadidos pela polícia, objetos sagrados foram apreendidos e muita gente foi presa por cultuar o que é seu.'),
      P('Mesmo assim, essa fé chegou até nós. E chegou porque, como nos quilombos, sempre houve quem guardasse o conhecimento, quem acolhesse quem chegava e quem não deixasse o tambor calar.'),
      P('Por isso, uma casa de axé também é um quilombo: um lugar de memória, de cuidado com quem chega e de resistência. Cada gira que acontece é a prova de que tentaram apagar e não conseguiram.'),
      F('Estar no terreiro é continuar uma história que começou muito antes de nós.'),
      { k: 'pergunta', texto: 'O QUE VOCÊ FAZ PARA QUE ESSA HISTÓRIA CONTINUE?' }
    ] },
  { n: '02', titulo: 'A RAIZ BANTO DA CASA', sub: 'O Congo, Angola e a sabedoria do Vô', cor: '#c4573a', corTxt: '#9a3a22', corSoft: '#f8e1dc', secao: 'NOSSA RAIZ', foto: '#3b1a10', img: foto('banto.jpg', 'FOTO · RAIZ BANTO', '#3b1a10'), pos: 'center 40%',
    chips: [
      { nome: 'Banto', texto: 'Banto não é um povo só: é um grande tronco de povos e línguas da África Central e do Sul, como os bacongos, os ambundos e os ovimbundos. A palavra "bantu" quer dizer "as pessoas" em muitas dessas línguas.' },
      { nome: 'Congo', texto: 'O antigo Reino do Congo ficava onde hoje estão partes de Angola, da República do Congo e da República Democrática do Congo. Foi de lá, e de toda a região, que veio uma enorme parte das pessoas escravizadas trazidas ao Brasil.' },
      { nome: 'Angola', texto: 'Do porto de Luanda saíram navios para o Brasil por mais de três séculos. Os povos de Angola deixaram marcas fortes na nossa língua, na nossa música, na nossa comida e na nossa fé.' },
      { nome: 'Pretos-Velhos', texto: 'Os Pretos-Velhos são espíritos de pessoas escravizadas que viveram muito e aprenderam muito. Chegam devagar, falam manso, benzem, aconselham e lembram que paciência e humildade também são força.' }
    ],
    blocos: [
      P('Quando falamos em matriz africana, muita gente pensa logo nos iorubás e nos Orixás. Mas o primeiro grande povo africano a chegar em massa ao Brasil foi o povo banto, vindo da região do Congo e de Angola.'),
      { k: 'chips', texto: 'Toque para conhecer:' },
      H('O QUE O POVO BANTO NOS DEU'),
      P('A herança banto está em toda parte, mesmo quando a gente não percebe. Palavras como caçula, moleque, cafuné, quitanda, samba e macumba vêm de línguas banto. O jongo, a capoeira e o maracatu também carregam essa raiz.'),
      P('Na fé, os bantos trouxeram o culto aos Inquices e um respeito profundo pelos ancestrais, os mais velhos que continuam presentes e orientando quem fica.'),
      Q('PARA O POVO BANTO, QUEM MORRE NÃO VAI EMBORA. VIRA ANCESTRAL.'),
      H('O QUE O NOME DA CASA CARREGA'),
      P('A nossa casa leva o nome de Pai Benedito do Congo, o Vô. O "do Congo" no nome não é enfeite: aponta para essa raiz, para a terra de onde vieram tantos dos nossos mais velhos.'),
      P('É o Vô quem orienta os caminhos da casa, quem é consultado antes de cada batizado e de cada passo importante. Na sua fala mansa estão a memória de quem atravessou o mar e a sabedoria de quem sobreviveu ao que parecia impossível.'),
      H('OS PRETOS-VELHOS'),
      P('Os Pretos-Velhos são a memória viva dos mais velhos. Quando chegam na gira, com o seu cachimbo, o seu banquinho e a sua reza, trazem o conhecimento das folhas, das benzeções e da paciência.'),
      F('Ouvir um Preto-Velho é ouvir a voz de quem veio antes de nós.')
    ] },
  { n: '03', titulo: 'CANJICA DE OXALÁ', sub: 'Comida de santo: alimentar e trocar axé', cor: '#d9cdb4', corTxt: '#6b5d4d', corSoft: '#f4efe6', corChip: '#231c16', secao: 'COMIDA DE SANTO', foto: '#4a4237', img: foto('canjica.jpg', 'FOTO · CANJICA BRANCA', '#4a4237'), pos: 'center 50%',
    blocos: [
      P('Nas casas de axé, a comida não é só alimento. Quando se prepara uma comida para um Orixá, se oferece aquilo que é dele e se recebe de volta o seu axé. É troca, é cuidado e é comunhão.'),
      P('Cada Orixá tem as suas comidas, as suas cores e os seus temperos, e cada detalhe tem um porquê. Nada vai para o prato por acaso.'),
      Q('QUEM ALIMENTA O SAGRADO TAMBÉM É ALIMENTADO POR ELE.'),
      H('A CANJICA DE OXALÁ'),
      P('Oxalá é o Orixá da criação, o pai que veste branco e pede calma, paz e silêncio. A comida dele é a canjica: o milho branco cozido em água, branco como a sua roupa.'),
      P('A canjica de Oxalá não leva dendê nem tempero forte. Oxalá não come dendê, e o branco da canjica é justamente o que ela tem de mais importante: é a pureza, a paz e a cabeça fresca que pedimos a ele.'),
      H('O CUIDADO NO PREPARO'),
      P('Mais importante do que a receita é o jeito de preparar. A comida de santo pede calma, respeito e a cabeça limpa. Não se cozinha para o Orixá com pressa, com raiva ou falando alto.'),
      P('Por isso, quando você estiver na cozinha da casa, lembre-se: o que está sendo preparado ali não é almoço. É oferenda. Sempre siga a orientação dos Pais sobre o que pode e o que não pode.'),
      F('A canjica nos ensina que o simples, quando feito com respeito, é sagrado.')
    ] },
  { n: '04', titulo: 'OS QUE VIERAM ANTES', sub: 'Ancestralidade no dia a dia', cor: '#6b4a8a', corTxt: '#553a70', corSoft: '#ece4f3', secao: 'ANCESTRALIDADE', foto: '#2a1f36', img: foto('ancestrais.jpg', 'FOTO · ANCESTRAIS', '#2a1f36'), pos: 'center 40%',
    blocos: [
      P('Ninguém chega sozinho. Antes de nós vieram os nossos pais, avós e bisavós, e antes deles uma fila enorme de gente que a gente nem conhece pelo nome. Cada um deixou alguma coisa em nós: um jeito de rir, uma reza, uma receita, uma coragem.'),
      H('TRÊS JEITOS DE OLHAR'),
      P('Os ancestrais da família: quem veio antes no nosso sangue, mesmo os que não conhecemos.'),
      P('Os ancestrais da casa: quem abriu caminho para que este terreiro existisse, os mais velhos da nossa linhagem de axé e os guias que nos acompanham.'),
      P('Os mais velhos do terreiro: quem está aqui hoje e já caminhou mais do que nós. Cuidar deles também é cultuar a ancestralidade.'),
      Q('EU SOU PORQUE NÓS SOMOS.'),
      H('E FINADOS?'),
      P('Novembro começa com o Dia de Finados, quando muita gente vai ao cemitério com saudade e com luto. No terreiro, olhamos para isso de outro jeito: os nossos mortos não são só lembrança. São ancestrais, continuam presentes e continuam cuidando de nós.'),
      H('COMO HONRAR NO DIA A DIA'),
      P('Lembre o nome de quem veio antes e conte a história deles para os mais novos. Cuide dos mais velhos da sua família e da sua casa. Pergunte, ouça, aprenda. Quando a gente esquece de onde veio, perde um pedaço de quem é.'),
      { k: 'pergunta', texto: 'QUAL ANCESTRAL VOCÊ CARREGA COM VOCÊ HOJE?' }
    ] },
  { n: '05', titulo: 'BANHO DE PROTEÇÃO', sub: 'Folhas, sal e cuidado com o corpo', cor: '#2f6b3a', corTxt: '#2f6b3a', corSoft: '#e6efe2', secao: 'FOLHAS', foto: '#1d3a22', img: foto('banho.jpg', 'FOTO · FOLHAS', '#1d3a22'), pos: 'center 50%',
    blocos: [
      P('O banho de proteção serve para fechar o corpo contra o que pesa: a inveja, o olho grande, a energia ruim que a gente pega na rua, no trabalho e até dentro de casa. É um cuidado para quando você sente que está mais vulnerável ou vai enfrentar um momento difícil.'),
      P('Este é o banho que os Pais da casa indicaram:'),
      { k: 'banho' },
      H('COMO TOMAR'),
      P('Depois do seu banho de higiene, jogue o banho de proteção da cabeça para baixo, mentalizando proteção e o corpo fechado para o que não te pertence.'),
      F('Cuidado com os olhos: por causa da espada, não deixe o banho cair direto neles.'),
      H('POR QUE ESSAS FOLHAS?'),
      P('A espada de Ogum e a espada de Oyá cortam o que é negativo e abrem caminho. A guiné é uma das folhas mais conhecidas de proteção e limpeza. O sal limpa e descarrega. Juntas, fazem um banho de defesa.'),
      Q('SEM FOLHA NÃO HÁ AXÉ.')
    ] },
  { n: '06', titulo: 'O TURÍBULO', sub: 'Aprendendo com os filhos da casa', cor: '#8a6a3a', corTxt: '#6e5229', corSoft: '#f3ebdd', secao: 'APRENDENDO COM OS FILHOS DA CASA', foto: '#2b2218', img: foto('turibulo.jpg', 'FOTO · DEFUMAÇÃO', '#2b2218'), pos: 'center 45%',
    blocos: [
      P('Esta é uma seção nova, com curiosidades enviadas pelos próprios filhos da casa. A primeira veio do Leandro, que quis saber de onde vem o turíbulo que usamos na defumação.'),
      H('O QUE É'),
      P('O turíbulo, também chamado de incensório ou defumador, é o recipiente onde se queimam carvão, ervas, resinas e incensos. Tem três partes: o vaso, onde fica o carvão em brasa; a tampa com furos, por onde a fumaça sai; e as correntes, que deixam levar a fumaça com segurança.'),
      H('DE ONDE VEM'),
      P('O turíbulo não é um objeto de matriz africana nem indígena. Ele vem da Igreja Católica, onde o vaso de metal com correntes ganhou essa forma por volta do século X, para queimar resinas como o olíbano e a mirra nas missas.'),
      H('COMO CHEGOU AOS TERREIROS'),
      P('No Brasil, os povos escravizados foram proibidos de cultuar seus Orixás e seus ancestrais. Para manter a fé viva, aproximaram cada Orixá de um santo católico e passaram a usar datas, imagens e objetos da igreja como proteção. Esse encontro forçado entre crenças é o sincretismo religioso.'),
      P('O turíbulo entrou nos terreiros por esse caminho: era prático e seguro para levar a brasa de um lado para o outro.'),
      Q('O OBJETO VEIO DA IGREJA. O GESTO É NOSSO: NÓS DEFUMAMOS.'),
      H('O QUE É DEFUMAR'),
      P('Defumar é queimar folhas e deixar a fumaça passar pelo espaço e pelas pessoas, para limpar o que está pesado e abrir caminho para o axé. Os povos iorubás, bantos e jejes já conheciam o poder das folhas, as ewé, e as queimavam em fogueiras e vasilhas de barro para limpar as aldeias. Os povos indígenas também defumavam com ervas.'),
      P('Por isso o recipiente pode mudar: turíbulo, vasilha de barro ou lata de defumador. O que importa é a defumação: folha, fogo e axé. Na gira, ela prepara o terreiro e os médiuns para os trabalhos, com os seus próprios pontos cantados.'),
      H('EM CASA, COM SEGURANÇA'),
      P('Acenda uma pastilha de carvão e espere virar brasa. Coloque pouca erva por cima: guiné, arruda e alecrim são uma combinação tradicional de limpeza e proteção. Segure pela corrente e leve a fumaça pela casa, do fundo em direção à porta de entrada.'),
      F('Tem uma curiosidade sobre a nossa fé? Mande para a gestão: ela pode virar a próxima matéria desta seção.')
    ] },
  { n: '07', titulo: 'CALENDÁRIO', sub: 'O que vem por aí', cor: '#2f6b3a', corTxt: '#2f6b3a', corSoft: '#e6efe2', secao: 'AGENDA', foto: '#1d3a22', img: foto('calendario.jpg', 'FOTO · TERREIRO', '#1d3a22'), pos: 'center 55%',
    blocos: [
      P('Confirme sua presença aqui mesmo. A divisão de turnos e tarefas aparece na Agenda do app.'),
      { k: 'agenda' }
    ] },
  { n: '08', titulo: 'AVISOS', sub: 'Mensalidade e aniversariantes', cor: '#e63a2e', corTxt: '#b8231a', corSoft: '#fde7e4', secao: 'RECADOS', foto: '#000', img: foto('avisos.jpg', 'FOTO · DETALHE DA CASA', '#2b1512'), pos: 'center 30%',
    blocos: [
      { k: 'pagar' },
      P('Sabemos que imprevistos acontecem. Se houver dificuldade ou necessidade de ajustar a data, converse com a Gisele. O mais importante é manter a comunicação.'),
      H('ANIVERSARIANTES DE NOVEMBRO'),
      { k: 'niver' }
    ] },
  { n: '09', titulo: 'GENTE DO TERREIRO', sub: 'Duas gerações da mesma família', cor: '#b38600', corTxt: '#8a6800', corSoft: '#fff5d1', secao: 'GENTE DO TERREIRO', foto: '#3a3020', img: foto('familia.jpg', 'FOTO · ROSANGELA E ISABELLA', '#3a3020'), pos: 'center 22%',
    blocos: [
      P('Nosso terreiro é feito de pessoas, histórias e caminhos que se cruzam. Este mês, duas gerações da mesma família: a Rosangela e a neta dela, a Isabella. Toque em cada uma para ler.'),
      { k: 'perfis', perfis: [
        { nome: 'ROSANGELA', sub: 'Filha de Oxum e Ogum', foto: foto('rosangela-rosto.jpg', 'ROSANGELA', '#7a5a1a'), blocos: [
          P('Olá, tudo bem? Vou escrever meu texto.'),
          P('Meu nome é Rosangela Ramos Pereira, tenho 61 anos e completo 62 no mês de dezembro. Desde pequena, vivi muita coisa. Minha mãe era Testemunha de Jeová quando se casou com meu pai, que era católico. Mas o tempo foi passando, e minha mãe viu que meu pai pegava muita carga. Ele sempre levava as roupas para benzer e levava a gente para benzer também. Quando eu ia junto, via aquilo, mas ainda não entendia.'),
          P('Eu sempre gostei da Umbanda e de tudo o que é sobre guias espirituais. O tempo passou, casei, tive 3 filhos e também sempre os levei para fazer o benzimento. Depois que eles cresceram, continuaram me acompanhando.'),
          P('Fiquei 9 anos em um terreiro, onde fiz uma deitada como filha de Oxum e Xangô. Saí de lá e fiquei 2 anos parada, mas tive que voltar. Meu avô faleceu e deixou o dom do benzimento para mim. Ele foi da Umbanda por 60 anos, mas quem benzia era o pai dele, não ele. No dia em que estava no hospital, disse que o dom ficaria com uma de nós três, eu e minhas irmãs, e ficou para mim. Faço isso há 35 anos.'),
          P('Depois fui para outro terreiro e fiquei 23 anos lá, dando passe e ajudando em tudo. Eu adorava. Mas as minhas entidades, o meu povo, me tiraram de lá: eu tinha cumprido a minha missão. Aprendi muito, principalmente com os meus guias.'),
          P('Aí meu filho me chamou para ir no Pai Jefferson. Fui como assistência e, no primeiro dia, já comecei. Depois fiz o jogo de búzios e descobri que era de Oxum, como sempre fui, mas meu pai era Ogum. Fiz as minhas iniciações de Oxum e de Ogum e, depois, fizemos Iyámi.'),
          P('Passei por muita coisa em todos esses anos. Chorei, sofri, fiquei magoada e fui discriminada nos lugares por onde passei. Mas a minha fé sempre foi maior. Tenho orgulho de ter minha família nesta religião e aprendi de novo que tudo o que vivi foi aprendizado, amor, muita coragem e fé.'),
          Q('NÃO DESISTAM DA SUA FÉ, PORQUE É DELA QUE VEM A NOSSA CORAGEM.'),
          P('Hoje me orgulho do que sou e faço tudo de coração. Continuo a benzer e, independente da nossa casa, se eu puder ajudar, é o que vou fazer, porque uma casa não se faz sozinha, e nem eu. Tenho coragem. Às vezes balança, mas sigo e levanto a cabeça. Agradeço aos meus ancestrais pelo que sou.'),
          P('Só tenho uma coisa a dizer a todos: não desistam da sua fé, porque é dela que vem a nossa coragem. Axé! Amo vocês, minha família.')
        ] },
        { nome: 'ISABELLA', sub: 'Filha de Oyá e Xangô', foto: foto('isabella-rosto.jpg', 'ISABELLA', '#5a2e1e'), blocos: [
          P('Eu nasci e cresci com a Umbanda presente na minha vida. Minha família toda é da religião e, desde pequena, eu frequentava o terreiro com a minha vó. Porém, quando ela saiu de lá, minha mãe me levou para a igreja com ela. Foi uma experiência importante na minha caminhada, mas, por mais que eu tentasse, não conseguia me identificar. Sentia que aquele não era o meu lugar, como se algo dentro de mim ainda precisasse encontrar o caminho de volta.'),
          P('Até que, um dia, minha vó, Rosangela, linda de Oxum, me chamou e perguntou: "O Jefferson e a Luciana abriram um terreiro, quer ir conhecer?". E eu fui. Mal sabia que aquele convite seria o começo de uma nova etapa da minha vida.'),
          P('Foi quando pisei naquele terreiro que senti que estava onde deveria estar. Ali encontrei acolhimento, e foi ali que comecei a cuidar de mim, do meu Ori e dos meus ancestrais. Passei por momentos muito difíceis, e foi naquele lugar que encontrei forças para me reconstruir, me conhecer e compreender tantas coisas que antes pareciam não fazer sentido.'),
          P('Foi na Umbanda que descobri que sou filha de Oyá e Xangô, que encontrei respostas para muitos dos meus porquês e que comecei a entender melhor a minha própria caminhada. E olha que descobri muita coisa, viu? Kkkkkk. Cada aprendizado me mostrou que ainda há muito para conhecer, sentir e viver dentro dessa religião tão linda.'),
          P('Hoje entendo que minha chegada ao terreiro aconteceu num momento em que eu precisava me reencontrar. A Umbanda me ensinou que cuidar de mim também é honrar aqueles que vieram antes de mim, respeitar minha história e aprender a caminhar com mais consciência e fé.'),
          Q('O CORAÇÃO RECONHECE ANTES MESMO DE CONSEGUIR EXPLICAR.'),
          P('Sou grata à minha vó por aquele convite, ao Jefferson e à Luciana por abrirem as portas desse lugar e a todos que fazem parte dessa caminhada comigo. Às vezes, a gente passa por tantos caminhos tentando encontrar o nosso lugar, até que, quando finalmente chega, o coração reconhece antes mesmo de conseguir explicar.'),
          P('Hoje sou imensamente grata por fazer parte desta comunidade e por poder compartilhar minha caminhada com essa egbé que se tornou tão importante para mim. Sou grata por cada ensinamento, cada acolhimento e cada pessoa que faz parte dessa história. Mais do que um lugar onde cuido da minha espiritualidade, encontrei uma família com quem posso aprender, crescer e fortalecer minha fé. Que eu possa continuar caminhando ao lado de vocês, cuidando de mim, do meu Ori e honrando meus ancestrais. Meu coração é cheio de gratidão por fazer parte dessa história.')
        ] }
      ] }
    ] }
];

export const banho = {
  ingredientes: ['Espada de Ogum', 'Espada de Oyá', 'Guiné', 'Boldo-do-chile', 'Opo obo', '2 dedos de gin', 'Um punhado de sal']
};
