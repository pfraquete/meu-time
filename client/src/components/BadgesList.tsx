import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  reward_xp: number;
}

interface UserBadge {
  id: string;
  earned_at: string;
  badge: BadgeData;
}

interface BadgesListProps {
  userId: string;
  compact?: boolean;
}

export default function BadgesList({ userId, compact = false }: BadgesListProps) {
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, [userId]);

  const fetchBadges = async () => {
    try {
      // Buscar badges do usuário
      const { data: earnedBadges, error: earnedError } = await supabase
        .from('user_badges')
        .select(`
          id,
          earned_at,
          badge:badges(*)
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (earnedError) throw earnedError;

      // Buscar todos os badges disponíveis
      const { data: allBadgesData, error: allError } = await supabase
        .from('badges')
        .select('*')
        .order('rarity', { ascending: false });

      if (allError) throw allError;

      setUserBadges(earnedBadges || []);
      setAllBadges(allBadgesData || []);
    } catch (error) {
      console.error('Erro ao carregar badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: 'bg-gray-500',
      rare: 'bg-blue-500',
      epic: 'bg-purple-500',
      legendary: 'bg-yellow-500',
    };
    return colors[rarity] || colors.common;
  };

  const getRarityLabel = (rarity: string) => {
    const labels: Record<string, string> = {
      common: 'Comum',
      rare: 'Raro',
      epic: 'Épico',
      legendary: 'Lendário',
    };
    return labels[rarity] || rarity;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      participation: 'Participação',
      achievement: 'Conquista',
      social: 'Social',
      special: 'Especial',
    };
    return labels[category] || category;
  };

  const hasBadge = (badgeId: string) => {
    return userBadges.some(ub => ub.badge.id === badgeId);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {userBadges.slice(0, 5).map((userBadge) => (
          <div
            key={userBadge.id}
            className="flex items-center gap-1 px-2 py-1 bg-muted rounded-lg"
            title={userBadge.badge.name}
          >
            <span className="text-lg">{userBadge.badge.icon}</span>
            <span className="text-xs font-medium">{userBadge.badge.name}</span>
          </div>
        ))}
        {userBadges.length > 5 && (
          <Badge variant="outline">+{userBadges.length - 5}</Badge>
        )}
        {userBadges.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum badge conquistado ainda</p>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Badges ({userBadges.length}/{allBadges.length})
        </CardTitle>
        <CardDescription>
          Conquiste badges participando de partidas e completando desafios
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allBadges.map((badge) => {
            const earned = hasBadge(badge.id);
            const userBadge = userBadges.find(ub => ub.badge.id === badge.id);

            return (
              <div
                key={badge.id}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  earned
                    ? 'border-primary bg-primary/5 hover:bg-primary/10'
                    : 'border-dashed border-muted-foreground/30 bg-muted/30 opacity-60'
                }`}
              >
                {/* Badge Icon */}
                <div className="flex justify-center mb-2">
                  {earned ? (
                    <span className="text-4xl">{badge.icon}</span>
                  ) : (
                    <div className="text-4xl grayscale opacity-50 relative">
                      {badge.icon}
                      <Lock className="absolute top-0 right-0 h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Badge Info */}
                <div className="text-center space-y-1">
                  <h3 className="font-semibold text-sm">{badge.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {badge.description}
                  </p>

                  {/* Rarity & Category */}
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {getCategoryLabel(badge.category)}
                    </Badge>
                    <Badge className={`text-xs ${getRarityColor(badge.rarity)}`}>
                      {getRarityLabel(badge.rarity)}
                    </Badge>
                  </div>

                  {/* XP Reward */}
                  {badge.reward_xp > 0 && (
                    <p className="text-xs text-primary font-medium mt-1">
                      +{badge.reward_xp} XP
                    </p>
                  )}

                  {/* Earned Date */}
                  {earned && userBadge && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Conquistado em{' '}
                      {format(new Date(userBadge.earned_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {allBadges.length === 0 && (
          <div className="text-center py-12">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum badge disponível no momento</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
