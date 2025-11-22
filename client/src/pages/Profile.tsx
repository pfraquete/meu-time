import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { User, Trophy, Calendar } from 'lucide-react';
import AvatarUpload from '@/components/AvatarUpload';

interface PlayerStats {
  sport_name: string;
  sport_icon: string;
  matches_played: number;
  matches_organized: number;
  attendance_rate: number;
  average_rating: number;
}

export default function Profile() {
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    bio: profile?.bio || '',
    phone: profile?.phone || '',
    city: profile?.city || '',
    state: profile?.state || '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        bio: profile.bio || '',
        phone: profile.phone || '',
        city: profile.city || '',
        state: profile.state || '',
      });
    }
    fetchStats();
  }, [profile]);

  const fetchStats = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('player_stats')
      .select(`
        *,
        sport:sports(name, icon)
      `)
      .eq('user_id', user.id);

    if (!error && data) {
      setStats(
        data.map((stat: any) => ({
          sport_name: stat.sport.name,
          sport_icon: stat.sport.icon,
          matches_played: stat.matches_played,
          matches_organized: stat.matches_organized,
          attendance_rate: stat.attendance_rate,
          average_rating: stat.average_rating,
        }))
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateProfile(formData);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="stats">
            <Trophy className="h-4 w-4 mr-2" />
            Estatísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar Upload */}
                <div className="flex justify-center">
                  <AvatarUpload
                    avatarUrl={profile?.avatar_url || null}
                    userName={profile?.name || user?.email || 'Usuário'}
                    onUploadComplete={refreshProfile}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Seu nome"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Conte um pouco sobre você..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Sua cidade"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Minhas Estatísticas</CardTitle>
              <CardDescription>
                Acompanhe seu desempenho em cada esporte
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Você ainda não participou de nenhuma partida.</p>
                  <p className="text-sm mt-2">
                    Comece a jogar para ver suas estatísticas aqui!
                  </p>
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
      </Tabs>
    </div>
  );
}
