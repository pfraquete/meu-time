import { Trophy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChallengesCard from '@/components/ChallengesCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Challenges() {
  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8" />
            Desafios
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete desafios para ganhar XP e badges exclusivos
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Ativos</TabsTrigger>
            <TabsTrigger value="completed">Completados</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <ChallengesCard />
          </TabsContent>

          <TabsContent value="completed">
            <Card>
              <CardHeader>
                <CardTitle>Desafios Completados</CardTitle>
                <CardDescription>
                  Parabéns por completar estes desafios!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    Você ainda não completou nenhum desafio
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Continue jogando para completar seus primeiros desafios!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <div className="space-y-6">
              <ChallengesCard />
              
              {/* Info sobre desafios futuros */}
              <Card>
                <CardHeader>
                  <CardTitle>Novos Desafios em Breve</CardTitle>
                  <CardDescription>
                    Estamos preparando mais desafios para você!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Novos desafios são adicionados regularmente. Fique atento às atualizações!
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
