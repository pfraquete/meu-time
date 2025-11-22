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
import MatchFiltersPanel from '@/components/MatchFiltersPanel';
import { useMatchFilters } from '@/hooks/useMatchFilters';

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
  const {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    matches,
    isLoading,
    error,
  } = useMatchFilters();

  // Hook useMatchFilters já faz o fetch e filtros automaticamente

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
        <MatchFiltersPanel
          filters={filters}
          onFilterChange={updateFilter}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      {/* Contador de Resultados */}
      {matches.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {matches.length} {matches.length === 1 ? 'partida encontrada' : 'partidas encontradas'}
          </p>
        </div>
      )}

      {/* Lista de Partidas */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : matches.length === 0 ? (
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
          {matches.map((match) => (
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
