# Meu Time

Sistema de gerenciamento de jogos esportivos entre amigos, desenvolvido com React, Supabase e TypeScript.

## 🚀 Funcionalidades

### Autenticação
- ✅ Login e registro de usuários com Supabase Auth
- ✅ Recuperação de senha
- ✅ Proteção de rotas

### Perfil do Jogador
- ✅ Edição de informações pessoais
- ✅ Visualização de estatísticas por esporte
- ✅ Histórico de partidas jogadas e organizadas

### Sistema de Partidas
- ✅ Criação de partidas com configurações detalhadas
- ✅ Listagem de partidas disponíveis
- ✅ Participação em partidas
- ✅ Filtros por esporte, nível, gênero e data

### Esportes Disponíveis
- ⚽ Futebol (campo, society, futsal)
- 🏐 Vôlei (quadra e praia)
- 🏀 Basquete (3x3 e 5x5)
- 🎾 Beach Tennis
- 🎾 Padel

## 🛠️ Tecnologias

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Wouter
- **Backend**: Supabase (Auth, Database, Storage)
- **UI Components**: shadcn/ui
- **Validação**: Zod
- **Formatação de Datas**: date-fns

## 📦 Estrutura do Banco de Dados

### Tabelas Principais

- **profiles**: Perfis dos usuários (estende auth.users)
- **sports**: Esportes disponíveis
- **venues**: Locais para partidas
- **matches**: Partidas criadas
- **match_participants**: Participantes das partidas
- **player_stats**: Estatísticas dos jogadores por esporte
- **ratings**: Avaliações entre jogadores

### Row Level Security (RLS)

Todas as tabelas possuem políticas RLS configuradas para garantir segurança dos dados:
- Usuários só podem editar seus próprios perfis
- Organizadores podem gerenciar suas partidas
- Participantes podem gerenciar sua própria participação

## 🚀 Como Executar

### Pré-requisitos

- Node.js 22+
- Conta no Supabase
- pnpm

### Configuração

1. Clone o repositório:
```bash
git clone https://github.com/pfraquete/meu-time.git
cd meu-time
```

2. Instale as dependências:
```bash
pnpm install
```

3. Configure as variáveis de ambiente:
```env
VITE_SUPABASE_URL=sua-url-do-supabase
VITE_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
```

4. Execute as migrations no Supabase:
```bash
# Use o arquivo migrations/001_initial_schema.sql
# no Supabase Dashboard → SQL Editor
```

5. Inicie o servidor de desenvolvimento:
```bash
pnpm dev
```

## 📝 Próximos Passos

### Funcionalidades Planejadas

- [ ] Sistema de recorrência de partidas (semanal, quinzenal, mensal)
- [ ] Lista de espera automática
- [ ] Sistema de confirmação de presença
- [ ] Upload de foto de perfil
- [ ] Integração com Google Maps para localização
- [ ] Chat da partida
- [ ] Sistema de pagamentos (Pagar.me)
- [ ] Sistema de avaliações e fair play
- [ ] Gamificação (badges, XP, ranking)
- [ ] Notificações push
- [ ] Aplicativo mobile

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## 📄 Licença

Este projeto está sob a licença MIT.

## 👥 Autor

Pedro Fraquete - [@pfraquete](https://github.com/pfraquete)

## 🔗 Links

- [Repositório GitHub](https://github.com/pfraquete/meu-time)
- [Supabase](https://supabase.com)
- [Documentação do Projeto](./todo.md)
