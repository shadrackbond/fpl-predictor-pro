import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

const suggestedQuestions = [
  "Who are the top 5 FPL picks this gameweek?",
  "Which teams have the best upcoming fixtures?",
  "Who should I captain this week?",
  "Show me the best differentials under 5% ownership",
  "Which injured players should I transfer out?",
  "Compare Salah vs Palmer for the next 3 gameweeks",
  "What are the latest price changes?",
  "Should I use my wildcard now?",
];

interface EmptyStateProps {
  onQuestionClick: (question: string) => void;
}

export function EmptyState({ onQuestionClick }: EmptyStateProps) {
  return (
    <div className="space-y-4">
      <div className="text-center py-6">
        <Sparkles className="w-12 h-12 mx-auto text-primary mb-3" />
        <h3 className="font-semibold">Ask me anything about FPL!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          I have full access to all Premier League data — teams, players, fixtures, form, injuries, price changes &amp; more.
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Try these:</p>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.slice(0, 6).map((q, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="text-xs h-auto py-1.5 px-2"
              onClick={() => onQuestionClick(q)}
            >
              {q}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
