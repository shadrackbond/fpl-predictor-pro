import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { Gameweek } from '@/types/fpl';
import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface GameweekSelectorProps {
  gameweeks: Gameweek[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  className?: string;
}

export function GameweekSelector({ gameweeks, selectedId, onSelect, className }: GameweekSelectorProps) {
  const selectedGW = gameweeks.find(gw => gw.id === selectedId);

  return (
    <div className={cn('space-y-2', className)}>
      <Select
        value={selectedId?.toString() || ''}
        onValueChange={(value) => onSelect(parseInt(value))}
      >
        <SelectTrigger className="w-full bg-card border-border">
          <SelectValue placeholder="Select a gameweek" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {gameweeks.map((gw) => (
            <SelectItem key={gw.id} value={gw.id.toString()}>
              <div className="flex items-center gap-2">
                <span>{gw.name}</span>
                {gw.is_current && (
                  <Badge className="bg-primary/20 text-primary text-xs">Current</Badge>
                )}
                {gw.is_next && (
                  <Badge className="bg-accent/20 text-accent text-xs">Next</Badge>
                )}
                {gw.finished && (
                  <Badge variant="outline" className="text-xs">Finished</Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedGW && selectedGW.deadline_time && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(selectedGW.deadline_time), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{format(new Date(selectedGW.deadline_time), 'HH:mm')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
