import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Trophy, Calendar, Award, MapPin } from 'lucide-react';
import UserXPCard from '@/components/UserXPCard';
import BadgesList from '@/components/BadgesList';

interface PlayerProfile {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
}

interface PlayerStats {
  sport_name: string;
  sport_icon: string;
  matches_played: number;
  matches_organized: number;
  attendance_rate: number;
  average_rating: number;
}

export default function PlayerProfile() {
  const [, params] = useRoute('/players/:id');
  const playerId = params?.id;
  
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (playerId) {
      fetchPlayerData();
    }
  }, [playerId]);

  const fetchPlayerData = async () => {
    if (!playerId) return;

    try {
      // Buscar perfil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', playerId)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);

      // Buscar estatísticas
      const { data: statsData, error: statsError } = await supabase
        .from('player_stats')
        .select(`
          *,
          sport:sports(name, icon)
        `)
        .eq('user_id', playerId);

      if (statsError) throw statsError;

      setStats(
        (statsData || []).map((stat: any) => ({
          sport_name: stat.sport.name,
          sport_icon: stat.sport.icon,
          matches_played: stat.matches_played,
          matches_organized: stat.matches_organized,
          attendance_rate: stat.attendance_rate,
          average_rating: stat.average_rating,
        }))
      );
    } catch (error) {
      console.error('Erro ao carregar perfil do jogador:', error);
    } finally {
      setLoading(false);
    }
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
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Jogador não encontrado</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{profile.name}</h1>
                {profile.bio && (
                  <p className="text-muted-foreground mb-3">{profile.bio}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {(profile.city || profile.state) && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {profile.city}
                        {profile.city && profile.state && ', '}
                        {profile.state}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Membro desde {new Date(profile.created_at).getFullYear()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="stats" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stats">
              <Trophy className="h-4 w-4 mr-2" />
              Estatísticas
            </TabsTrigger>
            <TabsTrigger value="gamification">
              <Award className="h-4 w-4 mr-2" />
              Gamificação
            </TabsTrigger>
            <TabsTrigger value="matches">
              <Calendar className="h-4 w-4 mr-2" />
              Partidas
            </TabsTrigger>
          </TabsList>

          {/* Estatísticas */}
          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas por Esporte</CardTitle>
                <CardDescription>
                  Desempenho do jogador em cada esporte
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Este jogador ainda não participou de nenhuma partida.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.map((stat, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <span className="text-2xl">{stat.sport_icon}</span>
                            {stat.sport_name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Partidas</p>
                              <p className="text-2xl font-bold">{stat.matches_played}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Organizadas</p>
                              <p className="text-2xl font-bold">{stat.matches_organized}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Presença</p>
                              <p className="text-2xl font-bold">
                                {stat.attendance_rate.toFixed(0)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Avaliação</p>
                              <p className="text-2xl font-bold">
                                {stat.average_rating.toFixed(1)}⭐
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gamificação */}
          <TabsContent value="gamification" className="space-y-6">
            <UserXPCard userId={playerId} />
            <BadgesList userId={playerId} />
          </TabsContent>

          {/* Partidas */}
          <TabsContent value="matches">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Partidas</CardTitle>
                <CardDescription>
                  Partidas que este jogador participou
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Funcionalidade em desenvolvimento</p>
                  <p className="text-sm mt-2">
                    Em breve você poderá ver o histórico completo de partidas
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
