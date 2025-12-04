import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Fixture } from '@/types/fpl';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';

interface FixturesOverviewProps {
  fixtures: (Fixture & { 
    home_team: { id: number; name: string; short_name: string } | null;
    away_team: { id: number; name: string; short_name: string } | null;
  })[];
  className?: string;
}

export function FixturesOverview({ fixtures, className }: FixturesOverviewProps) {
  const getDifficultyClass = (difficulty: number | null) => {
    if (!difficulty) return 'difficulty-3';
    return `difficulty-${Math.min(5, Math.max(1, difficulty))}`;
  };

  if (fixtures.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">No fixtures for this gameweek</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {fixtures.map((fixture) => (
        <div
          key={fixture.id}
          className="flex items-center justify-between p-4 rounded-xl glass hover:border-primary/30 transition-all"
        >
          {/* Home Team */}
          <div className="flex items-center gap-3 flex-1 justify-end">
            <span className="font-medium text-right">
              {fixture.home_team?.name || 'TBD'}
            </span>
            <Badge 
              variant="outline" 
              className={cn('text-xs shrink-0', getDifficultyClass(fixture.home_team_difficulty))}
            >
              {fixture.home_team_difficulty || '?'}
            </Badge>
          </div>

          {/* Score / Time */}
          <div className="px-4 text-center shrink-0">
            {fixture.finished ? (
              <div className="font-bold font-mono text-lg">
                {fixture.home_score ?? '-'} - {fixture.away_score ?? '-'}
              </div>
            ) : fixture.kickoff_time ? (
              <div className="text-sm text-muted-foreground">
                {format(new Date(fixture.kickoff_time), 'HH:mm')}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">TBD</div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex items-center gap-3 flex-1">
            <Badge 
              variant="outline" 
              className={cn('text-xs shrink-0', getDifficultyClass(fixture.away_team_difficulty))}
            >
              {fixture.away_team_difficulty || '?'}
            </Badge>
            <span className="font-medium">
              {fixture.away_team?.name || 'TBD'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
