// Ẹ̀mí Ìlú · Agosto 2026 — conteúdo da edição (transcrito do PDF original).
const IMG = import.meta.env.BASE_URL + "emi-ilu/2026-08/";
const P = (t) => ({ k: "p", texto: t }), F = (t) => ({ k: "forte", texto: t }), H = (t) => ({ k: "h", texto: t }), Q = (t) => ({ k: "quote", texto: t }), L = (itens) => ({ k: "lista", itens });

export const slug = "2026-08";
export const titulo = "Ẹ̀mí Ìlú · Agosto 2026";
export const mes = "AGOSTO 2026";
export const capa = { img: IMG + "capa.jpg", minutos: 10, chamadas: [
  { titulo: "INICIAÇÃO", sub: "Qual o verdadeiro significado?", cor: "#e8711c", grande: true },
  { titulo: "ORIXÁS DE FOGO", cor: "#e63a2e" },
  { titulo: "ENERGIA FEMININA", cor: "#d94f8c" },
  { titulo: "GIRA DE DESENVOLVIMENTO", cor: "#f4efe6" }
] };
export const agendaDe = "2026-08-01";
export const agendaAte = "2026-08-31";
export const mesAniversario = 8;

export const materias = [
  { n: '01', titulo: 'INICIAÇÃO', sub: 'Qual o verdadeiro significado?', cor: '#e8711c', corTxt: '#b4530c', corSoft: '#fdebdc', secao: 'COMUNIDADE ANTENADA', foto: '#2a1d10', img: IMG + 'bufalo.jpg', pos: 'center 45%',
    blocos: [
      P('Quando falamos em iniciação, podemos pensar nela como uma espécie de morte.'),
      P('Não no sentido literal, mas como um processo de transformação. Para que algo novo possa nascer, algumas coisas precisam deixar de existir.'),
      P('Velhos hábitos, comportamentos e formas de enxergar a própria caminhada começam, aos poucos, a ser transformados. E isso exige disciplina, responsabilidade e, principalmente, boa conduta.'),
      P('A iniciação pode acontecer por uma orientação recebida através do jogo ou pela própria devoção. Ainda assim, existe consulta e orientação para compreender se aquele caminho é favorável e o que ele exige de cada pessoa:'),
      L(['Coragem?', 'Equilíbrio?', 'Organização?', 'Responsabilidade?']),
      P('Cada caminho pode pedir algo diferente.'),
      P('Para quem cultua Orixá, receber a assinatura de uma divindade em seu Orí é uma grande bênção. A partir daquele momento, existe também um pertencimento, uma ligação com o clã daquela divindade.'),
      Q('MAS INICIAÇÃO NÃO SIGNIFICA CHEGADA. É JUSTAMENTE O INÍCIO.'),
      P('O primeiro passo em um dos muitos degraus que ainda podemos subir. Porque não adianta passar por uma iniciação se não estivermos realmente dispostos a nos transformar.'),
      F('Para algo novo nascer, algo antigo precisa estar disposto a morrer.')
    ] },
  { n: '02', titulo: 'ORIXÁS DE FOGO', sub: 'Aquilo que transforma', cor: '#e63a2e', corTxt: '#b8231a', corSoft: '#fde7e4', secao: 'APRENDIZADOS', foto: '#1a0805', img: IMG + 'tocha.jpg', pos: 'center 30%',
    chips: [
      { nome: 'Ogum', texto: 'Em Ogum, encontramos o fogo que forja. Aquele que transforma o ferro, cria ferramentas e nos ensina sobre trabalho, persistência e a força necessária para abrir caminhos.' },
      { nome: 'Xangô', texto: 'Em Xangô, o fogo nos aproxima da justiça, do equilíbrio e da responsabilidade sobre nossas decisões.' },
      { nome: 'Oyá', texto: 'Em Oyá, ele é movimento, coragem e transformação: a força que não permite que tudo permaneça no mesmo lugar.' },
      { nome: 'Obaluayê', texto: 'Em Obaluayê, o fogo encontra a terra e nos fala sobre transformação, cura e os processos que modificam aquilo que somos.' },
      { nome: 'Exu', texto: 'Já em Exu, o fogo é movimento, impulso e potência transformadora. É a força que dinamiza, provoca caminhos e nos lembra que toda ação também produz consequências.' }
    ],
    blocos: [
      P('O fogo aquece, ilumina, movimenta e transforma. Mas essa força não se manifesta de uma única maneira.'),
      P('Entre os Orixás ligados ao fogo, podemos encontrar Xangô, Ogum, Oyá, Obaluayê e Exu, cada um expressando essa força de uma maneira diferente.'),
      { k: 'chips', texto: 'Toque em cada Orixá:' },
      P('São manifestações diferentes de um mesmo elemento.'),
      Q('AQUILO QUE PASSA PELO CALOR SE MODIFICA, E NEM TODA TRANSFORMAÇÃO ACONTECE SEM DESCONFORTO.'),
      P('Por isso, falar dos Orixás de fogo não é falar apenas sobre intensidade ou força, é falar sobre como usamos aquilo que arde dentro de nós.'),
      P('Temos coragem para transformar? Sabemos a hora de agir?'),
      { k: 'pergunta', texto: 'SABEMOS CONDUZIR NOSSA PRÓPRIA FORÇA?' }
    ] },
  { n: '03', titulo: 'ENERGIA FEMININA', sub: 'Reflexão do mês', cor: '#b0306a', corTxt: '#8a1f50', corSoft: '#f9e3ee', secao: 'REFLEXÃO DO MÊS', foto: '#2a0a17', img: IMG + 'rosas.jpg', pos: 'center 40%',
    blocos: [
      P('Quando falamos em Pombogira, ainda existem muitos estereótipos: sensualidade, sedução, relacionamentos, uma ideia de mulher que pode tudo e não leva desaforo para casa…'),
      F('Mas será que falar sobre força feminina é só isso? Claro que não!'),
      P('Reduzir Pombogira a essas imagens também nos impede de olhar para questões muito mais profundas: autonomia, conhecimento, dignidade, limites e, principalmente, respeito.'),
      P('O feminino não existe de uma única maneira. Existe força em falar. Existe força em silenciar, em acolher, em estabelecer limites e em reconhecer o próprio valor. E nenhuma dessas coisas precisa caber em uma caricatura.'),
      P('Talvez por isso falar sobre Pombogira também seja uma oportunidade de observar nossos próprios preconceitos.'),
      L(['Quantas ideias repetimos sem conhecer?', 'Quantas histórias aceitamos sem perguntar de onde vieram?']),
      P('Nossa festa é um momento de celebrar essas entidades, mas também pode ser um convite para conhecer antes de julgar. Porque combater preconceito também passa pelo conhecimento.'),
      Q('RESPEITAR NÃO É CRIAR UMA NOVA IMAGEM SOBRE O FEMININO. É ENTENDER QUE ELE NUNCA COUBE EM UMA SÓ.')
    ] },
  { n: '04', titulo: 'DICAS E RECADOS', sub: 'Banho energia de Pombogira + recados importantes', cor: '#c0392b', corTxt: '#a12a1e', corSoft: '#fbe5e2', secao: 'RECADOS', foto: '#2a120a', img: IMG + 'canela.jpg', pos: 'center 50%',
    blocos: [
      H('DICA DE BANHO: ENERGIA DE POMBOGIRA'),
      { k: 'banho' },
      P('Prepare a infusão, espere amornar e utilize da cabeça pra baixo. Enquanto derrama o banho, mentalize autoconfiança, firmeza e abertura de caminhos, pedindo sabedoria para reconhecer seu próprio valor e coragem para estabelecer seus limites.'),
      F('Intenção: força pessoal, autoestima, movimento e confiança.'),
      H('MENSALIDADE DE AGOSTO'),
      P('R$ 40,00 pelo Pix pixtpbc@gmail.com.'),
      P('Sabemos que imprevistos acontecem. Caso haja dificuldade ou necessidade de ajustar a data do pagamento, converse conosco. O mais importante é manter a comunicação.'),
      H('CALENDÁRIO'),
      { k: 'cal', meses: [
        { mes: 'AGOSTO', itens: [
          { d: '15/08', h: '15h', t: 'Gira de Pretos-Velhos e Erês' },
          { d: '22/08', h: '17h', t: 'Festival do Fogo' },
          { d: '23/08', h: '11h30', t: 'Curimba' },
          { d: '29/08', h: '16h', t: 'Festa de Pombogira' }
        ] }
      ] }
    ] },
  { n: '05', titulo: 'GIRA DE DESENVOLVIMENTO', sub: 'Não é teste. É conexão.', cor: '#1f4fb3', corTxt: '#1f4fb3', corSoft: '#e4ecfb', secao: 'BABÁ JEFFERSON E IALORIXÁ LUCIANA', foto: '#0f2350', img: IMG + 'gira.jpg', pos: 'center 40%',
    blocos: [
      P('Antes de falar sobre gira de desenvolvimento, tem uma coisa importante para entender sobre a nossa casa.'),
      P('Aqui não trabalhamos com uma hierarquia marcada por títulos. Mas, como em toda comunidade, existe uma hierarquia que acontece naturalmente através da vivência, da participação e da relação que cada pessoa constrói dentro do terreiro.'),
      P('É por isso que, na gira de desenvolvimento, algumas pessoas mais velhas de casa, ou que já possuem uma relação mais próxima com suas entidades, estarão em um lugar diferente. Elas estarão ali para amparar quem está começando. E isso muda bastante a dinâmica da gira.'),
      H('HOJE, QUEM ESTÁ COMEÇANDO É QUEM VAI TRABALHAR'),
      P('Nas giras abertas, normalmente quem já trabalha com suas entidades assume determinadas funções enquanto quem está começando observa, auxilia ou aproveita alguns momentos para experimentar a incorporação.'),
      F('Na gira de desenvolvimento, a lógica se inverte.'),
      P('Quem ainda está construindo essa relação terá espaço para vivê-la com mais liberdade. E quem já possui uma caminhada estará por perto para dar suporte.'),
      P('Não para conduzir a incorporação. Não para chamar entidade. E muito menos para testar alguém.'),
      Q('O PAPEL DOS MAIS VELHOS É AMPARO.'),
      H('NÃO SE TRAVE'),
      P('Quem já passou por uma gira de desenvolvimento provavelmente conhece aquela sensação: "Está todo mundo olhando para mim."'),
      L(['Vem a vergonha.', 'O medo de falar.', 'O medo de dançar.', 'O medo de fazer alguma coisa "errada".']),
      P('E, diante disso, geralmente aparecem dois caminhos: tentar acelerar para que alguma coisa aconteça logo ou simplesmente querer desistir da experiência. Mas essa é justamente uma das barreiras que precisamos quebrar.'),
      P('Você está entre os seus. É um espaço para experimentar, perceber e construir confiança na relação com a sua entidade.'),
      P('Se precisar fechar os olhos, feche. Se sua mão tremer, deixe tremer. Se naquele dia não acontecer aquilo que você esperava, tudo bem.'),
      F('Você não precisa provar que tem entidade.'),
      { k: 'galeria', fotos: [IMG + 'atabaque.jpg', IMG + 'pes.jpg'] },
      H('A HORA DE "ERRAR"'),
      P('Durante esse processo, alguém mais velho pode se aproximar, pode cumprimentar sua entidade, pode fazer uma pergunta, pode observar uma reação, mas grave isso: não é teste.'),
      P('Ninguém está esperando que você saiba imediatamente o nome da entidade, o que ela quer, como ela fala ou como deveria se comportar. O mais velho está ali para acompanhar e, nesse processo, pode acontecer de você se atravessar. Pode ser difícil entender onde termina sua vontade e começa a manifestação da entidade. Isso também faz parte.'),
      P('Depois, alguém pode chegar e dizer: "Observe isso." Não como acusação, não para dizer que você está mistificando, mas para que, nas próximas experiências, você também comece a perceber essa relação.'),
      F('É aprendizado.'),
      H('NÃO ENTRE NO AUTOMÁTICO'),
      P('Esse cuidado também vale para aquilo que a entidade pede. Uma bebida, um objeto ou qualquer outro elemento pode ter uma função específica naquele trabalho. Por isso, é importante entender antes de simplesmente repetir.'),
      P('Se uma entidade pediu determinada bebida em um dia, isso não significa necessariamente que aquilo fará parte de todos os seus trabalhos.'),
      P('O médium precisa compreender o processo que está vivendo para não transformar experiência em automatismo. E é justamente para isso que existe observação.'),
      F('Não avaliação. Observação!'),
      H('GIRA DE DESENVOLVIMENTO NÃO É GIRA PARA INCORPORAR'),
      P('Talvez essa seja a parte mais importante. Você pode passar por esse processo e descobrir que sua relação com a espiritualidade acontece de outra maneira. E tudo bem.'),
      P('A gira não existe para provar que você incorpora. Ela existe para que você possa perceber como se relaciona com cada linha, com suas entidades e com aquilo que acontece no seu próprio corpo e na sua consciência.'),
      P('Por isso também trabalhamos diferentes linhas. Talvez você tenha facilidade de se relacionar com uma e quase nenhuma percepção com outra. Mas como descobrir sem viver aquela experiência?'),
      L(['Aqui existe espaço para isso.', 'Para experimentar.', 'Para observar.', 'Para se permitir.', 'Para descobrir.']),
      Q('A GIRA DE DESENVOLVIMENTO NÃO É SOBRE PROVAR QUE EXISTE UMA ENTIDADE ALI. É SOBRE CONSTRUIR UMA RELAÇÃO COM ELA.')
    ] },
  { n: '06', titulo: 'GENTE DO TERREIRO', sub: 'Pessoas, histórias e caminhos', cor: '#b38600', corTxt: '#8a6800', corSoft: '#fff5d1', secao: 'GENTE DO TERREIRO', foto: '#3a3020', img: IMG + 'lucas-1.jpg', pos: 'center 25%',
    blocos: [
      P('Nosso terreiro é feito de pessoas, histórias e caminhos que se cruzam. Toque para ler.'),
      { k: 'perfis', perfis: [
        { nome: 'LUCAS', sub: 'Filho de Exu', foto: IMG + 'lucas-rosto.jpg', galeria: [IMG + 'lucas-1.jpg', IMG + 'lucas-2.jpg', IMG + 'lucas-3.jpg'], blocos: [
          P('Eu sou o Lucas, filho de Exu.'),
          P('A umbanda chegou em mim antes mesmo de eu entender, de fato, quem eu era. Quando entrei no terreiro e comecei a entender esse resgate à minha ancestralidade e a cuidar do meu povo, percebi o quanto me aproximei da minha verdade. Não que ela seja fácil também, mas o aprendizado que chegou junto, a desconstruir aquilo que achava que era bom, em como eu tento todos os dias aplicar tudo que eu aprendo, nas minhas escolhas e decisões.'),
          P('E principalmente minha consciência social e racial.'),
          P('Acho que pra além de tudo que a espiritualidade faz no nosso dia a dia, que é já muito, essa foi a grande mudança que senti dentro dessa comunidade, desse chão que eu escolho pisar.'),
          Q('E SOU MUITO FELIZ AQUI.')
        ] }
      ] }
    ] }
];

export const vestimenta = [];
export const banho = {
  ingredientes: ['Rosa vermelha', 'Hibisco', 'Canela em pau', 'Mel']
};
export const livros = [];
