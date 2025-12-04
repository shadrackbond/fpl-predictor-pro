import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GameweekSelector } from '@/components/GameweekSelector';
import { OptimalTeamView } from '@/components/OptimalTeamView';
import { PredictionsTable } from '@/components/PredictionsTable';
import { FixturesOverview } from '@/components/FixturesOverview';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useGameweeks,
  usePredictions,
  useOptimalTeam,
  useFixtures,
  useFetchFPLData,
  useGeneratePredictions,
} from '@/hooks/useFPLData';
import { 
  RefreshCw, 
  Sparkles, 
  Trophy, 
  Users, 
  Calendar,
  TrendingUp,
  Zap
} from 'lucide-react';

const Index = () => {
  const [selectedGameweekId, setSelectedGameweekId] = useState<number | null>(null);

  const { data: gameweeks, isLoading: loadingGWs } = useGameweeks();
  const { data: predictions, isLoading: loadingPreds } = usePredictions(selectedGameweekId);
  const { data: optimalTeam, isLoading: loadingTeam } = useOptimalTeam(selectedGameweekId);
  const { data: fixtures, isLoading: loadingFixtures } = useFixtures(selectedGameweekId);

  const fetchFPLData = useFetchFPLData();
  const generatePredictions = useGeneratePredictions();

  // Auto-select current or next gameweek
  useEffect(() => {
    if (gameweeks && gameweeks.length > 0 && !selectedGameweekId) {
      const nextGW = gameweeks.find(gw => gw.is_next);
      const currentGW = gameweeks.find(gw => gw.is_current);
      setSelectedGameweekId(nextGW?.id || currentGW?.id || gameweeks[0].id);
    }
  }, [gameweeks, selectedGameweekId]);

  const handleFetchData = () => {
    fetchFPLData.mutate();
  };

  const handleGeneratePredictions = () => {
    if (selectedGameweekId) {
      generatePredictions.mutate(selectedGameweekId);
    }
  };

  const isGenerating = generatePredictions.isPending;
  const isFetching = fetchFPLData.isPending;
  const hasData = gameweeks && gameweeks.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_50%)]" />
        
        <div className="relative container py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl gradient-primary shadow-glow">
                  <Zap className="w-8 h-8 text-primary-foreground" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                  FPL <span className="text-gradient">Predictor</span>
                </h1>
              </div>
              <p className="text-lg text-muted-foreground max-w-xl">
                AI-powered predictions and optimal team selection for Fantasy Premier League. 
                Maximize your points with data-driven insights.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={handleFetchData}
                disabled={isFetching}
                className="gap-2"
              >
                <RefreshCw className={isFetching ? 'animate-spin' : ''} />
                {isFetching ? 'Updating...' : 'Sync FPL Data'}
              </Button>
              <Button
                variant="default"
                size="lg"
                onClick={handleGeneratePredictions}
                disabled={isGenerating || !selectedGameweekId}
                className="gap-2 gradient-gold text-accent-foreground font-semibold shadow-lg"
              >
                <Sparkles className={isGenerating ? 'animate-pulse' : ''} />
                {isGenerating ? 'Generating...' : 'Generate Predictions'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 space-y-8">
        {/* Gameweek Selector */}
        {loadingGWs ? (
          <Skeleton className="h-20 w-full max-w-md" />
        ) : hasData ? (
          <div className="max-w-md">
            <h2 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Select Gameweek
            </h2>
            <GameweekSelector
              gameweeks={gameweeks}
              selectedId={selectedGameweekId}
              onSelect={setSelectedGameweekId}
            />
          </div>
        ) : (
          <div className="text-center py-12 space-y-4">
            <Trophy className="w-16 h-16 mx-auto text-muted-foreground/50" />
            <h2 className="text-2xl font-semibold">Welcome to FPL Predictor</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Click "Sync FPL Data" to fetch the latest Premier League data and get started with predictions.
            </p>
            <Button
              variant="default"
              size="lg"
              onClick={handleFetchData}
              disabled={isFetching}
              className="gap-2 mt-4"
            >
              <RefreshCw className={isFetching ? 'animate-spin' : ''} />
              {isFetching ? 'Fetching Data...' : 'Get Started'}
            </Button>
          </div>
        )}

        {/* Tabs */}
        {hasData && selectedGameweekId && (
          <Tabs defaultValue="team" className="space-y-6">
            <TabsList className="bg-card border border-border p-1">
              <TabsTrigger value="team" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Trophy className="w-4 h-4" />
                Optimal Team
              </TabsTrigger>
              <TabsTrigger value="players" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Users className="w-4 h-4" />
                All Predictions
              </TabsTrigger>
              <TabsTrigger value="fixtures" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Calendar className="w-4 h-4" />
                Fixtures
              </TabsTrigger>
            </TabsList>

            <TabsContent value="team" className="animate-fade-in">
              <OptimalTeamView
                optimalTeam={optimalTeam || null}
                predictions={predictions || []}
                isLoading={loadingTeam || loadingPreds}
              />
            </TabsContent>

            <TabsContent value="players" className="animate-fade-in">
              {predictions && predictions.length > 0 ? (
                <PredictionsTable
                  predictions={predictions}
                  isLoading={loadingPreds}
                />
              ) : (
                <div className="text-center py-12 space-y-4">
                  <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground/50" />
                  <h3 className="text-xl font-semibold">No Predictions Yet</h3>
                  <p className="text-muted-foreground">
                    Click "Generate Predictions" to get AI-powered expected points for all players.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="fixtures" className="animate-fade-in">
              <div className="max-w-3xl mx-auto">
                <FixturesOverview
                  fixtures={fixtures || []}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="container text-center text-sm text-muted-foreground">
          <p>FPL Predictor uses AI to analyze player form, fixture difficulty, and historical data.</p>
          <p className="mt-1">Data sourced from the official Fantasy Premier League API.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
