import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, Flame, Scale, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RiskProfile = 'conservative' | 'balanced' | 'aggressive';

interface RiskProfileSelectorProps {
  value: RiskProfile;
  onChange: (profile: RiskProfile) => void;
  className?: string;
  compact?: boolean;
}

const profiles = [
  {
    id: 'conservative' as RiskProfile,
    label: 'Conservative',
    emoji: '🟢',
    icon: Shield,
    description: 'Protect your rank with safe picks',
    details: 'Focus on high-ownership players, avoid differentials, minimize risk of red arrows',
    color: 'text-emerald-500 border-emerald-500/50 bg-emerald-500/10',
    activeColor: 'bg-emerald-500 text-white border-emerald-500',
  },
  {
    id: 'balanced' as RiskProfile,
    label: 'Balanced',
    emoji: '🟡',
    icon: Scale,
    description: 'Mix of safe picks and differentials',
    details: 'Moderate risk approach with some differential picks to gain ground gradually',
    color: 'text-amber-500 border-amber-500/50 bg-amber-500/10',
    activeColor: 'bg-amber-500 text-white border-amber-500',
  },
  {
    id: 'aggressive' as RiskProfile,
    label: 'Aggressive',
    emoji: '🔴',
    icon: Flame,
    description: 'Chase rank with bold picks',
    details: 'High-risk strategy with differentials and punts to make big gains',
    color: 'text-red-500 border-red-500/50 bg-red-500/10',
    activeColor: 'bg-red-500 text-white border-red-500',
  },
];

export function RiskProfileSelector({ 
  value, 
  onChange, 
  className,
  compact = false 
}: RiskProfileSelectorProps) {
  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('fpl-risk-profile', value);
  }, [value]);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <TooltipProvider>
          {profiles.map(profile => {
            const Icon = profile.icon;
            const isActive = value === profile.id;
            return (
              <Tooltip key={profile.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onChange(profile.id)}
                    className={cn(
                      "h-8 w-8 p-0 transition-all",
                      isActive ? profile.activeColor : profile.color
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{profile.emoji} {profile.label}</p>
                  <p className="text-xs text-muted-foreground">{profile.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    );
  }

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="w-4 h-4 text-primary" />
          Risk Profile
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Choose your strategy. This affects transfer suggestions, captain picks, and chip recommendations.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {profiles.map(profile => {
            const Icon = profile.icon;
            const isActive = value === profile.id;
            return (
              <button
                key={profile.id}
                onClick={() => onChange(profile.id)}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all",
                  isActive ? profile.activeColor : cn(profile.color, "hover:opacity-80")
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{profile.label}</span>
                      <span>{profile.emoji}</span>
                    </div>
                    <p className={cn(
                      "text-xs",
                      isActive ? "opacity-90" : "opacity-70"
                    )}>
                      {profile.description}
                    </p>
                  </div>
                  {isActive && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                      Active
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Hook to get persisted risk profile
export function useRiskProfile(): [RiskProfile, (profile: RiskProfile) => void] {
  const [profile, setProfile] = useState<RiskProfile>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fpl-risk-profile');
      if (saved === 'conservative' || saved === 'balanced' || saved === 'aggressive') {
        return saved;
      }
    }
    return 'balanced';
  });

  return [profile, setProfile];
}
