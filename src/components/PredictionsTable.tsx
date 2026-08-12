import { Fragment, useMemo, useState } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { PlayerPrediction, Player, Position } from '@/types/fpl';
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Download,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';

type PredictionRow = PlayerPrediction & {
  player: Player & { teams: { id: number; name: string; short_name: string } | null };
};

interface PredictionsTableProps {
  predictions: PredictionRow[];
  isLoading?: boolean;
  className?: string;
}

type SortField = 'predicted_points' | 'ceiling' | 'confidence' | 'value' | 'price' | 'form' | 'ownership';
type SortDirection = 'asc' | 'desc';

const positionStyles: Record<Position, string> = {
  GKP: 'pos-gkp',
  DEF: 'pos-def',
  MID: 'pos-mid',
  FWD: 'pos-fwd',
};

const riskStyles = {
  low: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  medium: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  high: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

const numeric = (value: number | null | undefined, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const floorFor = (row: PredictionRow) => numeric(row.predicted_floor, Math.max(0, row.predicted_points - 2));
const ceilingFor = (row: PredictionRow) => numeric(row.predicted_ceiling, row.predicted_points + 3);
const confidenceFor = (row: PredictionRow) => numeric(row.confidence, 50);
const valueFor = (row: PredictionRow) => row.player?.price ? row.predicted_points / row.player.price : 0;

export function PredictionsTable({ predictions, isLoading, className }: PredictionsTableProps) {
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState<Position | 'ALL'>('ALL');
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [minimumConfidence, setMinimumConfidence] = useState(0);
  const [sortField, setSortField] = useState<SortField>('predicted_points');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [visibleCount, setVisibleCount] = useState(50);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(previous => previous === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSorted = useMemo(() => predictions
    .filter(row => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || row.player?.web_name.toLowerCase().includes(query) ||
        row.player?.teams?.name.toLowerCase().includes(query);
      const matchesPosition = positionFilter === 'ALL' || row.player?.position === positionFilter;
      const matchesRisk = riskFilter === 'all' || (row.risk_level || 'medium') === riskFilter;
      return matchesSearch && matchesPosition && matchesRisk && confidenceFor(row) >= minimumConfidence;
    })
    .sort((a, b) => {
      const values: Record<SortField, [number, number]> = {
        predicted_points: [a.predicted_points, b.predicted_points],
        ceiling: [ceilingFor(a), ceilingFor(b)],
        confidence: [confidenceFor(a), confidenceFor(b)],
        value: [valueFor(a), valueFor(b)],
        price: [numeric(a.player?.price), numeric(b.player?.price)],
        form: [numeric(a.player?.form), numeric(b.player?.form)],
        ownership: [numeric(a.player?.selected_by_percent), numeric(b.player?.selected_by_percent)],
      };
      const [aValue, bValue] = values[sortField];
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }), [predictions, search, positionFilter, riskFilter, minimumConfidence, sortField, sortDirection]);

  const actionable = predictions.filter(row => numeric(row.expected_minutes, 90) >= 60 && (row.risk_level || 'medium') !== 'high');
  const safestCaptain = [...actionable].sort((a, b) =>
    (b.predicted_points * confidenceFor(b)) - (a.predicted_points * confidenceFor(a)))[0];
  const highestUpside = [...predictions].sort((a, b) => ceilingFor(b) - ceilingFor(a))[0];
  const bestValue = [...actionable].filter(row => row.player?.price >= 4).sort((a, b) => valueFor(b) - valueFor(a))[0];
  const v2Coverage = predictions.length
    ? Math.round(predictions.filter(row => row.model_version?.startsWith('ensemble-v2')).length / predictions.length * 100)
    : 0;

  const exportCsv = () => {
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = filteredAndSorted.map(row => [
      row.player.web_name,
      row.player.teams?.short_name,
      row.player.position,
      row.player.price,
      row.predicted_points,
      floorFor(row),
      ceilingFor(row),
      confidenceFor(row),
      row.expected_minutes ?? '',
      row.risk_level ?? 'medium',
      row.fixture_count ?? 1,
      row.fixture_difficulty ?? '',
      row.model_version ?? 'legacy',
    ]);
    const csv = [
      ['Player', 'Team', 'Position', 'Price', 'xPts', 'Floor', 'Ceiling', 'Confidence', 'xMins', 'Risk', 'Fixtures', 'FDR', 'Model'],
      ...rows,
    ].map(row => row.map(escape).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'fpl-projections.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }: { field: SortField }) => sortField !== field
    ? <ChevronsUpDown className="ml-1 inline h-3.5 w-3.5 opacity-35" />
    : sortDirection === 'asc'
      ? <ChevronUp className="ml-1 inline h-3.5 w-3.5" />
      : <ChevronDown className="ml-1 inline h-3.5 w-3.5" />;

  if (isLoading) {
    return <div className={cn('space-y-4', className)}><Skeleton className="h-28 w-full" /><Skeleton className="h-[480px] w-full" /></div>;
  }

  return (
    <div className={cn('space-y-5', className)}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard icon={Target} label="Safest captain" value={safestCaptain?.player.web_name || '—'} detail={safestCaptain ? `${safestCaptain.predicted_points.toFixed(1)} xPts · ${confidenceFor(safestCaptain)}% confidence` : 'No stable starter found'} />
        <InsightCard icon={Sparkles} label="Highest upside" value={highestUpside?.player.web_name || '—'} detail={highestUpside ? `${ceilingFor(highestUpside).toFixed(1)} point ceiling` : 'Generate projections'} />
        <InsightCard icon={TrendingUp} label="Best value" value={bestValue?.player.web_name || '—'} detail={bestValue ? `${valueFor(bestValue).toFixed(2)} xPts per £m` : 'No candidate found'} />
        <InsightCard icon={ShieldCheck} label="Model coverage" value={`${v2Coverage}%`} detail={v2Coverage === 100 ? 'All rows use Ensemble v2' : 'Refresh to upgrade legacy rows'} />
      </div>

      <Card className="border-border/60 bg-card shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Search projections" placeholder="Search player or club" value={search} onChange={event => setSearch(event.target.value)} className="h-10 bg-background pl-10" />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['ALL', 'GKP', 'DEF', 'MID', 'FWD'] as const).map(position => (
                <Button key={position} variant={positionFilter === position ? 'default' : 'outline'} size="sm" onClick={() => setPositionFilter(position)} className="h-10">
                  {position}
                </Button>
              ))}
            </div>
            <Select value={riskFilter} onValueChange={value => setRiskFilter(value as typeof riskFilter)}>
              <SelectTrigger className="h-10 w-full bg-background xl:w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All risk levels</SelectItem>
                <SelectItem value="low">Low risk</SelectItem>
                <SelectItem value="medium">Medium risk</SelectItem>
                <SelectItem value="high">High risk</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-10 gap-2" onClick={exportCsv} disabled={!filteredAndSorted.length}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>

          <div className="grid gap-3 border-t border-border/60 pt-4 md:grid-cols-[1fr,auto] md:items-center">
            <div className="flex items-center gap-4">
              <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">Minimum confidence</span>
              <Slider value={[minimumConfidence]} onValueChange={value => setMinimumConfidence(value[0])} max={90} step={5} className="max-w-xs" aria-label="Minimum prediction confidence" />
              <span className="w-10 text-right font-mono text-sm font-semibold">{minimumConfidence}%</span>
            </div>
            <p className="text-xs text-muted-foreground">Click a player row to inspect the projection drivers.</p>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/35">
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[180px]">Player</TableHead>
                <SortableHead label="xPts" field="predicted_points" active={sortField} onSort={handleSort}><SortIcon field="predicted_points" /></SortableHead>
                <TableHead className="min-w-[120px] text-right">Range</TableHead>
                <SortableHead label="Confidence" field="confidence" active={sortField} onSort={handleSort} className="hidden md:table-cell"><SortIcon field="confidence" /></SortableHead>
                <TableHead className="hidden text-center lg:table-cell">xMins</TableHead>
                <SortableHead label="Value" field="value" active={sortField} onSort={handleSort} className="hidden lg:table-cell"><SortIcon field="value" /></SortableHead>
                <SortableHead label="Ownership" field="ownership" active={sortField} onSort={handleSort} className="hidden xl:table-cell"><SortIcon field="ownership" /></SortableHead>
                <TableHead className="hidden text-center xl:table-cell">Risk</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.slice(0, visibleCount).map((row, index) => {
                const expanded = expandedId === row.id;
                const risk = row.risk_level || 'medium';
                const factors = row.prediction_factors;
                return (
                  <Fragment key={row.id}>
                    <TableRow className="cursor-pointer border-border/50 hover:bg-primary/[0.035]" onClick={() => setExpandedId(expanded ? null : row.id)} aria-expanded={expanded}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="w-5 font-mono text-xs text-muted-foreground">{index + 1}</span>
                          <div>
                            <div className="flex items-center gap-2 font-semibold">
                              {row.player?.web_name}
                              {(row.fixture_count || 1) > 1 && <Badge className="border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" variant="outline">DGW</Badge>}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span>{row.player?.teams?.short_name}</span><span>·</span><span>£{numeric(row.player?.price).toFixed(1)}m</span>
                              <Badge variant="outline" className={cn('ml-1 px-1.5 py-0 text-[10px]', positionStyles[row.player?.position as Position])}>{row.player?.position}</Badge>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-lg font-bold text-primary">{row.predicted_points.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono text-sm"><span className="text-muted-foreground">{floorFor(row).toFixed(1)}</span><span className="mx-1.5 text-border">–</span><span className="font-semibold">{ceilingFor(row).toFixed(1)}</span></TableCell>
                      <TableCell className="hidden text-right md:table-cell"><Confidence value={confidenceFor(row)} /></TableCell>
                      <TableCell className="hidden text-center font-mono lg:table-cell">{numeric(row.expected_minutes, 0).toFixed(0)}</TableCell>
                      <TableCell className="hidden text-right font-mono lg:table-cell">{valueFor(row).toFixed(2)}</TableCell>
                      <TableCell className="hidden text-right font-mono xl:table-cell">{numeric(row.player?.selected_by_percent).toFixed(1)}%</TableCell>
                      <TableCell className="hidden text-center xl:table-cell"><Badge variant="outline" className={cn('capitalize', riskStyles[risk])}>{risk}</Badge></TableCell>
                      <TableCell><ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')} /></TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow className="border-border/50 bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={9} className="p-0">
                          <div className="grid gap-5 px-6 py-5 lg:grid-cols-[1.1fr,1fr]">
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Model reading</p>
                              <p className="text-sm leading-6 text-foreground/85">{row.ai_analysis || 'No explanation is available for this legacy projection.'}</p>
                              {row.player?.news && <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">Availability: {row.player.news}</p>}
                              <div className="mt-4 flex flex-wrap gap-2">
                                {factors?.fixtures?.map((fixture, fixtureIndex) => <Badge key={`${fixture.opponent}-${fixtureIndex}`} variant="secondary">{fixture.opponent} ({fixture.venue}) · FDR {fixture.difficulty}</Badge>)}
                                {factors?.flags?.map(flag => <Badge key={flag} variant="outline">{flag.replace(/-/g, ' ')}</Badge>)}
                              </div>
                            </div>
                            <div>
                              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Projection drivers</p>
                              <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm">
                                <Factor label="Appearance" value={factors?.appearance} />
                                <Factor label="Attacking" value={factors?.attacking} />
                                <Factor label="Clean sheet" value={factors?.cleanSheet} />
                                <Factor label="Saves" value={factors?.saves} />
                                <Factor label="Bonus" value={factors?.bonus} />
                                <Factor label="Recent form" value={factors?.recentForm} />
                                <Factor label="Season rate" value={factors?.seasonRate} />
                                <Factor label="Calibration" value={factors?.calibration} signed />
                              </div>
                              <p className="mt-4 text-xs text-muted-foreground">Model {row.model_version || 'legacy'} · values are expected points, not guarantees.</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
              {!filteredAndSorted.length && <TableRow><TableCell colSpan={9} className="h-40 text-center text-muted-foreground">No players match these filters.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-muted-foreground">Showing {Math.min(visibleCount, filteredAndSorted.length)} of {filteredAndSorted.length} projections</p>
        {visibleCount < filteredAndSorted.length && <Button variant="outline" onClick={() => setVisibleCount(count => count + 50)}>Show 50 more</Button>}
      </div>
    </div>
  );
}

function InsightCard({ icon: Icon, label, value, detail }: { icon: typeof Zap; label: string; value: string; detail: string }) {
  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="h-4 w-4" /></div>
        <div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-0.5 truncate font-display text-lg font-semibold">{value}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p></div>
      </CardContent>
    </Card>
  );
}

function SortableHead({ label, field, onSort, className, children }: { label: string; field: SortField; active: SortField; onSort: (field: SortField) => void; className?: string; children: React.ReactNode }) {
  return <TableHead className={cn('cursor-pointer select-none text-right hover:text-foreground', className)} onClick={() => onSort(field)}>{label}{children}</TableHead>;
}

function Confidence({ value }: { value: number }) {
  const color = value >= 75 ? 'bg-emerald-500' : value >= 55 ? 'bg-amber-500' : 'bg-rose-500';
  return <div className="inline-flex items-center gap-2"><span className="h-1.5 w-12 overflow-hidden rounded-full bg-muted"><span className={cn('block h-full rounded-full', color)} style={{ width: `${value}%` }} /></span><span className="w-8 font-mono text-xs font-semibold">{value}%</span></div>;
}

function Factor({ label, value, signed = false }: { label: string; value?: number; signed?: boolean }) {
  const number = numeric(value);
  return <div className="flex items-center justify-between border-b border-border/50 py-1.5"><span className="text-muted-foreground">{label}</span><span className="font-mono font-semibold">{signed && number > 0 ? '+' : ''}{number.toFixed(1)}</span></div>;
}
