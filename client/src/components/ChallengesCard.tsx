import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, Clock } from 'lucide-react';

// Placeholder: Desafios mockados até implementar backend completo
const MOCK_CHALLENGES = [
  {
    id: '1',
    title: 'Primeira Partida',
    description: 'Participe da sua primeira partida',
    progress: 0,
    target: 1,
    reward_xp: 100,
    reward_badge: 'Iniciante',
    type: 'participation',
    status: 'active',
  },
  {
    id: '2',
    title: 'Jogador Regular',
    description: 'Participe de 10 partidas',
    progress: 0,
    target: 10,
    reward_xp: 500,
    type: 'participation',
    status: 'active',
  },
  {
    id: '3',
    title: 'Organizador',
    description: 'Crie 5 partidas',
    progress: 0,
    target: 5,
    reward_xp: 300,
    type: 'organization',
    status: 'active',
  },
];

interface ChallengesCardProps {
  compact?: boolean;
}

export default function ChallengesCard({ compact = false }: ChallengesCardProps) {
  const challenges = MOCK_CHALLENGES;

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      participation: 'bg-green-500',
      organization: 'bg-blue-500',
      social: 'bg-purple-500',
      achievement: 'bg-yellow-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      participation: 'Participação',
      organization: 'Organização',
      social: 'Social',
      achievement: 'Conquista',
    };
    return labels[type] || type;
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {challenges.slice(0, 3).map((challenge) => {
          const progress = (challenge.progress / challenge.target) * 100;
          return (
            <div key={challenge.id} className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{challenge.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {challenge.progress}/{challenge.target}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  +{challenge.reward_xp} XP
                </Badge>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Desafios Ativos
        </CardTitle>
        <CardDescription>
          Complete desafios para ganhar XP e badges
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {challenges.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Nenhum desafio ativo no momento</p>
          </div>
        ) : (
          challenges.map((challenge) => {
            const progress = (challenge.progress / challenge.target) * 100;
            const isCompleted = progress >= 100;

            return (
              <Card
                key={challenge.id}
                className={isCompleted ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}
              >
                <CardContent className="pt-6 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="h-4 w-4" />
                        <h3 className="font-semibold">{challenge.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{challenge.description}</p>
                    </div>
                    {isCompleted && (
                      <Badge className="bg-green-600">Completado</Badge>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">
                        {challenge.progress}/{challenge.target}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Rewards */}
                  <div className="flex items-center gap-4 pt-2">
                    <Badge variant="outline" className={getTypeColor(challenge.type)}>
                      {getTypeLabel(challenge.type)}
                    </Badge>
                    <div className="flex items-center gap-2 text-sm">
                      <Trophy className="h-3 w-3 text-yellow-600" />
                      <span className="font-medium text-primary">
                        +{challenge.reward_xp} XP
                      </span>
                    </div>
                    {challenge.reward_badge && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <span>+</span>
                        <span>{challenge.reward_badge}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        {/* Info */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">Sistema de Desafios</p>
              <p className="text-muted-foreground">
                Novos desafios são adicionados regularmente. Complete-os para ganhar XP e badges
                exclusivos!
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
