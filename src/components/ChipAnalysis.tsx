import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Zap, 
  Shield, 
  Users2, 
  Star,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

interface ChipAnalysisItem {
  chip_name: string;
  success_percentage: number;
  recommendation: string;
  analysis: string;
}

interface ChipAnalysisProps {
  chips: ChipAnalysisItem[];
  chipsAvailable: string[];
  isLoading: boolean;
}

const chipConfig: Record<string, { icon: any; label: string; color: string }> = {
  wildcard: { 
    icon: Zap, 
    label: 'Wildcard', 
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' 
  },
  freehit: { 
    icon: Shield, 
    label: 'Free Hit', 
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
  },
  bboost: { 
    icon: Users2, 
    label: 'Bench Boost', 
    color: 'bg-green-500/10 text-green-400 border-green-500/30' 
  },
  triple_captain: { 
    icon: Star, 
    label: 'Triple Captain', 
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
  },
};

export function ChipAnalysis({ chips, chipsAvailable, isLoading }: ChipAnalysisProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Combine chip analysis with available chips
  const allChips = Object.keys(chipConfig);
  const displayChips = allChips.map(chipName => {
    const analysis = chips.find(c => c.chip_name === chipName);
    const isAvailable = chipsAvailable.includes(chipName);
    return {
      name: chipName,
      ...chipConfig[chipName],
      isAvailable,
      analysis: analysis || null,
    };
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Chip Analysis
        </CardTitle>
        <CardDescription>
          Success probability and recommendations for each chip this gameweek
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {displayChips.map(chip => {
            const Icon = chip.icon;
            const successPct = chip.analysis?.success_percentage || 0;
            const recommendation = chip.analysis?.recommendation || 'save';
            
            return (
              <div 
                key={chip.name} 
                className={`p-4 rounded-lg border ${chip.color} ${!chip.isAvailable ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    <span className="font-semibold">{chip.label}</span>
                  </div>
                  {chip.isAvailable ? (
                    <Badge variant="outline" className="text-xs">
                      Available
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs opacity-70">
                      Used
                    </Badge>
                  )}
                </div>

                {chip.isAvailable && chip.analysis && (
                  <>
                    <div className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Success Rate</span>
                        <span className="font-medium">{successPct}%</span>
                      </div>
                      <Progress value={successPct} className="h-2" />
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      {recommendation === 'use' ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          Recommended
                        </Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground gap-1">
                          <ThumbsDown className="w-3 h-3" />
                          Save for later
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {chip.analysis.analysis}
                    </p>
                  </>
                )}

                {!chip.isAvailable && (
                  <p className="text-xs text-muted-foreground">
                    This chip has already been used this season.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
