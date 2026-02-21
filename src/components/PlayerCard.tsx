import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Player, PlayerPrediction, Position, POSITION_COLORS } from '@/types/fpl';
import { TrendingUp, AlertCircle, Star, Target, Flag, CircleDot } from 'lucide-react';

interface PlayerCardProps {
  prediction: PlayerPrediction & { 
    player: Player & { 
      teams: { id: number; name: string; short_name: string } | null;
      penalties_order?: number | null;
      corners_order?: number | null;
      direct_freekicks_order?: number | null;
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

  // Check for set piece duties
  const hasPenalties = player.penalties_order && player.penalties_order <= 2;
  const hasCorners = player.corners_order && player.corners_order <= 2;
  const hasFreeKicks = player.direct_freekicks_order && player.direct_freekicks_order <= 2;
  const hasSetPieces = hasPenalties || hasCorners || hasFreeKicks;

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
          'absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10',
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

      {/* Set Piece Icons */}
      {hasSetPieces && (
        <TooltipProvider delayDuration={300}>
          <div className="mt-2 flex items-center gap-1.5">
            {hasPenalties && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-1 rounded bg-amber-500/10 text-amber-500">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>Penalty Taker (#{player.penalties_order})</p>
                </TooltipContent>
              </Tooltip>
            )}
            {hasCorners && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-1 rounded bg-blue-500/10 text-blue-500">
                    <Flag className="w-3.5 h-3.5" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>Corner Taker (#{player.corners_order})</p>
                </TooltipContent>
              </Tooltip>
            )}
            {hasFreeKicks && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-1 rounded bg-green-500/10 text-green-500">
                    <CircleDot className="w-3.5 h-3.5" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>Free Kick Taker (#{player.direct_freekicks_order})</p>
                </TooltipContent>
              </Tooltip>
            )}
            <span className="text-[10px] text-muted-foreground ml-1">Set Pieces</span>
          </div>
        </TooltipProvider>
      )}

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
