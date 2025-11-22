import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Users, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WaitlistParticipant {
  id: string;
  user_id: string;
  joined_at: string;
  position: number;
  profile: {
    name: string;
    avatar_url: string | null;
  };
}

interface WaitlistCardProps {
  matchId: string;
  onUpdate?: () => void;
}

export default function WaitlistCard({ matchId, onUpdate }: WaitlistCardProps) {
  const { user } = useAuth();
  const [waitlist, setWaitlist] = useState<WaitlistParticipant[]>([]);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPromoted, setIsPromoted] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWaitlist();
      subscribeToWaitlist();
    }
  }, [user, matchId]);

  const fetchWaitlist = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('match_participants')
        .select(`
          id,
          user_id,
          joined_at,
          profile:profiles(name, avatar_url)
        `)
        .eq('match_id', matchId)
        .eq('status', 'waitlist')
        .order('joined_at', { ascending: true });

      if (error) throw error;

      // Adicionar posição
      const waitlistWithPosition = (data || []).map((p, index) => ({
        ...p,
        position: index + 1,
      }));

      setWaitlist(waitlistWithPosition);

      // Verificar posição do usuário
      const userInWaitlist = waitlistWithPosition.find(p => p.user_id === user.id);
      setUserPosition(userInWaitlist?.position || null);
    } catch (error) {
      console.error('Erro ao carregar lista de espera:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToWaitlist = () => {
    if (!user) return;

    const channel = supabase
      .channel(`waitlist:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_participants',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new.user_id === user.id) {
            // Usuário foi promovido
            if (payload.new.status === 'confirmed') {
              setIsPromoted(true);
              toast.success('🎉 Você foi promovido! Uma vaga abriu na partida.');
            }
          }
          fetchWaitlist();
          onUpdate?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const leaveWaitlist = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('match_participants')
        .delete()
        .eq('match_id', matchId)
        .eq('user_id', user.id)
        .eq('status', 'waitlist');

      if (error) throw error;

      toast.success('Você saiu da lista de espera');
      setUserPosition(null);
      fetchWaitlist();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sair da lista de espera');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Usuário foi promovido
  if (isPromoted) {
    return (
      <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            Você foi Promovido!
          </CardTitle>
          <CardDescription>
            Uma vaga abriu e você foi adicionado à partida
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Parabéns! Você agora está confirmado na partida. Não esqueça de confirmar sua
              presença quando solicitado.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Usuário não está na lista de espera
  if (!userPosition) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Espera
          </CardTitle>
          <CardDescription>
            {waitlist.length === 0
              ? 'Ninguém na lista de espera'
              : `${waitlist.length} ${waitlist.length === 1 ? 'pessoa' : 'pessoas'} aguardando`}
          </CardDescription>
        </CardHeader>
        {waitlist.length > 0 && (
          <CardContent>
            <div className="space-y-2">
              {waitlist.slice(0, 3).map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 p-2 bg-muted rounded-lg"
                >
                  <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                    {participant.position}
                  </Badge>
                  <span className="text-sm">{participant.profile.name}</span>
                </div>
              ))}
              {waitlist.length > 3 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{waitlist.length - 3} pessoas
                </p>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  // Usuário está na lista de espera
  return (
    <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
          <Clock className="h-5 w-5" />
          Você está na Lista de Espera
        </CardTitle>
        <CardDescription>
          Aguardando uma vaga abrir na partida
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Posição do usuário */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-lg border">
          <div>
            <p className="text-sm text-muted-foreground">Sua posição</p>
            <p className="text-3xl font-bold">#{userPosition}</p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Users className="h-4 w-4 mr-2" />
            {waitlist.length} na fila
          </Badge>
        </div>

        {/* Pessoas na frente */}
        {userPosition > 1 && (
          <div>
            <p className="text-sm font-medium mb-2">
              {userPosition - 1} {userPosition - 1 === 1 ? 'pessoa' : 'pessoas'} na sua frente:
            </p>
            <div className="space-y-2">
              {waitlist
                .filter(p => p.position < userPosition)
                .slice(0, 3)
                .map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-3 p-2 bg-muted rounded-lg"
                  >
                    <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                      {participant.position}
                    </Badge>
                    <span className="text-sm">{participant.profile.name}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Alerta */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você será notificado automaticamente quando uma vaga abrir. Fique atento!
          </AlertDescription>
        </Alert>

        {/* Botão para sair */}
        <Button
          variant="outline"
          className="w-full text-red-600 hover:text-red-700"
          onClick={leaveWaitlist}
        >
          <X className="h-4 w-4 mr-2" />
          Sair da Lista de Espera
        </Button>
      </CardContent>
    </Card>
  );
}
