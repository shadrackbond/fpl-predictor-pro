import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  Users,
  Zap,
  Target,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Player {
  id: number;
  web_name: string;
  position: string;
  price: number;
  form: number;
  total_points: number;
  team_id: number;
  teams?: { short_name: string };
  status?: string;
  predicted_points?: number;
}

interface TeamAnalysis {
  rating: number;
  weakPositions: { position: string; reason: string }[];
  riskyPicks: { player: Player; risk: string; severity: 'high' | 'medium' | 'low' }[];
  overexposure: { team: string; count: number; players: string[] }[];
  improvements: { title: string; description: string; priority: 'high' | 'medium' | 'low' }[];
}

interface SmartTeamAnalyzerProps {
  players: Player[];
  predictions: Map<number, number>;
  captainId: number | null;
  className?: string;
}

export function SmartTeamAnalyzer({ 
  players, 
  predictions, 
  captainId,
  className 
}: SmartTeamAnalyzerProps) {
  const analysis = useMemo<TeamAnalysis>(() => {
    if (!players.length) {
      return {
        rating: 0,
        weakPositions: [],
        riskyPicks: [],
        overexposure: [],
        improvements: [],
      };
    }

    let rating = 70; // Base rating
    const weakPositions: TeamAnalysis['weakPositions'] = [];
    const riskyPicks: TeamAnalysis['riskyPicks'] = [];
    const overexposure: TeamAnalysis['overexposure'] = [];
    const improvements: TeamAnalysis['improvements'] = [];

    // Analyze by position
    const positionGroups: Record<string, Player[]> = {
      GKP: players.filter(p => p.position === 'GKP'),
      DEF: players.filter(p => p.position === 'DEF'),
      MID: players.filter(p => p.position === 'MID'),
      FWD: players.filter(p => p.position === 'FWD'),
    };

    // Check weak positions (low form/predicted points)
    Object.entries(positionGroups).forEach(([pos, posPlayers]) => {
      const avgForm = posPlayers.reduce((sum, p) => sum + (p.form || 0), 0) / posPlayers.length;
      const avgPredicted = posPlayers.reduce((sum, p) => sum + (predictions.get(p.id) || 0), 0) / posPlayers.length;
      
      if (avgForm < 3) {
        weakPositions.push({
          position: pos,
          reason: `Average form only ${avgForm.toFixed(1)} - consider upgrades`,
        });
        rating -= 5;
      }
      
      if (avgPredicted < 3 && posPlayers.length > 0) {
        rating -= 3;
      }
    });

    // Identify risky picks
    players.forEach(player => {
      // Injury/availability risk
      if (player.status && player.status !== 'a') {
        riskyPicks.push({
          player,
          risk: `Status: ${player.status === 'd' ? 'Doubtful' : player.status === 'i' ? 'Injured' : 'Unavailable'}`,
          severity: player.status === 'i' ? 'high' : 'medium',
        });
        rating -= player.status === 'i' ? 8 : 4;
      }

      // Low form risk
      if ((player.form || 0) < 2 && player.price > 6) {
        riskyPicks.push({
          player,
          risk: `Low form (${player.form?.toFixed(1) || '0'}) for premium price (£${player.price}M)`,
          severity: 'medium',
        });
        rating -= 3;
      }

      // Rotation risk (low minutes implied by low form + status)
      const predicted = predictions.get(player.id) || 0;
      if (predicted < 2 && player.price > 5) {
        riskyPicks.push({
          player,
          risk: `Low predicted points (${predicted.toFixed(1)}) - potential rotation risk`,
          severity: 'low',
        });
        rating -= 2;
      }
    });

    // Check team overexposure (more than 3 from same team is max, flag 3)
    const teamCounts: Record<string, { count: number; players: string[] }> = {};
    players.forEach(p => {
      const teamName = p.teams?.short_name || `Team ${p.team_id}`;
      if (!teamCounts[teamName]) {
        teamCounts[teamName] = { count: 0, players: [] };
      }
      teamCounts[teamName].count++;
      teamCounts[teamName].players.push(p.web_name);
    });

    Object.entries(teamCounts).forEach(([team, data]) => {
      if (data.count >= 3) {
        overexposure.push({
          team,
          count: data.count,
          players: data.players,
        });
        rating -= (data.count - 2) * 3;
      }
    });

    // Generate improvement suggestions
    if (weakPositions.length > 0) {
      improvements.push({
        title: 'Strengthen Weak Positions',
        description: `Consider upgrading ${weakPositions.map(w => w.position).join(', ')} - low form in these areas`,
        priority: 'high',
      });
    }

    if (riskyPicks.filter(r => r.severity === 'high').length > 0) {
      improvements.push({
        title: 'Address Injury Concerns',
        description: `${riskyPicks.filter(r => r.severity === 'high').map(r => r.player.web_name).join(', ')} may not play - find replacements`,
        priority: 'high',
      });
    }

    if (overexposure.length > 0) {
      improvements.push({
        title: 'Diversify Team Selection',
        description: `Heavy reliance on ${overexposure[0].team} (${overexposure[0].count} players) - consider spreading risk`,
        priority: 'medium',
      });
    }

    // Check captain choice
    const captainPlayer = players.find(p => p.id === captainId);
    if (captainPlayer) {
      const captainPredicted = predictions.get(captainPlayer.id) || 0;
      const maxPredicted = Math.max(...players.map(p => predictions.get(p.id) || 0));
      
      if (captainPredicted < maxPredicted - 1) {
        improvements.push({
          title: 'Optimize Captain Choice',
          description: `${captainPlayer.web_name} may not be optimal - consider players with higher predicted points`,
          priority: 'medium',
        });
        rating -= 3;
      } else {
        rating += 5; // Bonus for good captain choice
      }
    }

    // Add points for high predicted total
    const totalPredicted = players.reduce((sum, p) => sum + (predictions.get(p.id) || 0), 0);
    if (totalPredicted > 60) rating += 10;
    else if (totalPredicted > 50) rating += 5;

    // Clamp rating
    rating = Math.max(0, Math.min(100, rating));

    return {
      rating: Math.round(rating),
      weakPositions,
      riskyPicks: riskyPicks.slice(0, 5),
      overexposure,
      improvements: improvements.slice(0, 3),
    };
  }, [players, predictions, captainId]);

  const getRatingColor = (rating: number) => {
    if (rating >= 80) return 'text-emerald-500';
    if (rating >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getRatingBg = (rating: number) => {
    if (rating >= 80) return 'bg-emerald-500';
    if (rating >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const severityConfig = {
    high: { color: 'text-red-500 bg-red-500/10 border-red-500/30', icon: AlertTriangle },
    medium: { color: 'text-amber-500 bg-amber-500/10 border-amber-500/30', icon: AlertCircle },
    low: { color: 'text-blue-500 bg-blue-500/10 border-blue-500/30', icon: Target },
  };

  if (!players.length) return null;

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Smart Team Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Rating */}
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/20"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${analysis.rating * 2.83} 283`}
                strokeLinecap="round"
                className={getRatingColor(analysis.rating)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("text-2xl font-bold", getRatingColor(analysis.rating))}>
                {analysis.rating}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Team Rating</h3>
            <p className="text-sm text-muted-foreground">
              {analysis.rating >= 80 ? 'Excellent squad composition' :
               analysis.rating >= 60 ? 'Solid team with room to improve' :
               'Consider making changes to strengthen your team'}
            </p>
            <Progress 
              value={analysis.rating} 
              className="mt-2 h-2"
            />
          </div>
        </div>

        {/* Issues Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Risky Picks */}
          {analysis.riskyPicks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Risky Picks
              </h4>
              <div className="space-y-1.5">
                {analysis.riskyPicks.map((risk, i) => {
                  const config = severityConfig[risk.severity];
                  const Icon = config.icon;
                  return (
                    <div 
                      key={i}
                      className={cn("p-2 rounded-lg text-xs border flex items-start gap-2", config.color)}
                    >
                      <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">{risk.player.web_name}</span>
                        <p className="opacity-80">{risk.risk}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Team Overexposure */}
          {analysis.overexposure.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Team Concentration
              </h4>
              <div className="space-y-1.5">
                {analysis.overexposure.map((exp, i) => (
                  <div 
                    key={i}
                    className="p-2 rounded-lg text-xs bg-blue-500/10 border border-blue-500/30 text-blue-500"
                  >
                    <span className="font-medium">{exp.team}</span>
                    <span className="opacity-80"> - {exp.count} players: {exp.players.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Improvements */}
        {analysis.improvements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Suggested Improvements
            </h4>
            <div className="space-y-2">
              {analysis.improvements.map((imp, i) => (
                <div 
                  key={i}
                  className="p-3 rounded-lg bg-primary/5 border border-primary/10"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        imp.priority === 'high' && "border-red-500/50 text-red-500",
                        imp.priority === 'medium' && "border-amber-500/50 text-amber-500",
                        imp.priority === 'low' && "border-blue-500/50 text-blue-500"
                      )}
                    >
                      {imp.priority}
                    </Badge>
                    <span className="font-medium text-sm">{imp.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{imp.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Clear */}
        {analysis.riskyPicks.length === 0 && analysis.improvements.length === 0 && (
          <div className="text-center py-6 text-emerald-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2" />
            <p className="font-medium">Your team looks great!</p>
            <p className="text-sm opacity-80">No major issues detected</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
