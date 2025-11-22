import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Filter, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { MatchFilters } from '@/hooks/useMatchFilters';

interface MatchFiltersPanelProps {
  filters: MatchFilters;
  onFilterChange: (key: keyof MatchFilters, value: any) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export default function MatchFiltersPanel({
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: MatchFiltersPanelProps) {
  const [sports, setSports] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadSports();
  }, []);

  const loadSports = async () => {
    const { data } = await supabase
      .from('sports')
      .select('*')
      .order('name');
    
    if (data) setSports(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              Ativos
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Limpar filtros
          </Button>
        )}
      </div>

      {isOpen && (
        <Card>
          <CardHeader>
            <CardTitle>Filtrar Partidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Esporte */}
            <div className="space-y-2">
              <Label>Esporte</Label>
              <Select
                value={filters.sport_id || 'all'}
                onValueChange={(value) =>
                  onFilterChange('sport_id', value === 'all' ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os esportes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os esportes</SelectItem>
                  {sports.map((sport) => (
                    <SelectItem key={sport.id} value={sport.id}>
                      {sport.icon} {sport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data inicial</Label>
                <Input
                  type="date"
                  value={filters.date_from || ''}
                  onChange={(e) => onFilterChange('date_from', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data final</Label>
                <Input
                  type="date"
                  value={filters.date_to || ''}
                  onChange={(e) => onFilterChange('date_to', e.target.value)}
                />
              </div>
            </div>

            {/* Nível de habilidade */}
            <div className="space-y-2">
              <Label>Nível de habilidade</Label>
              <Select
                value={filters.skill_level || 'all'}
                onValueChange={(value) =>
                  onFilterChange('skill_level', value === 'all' ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os níveis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os níveis</SelectItem>
                  <SelectItem value="beginner">Iniciante</SelectItem>
                  <SelectItem value="intermediate">Intermediário</SelectItem>
                  <SelectItem value="advanced">Avançado</SelectItem>
                  <SelectItem value="any">Qualquer nível</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preço máximo */}
            <div className="space-y-2">
              <Label>
                Preço máximo: R$ {filters.price_max || 0}
              </Label>
              <Slider
                value={[filters.price_max || 0]}
                onValueChange={([value]) => onFilterChange('price_max', value)}
                max={200}
                step={10}
                className="w-full"
              />
            </div>

            {/* Cidade */}
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                type="text"
                placeholder="Digite a cidade"
                value={filters.city || ''}
                onChange={(e) => onFilterChange('city', e.target.value)}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  onFilterChange('status', value === 'all' ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Abertas</SelectItem>
                  <SelectItem value="confirmed">Confirmadas</SelectItem>
                  <SelectItem value="full">Cheias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
