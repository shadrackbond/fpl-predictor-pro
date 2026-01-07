import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { UserMenu } from '@/components/UserMenu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GameweekSelector } from '@/components/GameweekSelector';
import { OptimalTeamView } from '@/components/OptimalTeamView';
import { PredictionsTable } from '@/components/PredictionsTable';
import { FixturesOverview } from '@/components/FixturesOverview';
import { FixtureTicker } from '@/components/FixtureTicker';
import { CaptainPicker } from '@/components/CaptainPicker';
import { MyTeamSection } from '@/components/MyTeamSection';
import { AccuracyDashboard } from '@/components/AccuracyDashboard';
import { ResultsSection } from '@/components/ResultsSection';
import { DifferentialsDashboard } from '@/components/DifferentialsDashboard';
import { NewsFeed } from '@/components/NewsFeed';
import { InjuredPlayersSection } from '@/components/InjuredPlayersSection';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useGameweeks,
  usePredictions,
  useOptimalTeam,
  useFixtures,
  useFetchFPLData,
  useGeneratePredictions,
} from '@/hooks/useFPLData';
import { usePredictionHistory } from '@/hooks/usePredictionHistory';
import { 
  RefreshCw, 
  Sparkles, 
  Trophy, 
  Users, 
  Calendar,
  TrendingUp,
  Zap,
  UserCircle,
  Target,
  ChevronRight,
  Activity,
  BarChart3,
  Flame,
  Newspaper,
  Bandage,
  Crown,
  LayoutGrid
} from 'lucide-react';

const Index = () => {
  const [selectedGameweekId, setSelectedGameweekId] = useState<number | null>(null);

  const { data: gameweeks, isLoading: loadingGWs } = useGameweeks();
  const { data: predictions, isLoading: loadingPreds } = usePredictions(selectedGameweekId);
  const { data: optimalTeam, isLoading: loadingTeam } = useOptimalTeam(selectedGameweekId);
  const { data: fixtures, isLoading: loadingFixtures } = useFixtures(selectedGameweekId);
  const { data: history } = usePredictionHistory();

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

  // Calculate overall accuracy for hero stat
  const avgAccuracy = history && history.length > 0
    ? history.reduce((sum, h) => sum + (h.accuracy_percentage || 0), 0) / history.length
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.2),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--accent)/0.1),transparent_60%)]" />
        
        {/* Animated background elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse-slow" />
        
        <div className="relative container py-10 md:py-14">
          <div className="grid lg:grid-cols-[1fr,auto] gap-8 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                <Activity className="w-4 h-4" />
                AI-Powered Predictions
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl gradient-primary shadow-glow">
                    <Zap className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                      FPL <span className="text-gradient">Predictor</span>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                      Maximize your Fantasy Premier League points
                    </p>
                  </div>
                </div>
                <div className="lg:hidden flex items-center gap-2">
                  <ThemeToggle />
                  <UserMenu />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleFetchData}
                  disabled={isFetching}
                  className="gap-2 bg-card/50 backdrop-blur border-border/50 hover:bg-card/80"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                  {isFetching ? 'Syncing...' : 'Sync Data'}
                </Button>
                <Button
                  variant="default"
                  size="lg"
                  onClick={handleGeneratePredictions}
                  disabled={isGenerating || !selectedGameweekId}
                  className="gap-2 gradient-gold text-accent-foreground font-semibold shadow-lg hover:shadow-accent/25 transition-shadow"
                >
                  <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
                  {isGenerating ? 'Generating...' : 'Generate Predictions'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Quick Stats & User Menu */}
            <div className="hidden lg:flex flex-col gap-3">
              <div className="flex justify-end gap-2">
                <ThemeToggle />
                <UserMenu />
              </div>
              <div className="grid grid-cols-2 gap-3">
              <Card className="glass border-border/30 bg-card/40">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {avgAccuracy !== null ? `${avgAccuracy.toFixed(0)}%` : '--'}
                      </p>
                      <p className="text-xs text-muted-foreground">Accuracy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass border-border/30 bg-card/40">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Trophy className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {optimalTeam?.team_rating || '--'}
                      </p>
                      <p className="text-xs text-muted-foreground">Team Rating</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 space-y-8">
        {/* Gameweek Selector */}
        {loadingGWs ? (
          <Skeleton className="h-16 w-full max-w-sm" />
        ) : hasData ? (
          <div className="max-w-sm">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Select Gameweek
            </label>
            <GameweekSelector
              gameweeks={gameweeks}
              selectedId={selectedGameweekId}
              onSelect={setSelectedGameweekId}
            />
          </div>
        ) : (
          <Card className="glass border-border/30">
            <CardContent className="py-16 text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Welcome to FPL Predictor</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Get started by syncing the latest Premier League data to unlock AI-powered predictions.
              </p>
              <Button
                variant="default"
                size="lg"
                onClick={handleFetchData}
                disabled={isFetching}
                className="gap-2 mt-4 gradient-primary"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? 'Fetching Data...' : 'Get Started'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        {hasData && selectedGameweekId && (
          <Tabs defaultValue="myteam" className="space-y-6">
            <TabsList className="bg-card/50 backdrop-blur border border-border/50 p-1.5 flex-wrap h-auto gap-1 shadow-lg">
              <TabsTrigger 
                value="myteam" 
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <UserCircle className="w-4 h-4" />
                My Team
              </TabsTrigger>
              <TabsTrigger 
                value="team" 
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <Trophy className="w-4 h-4" />
                Optimal Team
              </TabsTrigger>
              <TabsTrigger 
                value="players" 
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <Users className="w-4 h-4" />
                All Predictions
              </TabsTrigger>
              <TabsTrigger 
                value="fixtures" 
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <Calendar className="w-4 h-4" />
                Fixtures
              </TabsTrigger>
              <TabsTrigger 
                value="results" 
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                Results
              </TabsTrigger>
              <TabsTrigger 
                value="differentials" 
                className="gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all"
              >
                <Flame className="w-4 h-4" />
                Differentials
              </TabsTrigger>
              <TabsTrigger 
                value="news" 
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <Newspaper className="w-4 h-4" />
                News
              </TabsTrigger>
              <TabsTrigger 
                value="accuracy" 
                className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground transition-all"
              >
                <Target className="w-4 h-4" />
                Accuracy
              </TabsTrigger>
              <TabsTrigger 
                value="captain" 
                className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground transition-all"
              >
                <Crown className="w-4 h-4" />
                Captain
              </TabsTrigger>
              <TabsTrigger 
                value="fdr" 
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <LayoutGrid className="w-4 h-4" />
                FDR
              </TabsTrigger>
              <TabsTrigger 
                value="injuries" 
                className="gap-2 data-[state=active]:bg-red-500 data-[state=active]:text-white transition-all"
              >
                <Bandage className="w-4 h-4" />
                Injuries
              </TabsTrigger>
            </TabsList>

            <TabsContent value="myteam" className="animate-fade-in">
              <MyTeamSection gameweekId={selectedGameweekId} />
            </TabsContent>

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
                <Card className="glass border-border/30">
                  <CardContent className="py-16 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                      <TrendingUp className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold">No Predictions Yet</h3>
                    <p className="text-muted-foreground">
                      Click "Generate Predictions" to get AI-powered expected points for all players.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="fixtures" className="animate-fade-in">
              <div className="max-w-3xl mx-auto">
                <FixturesOverview fixtures={fixtures || []} />
              </div>
            </TabsContent>

            <TabsContent value="results" className="animate-fade-in">
              <ResultsSection 
                gameweeks={gameweeks || []} 
                currentGameweekId={selectedGameweekId} 
              />
            </TabsContent>

            <TabsContent value="differentials" className="animate-fade-in">
              <DifferentialsDashboard gameweekId={selectedGameweekId} />
            </TabsContent>

            <TabsContent value="news" className="animate-fade-in">
              <NewsFeed />
            </TabsContent>

            <TabsContent value="accuracy" className="animate-fade-in">
              <AccuracyDashboard selectedGameweekId={selectedGameweekId} />
            </TabsContent>

            <TabsContent value="captain" className="animate-fade-in">
              <CaptainPicker predictions={predictions || []} isLoading={loadingPreds} />
            </TabsContent>

            <TabsContent value="fdr" className="animate-fade-in">
              <FixtureTicker gameweekCount={6} />
            </TabsContent>

            <TabsContent value="injuries" className="animate-fade-in">
              <InjuredPlayersSection />
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-12 bg-card/30">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg gradient-primary">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold">FPL Predictor</span>
            </div>
            <div className="text-center md:text-right text-sm text-muted-foreground">
              <p>AI-powered predictions based on player form, fixture difficulty, and historical data.</p>
              <p className="mt-1">Data sourced from the official Fantasy Premier League API.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
