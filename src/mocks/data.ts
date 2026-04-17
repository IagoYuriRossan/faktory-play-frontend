import { Company, Trail, User, Enrollment } from '../@types';

export const MOCK_TRAILS: Trail[] = [
  {
    id: 'faktory-one',
    title: 'Faktory One',
    description: 'Treinamento essencial para a versão ONE do ERP Faktory.',
    isPublic: true,
    modules: [
      {
        id: 'e1',
        title: 'Etapa 1 - Boas-vindas e Instruções Iniciais',
        lessons: [
          {
            id: 'l1-1',
            title: 'Bem-vindo ao Evolutto - Sua Jornada Começa Aqui',
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            content: `
              <h3>Bem-vindo ao Treinamento de Boas Vindas do Faktory!</h3>
              <p>Parabéns! Você está iniciando uma jornada essencial para otimizar a gestão e os processos da sua empresa. A implantação pode parecer um grande desafio, mas estamos aqui para tornar esse caminho claro, estruturado e eficiente.</p>
              
              <h4>Como será o processo?</h4>
              <p>A implantação será dividida em fases, garantindo que cada etapa seja absorvida e aplicada de forma prática. Nosso objetivo é proporcionar uma transição tranquila, permitindo que sua equipe se adapte gradativamente ao novo sistema.</p>
              
              <p><strong>Fase 1: A Base para o Sucesso</strong><br/>
              Nesta primeira etapa, focaremos nos fundamentos do ERP. Vamos configurar o sistema, cadastrar as principais informações e garantir que tudo esteja pronto para o uso inicial. Essa fase é essencial para que a estrutura da empresa esteja bem organizada antes de avançarmos para processos mais complexos.</p>
              
              <p><strong>Fase 2: Aprofundando o Conhecimento</strong><br/>
              Com a base já estabelecida, partiremos para recursos mais avançados. Aqui, vamos explorar funcionalidades mais estratégicas, personalizações e integrações para tornar o uso do ERP ainda mais eficiente e adaptado às necessidades do seu negócio.</p>
              
              <h4>O que esperar do treinamento?</h4>
              <ul>
                <li><strong>Conteúdo interativo:</strong> Vídeos, tutoriais e exercícios práticos para facilitar o aprendizado.</li>
                <li><strong>Suporte especializado:</strong> Nossa equipe estará disponível para esclarecer dúvidas e apoiar a adaptação ao sistema.</li>
                <li><strong>Evolução gradual:</strong> Cada fase será acompanhada de testes e validações para garantir que tudo esteja funcionando conforme o esperado.</li>
              </ul>
              
              <p>Agora que você já sabe como será essa jornada, vamos começar? 🚀</p>
            `,
            quiz: {
              id: 'q1-1',
              question: 'Qual o objetivo da Fase 1 da implantação?',
              options: [
                'Configurar os fundamentos e a base do sistema',
                'Trocar todos os computadores da empresa',
                'Apenas assistir vídeos sem praticar',
                'Ignorar os cadastros iniciais'
              ],
              correctIndex: 0
            }
          },
          {
            id: 'l1-2',
            title: 'Aprenda a utilizar o Evolutto',
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            content: '<p>Nesta aula você aprenderá a navegar pela plataforma de treinamento e como tirar o melhor proveito das ferramentas disponíveis.</p>',
          }
        ]
      },
      {
        id: 'e2',
        title: 'Etapa 2 - Usabilidade',
        lessons: [
          {
            id: 'l2-1',
            title: 'Navegação e Atalhos',
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            content: '<p>Conheça a interface do Faktory e aprenda os principais atalhos para ganhar produtividade.</p>',
          }
        ]
      },
      {
        id: 'e3',
        title: 'Etapa 3 - Administração do Sistema',
        lessons: [
          {
            id: 'l3-1',
            title: 'Configurações Globais',
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            content: '<p>Aprenda a configurar os parâmetros gerais do sistema.</p>',
          }
        ]
      },
      {
        id: 'e4',
        title: 'Etapa 4 - Cadastros',
        lessons: [
          {
            id: 'l4-1',
            title: 'Cadastro de Produtos e Clientes',
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            content: '<p>Como realizar os cadastros base para o funcionamento do ERP.</p>',
          }
        ]
      },
      {
        id: 'e5',
        title: 'Etapa 5 - Consultas e Relatórios',
        lessons: [
          {
            id: 'l5-1',
            title: 'Extraindo Dados',
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            content: '<p>Como utilizar as ferramentas de consulta e gerar relatórios gerenciais.</p>',
          }
        ]
      },
      {
        id: 'e6',
        title: 'Etapa 6 - Finalização da trilha',
        lessons: [
          {
            id: 'l6-1',
            title: 'Conclusão e Próximos Passos',
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            content: '<p>Parabéns por concluir a trilha Faktory One!</p>',
          }
        ]
      }
    ]
  },
  {
    id: 'smart',
    title: 'Faktory Smart',
    description: 'Treinamento avançado para a versão Smart do ERP.',
    modules: [
      {
        id: 'm2',
        title: 'Módulo de Vendas',
        lessons: [
          {
            id: 'l2',
            title: 'Emissão de NF-e',
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            content: '<h1>Emissão de Notas Fiscais</h1><p>Passo a passo para emitir uma NF-e no Faktory Smart.</p>',
            quiz: {
              id: 'q2',
              question: 'Qual a primeira etapa antes de faturar um pedido na versão Smart?',
              options: ['Conferir o estoque', 'Gerar o boleto', 'Fechar o sistema', 'Imprimir a nota'],
              correctIndex: 0
            }
          }
        ]
      }
    ]
  },
  {
    id: 'pro',
    title: 'Faktory PRO',
    description: 'Treinamento completo para a versão PRO do ERP.',
    modules: [
      {
        id: 'm3',
        title: 'BI e Relatórios Avançados',
        lessons: [
          {
            id: 'l3',
            title: 'Configurando Dashboards de Gestão',
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            content: '<h1>Gestão Avançada com Faktory PRO</h1><p>Aprenda a extrair o máximo de inteligência do seu ERP.</p>',
            quiz: {
              id: 'q3',
              question: 'Qual o principal benefício do módulo de BI no Faktory PRO?',
              options: ['Apenas ver o estoque', 'Tomada de decisão baseada em dados reais', 'Trocar a cor do sistema', 'Enviar e-mails'],
              correctIndex: 1
            }
          }
        ]
      }
    ]
  }
];

export const MOCK_COMPANIES: Company[] = [
  { id: 'beta-company', name: 'Faktory Beta Corp', cnpj: '00.000.000/0001-00', cep: '01001-000', address: 'Praca da Se', number: '100', complement: 'Andar 2', city: 'Sao Paulo', uf: 'SP', allowedTrails: ['faktory-one', 'smart', 'pro'] },
  { id: 'c1', name: 'Esquadrias Silva', cnpj: '12.345.678/0001-90', cep: '30140-110', address: 'Avenida Brasil', number: '450', complement: '', city: 'Belo Horizonte', uf: 'MG', allowedTrails: ['one', 'smart'] },
  { id: 'c2', name: 'Alumínio & Cia', cnpj: '98.765.432/0001-10', cep: '80010-180', address: 'Rua XV de Novembro', number: '980', complement: 'Sala 5', city: 'Curitiba', uf: 'PR', allowedTrails: ['one', 'smart', 'pro'] }
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin Faktory', email: 'admin@faktory.com', role: 'superadmin' },
  { id: 'u2', name: 'João Aluno', email: 'joao@silva.com', role: 'student', companyId: 'c1' }
];

export const MOCK_ENROLLMENTS: Enrollment[] = [
  { id: 'e1', userId: 'u2', trailId: 'one', progress: 45, completedLessons: [], status: 'in-progress', lastAccess: '2026-03-30T14:00:00Z' },
  { id: 'e2', userId: 'u2', trailId: 'smart', progress: 10, completedLessons: [], status: 'in-progress', lastAccess: '2026-03-31T10:00:00Z' }
];
