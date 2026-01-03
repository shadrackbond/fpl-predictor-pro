import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Zap,
  TrendingUp,
  Target,
  Trophy,
  BarChart3,
  Users,
  ArrowRight,
  Sparkles,
  Shield,
  Brain,
} from 'lucide-react';

export default function Landing() {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Predictions',
      description: 'Advanced machine learning analyzes player form, fixtures, and historical data to predict points.',
    },
    {
      icon: Target,
      title: 'Transfer Suggestions',
      description: 'Get personalized transfer recommendations based on your team and budget.',
    },
    {
      icon: TrendingUp,
      title: 'Differential Picks',
      description: 'Discover low-ownership gems with high potential to climb the ranks.',
    },
    {
      icon: Trophy,
      title: 'Optimal Team Builder',
      description: 'See the mathematically optimal team selection for each gameweek.',
    },
    {
      icon: BarChart3,
      title: 'Accuracy Tracking',
      description: 'Track how our predictions perform against actual results over time.',
    },
    {
      icon: Shield,
      title: 'Chip Strategy',
      description: 'Know exactly when to play your Wildcard, Triple Captain, and more.',
    },
  ];

  const stats = [
    { value: '15%+', label: 'Avg Accuracy' },
    { value: '780+', label: 'Players Analyzed' },
    { value: '38', label: 'Gameweeks Covered' },
    { value: '24/7', label: 'Real-time Updates' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.2),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--accent)/0.1),transparent_60%)]" />

        {/* Animated background elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse-slow" />

        <div className="relative container py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              AI-Powered Fantasy Football Intelligence
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Dominate Your <span className="text-gradient">FPL League</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get AI-powered predictions, transfer suggestions, and differential picks to maximize your Fantasy Premier League points and climb the rankings.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="gap-2 gradient-primary text-primary-foreground font-semibold shadow-lg hover:shadow-primary/25 transition-shadow">
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="gap-2 bg-card/50 backdrop-blur border-border/50">
                  <Users className="w-4 h-4" />
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <section className="py-16 border-y border-border/50 bg-card/30">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl md:text-5xl font-bold text-gradient">{stat.value}</p>
                <p className="text-muted-foreground mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to <span className="text-gradient">Win</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our AI analyzes thousands of data points to give you the edge over your mini-league rivals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="glass border-border/30 hover:border-primary/30 transition-colors">
                <CardContent className="pt-6">
                  <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-card/50">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="p-4 rounded-2xl gradient-primary w-fit mx-auto shadow-glow">
              <Zap className="w-12 h-12 text-primary-foreground" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to Climb the Rankings?
            </h2>
            <p className="text-muted-foreground text-lg">
              Join thousands of FPL managers using AI to make smarter decisions every gameweek.
            </p>
            <Link to="/auth">
              <Button size="lg" className="gap-2 gradient-gold text-accent-foreground font-semibold shadow-lg">
                Start Winning Today
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 bg-card/30">
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
}
