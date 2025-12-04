import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Player, PlayerPrediction, Position, POSITION_COLORS } from '@/types/fpl';
import { TrendingUp, AlertCircle, Star } from 'lucide-react';

interface PlayerCardProps {
  prediction: PlayerPrediction & { 
    player: Player & { 
      teams: { id: number; name: string; short_name: string } | null 
    } 
  };
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  className?: string;
}

const positionStyles: Record<Position, string> = {
  GKP: 'pos-gkp',
  DEF: 'pos-def',
  MID: 'pos-mid',
  FWD: 'pos-fwd',
};

export function PlayerCard({ prediction, isCaptain, isViceCaptain, className }: PlayerCardProps) {
  const { player } = prediction;
  const position = player.position as Position;

  const getDifficultyClass = (difficulty: number | null) => {
    if (!difficulty) return 'difficulty-3';
    return `difficulty-${Math.min(5, Math.max(1, difficulty))}`;
  };

  const getStatusIcon = () => {
    if (player.status === 'i') return <AlertCircle className="w-4 h-4 text-red-400" />;
    if (player.status === 'd') return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    return null;
  };

  return (
    <div
      className={cn(
        'relative group p-4 rounded-xl glass transition-all duration-300',
        'hover:shadow-elevated hover:scale-[1.02] hover:border-primary/30',
        'animate-fade-in',
        className
      )}
      style={{ animationDelay: `${Math.random() * 0.2}s` }}
    >
      {/* Captain/Vice Captain Badge */}
      {(isCaptain || isViceCaptain) && (
        <div className={cn(
          'absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
          isCaptain ? 'gradient-gold text-accent-foreground' : 'bg-secondary text-secondary-foreground border border-border'
        )}>
          {isCaptain ? 'C' : 'V'}
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Position Badge */}
        <Badge variant="outline" className={cn('shrink-0', positionStyles[position])}>
          {position}
        </Badge>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{player.web_name}</h3>
            {getStatusIcon()}
          </div>
          <p className="text-sm text-muted-foreground">{player.teams?.short_name || 'Unknown'}</p>
        </div>

        {/* Predicted Points */}
        <div className="text-right">
          <div className="text-2xl font-bold font-mono text-primary">
            {prediction.predicted_points.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">xPts</div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <div className="font-mono font-medium">£{player.price.toFixed(1)}m</div>
          <div className="text-xs text-muted-foreground">Price</div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 font-mono font-medium">
            <TrendingUp className="w-3 h-3 text-primary" />
            {player.form.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">Form</div>
        </div>
        <div>
          <Badge 
            variant="outline" 
            className={cn('text-xs', getDifficultyClass(prediction.fixture_difficulty))}
          >
            FDR {prediction.fixture_difficulty || '?'}
          </Badge>
        </div>
      </div>

      {/* AI Analysis */}
      {prediction.ai_analysis && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
          {prediction.ai_analysis}
        </p>
      )}
    </div>
  );
}
