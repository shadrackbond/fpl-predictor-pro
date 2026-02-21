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
import { TrendingUp, TrendingDown, Minus, BarChart3, Armchair } from 'lucide-react';

export interface GameweekHistoryRow {
  gameweek: number;
  gameweek_name: string;
  actual_points: number;
  predicted_points: number | null;
  cumulative_points: number;
  rank: number;
  bench_points?: number;
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

  // Calculate total bench points across all gameweeks
  const totalBenchPoints = sorted.reduce((sum, row) => sum + (row.bench_points || 0), 0);

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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Your FPL Points vs Predicted
            </CardTitle>
            <CardDescription>
              Compare your actual gameweek points against the model's predictions
            </CardDescription>
          </div>
          {totalBenchPoints > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <Armchair className="w-4 h-4 text-orange-400" />
              <div className="text-right">
                <p className="text-sm font-semibold text-orange-400">{totalBenchPoints} pts</p>
                <p className="text-xs text-muted-foreground">Left on bench</p>
              </div>
            </div>
          )}
        </div>
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
                <TableHead className="text-right">Bench</TableHead>
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
                  <TableCell className="text-right">
                    {row.bench_points !== undefined && row.bench_points > 0 ? (
                      <span className="text-orange-400">{row.bench_points}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{row.cumulative_points?.toLocaleString() ?? '—'}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.rank?.toLocaleString() ?? '—'}
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
