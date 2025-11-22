import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface RankingPlayer {
  rank: number;
  id: string;
  name: string;
  avatar_url: string | null;
  total_xp: number;
  level: number;
  league: string;
  total_badges: number;
  total_matches: number;
}

export default function Ranking() {
  const { user } = useAuth();
  const [ranking, setRanking] = useState<RankingPlayer[]>([]);
  const [userRank, setUserRank] = useState<RankingPlayer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    try {
      const { data, error } = await supabase
        .from('global_ranking')
        .select('*')
        .limit(100);

      if (error) throw error;

      setRanking(data || []);

      // Encontrar posição do usuário atual
      if (user) {
        const currentUser = data?.find(p => p.id === user.id);
        if (currentUser) {
          setUserRank(currentUser);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLeagueInfo = (league: string) => {
    const leagues: Record<string, { name: string; icon: string; color: string }> = {
      bronze: { name: 'Bronze', icon: '🥉', color: 'bg-amber-700' },
      silver: { name: 'Silver', icon: '🥈', color: 'bg-gray-400' },
      gold: { name: 'Gold', icon: '🥇', color: 'bg-yellow-500' },
      diamond: { name: 'Diamond', icon: '💎', color: 'bg-blue-500' },
      master: { name: 'Master', icon: '👑', color: 'bg-purple-600' },
    };
    return leagues[league] || leagues.bronze;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-700" />;
    return null;
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
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4">
                    <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
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
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8" />
            Ranking Global
          </h1>
          <p className="text-muted-foreground mt-1">
            Top 100 jogadores por XP acumulado
          </p>
        </div>

        {/* Posição do usuário */}
        {userRank && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-lg">Sua Posição</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="font-bold text-2xl w-12 text-center">
                    #{userRank.rank}
                  </div>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={userRank.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(userRank.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{userRank.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      <span>Nível {userRank.level}</span>
                      <span>•</span>
                      <span>{userRank.total_xp.toLocaleString()} XP</span>
                    </div>
                  </div>
                </div>
                <Badge className={getLeagueInfo(userRank.league).color}>
                  {getLeagueInfo(userRank.league).icon}{' '}
                  {getLeagueInfo(userRank.league).name}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top 3 */}
        <div className="grid md:grid-cols-3 gap-4">
          {ranking.slice(0, 3).map((player) => {
            const leagueInfo = getLeagueInfo(player.league);
            return (
              <Card
                key={player.id}
                className={`${
                  player.rank === 1
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
                    : player.rank === 2
                    ? 'border-gray-400 bg-gray-50 dark:bg-gray-950/20'
                    : 'border-amber-700 bg-amber-50 dark:bg-amber-950/20'
                }`}
              >
                <CardContent className="pt-6 text-center">
                  <div className="flex justify-center mb-4">
                    {getRankIcon(player.rank)}
                  </div>
                  <Avatar className="h-20 w-20 mx-auto mb-4">
                    <AvatarImage src={player.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(player.name)}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-bold text-lg mb-1">{player.name}</h3>
                  <Badge className={`mb-3 ${leagueInfo.color}`}>
                    {leagueInfo.icon} {leagueInfo.name}
                  </Badge>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      Nível {player.level}
                    </p>
                    <p className="font-semibold text-primary">
                      {player.total_xp.toLocaleString()} XP
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {player.total_badges} badges • {player.total_matches} partidas
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Ranking completo */}
        <Card>
          <CardHeader>
            <CardTitle>Ranking Completo</CardTitle>
            <CardDescription>Top 100 jogadores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ranking.slice(3).map((player) => {
                const leagueInfo = getLeagueInfo(player.league);
                const isCurrentUser = user?.id === player.id;

                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors ${
                      isCurrentUser ? 'bg-primary/5 border border-primary' : ''
                    }`}
                  >
                    <div className="font-bold text-lg w-12 text-center text-muted-foreground">
                      #{player.rank}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={player.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(player.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {player.name}
                        {isCurrentUser && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Você
                          </Badge>
                        )}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Nível {player.level}</span>
                        <span>•</span>
                        <span>{player.total_xp.toLocaleString()} XP</span>
                        <span>•</span>
                        <Award className="h-3 w-3" />
                        <span>{player.total_badges}</span>
                      </div>
                    </div>
                    <Badge className={leagueInfo.color}>
                      {leagueInfo.icon} {leagueInfo.name}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {/* Empty State */}
            {ranking.length === 0 && (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhum jogador no ranking ainda
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
