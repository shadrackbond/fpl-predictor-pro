import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Users, 
  Brain, 
  TrendingUp, 
  Trophy,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string;
}

const steps: OnboardingStep[] = [
  {
    title: "Welcome to FPL Predictor",
    description: "Your AI-powered Fantasy Premier League assistant. Let's take a quick tour of the key features.",
    icon: <Trophy className="w-8 h-8" />,
  },
  {
    title: "Sync FPL Data",
    description: "Click 'Sync Data' to fetch the latest player stats, fixtures, and gameweek information from the official FPL API.",
    icon: <TrendingUp className="w-8 h-8" />,
    highlight: "sync-button",
  },
  {
    title: "AI Predictions",
    description: "Generate AI-powered predictions for each gameweek. Our model analyzes form, fixtures, and historical data to forecast points.",
    icon: <Brain className="w-8 h-8" />,
    highlight: "predictions-tab",
  },
  {
    title: "Import Your Team",
    description: "Go to 'My Team' and enter your FPL Team ID to import your squad. You'll find your ID in your FPL account URL.",
    icon: <Users className="w-8 h-8" />,
    highlight: "my-team-tab",
  },
  {
    title: "Get Personalized Insights",
    description: "Once imported, get transfer suggestions, captain picks, chip recommendations, and more tailored to your team!",
    icon: <Sparkles className="w-8 h-8" />,
  },
];

const ONBOARDING_KEY = "fpl-predictor-onboarding-complete";

export function OnboardingTutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasCompleted = localStorage.getItem(ONBOARDING_KEY);
    if (!hasCompleted) {
      // Delay showing to let page load
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsOpen(false);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-lg glass border-primary/20 shadow-elevated">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                {step.icon}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Step {currentStep + 1} of {steps.length}
                </p>
                <h3 className="text-xl font-semibold">{step.title}</h3>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {step.description}
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentStep 
                    ? "w-6 bg-primary" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSkip}>
                Skip Tour
              </Button>
              <Button onClick={nextStep} className="gap-2 gradient-primary">
                {currentStep === steps.length - 1 ? (
                  "Get Started"
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY);
}
