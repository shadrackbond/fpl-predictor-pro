import { cn } from '@/lib/utils';
import { TeamRatingCircle } from './TeamRatingCircle';
import { PlayerCard } from './PlayerCard';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { OptimalTeam, PlayerPrediction, Player } from '@/types/fpl';
import { Users, Trophy, Target } from 'lucide-react';

interface OptimalTeamViewProps {
  optimalTeam: OptimalTeam | null;
  predictions: (PlayerPrediction & { player: Player & { teams: { id: number; name: string; short_name: string } | null } })[];
  isLoading?: boolean;
  className?: string;
}

export function OptimalTeamView({ optimalTeam, predictions, isLoading, className }: OptimalTeamViewProps) {
  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex justify-center">
          <Skeleton className="w-48 h-48 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(11)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!optimalTeam) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Trophy className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-semibold text-muted-foreground">No Optimal Team Generated</h3>
        <p className="text-muted-foreground mt-2">Generate predictions to see the optimal team</p>
      </div>
    );
  }

  // Get starting XI predictions
  const startingXIPredictions = predictions.filter(p => 
    optimalTeam.starting_xi.includes(p.player_id)
  );

  // Group by position
  const byPosition = {
    GKP: startingXIPredictions.filter(p => p.player?.position === 'GKP'),
    DEF: startingXIPredictions.filter(p => p.player?.position === 'DEF'),
    MID: startingXIPredictions.filter(p => p.player?.position === 'MID'),
    FWD: startingXIPredictions.filter(p => p.player?.position === 'FWD'),
  };

  return (
    <div className={cn('space-y-8', className)}>
      {/* Team Rating Header */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8 p-6 rounded-2xl glass">
        <div className="flex flex-col items-center lg:items-start gap-2">
          <h2 className="text-2xl font-bold">Team Performance Rating</h2>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-4 py-1">
              <Users className="w-4 h-4 mr-2" />
              {optimalTeam.formation}
            </Badge>
            <Badge variant="outline" className="text-lg px-4 py-1">
              <Target className="w-4 h-4 mr-2" />
              {optimalTeam.total_predicted_points.toFixed(1)} xPts
            </Badge>
          </div>
        </div>
        <TeamRatingCircle rating={optimalTeam.team_rating} />
      </div>

      {/* AI Analysis */}
      {optimalTeam.analysis && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <h3 className="font-semibold text-primary mb-2">AI Analysis</h3>
          <p className="text-muted-foreground">{optimalTeam.analysis}</p>
        </div>
      )}

      {/* Formation Display */}
      <div className="space-y-6">
        {/* Forwards */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Forwards</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
            {byPosition.FWD.map(pred => (
              <PlayerCard
                key={pred.id}
                prediction={pred}
                isCaptain={pred.player_id === optimalTeam.captain_id}
                isViceCaptain={pred.player_id === optimalTeam.vice_captain_id}
                className="w-full max-w-sm"
              />
            ))}
          </div>
        </div>

        {/* Midfielders */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Midfielders</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {byPosition.MID.map(pred => (
              <PlayerCard
                key={pred.id}
                prediction={pred}
                isCaptain={pred.player_id === optimalTeam.captain_id}
                isViceCaptain={pred.player_id === optimalTeam.vice_captain_id}
              />
            ))}
          </div>
        </div>

        {/* Defenders */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Defenders</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {byPosition.DEF.map(pred => (
              <PlayerCard
                key={pred.id}
                prediction={pred}
                isCaptain={pred.player_id === optimalTeam.captain_id}
                isViceCaptain={pred.player_id === optimalTeam.vice_captain_id}
              />
            ))}
          </div>
        </div>

        {/* Goalkeeper */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Goalkeeper</h3>
          <div className="flex justify-center">
            {byPosition.GKP.map(pred => (
              <PlayerCard
                key={pred.id}
                prediction={pred}
                isCaptain={pred.player_id === optimalTeam.captain_id}
                isViceCaptain={pred.player_id === optimalTeam.vice_captain_id}
                className="w-full max-w-sm"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
