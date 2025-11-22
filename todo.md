# Meu Time - TODO List

## Infraestrutura e Configuração
- [x] Configurar integração com Supabase Auth
- [x] Configurar Supabase Database
- [x] Configurar Supabase Storage
- [ ] Remover dependências do sistema de auth Manus
- [x] Criar variáveis de ambiente para Supabase

## Schema do Banco de Dados
- [x] Criar tabela de usuários (profiles)
- [x] Criar tabela de esportes
- [x] Criar tabela de partidas
- [x] Criar tabela de participantes
- [x] Criar tabela de locais
- [x] Criar tabela de avaliações
- [x] Criar tabela de estatísticas
- [ ] Criar tabela de notificações
- [ ] Criar tabela de pagamentos
- [x] Configurar RLS (Row Level Security) policies

## Autenticação
- [x] Implementar login com Supabase Auth
- [x] Implementar registro de usuários
- [x] Implementar logout
- [x] Implementar recuperação de senha
- [x] Criar hook useAuth customizado para Supabase
- [x] Implementar proteção de rotas

## Perfil do Jogador
- [x] Criar página de perfil
- [x] Implementar edição de perfil
- [ ] Upload de foto de perfil (Supabase Storage)
- [x] Exibir estatísticas do jogador
- [ ] Sistema de badges/conquistas
- [ ] Histórico de partidas

## Sistema de Partidas
- [x] Criar página de listagem de partidas
- [x] Implementar criação de partidas
- [ ] Sistema de recorrência (única, semanal, quinzenal, mensal)
- [ ] Configurações avançadas (nível, idade, gênero)
- [ ] Lista de espera automática
- [ ] Sistema de confirmação de presença
- [ ] Edição de partidas
- [ ] Cancelamento de partidas

## Busca de Partidas
- [ ] Implementar filtros (esporte, distância, data, nível, preço)
- [ ] Integração com Google Maps
- [ ] Mapa interativo com partidas próximas
- [ ] Sistema de notificações para partidas de interesse

## Esportes
- [x] Configurar esportes disponíveis (Futebol, Vôlei, Basquete, Beach Tennis, Padel)
- [ ] Sistema de sorteio de times
- [ ] Placar e estatísticas por esporte
- [ ] Posições por esporte

## Sistema Financeiro
- [ ] Integração com Pagar.me
- [ ] Sistema de pagamento via Pix
- [ ] Sistema de pagamento via Cartão
- [ ] Políticas de cancelamento e reembolso
- [ ] Divisão de custos
- [ ] Sistema de vaquinha

## Módulo Social
- [ ] Chat da partida
- [ ] Enquetes rápidas
- [ ] Compartilhamento de localização
- [ ] Sistema de confraternização
- [ ] Lista colaborativa de itens
- [ ] Calculadora de rateio

## Funcionalidades Adicionais
- [ ] Sistema de substituições
- [ ] Banco de reservas
- [ ] Gamificação (XP, ligas, desafios)
- [ ] Sistema de avaliações e fair play
- [ ] Integração com locais/quadras
- [ ] Relatórios e estatísticas
- [ ] Sistema de ranking

## Interface do Usuário
- [x] Design system e paleta de cores
- [x] Landing page
- [x] Dashboard do usuário
- [x] Navegação responsiva
- [ ] Componentes reutilizáveis
- [ ] Estados de loading e erro
- [ ] Feedback visual (toasts, modals)

## Testes
- [ ] Testes unitários para procedures
- [ ] Testes de integração com Supabase
- [ ] Testes de autenticação
- [ ] Testes de CRUD de partidas
- [ ] Testes de upload de arquivos

## Deployment
- [ ] Configurar variáveis de ambiente de produção
- [ ] Documentação de setup
- [ ] README atualizado
- [ ] Criar checkpoint final

## Integração OpenAI
- [x] Instalar dependência openai
- [x] Configurar variável de ambiente OPENAI_API_KEY
- [x] Criar script de análise de código com GPT-4
- [ ] Executar análise completa do projeto
- [ ] Implementar correções sugeridas pela IA
