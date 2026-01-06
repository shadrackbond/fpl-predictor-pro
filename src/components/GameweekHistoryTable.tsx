import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';

export interface GameweekHistoryRow {
  gameweek: number;
  gameweek_name: string;
  actual_points: number;
  predicted_points: number | null;
  cumulative_points: number;
  rank: number;
}

interface GameweekHistoryTableProps {
  history: GameweekHistoryRow[];
}

export function GameweekHistoryTable({ history }: GameweekHistoryTableProps) {
  if (!history || history.length === 0) {
    return null;
  }

  // Sort by gameweek descending (most recent first)
  const sorted = [...history].sort((a, b) => b.gameweek - a.gameweek);

  const getDiffBadge = (actual: number, predicted: number | null) => {
    if (predicted === null) {
      return <Badge variant="secondary" className="text-xs">N/A</Badge>;
    }
    const diff = actual - predicted;
    if (diff > 0) {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1 text-xs">
          <TrendingUp className="w-3 h-3" />
          +{diff.toFixed(0)}
        </Badge>
      );
    } else if (diff < 0) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1 text-xs">
          <TrendingDown className="w-3 h-3" />
          {diff.toFixed(0)}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <Minus className="w-3 h-3" />
        0
      </Badge>
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Your FPL Points vs Predicted
        </CardTitle>
        <CardDescription>
          Compare your actual gameweek points against the model's predictions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[100px]">Gameweek</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Predicted</TableHead>
                <TableHead className="text-right">Diff</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Rank</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => (
                <TableRow key={row.gameweek}>
                  <TableCell className="font-medium">{row.gameweek_name}</TableCell>
                  <TableCell className="text-right font-semibold">{row.actual_points}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.predicted_points !== null ? row.predicted_points.toFixed(0) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {getDiffBadge(row.actual_points, row.predicted_points)}
                  </TableCell>
                  <TableCell className="text-right">{row.cumulative_points.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.rank.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
