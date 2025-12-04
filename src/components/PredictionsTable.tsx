import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { PlayerPrediction, Player, Position } from '@/types/fpl';
import { Search, TrendingUp, ChevronUp, ChevronDown } from 'lucide-react';

interface PredictionsTableProps {
  predictions: (PlayerPrediction & { player: Player & { teams: { id: number; name: string; short_name: string } | null } })[];
  isLoading?: boolean;
  className?: string;
}

type SortField = 'predicted_points' | 'price' | 'form' | 'total_points';
type SortDirection = 'asc' | 'desc';

const positionStyles: Record<Position, string> = {
  GKP: 'pos-gkp',
  DEF: 'pos-def',
  MID: 'pos-mid',
  FWD: 'pos-fwd',
};

export function PredictionsTable({ predictions, isLoading, className }: PredictionsTableProps) {
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState<Position | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<SortField>('predicted_points');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSorted = predictions
    .filter(p => {
      const matchesSearch = p.player?.web_name.toLowerCase().includes(search.toLowerCase()) ||
        p.player?.teams?.name.toLowerCase().includes(search.toLowerCase());
      const matchesPosition = positionFilter === 'ALL' || p.player?.position === positionFilter;
      return matchesSearch && matchesPosition;
    })
    .sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case 'predicted_points':
          aVal = a.predicted_points;
          bVal = b.predicted_points;
          break;
        case 'price':
          aVal = a.player?.price || 0;
          bVal = b.player?.price || 0;
          break;
        case 'form':
          aVal = a.player?.form || 0;
          bVal = b.player?.form || 0;
          break;
        case 'total_points':
          aVal = a.player?.total_points || 0;
          bVal = b.player?.total_points || 0;
          break;
        default:
          aVal = 0;
          bVal = 0;
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4 inline ml-1" /> : 
      <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  const getDifficultyClass = (difficulty: number | null) => {
    if (!difficulty) return 'difficulty-3';
    return `difficulty-${Math.min(5, Math.max(1, difficulty))}`;
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search players or teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        <div className="flex gap-2">
          {(['ALL', 'GKP', 'DEF', 'MID', 'FWD'] as const).map((pos) => (
            <Button
              key={pos}
              variant={positionFilter === pos ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPositionFilter(pos)}
              className={cn(
                pos !== 'ALL' && positionFilter === pos && positionStyles[pos as Position]
              )}
            >
              {pos}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="w-12">#</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-center">Pos</TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:text-foreground"
                onClick={() => handleSort('predicted_points')}
              >
                xPts <SortIcon field="predicted_points" />
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:text-foreground"
                onClick={() => handleSort('price')}
              >
                Price <SortIcon field="price" />
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:text-foreground"
                onClick={() => handleSort('form')}
              >
                Form <SortIcon field="form" />
              </TableHead>
              <TableHead className="text-center">FDR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.slice(0, 50).map((pred, index) => (
              <TableRow 
                key={pred.id} 
                className="hover:bg-secondary/50 border-border transition-colors"
              >
                <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium">{pred.player?.web_name}</TableCell>
                <TableCell className="text-muted-foreground">{pred.player?.teams?.short_name}</TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant="outline" 
                    className={cn('text-xs', positionStyles[pred.player?.position as Position])}
                  >
                    {pred.player?.position}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-bold font-mono text-primary">
                    {pred.predicted_points.toFixed(1)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono">
                  £{pred.player?.price.toFixed(1)}m
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <TrendingUp className="w-3 h-3 text-primary" />
                    <span className="font-mono">{pred.player?.form.toFixed(1)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant="outline" 
                    className={cn('text-xs', getDifficultyClass(pred.fixture_difficulty))}
                  >
                    {pred.fixture_difficulty || '?'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Showing {Math.min(50, filteredAndSorted.length)} of {filteredAndSorted.length} players
      </p>
    </div>
  );
}
