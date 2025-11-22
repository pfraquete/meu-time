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
  Clock3,
  Repeat
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInHours, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  confirmed_at: string | null;
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
          confirmed_at,
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

      // Se saiu e tinha vaga, promover primeiro da lista de espera
      if (userParticipation.status !== 'waitlist') {
        await promoteFromWaitlist();
      }

      fetchMatchDetails(matchData.id);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sair da partida');
    }
  };

  const joinWaitlist = async () => {
    if (!user || !matchData) return;

    try {
      const { error } = await supabase
        .from('match_participants')
        .insert({
          match_id: matchData.id,
          user_id: user.id,
          status: 'waitlist',
        });

      if (error) throw error;

      toast.success('Você entrou na lista de espera!');
      fetchMatchDetails(matchData.id);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao entrar na lista de espera');
    }
  };

  const promoteFromWaitlist = async () => {
    if (!matchData) return;

    try {
      // Buscar primeiro da lista de espera
      const { data: waitlistData, error: waitlistError } = await supabase
        .from('match_participants')
        .select('id')
        .eq('match_id', matchData.id)
        .eq('status', 'waitlist')
        .order('joined_at', { ascending: true })
        .limit(1)
        .single();

      if (waitlistError || !waitlistData) return;

      // Promover para pending
      const { error: updateError } = await supabase
        .from('match_participants')
        .update({ status: 'pending' })
        .eq('id', waitlistData.id);

      if (updateError) throw updateError;

      toast.success('Participante promovido da lista de espera!');
    } catch (error: any) {
      console.error('Erro ao promover da lista de espera:', error);
    }
  };

  const confirmPresence = async () => {
    if (!user || !matchData || !userParticipation) return;

    try {
      const { error } = await supabase
        .from('match_participants')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', userParticipation.id);

      if (error) throw error;

      toast.success('Presença confirmada!');
      fetchMatchDetails(matchData.id);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao confirmar presença');
    }
  };

  const needsConfirmation = () => {
    if (!matchData || !userParticipation) return false;

    const matchDate = new Date(matchData.match_date);
    const hoursUntilMatch = differenceInHours(matchDate, new Date());

    // Precisa confirmar se:
    // 1. Faltam menos de 48h para a partida
    // 2. Ainda não confirmou
    // 3. Status é 'pending'
    return (
      hoursUntilMatch <= 48 &&
      hoursUntilMatch > 0 &&
      !userParticipation.confirmed_at &&
      userParticipation.status === 'pending'
    );
  };

  const confirmationDeadlinePassed = () => {
    if (!matchData) return false;
    const matchDate = new Date(matchData.match_date);
    return isPast(matchDate);
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
      waitlist: 'Lista de Espera',
      declined: 'Recusado',
      attended: 'Compareceu',
      no_show: 'Não Compareceu',
    };
    return labels[status] || status;
  };

  // Separar participantes ativos e lista de espera
  const activeParticipants = participants.filter(p => p.status !== 'waitlist');
  const waitlistParticipants = participants.filter(p => p.status === 'waitlist');

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

      {/* Alert de confirmação de presença */}
      {needsConfirmation() && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
          <Clock3 className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-400">
            Confirmação de Presença Necessária
          </AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-500">
            Faltam menos de 48 horas para a partida. Por favor, confirme sua presença para garantir sua vaga.
          </AlertDescription>
        </Alert>
      )}

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
                  {matchData.recurrence && matchData.recurrence !== 'none' && (
                    <Badge variant="default" className="gap-1">
                      <Repeat className="h-3 w-3" />
                      Série {getRecurrenceLabel(matchData.recurrence)}
                    </Badge>
                  )}
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
                Participantes ({activeParticipants.length}/{matchData.max_players})
              </CardTitle>
              <CardDescription>
                Jogadores confirmados e pendentes para esta partida
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeParticipants.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum participante ainda. Seja o primeiro!
                </p>
              ) : (
                <div className="space-y-3">
                  {activeParticipants.map((participant) => (
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

          {/* Lista de espera */}
          {waitlistParticipants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Lista de Espera ({waitlistParticipants.length})
                </CardTitle>
                <CardDescription>
                  Jogadores aguardando vaga na partida
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {waitlistParticipants.map((participant, index) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-300 font-bold text-sm">
                          {index + 1}
                        </div>
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
                      <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900/20">
                        Posição #{index + 1}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
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
                    {userParticipation?.status === 'waitlist' ? (
                      <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                          <Clock3 className="h-5 w-5" />
                          <span className="font-medium">Você está na lista de espera!</span>
                        </div>
                        <p className="text-sm text-orange-600 dark:text-orange-500 mt-2">
                          Posição: #{waitlistParticipants.findIndex(p => p.user.id === user?.id) + 1}
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">Você está participando!</span>
                        </div>
                        {userParticipation && (
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-green-600 dark:text-green-500">
                              Status: {getStatusLabel(userParticipation.status)}
                            </p>
                            {userParticipation.confirmed_at && (
                              <p className="text-xs text-green-600/80 dark:text-green-500/80">
                                Confirmado em {format(new Date(userParticipation.confirmed_at), "dd/MM/yyyy 'às' HH:mm")}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {needsConfirmation() && userParticipation?.status !== 'waitlist' && (
                      <Button
                        className="w-full"
                        onClick={confirmPresence}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirmar Presença
                      </Button>
                    )}

                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={leaveMatch}
                    >
                      {userParticipation?.status === 'waitlist' ? 'Sair da Lista de Espera' : 'Sair da partida'}
                    </Button>
                  </>
                ) : (
                  <>
                    {isFull ? (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={joinWaitlist}
                        disabled={matchData.status !== 'open'}
                      >
                        <Clock3 className="h-4 w-4 mr-2" />
                        Entrar na Lista de Espera
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={joinMatch}
                        disabled={matchData.status !== 'open'}
                      >
                        Participar da Partida
                      </Button>
                    )}
                  </>
                )}

                {isFull && !isParticipant && waitlistParticipants.length > 0 && (
                  <p className="text-sm text-center text-muted-foreground">
                    {waitlistParticipants.length} {waitlistParticipants.length === 1 ? 'pessoa' : 'pessoas'} na lista de espera
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
