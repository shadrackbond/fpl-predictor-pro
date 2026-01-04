import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Target, ArrowLeftRight, RotateCcw, Sparkles, 
  X, Check, AlertCircle
} from 'lucide-react';
import { POSITION_COLORS, type Position } from '@/types/fpl';
import { PlayerSearchModal } from './PlayerSearchModal';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Available formations: DEF-MID-FWD
const FORMATIONS = [
  { value: '4-4-2', def: 4, mid: 4, fwd: 2 },
  { value: '4-3-3', def: 4, mid: 3, fwd: 3 },
  { value: '3-4-3', def: 3, mid: 4, fwd: 3 },
  { value: '3-5-2', def: 3, mid: 5, fwd: 2 },
  { value: '4-5-1', def: 4, mid: 5, fwd: 1 },
  { value: '5-3-2', def: 5, mid: 3, fwd: 2 },
  { value: '5-2-3', def: 5, mid: 2, fwd: 3 },
];

interface Player {
  id: number;
  web_name: string;
  position: Position;
  price: number;
  form: number;
  total_points: number;
  team_id: number;
  teams?: { short_name: string };
  predicted_points?: number;
}

interface TeamSimulatorProps {
  players: Player[];
  captainId: number | null;
  viceCaptainId: number | null;
  initialStartingXI?: number[];
  suggestedLineup?: number[];
  predictions?: Map<number, number>;
  showOptimized?: boolean;
  bank: number;
  onSimulationChange?: (hasChanges: boolean) => void;
}

interface SimulatedTransfer {
  playerOut: Player;
  playerIn: Player;
}

export function TeamSimulator({ 
  players: originalPlayers, 
  captainId: originalCaptainId, 
  viceCaptainId: originalViceCaptainId,
  initialStartingXI,
  suggestedLineup,
  predictions = new Map(),
  showOptimized = false,
  bank: originalBank,
  onSimulationChange
}: TeamSimulatorProps) {
  // Simulated state
  const [simulatedPlayers, setSimulatedPlayers] = useState<Player[]>(originalPlayers);
  const [simulatedCaptainId, setSimulatedCaptainId] = useState<number | null>(originalCaptainId);
  const [simulatedViceCaptainId, setSimulatedViceCaptainId] = useState<number | null>(originalViceCaptainId);
  const [simulatedStartingXI, setSimulatedStartingXI] = useState<number[]>([]);
  const [transfers, setTransfers] = useState<SimulatedTransfer[]>([]);
  const [simulatedBank, setSimulatedBank] = useState(originalBank);
  const [selectedFormation, setSelectedFormation] = useState<string>('4-4-2');
  
  // Modal state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [selectedPlayerForTransfer, setSelectedPlayerForTransfer] = useState<Player | null>(null);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  
  // Substitution state - click-based
  const [selectedForSub, setSelectedForSub] = useState<Player | null>(null);

  // Check if there are changes
  const hasChanges = useMemo(() => {
    return transfers.length > 0 || 
           simulatedCaptainId !== originalCaptainId ||
           simulatedViceCaptainId !== originalViceCaptainId ||
           simulatedStartingXI.length > 0;
  }, [transfers, simulatedCaptainId, simulatedViceCaptainId, simulatedStartingXI, originalCaptainId, originalViceCaptainId]);

  // Get formation requirements
  const formationReqs = useMemo(() => {
    return FORMATIONS.find(f => f.value === selectedFormation) || FORMATIONS[0];
  }, [selectedFormation]);

  // Calculate starting XI and bench based on formation
  const { startingXI, bench } = useMemo(() => {
    const playersToUse = simulatedPlayers;
    let starting: Player[];
    let benchPlayers: Player[];

    if (showOptimized && suggestedLineup && suggestedLineup.length === 11) {
      starting = playersToUse.filter(p => suggestedLineup.includes(p.id));
      benchPlayers = playersToUse.filter(p => !suggestedLineup.includes(p.id));
    } else if (simulatedStartingXI.length > 0) {
      // Use the manually set starting XI from substitutions
      starting = playersToUse.filter(p => simulatedStartingXI.includes(p.id));
      benchPlayers = playersToUse.filter(p => !simulatedStartingXI.includes(p.id));
    } else if (initialStartingXI && initialStartingXI.length === 11) {
      // Use the actual starting XI from FPL picks (preserves real formation/bench)
      starting = playersToUse.filter(p => initialStartingXI.includes(p.id));
      benchPlayers = playersToUse.filter(p => !initialStartingXI.includes(p.id));
    } else {
      // Build lineup based on selected formation
      const sorted = [...playersToUse].sort((a, b) => {
        const ptsA = predictions.get(a.id) || a.total_points || 0;
        const ptsB = predictions.get(b.id) || b.total_points || 0;
        return ptsB - ptsA;
      });

      const gk = sorted.find(p => p.position === 'GKP');
      const defs = sorted.filter(p => p.position === 'DEF');
      const mids = sorted.filter(p => p.position === 'MID');
      const fwds = sorted.filter(p => p.position === 'FWD');

      starting = [];
      if (gk) starting.push(gk);
      defs.slice(0, formationReqs.def).forEach(p => starting.push(p));
      mids.slice(0, formationReqs.mid).forEach(p => starting.push(p));
      fwds.slice(0, formationReqs.fwd).forEach(p => starting.push(p));

      benchPlayers = playersToUse.filter(p => !starting.includes(p));
    }

    return { startingXI: starting, bench: benchPlayers.slice(0, 4) };
  }, [simulatedPlayers, simulatedStartingXI, showOptimized, suggestedLineup, initialStartingXI, predictions, formationReqs]);

  // Reset to original
  const handleReset = useCallback(() => {
    setSimulatedPlayers(originalPlayers);
    setSimulatedCaptainId(originalCaptainId);
    setSimulatedViceCaptainId(originalViceCaptainId);
    setSimulatedStartingXI([]);
    setTransfers([]);
    setSimulatedBank(originalBank);
    setSelectedFormation('4-4-2');
    setSelectedForSub(null);
    setIsSimulationMode(false);
    onSimulationChange?.(false);
    toast.success('Simulation reset to original team');
  }, [originalPlayers, originalCaptainId, originalViceCaptainId, originalBank, onSimulationChange]);

  // Handle formation change
  const handleFormationChange = useCallback((formation: string) => {
    setSelectedFormation(formation);
    setSimulatedStartingXI([]); // Reset starting XI to recalculate based on new formation
    setSelectedForSub(null);
    onSimulationChange?.(true);
    toast.success(`Formation changed to ${formation}`);
  }, [onSimulationChange]);

  // Handle click-based substitution
  const handlePlayerClick = useCallback((player: Player) => {
    if (!isSimulationMode) return;
    
    const isInStarting = startingXI.some(p => p.id === player.id);
    const isInBench = bench.some(p => p.id === player.id);
    
    if (!selectedForSub) {
      // First click - select player from starting XI or bench
      if (isInStarting) {
        setSelectedForSub(player);
        toast.info(`Selected ${player.web_name}. Now click a bench player to swap.`);
      } else if (isInBench) {
        setSelectedForSub(player);
        toast.info(`Selected ${player.web_name}. Now click a starting player to swap.`);
      }
    } else {
      // Second click - complete substitution
      const selectedIsStarting = startingXI.some(p => p.id === selectedForSub.id);
      
      if (selectedIsStarting && isInBench) {
        // Swap starting player with bench player - preserve the full starting XI IDs
        const currentStartingIds = startingXI.map(p => p.id);
        const newStarting = currentStartingIds.filter(id => id !== selectedForSub.id);
        newStarting.push(player.id);
        setSimulatedStartingXI(newStarting);
        toast.success(`Substitution: ${selectedForSub.web_name} ↔ ${player.web_name}`);
        setSelectedForSub(null);
        onSimulationChange?.(true);
      } else if (!selectedIsStarting && isInStarting) {
        // Swap bench player with starting player - preserve the full starting XI IDs
        const currentStartingIds = startingXI.map(p => p.id);
        const newStarting = currentStartingIds.filter(id => id !== player.id);
        newStarting.push(selectedForSub.id);
        setSimulatedStartingXI(newStarting);
        toast.success(`Substitution: ${player.web_name} ↔ ${selectedForSub.web_name}`);
        setSelectedForSub(null);
        onSimulationChange?.(true);
      } else {
        // Same area clicked - reselect
        setSelectedForSub(player);
        if (isInStarting) {
          toast.info(`Selected ${player.web_name}. Now click a bench player to swap.`);
        } else {
          toast.info(`Selected ${player.web_name}. Now click a starting player to swap.`);
        }
      }
    }
  }, [isSimulationMode, selectedForSub, startingXI, bench, onSimulationChange]);

  // Open transfer modal for a player
  const handleOpenTransfer = useCallback((player: Player) => {
    setSelectedPlayerForTransfer(player);
    setIsSearchModalOpen(true);
  }, []);

  // Handle transfer confirmation
  const handleTransferConfirm = useCallback((newPlayer: Player) => {
    if (!selectedPlayerForTransfer) return;
    
    // Check budget
    const cost = newPlayer.price - selectedPlayerForTransfer.price;
    if (cost > simulatedBank) {
      toast.error('Insufficient budget for this transfer');
      return;
    }
    
    // Check max 3 players per team
    const teamCounts = new Map<number, number>();
    simulatedPlayers.forEach(p => {
      if (p.id !== selectedPlayerForTransfer.id) {
        teamCounts.set(p.team_id, (teamCounts.get(p.team_id) || 0) + 1);
      }
    });
    const newTeamCount = (teamCounts.get(newPlayer.team_id) || 0) + 1;
    if (newTeamCount > 3) {
      toast.error('Cannot have more than 3 players from the same team');
      return;
    }
    
    // Perform transfer
    const newPlayers = simulatedPlayers.map(p => 
      p.id === selectedPlayerForTransfer.id ? newPlayer : p
    );
    
    setSimulatedPlayers(newPlayers);
    setSimulatedBank(prev => prev - cost);
    setTransfers(prev => [...prev, { playerOut: selectedPlayerForTransfer, playerIn: newPlayer }]);
    
    // Update captain/vice if needed
    if (selectedPlayerForTransfer.id === simulatedCaptainId) {
      setSimulatedCaptainId(newPlayer.id);
    }
    if (selectedPlayerForTransfer.id === simulatedViceCaptainId) {
      setSimulatedViceCaptainId(newPlayer.id);
    }
    
    // Update starting XI if needed
    if (simulatedStartingXI.includes(selectedPlayerForTransfer.id)) {
      setSimulatedStartingXI(prev => 
        prev.map(id => id === selectedPlayerForTransfer.id ? newPlayer.id : id)
      );
    }
    
    setIsSearchModalOpen(false);
    setSelectedPlayerForTransfer(null);
    onSimulationChange?.(true);
    toast.success(`Transfer: ${selectedPlayerForTransfer.web_name} → ${newPlayer.web_name}`);
  }, [selectedPlayerForTransfer, simulatedBank, simulatedPlayers, simulatedCaptainId, simulatedViceCaptainId, simulatedStartingXI, onSimulationChange]);

  // Set captain
  const handleSetCaptain = useCallback((player: Player) => {
    if (player.id === simulatedCaptainId) return;
    if (player.id === simulatedViceCaptainId) {
      setSimulatedViceCaptainId(simulatedCaptainId);
    }
    setSimulatedCaptainId(player.id);
    onSimulationChange?.(true);
    toast.success(`${player.web_name} is now captain`);
  }, [simulatedCaptainId, simulatedViceCaptainId, onSimulationChange]);

  // Set vice captain
  const handleSetViceCaptain = useCallback((player: Player) => {
    if (player.id === simulatedViceCaptainId) return;
    if (player.id === simulatedCaptainId) {
      setSimulatedCaptainId(simulatedViceCaptainId);
    }
    setSimulatedViceCaptainId(player.id);
    onSimulationChange?.(true);
    toast.success(`${player.web_name} is now vice-captain`);
  }, [simulatedCaptainId, simulatedViceCaptainId, onSimulationChange]);

  // Calculate total predicted points
  const totalPredicted = useMemo(() => {
    return startingXI.reduce((sum, p) => {
      const pts = predictions.get(p.id) || 0;
      if (p.id === simulatedCaptainId) return sum + (pts * 2);
      return sum + pts;
    }, 0);
  }, [startingXI, predictions, simulatedCaptainId]);

  // Original total for comparison
  const originalTotalPredicted = useMemo(() => {
    const origStarting = (initialStartingXI && initialStartingXI.length === 11)
      ? originalPlayers.filter(p => initialStartingXI.includes(p.id))
      : originalPlayers.slice(0, 11);

    return origStarting.reduce((sum, p) => {
      const pts = predictions.get(p.id) || 0;
      if (p.id === originalCaptainId) return sum + (pts * 2);
      return sum + pts;
    }, 0);
  }, [originalPlayers, initialStartingXI, predictions, originalCaptainId]);

  const pointsDiff = totalPredicted - originalTotalPredicted;

  const startingByPosition = {
    GKP: startingXI.filter(p => p.position === 'GKP'),
    DEF: startingXI.filter(p => p.position === 'DEF'),
    MID: startingXI.filter(p => p.position === 'MID'),
    FWD: startingXI.filter(p => p.position === 'FWD'),
  };

  const positionOrder: Position[] = ['GKP', 'DEF', 'MID', 'FWD'];
  const positionLabels = { GKP: 'GK', DEF: 'DEF', MID: 'MID', FWD: 'FWD' };

  if (!originalPlayers.length) return null;

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {showOptimized ? 'Optimized Lineup' : isSimulationMode ? 'Simulation Mode' : 'Current Lineup'}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {totalPredicted > 0 && (
                  <Badge variant="secondary" className="text-sm gap-1">
                    <Target className="w-3 h-3" />
                    {totalPredicted.toFixed(1)} pts
                  </Badge>
                )}
                {hasChanges && pointsDiff !== 0 && (
                  <Badge variant={pointsDiff > 0 ? 'default' : 'destructive'} className="text-sm">
                    {pointsDiff > 0 ? '+' : ''}{pointsDiff.toFixed(1)} pts
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Simulation Controls */}
            <div className="flex flex-wrap gap-2 items-center">
              {!isSimulationMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSimulationMode(true)}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Simulate Changes
                </Button>
              ) : (
                <>
                  <Select value={selectedFormation} onValueChange={handleFormationChange}>
                    <SelectTrigger className="w-[100px] h-8">
                      <SelectValue placeholder="Formation" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMATIONS.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedForSub ? (
                    <Badge variant="default" className="py-1.5 px-3 gap-1 bg-yellow-600 text-white">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Swapping: {selectedForSub.web_name}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="py-1.5 px-3 gap-1 bg-primary/10 text-primary border-primary">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Click player to swap
                    </Badge>
                  )}
                  <Badge variant="secondary" className="py-1.5 px-3 gap-1">
                    Bank: £{simulatedBank.toFixed(1)}M
                  </Badge>
                  {transfers.length > 0 && (
                    <Badge variant="secondary" className="py-1.5 px-3 gap-1">
                      {transfers.length} transfer{transfers.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {selectedForSub && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedForSub(null)}
                      className="gap-1 text-muted-foreground h-8"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </Button>
                  )}
                  {hasChanges && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="gap-2 text-muted-foreground"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Starting XI */}
            {positionOrder.map(position => {
              const posPlayers = startingByPosition[position];
              if (posPlayers.length === 0) return null;
              
              return (
                <div key={position}>
                  <h4 className={`text-xs font-semibold mb-2 ${POSITION_COLORS[position]}`}>
                    {position === 'GKP' ? 'Goalkeeper' : 
                     position === 'DEF' ? 'Defenders' : 
                     position === 'MID' ? 'Midfielders' : 'Forwards'}
                  </h4>
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {posPlayers.map(player => (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        predictions={predictions}
                        positionLabels={positionLabels}
                        isCaptain={player.id === simulatedCaptainId}
                        isViceCaptain={player.id === simulatedViceCaptainId}
                        isSimulationMode={isSimulationMode}
                        isStarting={true}
                        isSelectedForSub={selectedForSub?.id === player.id}
                        onClick={() => handlePlayerClick(player)}
                        onTransfer={() => handleOpenTransfer(player)}
                        onSetCaptain={() => handleSetCaptain(player)}
                        onSetViceCaptain={() => handleSetViceCaptain(player)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Bench */}
            {bench.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Bench</h4>
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                  {bench.map(player => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      predictions={predictions}
                      positionLabels={positionLabels}
                      isCaptain={player.id === simulatedCaptainId}
                      isViceCaptain={player.id === simulatedViceCaptainId}
                      isSimulationMode={isSimulationMode}
                      isStarting={false}
                      isSelectedForSub={selectedForSub?.id === player.id}
                      onClick={() => handlePlayerClick(player)}
                      onTransfer={() => handleOpenTransfer(player)}
                      onSetCaptain={() => handleSetCaptain(player)}
                      onSetViceCaptain={() => handleSetViceCaptain(player)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Transfers List */}
            {transfers.length > 0 && (
              <div className="border-t border-border pt-4 mt-4">
                <h4 className="text-xs font-semibold mb-2 text-primary">Simulated Transfers</h4>
                <div className="space-y-2">
                  {transfers.map((transfer, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Badge variant="destructive" className="gap-1">
                        <X className="w-3 h-3" />
                        {transfer.playerOut.web_name}
                      </Badge>
                      <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                      <Badge variant="default" className="gap-1 bg-green-600">
                        <Check className="w-3 h-3" />
                        {transfer.playerIn.web_name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({transfer.playerIn.price > transfer.playerOut.price ? '-' : '+'}
                        £{Math.abs(transfer.playerIn.price - transfer.playerOut.price).toFixed(1)}M)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Player Search Modal */}
      <PlayerSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => {
          setIsSearchModalOpen(false);
          setSelectedPlayerForTransfer(null);
        }}
        onSelect={handleTransferConfirm}
        position={selectedPlayerForTransfer?.position}
        maxPrice={simulatedBank + (selectedPlayerForTransfer?.price || 0)}
        excludePlayerIds={simulatedPlayers.map(p => p.id)}
        excludeTeamIds={(() => {
          // Get teams with 3 players (excluding the player being transferred out)
          const teamCounts = new Map<number, number>();
          simulatedPlayers.forEach(p => {
            if (p.id !== selectedPlayerForTransfer?.id) {
              teamCounts.set(p.team_id, (teamCounts.get(p.team_id) || 0) + 1);
            }
          });
          return Array.from(teamCounts.entries())
            .filter(([_, count]) => count >= 3)
            .map(([teamId]) => teamId);
        })()}
        predictions={predictions}
      />
    </>
  );
}

// Player Card Component
interface PlayerCardProps {
  player: Player;
  predictions: Map<number, number>;
  positionLabels: Record<Position, string>;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isSimulationMode: boolean;
  isStarting: boolean;
  isSelectedForSub: boolean;
  onClick: () => void;
  onTransfer: () => void;
  onSetCaptain: () => void;
  onSetViceCaptain: () => void;
}

function PlayerCard({
  player,
  predictions,
  positionLabels,
  isCaptain,
  isViceCaptain,
  isSimulationMode,
  isStarting,
  isSelectedForSub,
  onClick,
  onTransfer,
  onSetCaptain,
  onSetViceCaptain
}: PlayerCardProps) {
  const predictedPts = predictions.get(player.id) || 0;
  
  return (
    <div 
      onClick={onClick}
      className={`aspect-square p-3 rounded-lg border bg-muted/30 transition-all flex flex-col justify-between relative group 
        ${!isStarting ? 'opacity-60' : ''} 
        ${isSimulationMode ? 'cursor-pointer hover:bg-muted/50' : ''} 
        ${isSelectedForSub ? 'border-yellow-500 border-2 bg-yellow-500/10 ring-2 ring-yellow-500/30' : 'border-border'}
        ${isSimulationMode && !isSelectedForSub ? 'hover:border-primary' : ''}`}
    >
      <div className="flex items-center justify-between">
        <Badge 
          variant="outline" 
          className={`text-[10px] px-1 py-0 ${POSITION_COLORS[player.position]}`}
        >
          {positionLabels[player.position]}
        </Badge>
        <div className="flex gap-1">
          {isCaptain && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-primary">C</Badge>
          )}
          {isViceCaptain && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">V</Badge>
          )}
        </div>
      </div>
      
      <div className="text-center">
        <p className="font-semibold text-sm truncate">{player.web_name}</p>
        <p className="text-[10px] text-muted-foreground">
          {player.teams?.short_name || 'N/A'}
        </p>
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">£{player.price.toFixed(1)}M</span>
        <div className="text-right">
          {predictedPts > 0 ? (
            <span className="font-semibold text-primary">{predictedPts.toFixed(1)} pts</span>
          ) : (
            <span className="text-muted-foreground">{player.total_points} pts</span>
          )}
        </div>
      </div>

      {/* Action overlay when in simulation mode - only show for transfer/captain actions */}
      {isSimulationMode && !isSelectedForSub && (
        <div className="absolute inset-0 bg-background/95 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-1.5 p-2">
          <p className="text-[10px] text-muted-foreground mb-1">Click to swap</p>
          <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); onTransfer(); }}>
            <ArrowLeftRight className="w-3 h-3" />
            Transfer
          </Button>
          <div className="flex gap-1 w-full">
            <Button size="sm" variant={isCaptain ? "default" : "outline"} className="flex-1 h-6 text-[10px] px-1" onClick={(e) => { e.stopPropagation(); onSetCaptain(); }}>
              C
            </Button>
            <Button size="sm" variant={isViceCaptain ? "default" : "outline"} className="flex-1 h-6 text-[10px] px-1" onClick={(e) => { e.stopPropagation(); onSetViceCaptain(); }}>
              V
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
