import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowRight, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  Minus
} from 'lucide-react';

interface TransferSuggestion {
  player_out_id: number;
  player_out_name: string;
  player_in_id: number;
  player_in_name: string;
  priority: 'high' | 'medium' | 'low';
  points_impact: number;
  reason: string;
}

interface TransferSuggestionsProps {
  suggestions: TransferSuggestion[];
  freeTransfers: number;
  isLoading: boolean;
}

export function TransferSuggestions({ suggestions, freeTransfers, isLoading }: TransferSuggestionsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const priorityConfig = {
    high: { 
      color: 'bg-red-500/10 text-red-500 border-red-500/30', 
      icon: AlertTriangle,
      label: 'High Priority'
    },
    medium: { 
      color: 'bg-amber-500/10 text-amber-500 border-amber-500/30', 
      icon: TrendingUp,
      label: 'Medium Priority'
    },
    low: { 
      color: 'bg-green-500/10 text-green-500 border-green-500/30', 
      icon: Minus,
      label: 'Low Priority'
    },
  };

  const highPriority = suggestions.filter(s => s.priority === 'high');
  const mediumPriority = suggestions.filter(s => s.priority === 'medium');
  const lowPriority = suggestions.filter(s => s.priority === 'low');

  const orderedSuggestions = [...highPriority, ...mediumPriority, ...lowPriority];

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Transfer Suggestions
            </CardTitle>
            <CardDescription>
              Based on fixture difficulty, form, and predicted points
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm py-1">
            {freeTransfers} Free Transfer{freeTransfers !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {orderedSuggestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium">Your team looks great!</p>
            <p className="text-sm">No urgent transfers recommended at this time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orderedSuggestions.map((suggestion, index) => {
              const config = priorityConfig[suggestion.priority];
              const Icon = config.icon;

              return (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border ${config.color} transition-all hover:scale-[1.01]`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className={config.color}>
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                    <span className="text-sm font-semibold text-primary">
                      +{suggestion.points_impact.toFixed(1)} pts
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1">
                      <span className="text-sm text-muted-foreground">Out:</span>
                      <p className="font-semibold text-red-400">{suggestion.player_out_name}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1 text-right">
                      <span className="text-sm text-muted-foreground">In:</span>
                      <p className="font-semibold text-green-400">{suggestion.player_in_name}</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                </div>
              );
            })}

            {freeTransfers < highPriority.length && (
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-sm">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                You have {highPriority.length} high priority transfers but only {freeTransfers} free transfer{freeTransfers !== 1 ? 's' : ''}. 
                Consider using additional transfers for a -4 point hit if the gain outweighs the cost.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
