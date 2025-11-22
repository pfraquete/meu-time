import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface MatchFilters {
  search: string;
  sportId: string;
  skillLevel: string;
  priceRange: string;
  dateRange: string;
}

interface MatchFiltersProps {
  filters: MatchFilters;
  onFiltersChange: (filters: MatchFilters) => void;
  sports: { id: string; name: string; icon: string }[];
}

export default function MatchFiltersComponent({ filters, onFiltersChange, sports }: MatchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleSportChange = (value: string) => {
    onFiltersChange({ ...filters, sportId: value });
  };

  const handleSkillLevelChange = (value: string) => {
    onFiltersChange({ ...filters, skillLevel: value });
  };

  const handlePriceRangeChange = (value: string) => {
    onFiltersChange({ ...filters, priceRange: value });
  };

  const handleDateRangeChange = (value: string) => {
    onFiltersChange({ ...filters, dateRange: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      sportId: 'all',
      skillLevel: 'all',
      priceRange: 'all',
      dateRange: 'all',
    });
  };

  const hasActiveFilters =
    filters.search !== '' ||
    filters.sportId !== 'all' ||
    filters.skillLevel !== 'all' ||
    filters.priceRange !== 'all' ||
    filters.dateRange !== 'all';

  return (
    <div className="space-y-4">
      {/* Busca sempre visível */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar partidas por título ou descrição..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 pr-4"
        />
      </div>

      {/* Filtros avançados colapsáveis */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros Avançados
                {hasActiveFilters && (
                  <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    Ativos
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">
                {isOpen ? '▼' : '▶'}
              </span>
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="space-y-4 pt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Filtro por Esporte */}
              <div className="space-y-2">
                <Label htmlFor="sport">Esporte</Label>
                <Select value={filters.sportId} onValueChange={handleSportChange}>
                  <SelectTrigger id="sport">
                    <SelectValue placeholder="Todos os esportes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os esportes</SelectItem>
                    {sports.map((sport) => (
                      <SelectItem key={sport.id} value={sport.id}>
                        <span className="flex items-center gap-2">
                          <span>{sport.icon}</span>
                          <span>{sport.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Período */}
              <div className="space-y-2">
                <Label htmlFor="date">Período</Label>
                <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
                  <SelectTrigger id="date">
                    <SelectValue placeholder="Todos os períodos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os períodos</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="tomorrow">Amanhã</SelectItem>
                    <SelectItem value="this-week">Esta semana</SelectItem>
                    <SelectItem value="next-week">Próxima semana</SelectItem>
                    <SelectItem value="this-month">Este mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Nível */}
              <div className="space-y-2">
                <Label htmlFor="skill">Nível de Habilidade</Label>
                <Select value={filters.skillLevel} onValueChange={handleSkillLevelChange}>
                  <SelectTrigger id="skill">
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

              {/* Filtro por Preço */}
              <div className="space-y-2">
                <Label htmlFor="price">Preço</Label>
                <Select value={filters.priceRange} onValueChange={handlePriceRangeChange}>
                  <SelectTrigger id="price">
                    <SelectValue placeholder="Todos os preços" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os preços</SelectItem>
                    <SelectItem value="free">Gratuito</SelectItem>
                    <SelectItem value="0-50">Até R$ 50</SelectItem>
                    <SelectItem value="50-100">R$ 50 - R$ 100</SelectItem>
                    <SelectItem value="100+">Acima de R$ 100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Botão Limpar Filtros */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
