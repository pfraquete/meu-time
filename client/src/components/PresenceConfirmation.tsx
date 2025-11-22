import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { differenceInHours, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface PresenceConfirmationProps {
  matchId: string;
  matchDate: string;
  participantId: string;
  confirmedPresence: boolean;
  confirmationDate: string | null;
  onConfirm: () => void;
}

export default function PresenceConfirmation({
  matchId,
  matchDate,
  participantId,
  confirmedPresence,
  confirmationDate,
  onConfirm,
}: PresenceConfirmationProps) {
  const [loading, setLoading] = useState(false);

  const matchDateTime = new Date(matchDate);
  const hoursUntilMatch = differenceInHours(matchDateTime, new Date());
  const needsConfirmation = hoursUntilMatch <= 48 && hoursUntilMatch > 0;
  const isMatchPast = hoursUntilMatch < 0;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('match_participants')
        .update({
          confirmed_presence: true,
          confirmation_date: new Date().toISOString(),
        })
        .eq('id', participantId);

      if (error) throw error;

      toast.success('Presença confirmada!');
      onConfirm();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao confirmar presença');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('match_participants')
        .delete()
        .eq('id', participantId);

      if (error) throw error;

      toast.success('Você saiu da partida');
      onConfirm();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sair da partida');
    } finally {
      setLoading(false);
    }
  };

  // Não mostrar se a partida já passou
  if (isMatchPast) return null;

  // Já confirmou
  if (confirmedPresence && confirmationDate) {
    return (
      <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            Presença Confirmada
          </CardTitle>
          <CardDescription>
            Confirmado em {format(new Date(confirmationDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Sua presença está confirmada para esta partida. Não esqueça de comparecer!
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={loading}
            className="text-red-600 hover:text-red-700"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancelar Participação
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Precisa confirmar (48h antes)
  if (needsConfirmation) {
    return (
      <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-5 w-5" />
            Confirmação de Presença Necessária
          </CardTitle>
          <CardDescription>
            A partida acontece em {hoursUntilMatch} horas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Por favor, confirme sua presença para garantir sua vaga. Caso não confirme, sua vaga
              poderá ser liberada para outros jogadores.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={handleConfirm} disabled={loading} className="flex-1">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmar Presença
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="text-red-600 hover:text-red-700"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Não Vou
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            ⚠️ Atenção: Faltar sem avisar pode resultar em penalidades
          </p>
        </CardContent>
      </Card>
    );
  }

  // Confirmação ainda não necessária
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Confirmação de Presença
        </CardTitle>
        <CardDescription>
          Você precisará confirmar sua presença 48 horas antes da partida
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm">Status</span>
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              Aguardando
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Você receberá uma notificação quando for necessário confirmar sua presença.
          </p>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={loading}
            className="w-full text-red-600 hover:text-red-700"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancelar Participação
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
