import { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  ArrowLeft,
  User,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Clock3
} from 'lucide-react';
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
  sport: {
    id: string;
    name: string;
    icon: string;
    description: string;
  };
  venue: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    facilities: string[];
  } | null;
  organizer: {
    id: string;
    name: string;
    avatar_url: string | null;
    phone: string | null;
    bio: string | null;
  };
}

interface Participant {
  id: string;
  status: string;
  joined_at: string;
  user: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

export default function MatchDetails() {
  const [match] = useRoute('/matches/:id');
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [matchData, setMatchData] = useState<Match | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);
  const [userParticipation, setUserParticipation] = useState<Participant | null>(null);

  useEffect(() => {
    if (match) {
      const params = new URLSearchParams(window.location.search);
      const id = window.location.pathname.split('/').pop();
      if (id) {
        fetchMatchDetails(id);
      }
    }
  }, [match]);

  const fetchMatchDetails = async (matchId: string) => {
    try {
      // Buscar detalhes da partida
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select(`
          *,
          sport:sports(id, name, icon, description),
          venue:venues(id, name, address, city, state, facilities),
          organizer:profiles!organizer_id(id, name, avatar_url, phone, bio)
        `)
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;

      // Buscar participantes
      const { data: participantsData, error: participantsError } = await supabase
        .from('match_participants')
        .select(`
          id,
          status,
          joined_at,
          user:profiles!user_id(id, name, avatar_url)
        `)
        .eq('match_id', matchId)
        .order('joined_at', { ascending: true });

      if (participantsError) throw participantsError;

      setMatchData(matchData);
      setParticipants(participantsData || []);

      // Verificar se o usuário já está participando
      if (user) {
        const userPart = participantsData?.find(p => p.user.id === user.id);
        setIsParticipant(!!userPart);
        setUserParticipation(userPart || null);
      }
    } catch (error: any) {
      toast.error('Erro ao carregar detalhes da partida');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const joinMatch = async () => {
    if (!user || !matchData) return;

    try {
      const { error } = await supabase
        .from('match_participants')
        .insert({
          match_id: matchData.id,
          user_id: user.id,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Você entrou na partida!');
      fetchMatchDetails(matchData.id);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao entrar na partida');
    }
  };

  const leaveMatch = async () => {
    if (!user || !matchData || !userParticipation) return;

    try {
      const { error } = await supabase
        .from('match_participants')
        .delete()
        .eq('id', userParticipation.id);

      if (error) throw error;

      toast.success('Você saiu da partida');
      fetchMatchDetails(matchData.id);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sair da partida');
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock3 className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Partida não encontrada</p>
            <Button className="mt-4" onClick={() => setLocation('/matches')}>
              Voltar para partidas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isFull = matchData.current_players >= matchData.max_players;
  const isOrganizer = user?.id === matchData.organizer.id;

  return (
    <div className="container py-8">
      {/* Header com botão de voltar */}
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => setLocation('/matches')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar para partidas
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal - Informações da partida */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card principal da partida */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{matchData.sport.icon}</span>
                  <div>
                    <CardTitle className="text-2xl">{matchData.title}</CardTitle>
                    <CardDescription className="text-base">
                      {matchData.sport.name}
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant={matchData.status === 'open' ? 'default' : 'secondary'}
                  className="text-sm"
                >
                  {matchData.status === 'open' ? 'Aberta' : 'Fechada'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Descrição */}
              {matchData.description && (
                <div>
                  <h3 className="font-semibold mb-2">Sobre a partida</h3>
                  <p className="text-muted-foreground">{matchData.description}</p>
                </div>
              )}

              <Separator />

              {/* Informações principais */}
              <div className="grid gap-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(matchData.match_date), "EEEE, dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      às {format(new Date(matchData.match_date), 'HH:mm')}
                    </p>
                  </div>
                </div>

                {matchData.venue && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{matchData.venue.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {matchData.venue.address}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {matchData.venue.city}/{matchData.venue.state}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {matchData.current_players}/{matchData.max_players} jogadores
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Mínimo: {matchData.min_players} jogadores
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <p className="font-medium">{matchData.duration_minutes} minutos</p>
                </div>
              </div>

              <Separator />

              {/* Badges de configuração */}
              <div>
                <h3 className="font-semibold mb-3">Configurações</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {getSkillLevelLabel(matchData.skill_level)}
                  </Badge>
                  <Badge variant="outline">{getGenderLabel(matchData.gender)}</Badge>
                  {matchData.price > 0 ? (
                    <Badge variant="outline">R$ {matchData.price.toFixed(2)}</Badge>
                  ) : (
                    <Badge variant="outline">Gratuito</Badge>
                  )}
                </div>
              </div>

              {/* Facilidades do local */}
              {matchData.venue?.facilities && matchData.venue.facilities.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3">Facilidades do local</h3>
                    <div className="flex flex-wrap gap-2">
                      {matchData.venue.facilities.map((facility, index) => (
                        <Badge key={index} variant="outline">
                          {facility}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Lista de participantes */}
          <Card>
            <CardHeader>
              <CardTitle>
                Participantes ({participants.length}/{matchData.max_players})
              </CardTitle>
              <CardDescription>
                Jogadores confirmados e pendentes para esta partida
              </CardDescription>
            </CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum participante ainda. Seja o primeiro!
                </p>
              ) : (
                <div className="space-y-3">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={participant.user.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(participant.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{participant.user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Entrou em {format(new Date(participant.joined_at), "dd/MM/yyyy 'às' HH:mm")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(participant.status)}
                        <span className="text-sm">{getStatusLabel(participant.status)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral - Organizador e ações */}
        <div className="space-y-6">
          {/* Card do organizador */}
          <Card>
            <CardHeader>
              <CardTitle>Organizador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={matchData.organizer.avatar_url || undefined} />
                  <AvatarFallback>
                    {getInitials(matchData.organizer.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{matchData.organizer.name}</p>
                  {matchData.organizer.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {matchData.organizer.bio}
                    </p>
                  )}
                </div>
              </div>

              {matchData.organizer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{matchData.organizer.phone}</span>
                </div>
              )}

              {isOrganizer && (
                <Badge variant="secondary" className="w-full justify-center">
                  Você é o organizador
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Card de ações */}
          {!isOrganizer && (
            <Card>
              <CardHeader>
                <CardTitle>Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isParticipant ? (
                  <>
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Você está participando!</span>
                      </div>
                      {userParticipation && (
                        <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                          Status: {getStatusLabel(userParticipation.status)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={leaveMatch}
                    >
                      Sair da partida
                    </Button>
                  </>
                ) : (
                  <Button
                    className="w-full"
                    onClick={joinMatch}
                    disabled={isFull || matchData.status !== 'open'}
                  >
                    {isFull ? 'Partida Cheia' : 'Participar da Partida'}
                  </Button>
                )}

                {isFull && !isParticipant && (
                  <p className="text-sm text-center text-muted-foreground">
                    Esta partida está cheia. Você pode entrar na lista de espera (em breve).
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Card de informações adicionais */}
          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Vagas disponíveis</p>
                <p className="font-medium">
                  {matchData.max_players - matchData.current_players} de {matchData.max_players}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">Nível de habilidade</p>
                <p className="font-medium">{getSkillLevelLabel(matchData.skill_level)}</p>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">Gênero</p>
                <p className="font-medium">{getGenderLabel(matchData.gender)}</p>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">Valor</p>
                <p className="font-medium">
                  {matchData.price > 0 ? `R$ ${matchData.price.toFixed(2)}` : 'Gratuito'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
