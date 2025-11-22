import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  sport: { name: string; icon: string };
  venue: { name: string; city: string; state: string } | null;
  organizer: { name: string };
}

export default function Matches() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          sport:sports(name, icon),
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

      {matches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhuma partida disponível no momento.
            </p>
            <Button className="mt-4" onClick={() => setLocation('/matches/create')}>
              Criar a primeira partida
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <Card key={match.id} className="flex flex-col">
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
                  onClick={() => joinMatch(match.id)}
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
