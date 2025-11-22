import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface MatchFilters {
  sport_id?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  skill_level?: string | null;
  price_max?: number | null;
  city?: string | null;
  status?: string | null;
}

export function useMatchFilters(initialFilters: MatchFilters = {}) {
  const [filters, setFilters] = useState<MatchFilters>(initialFilters);

  const { data: matches, isLoading, error, refetch } = useQuery({
    queryKey: ['matches', 'filtered', filters],
    queryFn: async () => {
      let query = supabase
        .from('matches')
        .select(`
          *,
          sport:sports(*),
          venue:venues(*),
          organizer:profiles!matches_organizer_id_fkey(id, name, avatar_url),
          participants:match_participants(count)
        `)
        .gte('match_date', new Date().toISOString())
        .order('match_date', { ascending: true });

      // Aplicar filtros
      if (filters.sport_id) {
        query = query.eq('sport_id', filters.sport_id);
      }

      if (filters.date_from) {
        query = query.gte('match_date', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('match_date', filters.date_to);
      }

      if (filters.skill_level && filters.skill_level !== 'any') {
        query = query.eq('skill_level', filters.skill_level);
      }

      if (filters.price_max !== null && filters.price_max !== undefined) {
        query = query.lte('price', filters.price_max);
      }

      if (filters.city) {
        query = query.ilike('venue.city', `%${filters.city}%`);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      } else {
        // Por padrão, mostrar apenas partidas abertas
        query = query.in('status', ['open', 'confirmed']);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: false,
  });

  const updateFilter = (key: keyof MatchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => value !== null && value !== undefined && value !== '');
  }, [filters]);

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    matches: matches || [],
    isLoading,
    error,
    refetch,
  };
}
