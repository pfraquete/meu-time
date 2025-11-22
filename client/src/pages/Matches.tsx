import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Clock, Repeat } from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MatchFiltersComponent, { MatchFilters as MatchFiltersType } from '@/components/MatchFilters';

interface Match {
  id: string;
  title: string;
  description: string;
  match_date: string;
  duration_minutes: number;
  min_players: number;
  max_players: number;
  current_players: number;
  price: number;
  skill_level: string;
  gender: string;
  status: string;
  recurrence: string;
  sport: { id: string; name: string; icon: string };
  venue: { name: string; city: string; state: string } | null;
  organizer: { name: string };
}

interface Sport {
  id: string;
  name: string;
  icon: string;
}

export default function Matches() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MatchFiltersType>({
    search: '',
    sportId: 'all',
    skillLevel: 'all',
    priceRange: 'all',
    dateRange: 'all',
  });

  useEffect(() => {
    fetchSports();
    fetchMatches();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [matches, filters]);

  const fetchSports = async () => {
    try {
      const { data, error } = await supabase
        .from('sports')
        .select('id, name, icon')
        .order('name');

      if (error) throw error;
      setSports(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar esportes:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          sport:sports(id, name, icon),
          venue:venues(name, city, state),
          organizer:profiles!organizer_id(name)
        `)
        .eq('status', 'open')
        .gte('match_date', new Date().toISOString())
        .order('match_date', { ascending: true });

      if (error) throw error;
      setMatches(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar partidas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...matches];

    // Filtro por esporte
    if (filters.sportId !== 'all') {
      filtered = filtered.filter(match => match.sport.id === filters.sportId);
    }

    // Filtro por nível de habilidade
    if (filters.skillLevel !== 'all') {
      filtered = filtered.filter(match => match.skill_level === filters.skillLevel);
    }

    // Filtro por preço
    if (filters.priceRange !== 'all') {
      filtered = filtered.filter(match => {
        const price = match.price;
        switch (filters.priceRange) {
          case 'free':
            return price === 0;
          case '0-50':
            return price > 0 && price <= 50;
          case '50-100':
            return price > 50 && price <= 100;
          case '100+':
            return price > 100;
          default:
            return true;
        }
      });
    }

    // Filtro por data
    if (filters.dateRange !== 'all') {
      const now = new Date();
      filtered = filtered.filter(match => {
        const matchDate = new Date(match.match_date);
        switch (filters.dateRange) {
          case 'today':
            return matchDate >= startOfDay(now) && matchDate <= endOfDay(now);
          case 'tomorrow':
            const tomorrow = addDays(now, 1);
            return matchDate >= startOfDay(tomorrow) && matchDate <= endOfDay(tomorrow);
          case 'this-week':
            return matchDate >= startOfWeek(now, { locale: ptBR }) &&
                   matchDate <= endOfWeek(now, { locale: ptBR });
          case 'next-week':
            const nextWeekStart = addWeeks(startOfWeek(now, { locale: ptBR }), 1);
            const nextWeekEnd = addWeeks(endOfWeek(now, { locale: ptBR }), 1);
            return matchDate >= nextWeekStart && matchDate <= nextWeekEnd;
          case 'this-month':
            return matchDate >= startOfMonth(now) && matchDate <= endOfMonth(now);
          default:
            return true;
        }
      });
    }

    // Filtro por busca de texto (título ou descrição)
    if (filters.search.trim() !== '') {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(match =>
        match.title.toLowerCase().includes(searchLower) ||
        match.description?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredMatches(filtered);
  };

  const joinMatch = async (matchId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('match_participants')
        .insert({
          match_id: matchId,
          user_id: user.id,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Você entrou na partida!');
      fetchMatches();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao entrar na partida');
    }
  };

  const getSkillLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      beginner: 'Iniciante',
      intermediate: 'Intermediário',
      advanced: 'Avançado',
      any: 'Qualquer nível',
    };
    return labels[level] || level;
  };

  const getGenderLabel = (gender: string) => {
    const labels: Record<string, string> = {
      male: 'Masculino',
      female: 'Feminino',
      mixed: 'Misto',
    };
    return labels[gender] || gender;
  };

  const getRecurrenceLabel = (recurrence: string) => {
    const labels: Record<string, string> = {
      weekly: 'Semanal',
      biweekly: 'Quinzenal',
      monthly: 'Mensal',
    };
    return labels[recurrence] || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Partidas Disponíveis</h1>
          <p className="text-muted-foreground mt-1">
            Encontre partidas próximas e participe
          </p>
        </div>
        <Button onClick={() => setLocation('/matches/create')}>
          Criar Partida
        </Button>
      </div>

      {/* Filtros */}
      <div className="mb-6">
        <MatchFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          sports={sports}
        />
      </div>

      {/* Contador de Resultados */}
      {matches.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {filteredMatches.length === matches.length
              ? `${matches.length} ${matches.length === 1 ? 'partida encontrada' : 'partidas encontradas'}`
              : `${filteredMatches.length} de ${matches.length} ${matches.length === 1 ? 'partida' : 'partidas'}`
            }
          </p>
        </div>
      )}

      {/* Lista de Partidas */}
      {filteredMatches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {matches.length === 0
                ? 'Nenhuma partida disponível no momento.'
                : 'Nenhuma partida encontrada com os filtros selecionados.'
              }
            </p>
            {matches.length === 0 && (
              <Button className="mt-4" onClick={() => setLocation('/matches/create')}>
                Criar a primeira partida
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMatches.map((match) => (
            <Card
              key={match.id}
              className="flex flex-col cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setLocation(`/matches/${match.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{match.sport.icon}</span>
                    <div>
                      <CardTitle className="text-lg">{match.title}</CardTitle>
                      <CardDescription>{match.sport.name}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(match.match_date), "dd 'de' MMMM 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
                {match.venue && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {match.venue.name} - {match.venue.city}/{match.venue.state}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {match.current_players}/{match.max_players} jogadores
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{match.duration_minutes} minutos</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {match.recurrence && match.recurrence !== 'none' && (
                    <Badge variant="default" className="gap-1">
                      <Repeat className="h-3 w-3" />
                      {getRecurrenceLabel(match.recurrence)}
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    {getSkillLevelLabel(match.skill_level)}
                  </Badge>
                  <Badge variant="outline">{getGenderLabel(match.gender)}</Badge>
                  {match.price > 0 && (
                    <Badge variant="outline">
                      R$ {match.price.toFixed(2)}
                    </Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    joinMatch(match.id);
                  }}
                  disabled={match.current_players >= match.max_players}
                >
                  {match.current_players >= match.max_players
                    ? 'Partida Cheia'
                    : 'Participar'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
