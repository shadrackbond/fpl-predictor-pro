import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Target } from 'lucide-react';
import { POSITION_COLORS, type Position } from '@/types/fpl';

interface Player {
  id: number;
  web_name: string;
  position: Position;
  price: number;
  form: number;
  total_points: number;
  team_id: number;
  teams?: { short_name: string };
  predicted_points?: number;
}

interface UserTeamDisplayProps {
  players: Player[];
  captainId: number | null;
  viceCaptainId: number | null;
  suggestedLineup?: number[];
  predictions?: Map<number, number>;
  showOptimized?: boolean;
}

export function UserTeamDisplay({ 
  players, 
  captainId, 
  viceCaptainId, 
  suggestedLineup,
  predictions = new Map(),
  showOptimized = false
}: UserTeamDisplayProps) {
  if (!players.length) return null;

  // Determine starting XI (exactly 11) and bench (exactly 4)
  let startingXI: Player[];
  let bench: Player[];
  
  if (showOptimized && suggestedLineup && suggestedLineup.length === 11) {
    // Show optimized lineup from AI
    startingXI = players.filter(p => suggestedLineup.includes(p.id));
    bench = players.filter(p => !suggestedLineup.includes(p.id));
  } else {
    // Show current lineup - use predicted points to build a valid formation
    const sorted = [...players].sort((a, b) => {
      const ptsA = predictions.get(a.id) || a.total_points || 0;
      const ptsB = predictions.get(b.id) || b.total_points || 0;
      return ptsB - ptsA;
    });
    
    // Ensure valid formation: 1 GK, 3+ DEF, 2+ MID, 1+ FWD
    const gk = sorted.find(p => p.position === 'GKP');
    const defs = sorted.filter(p => p.position === 'DEF');
    const mids = sorted.filter(p => p.position === 'MID');
    const fwds = sorted.filter(p => p.position === 'FWD');
    
    startingXI = [];
    if (gk) startingXI.push(gk);
    defs.slice(0, 3).forEach(p => startingXI.push(p));
    mids.slice(0, 2).forEach(p => startingXI.push(p));
    fwds.slice(0, 1).forEach(p => startingXI.push(p));
    
    // Fill remaining spots
    const remaining = [...defs.slice(3), ...mids.slice(2), ...fwds.slice(1)]
      .filter(p => !startingXI.includes(p))
      .sort((a, b) => (predictions.get(b.id) || 0) - (predictions.get(a.id) || 0));
    
    while (startingXI.length < 11 && remaining.length > 0) {
      startingXI.push(remaining.shift()!);
    }
    
    bench = players.filter(p => !startingXI.includes(p));
  }
  
  // Ensure bench has exactly 4 players
  bench = bench.slice(0, 4);

  // Group starting XI by position
  const startingByPosition = {
    GKP: startingXI.filter(p => p.position === 'GKP'),
    DEF: startingXI.filter(p => p.position === 'DEF'),
    MID: startingXI.filter(p => p.position === 'MID'),
    FWD: startingXI.filter(p => p.position === 'FWD'),
  };

  const positionOrder: Position[] = ['GKP', 'DEF', 'MID', 'FWD'];
  const positionLabels = {
    GKP: 'GK',
    DEF: 'DEF',
    MID: 'MID',
    FWD: 'FWD',
  };

  const PlayerCard = ({ player, isStarting = true }: { player: Player; isStarting?: boolean }) => {
    const predictedPts = predictions.get(player.id) || 0;
    const isCaptain = player.id === captainId;
    const isViceCaptain = player.id === viceCaptainId;
    
    return (
      <div 
        className={`aspect-square p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors flex flex-col justify-between ${!isStarting ? 'opacity-60' : ''}`}
      >
        <div className="flex items-center justify-between">
          <Badge 
            variant="outline" 
            className={`text-[10px] px-1 py-0 ${POSITION_COLORS[player.position]}`}
          >
            {positionLabels[player.position]}
          </Badge>
          <div className="flex gap-1">
            {isCaptain && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-primary">C</Badge>
            )}
            {isViceCaptain && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">V</Badge>
            )}
          </div>
        </div>
        
        <div className="text-center">
          <p className="font-semibold text-sm truncate">{player.web_name}</p>
          <p className="text-[10px] text-muted-foreground">
            {player.teams?.short_name || 'N/A'}
          </p>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">£{player.price.toFixed(1)}M</span>
          <div className="text-right">
            {predictedPts > 0 ? (
              <span className="font-semibold text-primary">{predictedPts.toFixed(1)} pts</span>
            ) : (
              <span className="text-muted-foreground">{player.total_points} pts</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Calculate total predicted points
  const totalPredicted = startingXI.reduce((sum, p) => {
    const pts = predictions.get(p.id) || 0;
    // Double captain points
    if (p.id === captainId) return sum + (pts * 2);
    return sum + pts;
  }, 0);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {showOptimized ? 'Optimized Lineup' : 'Current Lineup'}
          </CardTitle>
          {totalPredicted > 0 && (
            <Badge variant="secondary" className="text-sm gap-1">
              <Target className="w-3 h-3" />
              {totalPredicted.toFixed(1)} predicted pts
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Starting XI */}
          {positionOrder.map(position => {
            const posPlayers = startingByPosition[position];
            if (posPlayers.length === 0) return null;
            
            return (
              <div key={position}>
                <h4 className={`text-xs font-semibold mb-2 ${POSITION_COLORS[position]}`}>
                  {position === 'GKP' ? 'Goalkeeper' : 
                   position === 'DEF' ? 'Defenders' : 
                   position === 'MID' ? 'Midfielders' : 'Forwards'}
                </h4>
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {posPlayers.map(player => (
                    <PlayerCard key={player.id} player={player} isStarting={true} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Bench */}
          {bench.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold mb-2 text-muted-foreground">
                Bench
              </h4>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                {bench.map(player => (
                  <PlayerCard key={player.id} player={player} isStarting={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
