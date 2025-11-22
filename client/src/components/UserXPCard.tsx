import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, TrendingUp, Award } from 'lucide-react';

interface UserXP {
  total_xp: number;
  level: number;
  league: string;
  rank_position: number | null;
}

interface UserXPCardProps {
  userId: string;
  compact?: boolean;
}

export default function UserXPCard({ userId, compact = false }: UserXPCardProps) {
  const [xpData, setXpData] = useState<UserXP | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserXP();
  }, [userId]);

  const fetchUserXP = async () => {
    try {
      const { data, error } = await supabase
        .from('user_xp')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Se não existe registro, criar um padrão
        if (error.code === 'PGRST116') {
          setXpData({
            total_xp: 0,
            level: 1,
            league: 'bronze',
            rank_position: null,
          });
        } else {
          throw error;
        }
      } else {
        setXpData(data);
      }
    } catch (error) {
      console.error('Erro ao carregar XP:', error);
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

  const getXPForNextLevel = (level: number) => {
    // Fórmula: level = floor(sqrt(xp / 100)) + 1
    // Invertendo: xp = ((level - 1) ^ 2) * 100
    return Math.pow(level, 2) * 100;
  };

  const getXPForCurrentLevel = (level: number) => {
    return Math.pow(level - 1, 2) * 100;
  };

  const calculateProgress = () => {
    if (!xpData) return 0;
    
    const currentLevelXP = getXPForCurrentLevel(xpData.level);
    const nextLevelXP = getXPForNextLevel(xpData.level);
    const xpInCurrentLevel = xpData.total_xp - currentLevelXP;
    const xpNeededForLevel = nextLevelXP - currentLevelXP;
    
    return (xpInCurrentLevel / xpNeededForLevel) * 100;
  };

  if (loading) {
    return (
      <Card className={compact ? '' : 'w-full'}>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!xpData) return null;

  const leagueInfo = getLeagueInfo(xpData.league);
  const progress = calculateProgress();
  const xpForNext = getXPForNextLevel(xpData.level);
  const xpNeeded = xpForNext - xpData.total_xp;

  if (compact) {
    return (
      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <span className="text-2xl font-bold">Nível {xpData.level}</span>
        </div>
        <div className="flex-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {xpData.total_xp} XP • Faltam {xpNeeded} XP para o próximo nível
          </p>
        </div>
        <Badge className={leagueInfo.color}>
          {leagueInfo.icon} {leagueInfo.name}
        </Badge>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Progresso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Nível */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Nível</span>
            </div>
            <span className="text-3xl font-bold">{xpData.level}</span>
          </div>
          <Progress value={progress} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {xpData.total_xp.toLocaleString()} / {xpForNext.toLocaleString()} XP
          </p>
          <p className="text-xs text-muted-foreground">
            Faltam {xpNeeded.toLocaleString()} XP para o próximo nível
          </p>
        </div>

        {/* Liga */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Liga</span>
            </div>
            <Badge className={leagueInfo.color}>
              {leagueInfo.icon} {leagueInfo.name}
            </Badge>
          </div>
          {xpData.rank_position && (
            <p className="text-xs text-muted-foreground">
              Posição no ranking: #{xpData.rank_position}
            </p>
          )}
        </div>

        {/* Próxima liga */}
        {xpData.league !== 'master' && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs font-medium mb-1">Próxima liga</p>
            <div className="flex items-center justify-between">
              <span className="text-sm">
                {xpData.league === 'bronze' && '🥈 Silver (1.000 XP)'}
                {xpData.league === 'silver' && '🥇 Gold (5.000 XP)'}
                {xpData.league === 'gold' && '💎 Diamond (15.000 XP)'}
                {xpData.league === 'diamond' && '👑 Master (50.000 XP)'}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
