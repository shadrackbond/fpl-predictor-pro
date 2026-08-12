/* eslint-disable react-refresh/only-export-components */
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Crown,
  Flame,
  Goal,
  HeartPulse,
  LayoutDashboard,
  Newspaper,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react';

export type WorkspaceView =
  | 'myteam' | 'team' | 'captain'
  | 'players' | 'differentials' | 'topplayers'
  | 'fixtures' | 'fdr' | 'injuries' | 'prices'
  | 'results' | 'accuracy' | 'news' | 'rivals';

interface NavigationItem {
  value: WorkspaceView;
  label: string;
  description: string;
  icon: LucideIcon;
}

const groups: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: 'Squad',
    items: [
      { value: 'myteam', label: 'My team', description: 'Manage your current squad', icon: LayoutDashboard },
      { value: 'team', label: 'Optimized XI', description: 'Best valid £100m squad', icon: Trophy },
      { value: 'captain', label: 'Captaincy', description: 'Risk-aware armband picks', icon: Crown },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { value: 'players', label: 'Projections', description: 'Ranges, confidence and drivers', icon: Sparkles },
      { value: 'differentials', label: 'Differentials', description: 'Low-owned upside', icon: Flame },
      { value: 'topplayers', label: 'Position leaders', description: 'Compare the best by role', icon: ScanSearch },
    ],
  },
  {
    label: 'Planning',
    items: [
      { value: 'fixtures', label: 'Fixtures', description: 'Gameweek schedule', icon: CalendarDays },
      { value: 'fdr', label: 'Fixture planner', description: 'Six-gameweek difficulty', icon: Goal },
      { value: 'injuries', label: 'Availability', description: 'Injuries and doubts', icon: HeartPulse },
      { value: 'prices', label: 'Price watch', description: 'Likely rises and falls', icon: CircleDollarSign },
    ],
  },
  {
    label: 'Performance',
    items: [
      { value: 'results', label: 'Results', description: 'Live and completed fixtures', icon: BarChart3 },
      { value: 'accuracy', label: 'Model accuracy', description: 'MAE, trend and calibration', icon: ShieldCheck },
      { value: 'news', label: 'News', description: 'Relevant squad updates', icon: Newspaper },
      { value: 'rivals', label: 'Mini-league', description: 'Track rival decisions', icon: Swords },
    ],
  },
];

const items = groups.flatMap(group => group.items);

export function WorkspaceNavigation({ active, onChange }: { active: WorkspaceView; onChange: (view: WorkspaceView) => void }) {
  return (
    <>
      <div className="lg:hidden">
        <Select value={active} onValueChange={value => onChange(value as WorkspaceView)}>
          <SelectTrigger className="h-10 rounded-md bg-card shadow-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {groups.map(group => (
              <div key={group.label}>
                <p className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{group.label}</p>
                {group.items.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      <aside className="hidden lg:block">
        <nav aria-label="FPL workspace" className="edge-nav space-y-4">
          {groups.map((group, groupIndex) => (
            <div key={group.label}>
              <p className="edge-nav-label">{String(groupIndex + 1).padStart(2, '0')} — {group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = item.value === active;
                  return (
                    <button
                      type="button"
                      key={item.value}
                      onClick={() => onChange(item.value)}
                      aria-current={isActive ? 'page' : undefined}
                      data-active={isActive}
                      className="edge-nav-item group"
                    >
                      <Icon className={cn('mt-px h-3.5 w-3.5 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                      <span className="min-w-0">
                        <span className="edge-nav-item-title">{item.label}</span>
                        <span className="edge-nav-item-copy">{item.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

export function getWorkspaceItem(view: WorkspaceView) {
  return items.find(item => item.value === view) || items[0];
}
