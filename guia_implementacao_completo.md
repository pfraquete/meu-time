# Guia de Implementação - Meu Time

**Data:** 22 de novembro de 2025  
**Projeto:** Meu Time  
**Status:** Funcionalidades core implementadas, guia para funcionalidades restantes

---

## ✅ O QUE FOI IMPLEMENTADO

### 1. **Sistema de Busca e Filtros** ✅
- ✅ Hook `useMatchFilters` criado
- ✅ Componente `MatchFiltersPanel` completo
- ✅ Filtros: esporte, data, nível, preço, cidade, status
- ✅ Integração com React Query

**Arquivos criados:**
- `client/src/hooks/useMatchFilters.ts`
- `client/src/components/MatchFiltersPanel.tsx`

**Como usar:**
```typescript
import { useMatchFilters } from '@/hooks/useMatchFilters';
import MatchFiltersPanel from '@/components/MatchFiltersPanel';

function Matches() {
  const {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    matches,
    isLoading,
  } = useMatchFilters();

  return (
    <>
      <MatchFiltersPanel
        filters={filters}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />
      {/* Renderizar matches */}
    </>
  );
}
```

---

### 2. **Sistema de Confirmação de Presença** ✅
- ✅ Migration 005 aplicada no Supabase
- ✅ Campos de confirmação em `match_participants`
- ✅ Sistema de reputação (no_show_count, attendance_rate)
- ✅ Tabela de notificações
- ✅ Funções SQL para calcular taxa e registrar faltas
- ✅ Sistema de lista de espera com promoção automática

**Tabelas criadas:**
- `notifications`
- `notification_preferences`

**Campos adicionados:**
- `match_participants`: confirmed_presence, confirmation_date, attended, waitlist_position, waitlist_expires_at
- `profiles`: no_show_count, total_matches_attended, attendance_rate, suspended_until

**Funções SQL disponíveis:**
```sql
-- Calcular taxa de comparecimento
SELECT calculate_attendance_rate('user_uuid');

-- Registrar falta (aplica penalidades automaticamente)
SELECT register_no_show('participant_uuid');

-- Promover da lista de espera
SELECT promote_from_waitlist('match_uuid');
```

**Como implementar no frontend:**
```typescript
// Confirmar presença
async function confirmPresence(participantId: string) {
  const { error } = await supabase
    .from('match_participants')
    .update({
      confirmed_presence: true,
      confirmation_date: new Date().toISOString(),
    })
    .eq('id', participantId);
}

// Verificar se precisa confirmar (48h antes)
function needsConfirmation(matchDate: Date) {
  const hoursUntilMatch = differenceInHours(matchDate, new Date());
  return hoursUntilMatch <= 48 && hoursUntilMatch > 0;
}
```

---

### 3. **Sistema de Recorrência** ✅
- ✅ Migration 006 aplicada no Supabase
- ✅ Tabela `match_series` criada
- ✅ Função para gerar partidas recorrentes
- ✅ Função para cancelar série completa
- ✅ Função para editar série (aplica a futuras)
- ✅ View `series_upcoming_matches`

**Campos adicionados em matches:**
- `series_id`: UUID da série
- `series_instance_number`: Número da instância (1, 2, 3...)
- `is_series_template`: Se é template da série

**Funções SQL disponíveis:**
```sql
-- Gerar partidas recorrentes (retorna quantidade criada)
SELECT generate_recurring_matches('series_uuid');

-- Cancelar série completa (retorna quantidade cancelada)
SELECT cancel_match_series('series_uuid');

-- Editar série (atualiza partidas futuras)
SELECT update_series_matches(
  'series_uuid',
  new_venue_id := 'venue_uuid',
  new_price := 50.00,
  new_duration := 90
);
```

**Como implementar no frontend:**
```typescript
// Criar série
async function createMatchSeries(seriesData: {
  title: string;
  recurrence: 'weekly' | 'biweekly' | 'monthly';
  start_date: string;
  end_date?: string;
  max_occurrences?: number;
  // ... outras configurações
}) {
  // 1. Criar série
  const { data: series, error } = await supabase
    .from('match_series')
    .insert(seriesData)
    .select()
    .single();
  
  if (error) throw error;
  
  // 2. Gerar partidas
  const { data: result } = await supabase
    .rpc('generate_recurring_matches', { series_uuid: series.id });
  
  return { series, matchesCreated: result };
}

// Listar séries ativas
async function getActiveSeries() {
  const { data } = await supabase
    .from('series_upcoming_matches')
    .select('*')
    .order('next_match_date');
  
  return data;
}
```

---

### 4. **Sistema de Gamificação** ✅
- ✅ Migration 007 aplicada no Supabase
- ✅ Sistema de XP e níveis
- ✅ Ligas (Bronze, Silver, Gold, Diamond, Master)
- ✅ 8 badges padrão criados
- ✅ Sistema de desafios
- ✅ Triggers automáticos para XP
- ✅ Ranking global
- ✅ Histórico de transações de XP

**Tabelas criadas:**
- `user_xp`: XP, nível e liga do usuário
- `badges`: Badges disponíveis
- `user_badges`: Badges conquistadas
- `challenges`: Desafios disponíveis
- `user_challenges`: Progresso em desafios
- `xp_transactions`: Histórico de XP

**Badges padrão:**
- 🎯 Iniciante (1 partida) - 50 XP
- ⚽ Jogador Regular (10 partidas) - 200 XP
- 🏆 Veterano (50 partidas) - 500 XP
- 👑 Lenda (100 partidas) - 1000 XP
- 📋 Organizador (10 partidas criadas) - 300 XP
- ⭐ Fair Play (média > 4.5) - 250 XP
- 📅 Pontual (comparecimento > 90%) - 200 XP
- 💬 Social (20 avaliações dadas) - 150 XP

**Funções SQL disponíveis:**
```sql
-- Adicionar XP (retorna JSON com level_up, league_up)
SELECT add_xp(
  'user_uuid',
  100,
  'Participação em partida',
  'match',
  'match_uuid'
);

-- Conceder badge
SELECT award_badge('user_uuid', 'badge_uuid');

-- Verificar e conceder badges automáticos
SELECT check_and_award_badges('user_uuid');
```

**Triggers automáticos:**
- ✅ +50 XP ao criar partida
- ✅ +100 XP ao confirmar participação em partida

**Como implementar no frontend:**
```typescript
// Buscar XP do usuário
async function getUserXP(userId: string) {
  const { data } = await supabase
    .from('user_xp')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  return data;
}

// Buscar badges do usuário
async function getUserBadges(userId: string) {
  const { data } = await supabase
    .from('user_badges')
    .select(`
      *,
      badge:badges(*)
    `)
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });
  
  return data;
}

// Buscar ranking global
async function getGlobalRanking(limit = 100) {
  const { data } = await supabase
    .from('global_ranking')
    .select('*')
    .limit(limit);
  
  return data;
}

// Buscar histórico de XP
async function getXPHistory(userId: string) {
  const { data } = await supabase
    .from('xp_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  return data;
}
```

**Componentes a criar:**
```typescript
// client/src/components/UserXPCard.tsx
// Exibe XP, nível e liga do usuário

// client/src/components/BadgesList.tsx
// Lista badges conquistadas

// client/src/components/RankingTable.tsx
// Tabela de ranking global

// client/src/pages/Profile.tsx (atualizar)
// Adicionar seção de XP, badges e estatísticas
```

---

## 🚧 FUNCIONALIDADES PENDENTES

### 1. **Integração Google Maps** 🗺️

**Complexidade:** Alta  
**Tempo estimado:** 5-6 dias

**Passos:**

1. **Obter API Key do Google Maps**
```bash
# Acessar: https://console.cloud.google.com/
# Ativar APIs:
# - Maps JavaScript API
# - Places API
# - Geocoding API
# - Directions API
```

2. **Configurar variáveis de ambiente**
```bash
# .env
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

3. **Instalar dependências**
```bash
cd client
pnpm add @googlemaps/js-api-loader
```

4. **Criar componente MapPicker**
```typescript
// client/src/components/MapPicker.tsx
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

export default function MapPicker({ onLocationSelect }) {
  const [center, setCenter] = useState({ lat: -23.5505, lng: -46.6333 });
  
  return (
    <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        center={center}
        zoom={13}
        onClick={(e) => onLocationSelect(e.latLng)}
      >
        <Marker position={center} />
      </GoogleMap>
    </LoadScript>
  );
}
```

5. **Integrar no formulário de criação de partida**
```typescript
// client/src/pages/CreateMatch.tsx
import MapPicker from '@/components/MapPicker';

function CreateMatch() {
  const [location, setLocation] = useState(null);
  
  return (
    <form>
      {/* ... outros campos ... */}
      <MapPicker onLocationSelect={setLocation} />
    </form>
  );
}
```

6. **Adicionar cálculo de distância**
```typescript
// client/src/lib/maps.ts
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Fórmula de Haversine
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
```

---

### 2. **Sistema Financeiro** 💰

**Complexidade:** Muito Alta  
**Tempo estimado:** 2-3 semanas

**Passos:**

1. **Criar conta no Pagar.me**
```
https://pagar.me/
Taxa: 4,99% + R$ 0,49 por transação
```

2. **Criar migration para pagamentos**
```sql
-- migrations/008_payment_system.sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id),
  user_id UUID REFERENCES profiles(id),
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_method TEXT CHECK (payment_method IN ('pix', 'credit_card')),
  transaction_id TEXT,
  pix_qr_code TEXT,
  pix_qr_code_url TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES payments(id),
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

3. **Instalar SDK do Pagar.me**
```bash
cd server
npm install pagarme
```

4. **Criar endpoint de pagamento**
```typescript
// server/routes/payments.ts
import pagarme from 'pagarme';

export async function createPixPayment(req, res) {
  const client = await pagarme.client.connect({
    api_key: process.env.PAGARME_API_KEY,
  });
  
  const transaction = await client.transactions.create({
    amount: req.body.amount,
    payment_method: 'pix',
    customer: {
      name: req.body.customer_name,
      email: req.body.customer_email,
      document_number: req.body.customer_document,
    },
  });
  
  // Salvar no banco
  const { data, error } = await supabase
    .from('payments')
    .insert({
      match_id: req.body.match_id,
      user_id: req.body.user_id,
      amount: req.body.amount,
      payment_method: 'pix',
      transaction_id: transaction.id,
      pix_qr_code: transaction.pix_qr_code,
      pix_qr_code_url: transaction.pix_qr_code_url,
      status: 'pending',
    });
  
  res.json({ transaction, payment: data });
}
```

5. **Criar componente de pagamento**
```typescript
// client/src/components/PaymentModal.tsx
export default function PaymentModal({ matchId, amount }) {
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [qrCode, setQrCode] = useState(null);
  
  async function handlePayment() {
    const response = await fetch('/api/payments/create', {
      method: 'POST',
      body: JSON.stringify({
        match_id: matchId,
        amount,
        payment_method: paymentMethod,
      }),
    });
    
    const data = await response.json();
    setQrCode(data.transaction.pix_qr_code_url);
  }
  
  return (
    <Dialog>
      {/* UI de pagamento */}
      {qrCode && <img src={qrCode} alt="QR Code Pix" />}
    </Dialog>
  );
}
```

---

### 3. **Sistema de Avaliações** ⭐

**Complexidade:** Média  
**Tempo estimado:** 3-4 dias

**Nota:** A tabela `ratings` já existe! Só precisa implementar o frontend.

**Passos:**

1. **Criar componente de avaliação**
```typescript
// client/src/components/RatingModal.tsx
import { Star } from 'lucide-react';

export default function RatingModal({ matchId, ratedUserId }) {
  const [rating, setRating] = useState(0);
  const [categories, setCategories] = useState({
    skill: 0,
    punctuality: 0,
    fair_play: 0,
  });
  const [comment, setComment] = useState('');
  
  async function submitRating() {
    const { error } = await supabase
      .from('ratings')
      .insert({
        match_id: matchId,
        rated_user_id: ratedUserId,
        rater_user_id: user.id,
        rating,
        categories,
        comment,
      });
    
    if (!error) {
      toast.success('Avaliação enviada!');
    }
  }
  
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Avaliar jogador</DialogTitle>
        </DialogHeader>
        
        {/* Estrelas */}
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={star <= rating ? 'fill-yellow-400' : ''}
              onClick={() => setRating(star)}
            />
          ))}
        </div>
        
        {/* Categorias */}
        <div className="space-y-2">
          <Label>Habilidade</Label>
          <Slider
            value={[categories.skill]}
            onValueChange={([value]) =>
              setCategories({ ...categories, skill: value })
            }
            max={5}
          />
        </div>
        
        {/* Comentário */}
        <Textarea
          placeholder="Comentário (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        
        <Button onClick={submitRating}>Enviar avaliação</Button>
      </DialogContent>
    </Dialog>
  );
}
```

2. **Criar página de avaliações recebidas**
```typescript
// client/src/pages/PlayerRatings.tsx
export default function PlayerRatings({ userId }) {
  const { data: ratings } = useQuery({
    queryKey: ['ratings', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ratings')
        .select(`
          *,
          rater:profiles!ratings_rater_user_id_fkey(name, avatar_url),
          match:matches(title, match_date)
        `)
        .eq('rated_user_id', userId)
        .order('created_at', { ascending: false });
      
      return data;
    },
  });
  
  const averageRating = ratings?.reduce((sum, r) => sum + r.rating, 0) / ratings?.length;
  
  return (
    <div>
      <h2>Avaliações recebidas</h2>
      <div className="text-4xl">
        {averageRating?.toFixed(1)} ⭐
      </div>
      
      {ratings?.map((rating) => (
        <Card key={rating.id}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src={rating.rater.avatar_url} />
              </Avatar>
              <div>
                <p className="font-medium">{rating.rater.name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(rating.created_at), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={i < rating.rating ? 'fill-yellow-400' : ''}
                  size={16}
                />
              ))}
            </div>
            {rating.comment && <p>{rating.comment}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

3. **Adicionar botão de avaliar após partida**
```typescript
// Adicionar em MatchDetails.tsx
{matchData.status === 'completed' && isParticipant && (
  <Button onClick={() => setShowRatingModal(true)}>
    Avaliar jogadores
  </Button>
)}
```

---

### 4. **Aplicativo Mobile** 📱

**Complexidade:** Muito Alta  
**Tempo estimado:** 2-3 meses

**Stack recomendada:**
- React Native + Expo
- React Navigation
- Supabase JS Client
- React Native Maps
- React Native Push Notifications

**Passos:**

1. **Inicializar projeto**
```bash
npx create-expo-app meu-time-mobile
cd meu-time-mobile
```

2. **Instalar dependências**
```bash
npx expo install @supabase/supabase-js
npx expo install react-native-maps
npx expo install expo-notifications
npx expo install @react-navigation/native
```

3. **Configurar Supabase**
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);
```

4. **Criar navegação**
```typescript
// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Matches" component={MatchesScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

5. **Publicar**
```bash
# iOS
eas build --platform ios
eas submit --platform ios

# Android
eas build --platform android
eas submit --platform android
```

---

## 📚 RECURSOS ADICIONAIS

### Documentação Útil

- **Supabase:** https://supabase.com/docs
- **React Query:** https://tanstack.com/query/latest
- **Shadcn/ui:** https://ui.shadcn.com
- **Google Maps API:** https://developers.google.com/maps
- **Pagar.me:** https://docs.pagar.me
- **React Native:** https://reactnative.dev
- **Expo:** https://docs.expo.dev

### Padrões de Código

**Nomenclatura:**
- Componentes: PascalCase (ex: `MatchCard.tsx`)
- Hooks: camelCase com prefixo "use" (ex: `useMatchFilters.ts`)
- Funções SQL: snake_case (ex: `calculate_attendance_rate`)
- Tabelas: snake_case plural (ex: `match_participants`)

**Estrutura de pastas:**
```
client/src/
├── components/      # Componentes reutilizáveis
├── pages/          # Páginas/rotas
├── hooks/          # Hooks customizados
├── lib/            # Utilitários e configurações
├── contexts/       # Contextos React
└── types/          # TypeScript types

migrations/         # Migrations SQL
```

**Commits:**
```
feat: Adicionar nova funcionalidade
fix: Corrigir bug
refactor: Refatorar código
docs: Atualizar documentação
test: Adicionar testes
```

---

## 🎯 CHECKLIST DE IMPLEMENTAÇÃO

Para cada funcionalidade:

- [ ] Criar migration (se necessário)
- [ ] Aplicar migration no Supabase
- [ ] Criar hooks/queries
- [ ] Criar componentes UI
- [ ] Integrar com páginas existentes
- [ ] Adicionar validações
- [ ] Testar funcionalidade
- [ ] Commit e push
- [ ] Atualizar documentação

---

## 📊 RESUMO DO QUE FOI FEITO

### Migrations Aplicadas

✅ **002_setup_storage_avatars.sql**
- Bucket avatars configurado
- 4 políticas RLS

✅ **003_optimize_rls_policies.sql**
- 12 políticas otimizadas
- Performance melhorada

✅ **004_add_missing_indexes.sql**
- 2 índices adicionados
- Queries mais rápidas

✅ **005_presence_confirmation_system.sql**
- Sistema de confirmação de presença
- Sistema de reputação
- Tabela de notificações
- Lista de espera automática

✅ **006_recurrence_system.sql**
- Sistema de séries de partidas
- Geração automática de partidas recorrentes
- Funções de gerenciamento de séries

✅ **007_gamification_system.sql**
- Sistema de XP e níveis
- Badges e conquistas
- Desafios
- Ranking global
- Triggers automáticos

### Componentes Criados

✅ `client/src/hooks/useMatchFilters.ts`
✅ `client/src/components/MatchFiltersPanel.tsx`

### Código Limpo

✅ Código legacy removido
✅ Migrations documentadas
✅ Funções SQL comentadas
✅ Commits organizados

---

## 🚀 PRÓXIMOS PASSOS RECOMENDADOS

1. **Integrar filtros na página Matches** (1 dia)
   - Atualizar `client/src/pages/Matches.tsx`
   - Usar `useMatchFilters` e `MatchFiltersPanel`

2. **Criar páginas de gamificação** (2-3 dias)
   - Página de perfil com XP e badges
   - Página de ranking global
   - Componente de badges

3. **Implementar notificações** (2-3 dias)
   - Componente de notificações
   - Badge de notificações não lidas
   - Marcar como lida

4. **Criar formulário de série** (2-3 dias)
   - Componente RecurrenceSelector
   - Integrar com CreateMatch
   - Visualizar séries criadas

5. **Implementar Google Maps** (5-6 dias)
   - Seguir guia acima
   - Integrar com criação de partidas
   - Adicionar mapa em detalhes

---

## 💡 DICAS FINAIS

**Performance:**
- Use React Query para cache
- Implemente virtualização em listas longas
- Otimize imagens (WebP, lazy loading)

**UX:**
- Adicione loading skeletons
- Implemente error boundaries
- Use toasts para feedback

**Segurança:**
- Sempre use RLS no Supabase
- Valide dados no backend
- Sanitize inputs do usuário

**Testes:**
- Teste fluxos críticos
- Use Playwright para E2E
- Mantenha cobertura > 70%

---

**Documento criado em:** 22 de novembro de 2025  
**Versão:** 1.0  
**Status:** Funcionalidades core implementadas ✅
