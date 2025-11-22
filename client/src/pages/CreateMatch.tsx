import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { addWeeks, addMonths, format } from 'date-fns';
import { Repeat, Info } from 'lucide-react';

interface Sport {
  id: string;
  name: string;
  icon: string;
  min_players: number;
  max_players: number;
}

export default function CreateMatch() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(false);
  const [enableRecurrence, setEnableRecurrence] = useState(false);
  const [formData, setFormData] = useState({
    sport_id: '',
    title: '',
    description: '',
    match_date: '',
    duration_minutes: 90,
    min_players: 10,
    max_players: 22,
    price: 0,
    skill_level: 'any',
    gender: 'mixed',
    recurrence: 'none',
    recurrence_end_date: '',
    occurrences_count: 4,
  });

  useEffect(() => {
    fetchSports();
  }, []);

  const fetchSports = async () => {
    const { data, error } = await supabase
      .from('sports')
      .select('*')
      .order('name');

    if (!error && data) {
      setSports(data);
    }
  };

  const handleSportChange = (sportId: string) => {
    const sport = sports.find(s => s.id === sportId);
    if (sport) {
      setFormData(prev => ({
        ...prev,
        sport_id: sportId,
        min_players: sport.min_players,
        max_players: sport.max_players,
      }));
    }
  };

  const generateRecurringMatches = () => {
    if (!enableRecurrence || formData.recurrence === 'none') {
      return [formData.match_date];
    }

    const dates: string[] = [];
    const startDate = new Date(formData.match_date);
    const { occurrences_count, recurrence } = formData;

    for (let i = 0; i < occurrences_count; i++) {
      let nextDate: Date;

      if (i === 0) {
        nextDate = startDate;
      } else {
        switch (recurrence) {
          case 'weekly':
            nextDate = addWeeks(startDate, i);
            break;
          case 'biweekly':
            nextDate = addWeeks(startDate, i * 2);
            break;
          case 'monthly':
            nextDate = addMonths(startDate, i);
            break;
          default:
            nextDate = startDate;
        }
      }

      dates.push(nextDate.toISOString());
    }

    return dates;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const matchDates = generateRecurringMatches();
      const matches = matchDates.map(date => ({
        sport_id: formData.sport_id,
        title: formData.title,
        description: formData.description,
        match_date: date,
        duration_minutes: formData.duration_minutes,
        min_players: formData.min_players,
        max_players: formData.max_players,
        price: formData.price,
        skill_level: formData.skill_level,
        gender: formData.gender,
        organizer_id: user.id,
        status: 'open',
        current_players: 0,
        recurrence: enableRecurrence ? formData.recurrence : 'none',
        recurrence_end_date: enableRecurrence && matchDates.length > 0
          ? matchDates[matchDates.length - 1]
          : null,
      }));

      const { error } = await supabase.from('matches').insert(matches);

      if (error) throw error;

      if (matches.length > 1) {
        toast.success(`${matches.length} partidas criadas com sucesso!`);
      } else {
        toast.success('Partida criada com sucesso!');
      }

      setLocation('/matches');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar partida');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Criar Nova Partida</CardTitle>
          <CardDescription>
            Preencha os detalhes da partida que você quer organizar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="sport">Esporte *</Label>
              <Select
                value={formData.sport_id}
                onValueChange={handleSportChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o esporte" />
                </SelectTrigger>
                <SelectContent>
                  {sports.map((sport) => (
                    <SelectItem key={sport.id} value={sport.id}>
                      {sport.icon} {sport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título da Partida *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Futebol no Parque"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes sobre a partida..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="match_date">Data e Hora *</Label>
                <Input
                  id="match_date"
                  type="datetime-local"
                  value={formData.match_date}
                  onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duração (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                  min={30}
                  step={15}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="min_players">Mínimo de Jogadores</Label>
                <Input
                  id="min_players"
                  type="number"
                  value={formData.min_players}
                  onChange={(e) => setFormData({ ...formData, min_players: parseInt(e.target.value) })}
                  min={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_players">Máximo de Jogadores</Label>
                <Input
                  id="max_players"
                  type="number"
                  value={formData.max_players}
                  onChange={(e) => setFormData({ ...formData, max_players: parseInt(e.target.value) })}
                  min={formData.min_players}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="skill_level">Nível de Habilidade</Label>
                <Select
                  value={formData.skill_level}
                  onValueChange={(value) => setFormData({ ...formData, skill_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Qualquer nível</SelectItem>
                    <SelectItem value="beginner">Iniciante</SelectItem>
                    <SelectItem value="intermediate">Intermediário</SelectItem>
                    <SelectItem value="advanced">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gênero</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Misto</SelectItem>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Valor por Jogador (R$)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                min={0}
                step={0.01}
              />
            </div>

            {/* Seção de Recorrência */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-recurrence" className="flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    Partida Recorrente
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Crie múltiplas partidas com a mesma configuração
                  </p>
                </div>
                <Switch
                  id="enable-recurrence"
                  checked={enableRecurrence}
                  onCheckedChange={setEnableRecurrence}
                />
              </div>

              {enableRecurrence && (
                <div className="space-y-4 pl-4 border-l-2">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="recurrence">Frequência</Label>
                      <Select
                        value={formData.recurrence}
                        onValueChange={(value) => setFormData({ ...formData, recurrence: value })}
                      >
                        <SelectTrigger id="recurrence">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="biweekly">Quinzenal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="occurrences">Número de Ocorrências</Label>
                      <Input
                        id="occurrences"
                        type="number"
                        value={formData.occurrences_count}
                        onChange={(e) => setFormData({ ...formData, occurrences_count: parseInt(e.target.value) })}
                        min={2}
                        max={52}
                      />
                    </div>
                  </div>

                  {formData.match_date && formData.recurrence !== 'none' && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Preview das datas:</strong>
                        <ul className="mt-2 space-y-1 text-sm">
                          {generateRecurringMatches().slice(0, 5).map((date, index) => (
                            <li key={index}>
                              {index + 1}. {format(new Date(date), "dd/MM/yyyy 'às' HH:mm")}
                            </li>
                          ))}
                          {generateRecurringMatches().length > 5 && (
                            <li className="text-muted-foreground">
                              ... e mais {generateRecurringMatches().length - 5} partidas
                            </li>
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Partida'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/matches')}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
