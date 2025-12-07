import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserTeam, useAnalyzeUserTeam, useDeleteUserTeam } from '@/hooks/useUserTeam';
import { TransferSuggestions } from './TransferSuggestions';
import { ChipAnalysis } from './ChipAnalysis';
import { TeamComparison } from './TeamComparison';
import { UserTeamDisplay } from './UserTeamDisplay';
import { 
  UserCircle, 
  Download, 
  TrendingUp, 
  Trophy,
  Coins,
  ArrowLeftRight,
  Loader2
} from 'lucide-react';

interface MyTeamSectionProps {
  gameweekId: number | null;
}

export function MyTeamSection({ gameweekId }: MyTeamSectionProps) {
  const [fplId, setFplId] = useState('');
  const { data: userTeam, isLoading: loadingTeam } = useUserTeam();
  const analyzeTeam = useAnalyzeUserTeam();
  const deleteTeam = useDeleteUserTeam();

  const handleImportTeam = () => {
    const teamId = parseInt(fplId.trim());
    if (isNaN(teamId) || teamId <= 0) {
      return;
    }
    analyzeTeam.mutate({ fpl_team_id: teamId, gameweek_id: gameweekId });
  };

  const handleRefreshAnalysis = () => {
    if (userTeam?.fpl_team_id) {
      analyzeTeam.mutate({ fpl_team_id: userTeam.fpl_team_id, gameweek_id: gameweekId });
    }
  };

  const handleChangeTeam = () => {
    if (userTeam?.id) {
      deleteTeam.mutate(userTeam.id);
    }
  };

  const isAnalyzing = analyzeTeam.isPending || deleteTeam.isPending;

  if (loadingTeam) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // No team imported yet
  if (!userTeam) {
    return (
      <Card className="border-dashed border-2 border-border bg-card/50">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 rounded-full gradient-primary mx-auto mb-4 flex items-center justify-center">
            <UserCircle className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Import Your FPL Team</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            Enter your FPL Team ID to analyze your team, get transfer suggestions, and compare against the optimal prediction.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-md mx-auto space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter your FPL Team ID"
              value={fplId}
              onChange={(e) => setFplId(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleImportTeam} 
              disabled={isAnalyzing || !fplId.trim()}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Import
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Find your Team ID in the FPL website URL when viewing your team: 
            <br />
            <code className="bg-muted px-1 rounded">fantasy.premierleague.com/entry/<strong>YOUR_ID</strong>/event/...</code>
          </p>
        </CardContent>
      </Card>
    );
  }

  // Team already imported - show analysis
  return (
    <div className="space-y-6">
      {/* Team Header */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                <Trophy className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{userTeam.team_name}</h2>
                <p className="text-muted-foreground">FPL ID: {userTeam.fpl_team_id}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1 py-1.5 px-3">
                <TrendingUp className="w-3.5 h-3.5" />
                Rank: {userTeam.overall_rank?.toLocaleString() || 'N/A'}
              </Badge>
              <Badge variant="secondary" className="gap-1 py-1.5 px-3">
                <Trophy className="w-3.5 h-3.5" />
                Points: {userTeam.overall_points || 0}
              </Badge>
              <Badge variant="secondary" className="gap-1 py-1.5 px-3">
                <Coins className="w-3.5 h-3.5" />
                Bank: £{(userTeam.bank || 0).toFixed(1)}M
              </Badge>
              <Badge variant="outline" className="gap-1 py-1.5 px-3 border-primary text-primary">
                <ArrowLeftRight className="w-3.5 h-3.5" />
                {userTeam.free_transfers || 1} FT
              </Badge>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefreshAnalysis}
              disabled={isAnalyzing}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4" />
                  Refresh Analysis
                </>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleChangeTeam}
              disabled={isAnalyzing}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Change Team
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team Comparison */}
      {analyzeTeam.data?.team_comparison && (
        <TeamComparison comparison={analyzeTeam.data.team_comparison} />
      )}

      {/* Transfer Suggestions */}
      <TransferSuggestions 
        suggestions={analyzeTeam.data?.transfers || []} 
        freeTransfers={userTeam.free_transfers || 1}
        isLoading={isAnalyzing}
      />

      {/* Chip Analysis */}
      <ChipAnalysis 
        chips={analyzeTeam.data?.chip_analysis || []}
        chipsAvailable={userTeam.chips_available as string[] || []}
        isLoading={isAnalyzing}
      />

      {/* User Team Display with Suggested Lineup */}
      <UserTeamDisplay 
        players={analyzeTeam.data?.user_players || []}
        captainId={userTeam.captain_id}
        viceCaptainId={userTeam.vice_captain_id}
        suggestedLineup={analyzeTeam.data?.suggested_lineup || []}
        predictions={new Map(Object.entries(analyzeTeam.data?.player_predictions || {}).map(([k, v]) => [parseInt(k), v as number]))}
      />
    </div>
  );
}
