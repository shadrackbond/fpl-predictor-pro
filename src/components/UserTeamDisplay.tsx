import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
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
}

interface UserTeamDisplayProps {
  players: Player[];
  captainId: number | null;
  viceCaptainId: number | null;
}

export function UserTeamDisplay({ players, captainId, viceCaptainId }: UserTeamDisplayProps) {
  if (!players.length) return null;

  // Group players by position
  const byPosition = {
    GKP: players.filter(p => p.position === 'GKP'),
    DEF: players.filter(p => p.position === 'DEF'),
    MID: players.filter(p => p.position === 'MID'),
    FWD: players.filter(p => p.position === 'FWD'),
  };

  const positionOrder: Position[] = ['GKP', 'DEF', 'MID', 'FWD'];

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Your Squad
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {positionOrder.map(position => (
            <div key={position}>
              <h4 className={`text-sm font-semibold mb-2 ${POSITION_COLORS[position]}`}>
                {position === 'GKP' ? 'Goalkeepers' : 
                 position === 'DEF' ? 'Defenders' : 
                 position === 'MID' ? 'Midfielders' : 'Forwards'}
              </h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {byPosition[position].map(player => (
                  <div 
                    key={player.id}
                    className={`p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{player.web_name}</span>
                          {player.id === captainId && (
                            <Badge variant="default" className="text-xs px-1.5 py-0">C</Badge>
                          )}
                          {player.id === viceCaptainId && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">V</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {player.teams?.short_name || 'N/A'} • £{player.price.toFixed(1)}M
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">{player.total_points}</p>
                        <p className="text-xs text-muted-foreground">Form: {player.form}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
