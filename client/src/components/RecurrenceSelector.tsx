import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RecurrenceData {
  enabled: boolean;
  type: 'weekly' | 'biweekly' | 'monthly';
  startDate: Date;
  endDate?: Date;
  maxOccurrences?: number;
}

interface RecurrenceSelectorProps {
  value: RecurrenceData;
  onChange: (value: RecurrenceData) => void;
}

export default function RecurrenceSelector({ value, onChange }: RecurrenceSelectorProps) {
  const [useEndDate, setUseEndDate] = useState(!!value.endDate);

  const handleToggle = (enabled: boolean) => {
    onChange({ ...value, enabled });
  };

  const handleTypeChange = (type: 'weekly' | 'biweekly' | 'monthly') => {
    onChange({ ...value, type });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      onChange({ ...value, startDate: date });
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    onChange({ ...value, endDate: date });
  };

  const handleMaxOccurrencesChange = (occurrences: number) => {
    onChange({ ...value, maxOccurrences: occurrences });
  };

  const getRecurrenceLabel = (type: string) => {
    const labels: Record<string, string> = {
      weekly: 'Semanal',
      biweekly: 'Quinzenal',
      monthly: 'Mensal',
    };
    return labels[type];
  };

  const getRecurrenceDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      weekly: 'A partida se repetirá toda semana no mesmo dia e horário',
      biweekly: 'A partida se repetirá a cada 2 semanas no mesmo dia e horário',
      monthly: 'A partida se repetirá todo mês no mesmo dia e horário',
    };
    return descriptions[type];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            <CardTitle>Partida Recorrente</CardTitle>
          </div>
          <Switch checked={value.enabled} onCheckedChange={handleToggle} />
        </div>
        <CardDescription>
          Crie uma série de partidas que se repetem automaticamente
        </CardDescription>
      </CardHeader>

      {value.enabled && (
        <CardContent className="space-y-6">
          {/* Tipo de Recorrência */}
          <div className="space-y-3">
            <Label>Frequência</Label>
            <RadioGroup value={value.type} onValueChange={handleTypeChange}>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="weekly" id="weekly" />
                  <Label htmlFor="weekly" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium">Semanal</p>
                      <p className="text-xs text-muted-foreground">
                        Toda semana no mesmo dia e horário
                      </p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="biweekly" id="biweekly" />
                  <Label htmlFor="biweekly" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium">Quinzenal</p>
                      <p className="text-xs text-muted-foreground">
                        A cada 2 semanas no mesmo dia e horário
                      </p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium">Mensal</p>
                      <p className="text-xs text-muted-foreground">
                        Todo mês no mesmo dia e horário
                      </p>
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Data de Início */}
          <div className="space-y-2">
            <Label>Data de Início</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value.startDate ? (
                    format(value.startDate, "PPP 'às' HH:mm", { locale: ptBR })
                  ) : (
                    <span>Selecione a data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={value.startDate}
                  onSelect={handleStartDateChange}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              A primeira partida da série será criada nesta data
            </p>
          </div>

          {/* Duração da Série */}
          <div className="space-y-3">
            <Label>Duração da Série</Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={useEndDate}
                onCheckedChange={(checked) => {
                  setUseEndDate(checked);
                  if (!checked) {
                    onChange({ ...value, endDate: undefined });
                  }
                }}
              />
              <Label>Definir data final</Label>
            </div>

            {useEndDate ? (
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {value.endDate ? (
                        format(value.endDate, 'PPP', { locale: ptBR })
                      ) : (
                        <span>Selecione a data final</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={value.endDate}
                      onSelect={handleEndDateChange}
                      initialFocus
                      locale={ptBR}
                      disabled={(date) => date < value.startDate}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  A série terminará nesta data
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="max-occurrences">Número de partidas</Label>
                <Input
                  id="max-occurrences"
                  type="number"
                  min="1"
                  max="52"
                  value={value.maxOccurrences || 12}
                  onChange={(e) => handleMaxOccurrencesChange(parseInt(e.target.value))}
                  placeholder="12"
                />
                <p className="text-xs text-muted-foreground">
                  Quantas partidas serão criadas (máximo 52)
                </p>
              </div>
            )}
          </div>

          {/* Resumo */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium">Resumo da Série</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Frequência: {getRecurrenceLabel(value.type)}</li>
              <li>
                • Início:{' '}
                {format(value.startDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </li>
              {useEndDate && value.endDate && (
                <li>
                  • Término: {format(value.endDate, 'dd/MM/yyyy', { locale: ptBR })}
                </li>
              )}
              {!useEndDate && value.maxOccurrences && (
                <li>• Total: {value.maxOccurrences} partidas</li>
              )}
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              {getRecurrenceDescription(value.type)}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
