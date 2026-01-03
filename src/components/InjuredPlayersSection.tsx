import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Bandage } from 'lucide-react';

interface Player {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  position: string;
  price: number;
  status: string;
  team_id: number;
  teams?: { name: string; short_name: string };
}

interface TeamGroup {
  team: { name: string; short_name: string };
  players: Player[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  i: { label: 'Injured', color: 'bg-red-500/10 text-red-500 border-red-500/30' },
  d: { label: 'Doubtful', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  s: { label: 'Suspended', color: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  u: { label: 'Unavailable', color: 'bg-gray-500/10 text-gray-500 border-gray-500/30' },
  n: { label: 'Not Available', color: 'bg-gray-500/10 text-gray-500 border-gray-500/30' },
};

const POSITION_ORDER = ['GKP', 'DEF', 'MID', 'FWD'];

export function InjuredPlayersSection() {
  const { data: injuredPlayers, isLoading } = useQuery({
    queryKey: ['injured-players'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select(`
          id,
          web_name,
          first_name,
          second_name,
          position,
          price,
          status,
          team_id,
          teams(name, short_name)
        `)
        .in('status', ['i', 'd', 's', 'u', 'n'])
        .order('team_id', { ascending: true });

      if (error) throw error;
      return data as Player[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  // Group players by team
  const teamGroups: TeamGroup[] = [];
  const teamMap = new Map<number, TeamGroup>();

  for (const player of injuredPlayers || []) {
    if (!teamMap.has(player.team_id)) {
      const group: TeamGroup = {
        team: player.teams || { name: 'Unknown', short_name: 'UNK' },
        players: [],
      };
      teamMap.set(player.team_id, group);
      teamGroups.push(group);
    }
    teamMap.get(player.team_id)!.players.push(player);
  }

  // Sort players within each team by position
  for (const group of teamGroups) {
    group.players.sort((a, b) => {
      return POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position);
    });
  }

  // Sort teams alphabetically
  teamGroups.sort((a, b) => a.team.name.localeCompare(b.team.name));

  const totalInjured = injuredPlayers?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bandage className="w-6 h-6 text-red-500" />
            Injured & Unavailable Players
          </h2>
          <p className="text-muted-foreground">
            {totalInjured} players currently unavailable across all teams
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_LABELS).map(([key, { label, color }]) => (
          <Badge key={key} variant="outline" className={color}>
            {label}
          </Badge>
        ))}
      </div>

      {/* Teams Grid */}
      {teamGroups.length === 0 ? (
        <Card className="glass border-border/30">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold">All Players Available!</h3>
            <p className="text-muted-foreground">
              No injured or unavailable players at the moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {teamGroups.map((group) => (
            <Card key={group.team.short_name} className="glass border-border/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span>{group.team.name}</span>
                  <Badge variant="secondary">{group.players.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.players.map((player) => {
                  const statusInfo = STATUS_LABELS[player.status] || STATUS_LABELS.u;
                  return (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-card/50 border border-border/30"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {player.position}
                        </Badge>
                        <span className="font-medium text-sm">{player.web_name}</span>
                      </div>
                      <Badge variant="outline" className={`text-xs ${statusInfo.color}`}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
