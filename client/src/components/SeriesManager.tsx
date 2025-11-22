import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Repeat, Calendar, Edit, Trash2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

interface MatchSeries {
  id: string;
  title: string;
  description: string | null;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  start_date: string;
  end_date: string | null;
  max_occurrences: number | null;
  is_active: boolean;
  total_matches: number;
  upcoming_matches: any[];
}

export default function SeriesManager() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [series, setSeries] = useState<MatchSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [seriesToDelete, setSeriesToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSeries();
    }
  }, [user]);

  const fetchSeries = async () => {
    if (!user) return;

    try {
      // Buscar séries do usuário
      const { data: seriesData, error: seriesError } = await supabase
        .from('match_series')
        .select('*')
        .eq('organizer_id', user.id)
        .eq('is_active', true)
        .order('start_date', { ascending: false });

      if (seriesError) throw seriesError;

      // Para cada série, buscar próximas partidas
      const seriesWithMatches = await Promise.all(
        (seriesData || []).map(async (s) => {
          const { data: matches, error: matchesError } = await supabase
            .from('matches')
            .select('id, date, venue_id, max_participants')
            .eq('series_id', s.id)
            .gte('date', new Date().toISOString())
            .order('date', { ascending: true })
            .limit(3);

          if (matchesError) {
            console.error('Erro ao buscar partidas da série:', matchesError);
          }

          // Contar total de partidas
          const { count } = await supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
            .eq('series_id', s.id);

          return {
            ...s,
            total_matches: count || 0,
            upcoming_matches: matches || [],
          };
        })
      );

      setSeries(seriesWithMatches);
    } catch (error) {
      console.error('Erro ao carregar séries:', error);
      toast.error('Erro ao carregar séries');
    } finally {
      setLoading(false);
    }
  };

  const cancelSeries = async (seriesId: string) => {
    try {
      // Chamar função SQL para cancelar série
      const { error } = await supabase.rpc('cancel_match_series', {
        p_series_id: seriesId,
      });

      if (error) throw error;

      toast.success('Série cancelada com sucesso');
      fetchSeries();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar série');
    } finally {
      setSeriesToDelete(null);
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      weekly: 'Semanal',
      biweekly: 'Quinzenal',
      monthly: 'Mensal',
    };
    return labels[frequency] || frequency;
  };

  const getFrequencyIcon = (frequency: string) => {
    return '🔄';
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Repeat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Você ainda não criou nenhuma série de partidas
            </p>
            <Button onClick={() => setLocation('/matches/create')}>
              <Calendar className="h-4 w-4 mr-2" />
              Criar Primeira Série
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {series.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Repeat className="h-5 w-5" />
                    {s.title}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {s.description || 'Sem descrição'}
                  </CardDescription>
                </div>
                <Badge>
                  {getFrequencyIcon(s.frequency)} {getFrequencyLabel(s.frequency)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Estatísticas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Total de Partidas</p>
                  <p className="text-2xl font-bold">{s.total_matches}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Próximas</p>
                  <p className="text-2xl font-bold">{s.upcoming_matches.length}</p>
                </div>
              </div>

              {/* Próximas partidas */}
              {s.upcoming_matches.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Próximas partidas:</p>
                  <div className="space-y-2">
                    {s.upcoming_matches.map((match) => (
                      <div
                        key={match.id}
                        className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm cursor-pointer hover:bg-muted/80"
                        onClick={() => setLocation(`/matches/${match.id}`)}
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(new Date(match.date), "dd/MM 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {match.max_participants}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Datas */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  Início: {format(new Date(s.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
                {s.end_date && (
                  <p>
                    Término: {format(new Date(s.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                )}
                {s.max_occurrences && <p>Máximo: {s.max_occurrences} partidas</p>}
              </div>

              {/* Ações */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => toast.info('Funcionalidade em desenvolvimento')}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setSeriesToDelete(s.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de confirmação */}
      <AlertDialog open={!!seriesToDelete} onOpenChange={() => setSeriesToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar série?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as partidas futuras desta série serão canceladas. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => seriesToDelete && cancelSeries(seriesToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancelar Série
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
