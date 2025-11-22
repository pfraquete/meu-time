import { Button } from '@/components/ui/button';
import { Repeat, Plus } from 'lucide-react';
import { useLocation } from 'wouter';
import SeriesManager from '@/components/SeriesManager';

export default function MySeries() {
  const [, setLocation] = useLocation();

  return (
    <div className="container py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Repeat className="h-8 w-8" />
              Minhas Séries
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas partidas recorrentes
            </p>
          </div>
          <Button onClick={() => setLocation('/matches/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Série
          </Button>
        </div>

        {/* Series Manager */}
        <SeriesManager />
      </div>
    </div>
  );
}
