import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Trophy, Award, Calendar, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface XPTransaction {
  id: string;
  amount: number;
  reason: string;
  type: string;
  created_at: string;
}

export default function XPHistoryCard() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<XPTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, filter]);

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('xp_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        query = query.eq('type', filter);
      }

      const { data, error } = await query;

      if (error) {
        // Se a tabela não existir ainda, mostrar dados mockados
        if (error.code === '42P01') {
          console.warn('Tabela xp_transactions não existe ainda. Aplicar migration 008.');
          setTransactions([]);
        } else {
          throw error;
        }
      } else {
        setTransactions(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico de XP:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeInfo = (type: string) => {
    const types: Record<string, { icon: any; label: string; color: string }> = {
      match_created: {
        icon: Plus,
        label: 'Partida Criada',
        color: 'bg-blue-500',
      },
      match_participated: {
        icon: Calendar,
        label: 'Participação',
        color: 'bg-green-500',
      },
      badge_earned: {
        icon: Award,
        label: 'Badge Conquistado',
        color: 'bg-purple-500',
      },
      challenge_completed: {
        icon: Trophy,
        label: 'Desafio Completado',
        color: 'bg-yellow-500',
      },
      manual: {
        icon: TrendingUp,
        label: 'Manual',
        color: 'bg-gray-500',
      },
    };
    return types[type] || types.manual;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Histórico de XP
        </CardTitle>
        <CardDescription>
          Acompanhe como você ganhou experiência
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={setFilter} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="match_participated">Partidas</TabsTrigger>
            <TabsTrigger value="badge_earned">Badges</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="space-y-3">
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  Nenhuma transação de XP encontrada
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {filter === 'all'
                    ? 'Comece a jogar para ganhar XP!'
                    : 'Nenhuma transação deste tipo ainda'}
                </p>
              </div>
            ) : (
              transactions.map((transaction) => {
                const typeInfo = getTypeInfo(transaction.type);
                const Icon = typeInfo.icon;

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className={`h-10 w-10 rounded-full ${typeInfo.color} flex items-center justify-center text-white`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{transaction.reason}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {typeInfo.label}
                        </Badge>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(transaction.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {transaction.amount > 0 ? '+' : ''}
                        {transaction.amount} XP
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
