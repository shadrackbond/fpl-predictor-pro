export const MODEL_VERSION = 'ensemble-v2.0';

export type Position = 'GKP' | 'DEF' | 'MID' | 'FWD';

export interface TeamStrength {
  id: number;
  short_name: string;
  strength_attack_home?: number | null;
  strength_attack_away?: number | null;
  strength_defence_home?: number | null;
  strength_defence_away?: number | null;
}

export interface ProjectionPlayer {
  id: number;
  web_name: string;
  team_id: number;
  position: Position;
  price: number;
  form?: number | null;
  total_points?: number | null;
  minutes?: number | null;
  starts?: number | null;
  starts_per_90?: number | null;
  bonus?: number | null;
  saves?: number | null;
  expected_goals?: number | null;
  expected_assists?: number | null;
  expected_goals_per_90?: number | null;
  expected_assists_per_90?: number | null;
  points_per_game?: number | null;
  ep_next?: number | null;
  chance_of_playing_next_round?: number | null;
  status?: string | null;
  news?: string | null;
  penalties_order?: number | null;
  corners_order?: number | null;
  direct_freekicks_order?: number | null;
  teams?: TeamStrength | null;
}

export interface ProjectionFixture {
  opponent: string;
  difficulty: number;
  isHome: boolean;
  opponentAttack: number;
  opponentDefence: number;
}

export interface CalibrationStats {
  bias: number;
  mae: number;
  samples: number;
}

export interface ProjectionFactors {
  appearance: number;
  attacking: number;
  cleanSheet: number;
  saves: number;
  bonus: number;
  recentForm: number;
  seasonRate: number;
  officialEstimate: number;
  calibration: number;
  availability: number;
  fixtureCount: number;
  fixtures: Array<{ opponent: string; difficulty: number; venue: 'H' | 'A' }>;
  flags: string[];
}

export interface PlayerProjection {
  player_id: number;
  predicted_points: number;
  predicted_floor: number;
  predicted_ceiling: number;
  expected_minutes: number;
  confidence: number;
  risk_level: 'low' | 'medium' | 'high';
  fixture_difficulty: number | null;
  fixture_count: number;
  form_factor: number;
  model_version: string;
  prediction_factors: ProjectionFactors;
  analysis: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const safe = (value: number | null | undefined, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const round = (value: number, digits = 1) => {
  const power = 10 ** digits;
  return Math.round(value * power) / power;
};

function availabilityFor(player: ProjectionPlayer): number {
  if (player.chance_of_playing_next_round != null) {
    return clamp(player.chance_of_playing_next_round / 100, 0, 1);
  }
  if (player.status === 'i' || player.status === 'u' || player.status === 's') return 0;
  if (player.status === 'd') return 0.5;
  return 1;
}

function expectedMinutesFor(player: ProjectionPlayer, completedGameweeks: number): number {
  const availability = availabilityFor(player);
  if (availability === 0) return 0;

  const minutes = safe(player.minutes);
  const starts = safe(player.starts);
  const gameweeks = Math.max(1, completedGameweeks);
  const startRate = clamp(starts / gameweeks, 0, 1);
  const historicalMinutes = clamp(minutes / gameweeks, 0, 90);
  const roleEstimate = starts > 0
    ? 0.6 * historicalMinutes + 0.4 * (12 + 78 * startRate)
    : historicalMinutes > 0
      ? Math.min(35, historicalMinutes)
      : 5;

  return round(clamp(roleEstimate * availability, 0, 90), 0);
}

function difficultyMultiplier(difficulty: number): number {
  return ({ 1: 1.24, 2: 1.12, 3: 1, 4: 0.87, 5: 0.74 } as Record<number, number>)[clamp(Math.round(difficulty), 1, 5)];
}

function per90(total: number | null | undefined, minutes: number): number {
  return minutes >= 90 ? safe(total) * 90 / minutes : 0;
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

function describeProjection(
  player: ProjectionPlayer,
  fixtures: ProjectionFixture[],
  factors: ProjectionFactors,
  expectedMinutes: number,
  risk: PlayerProjection['risk_level'],
): string {
  if (fixtures.length === 0) return 'Blank gameweek: no scheduled fixture, so the projection is 0.0 points.';
  if (factors.availability === 0) return player.news || 'Unavailable for the selected gameweek.';

  const fixtureLabel = fixtures.map(fixture => `${fixture.opponent} (${fixture.isHome ? 'H' : 'A'}, FDR ${fixture.difficulty})`).join(' + ');
  const drivers: string[] = [];
  if (factors.attacking >= 1.5) drivers.push('strong attacking involvement');
  if (factors.cleanSheet >= 1.4) drivers.push('clean-sheet potential');
  if (factors.recentForm >= 4.5) drivers.push('recent form');
  if (player.penalties_order === 1) drivers.push('penalty duty');
  if (drivers.length === 0) drivers.push('minutes, form and fixture strength');

  const riskText = risk === 'low' ? 'stable minutes profile' : risk === 'medium' ? 'some minutes or outcome variance' : 'significant availability or rotation risk';
  return `${fixtureLabel}. Projection is driven by ${drivers.slice(0, 2).join(' and ')} with ${expectedMinutes} expected minutes; ${riskText}.`;
}

export function projectPlayer(
  player: ProjectionPlayer,
  fixtures: ProjectionFixture[],
  completedGameweeks: number,
  calibration: CalibrationStats = { bias: 0, mae: 2.4, samples: 0 },
): PlayerProjection {
  const minutes = safe(player.minutes);
  const expectedMinutes = expectedMinutesFor(player, completedGameweeks);
  const availability = availabilityFor(player);
  const minuteShare = expectedMinutes / 90;
  const fixtureCount = fixtures.length;
  const flags: string[] = [];

  if (fixtureCount === 0) flags.push('blank-gameweek');
  if (fixtureCount > 1) flags.push('double-gameweek');
  if (expectedMinutes < 55 && availability > 0) flags.push('minutes-risk');
  if (availability < 1) flags.push('availability-risk');
  if (player.penalties_order === 1) flags.push('penalties');
  if (player.corners_order === 1 || player.direct_freekicks_order === 1) flags.push('set-pieces');

  const xg90 = safe(player.expected_goals_per_90) || per90(player.expected_goals, minutes);
  const xa90 = safe(player.expected_assists_per_90) || per90(player.expected_assists, minutes);
  const points90 = minutes >= 90 ? safe(player.total_points) * 90 / minutes : safe(player.points_per_game, 2);
  const bonus90 = per90(player.bonus, minutes);
  const saves90 = per90(player.saves, minutes);
  const recentForm = safe(player.form, safe(player.points_per_game, 2));
  const officialEstimate = safe(player.ep_next, recentForm);
  const goalPoints = ({ GKP: 6, DEF: 6, MID: 5, FWD: 4 } as Record<Position, number>)[player.position];
  const cleanSheetPoints = ({ GKP: 4, DEF: 4, MID: 1, FWD: 0 } as Record<Position, number>)[player.position];

  let appearance = 0;
  let attacking = 0;
  let cleanSheet = 0;
  let savePoints = 0;
  let bonus = 0;
  let recentFormTotal = 0;
  let seasonRate = 0;
  let officialTotal = 0;
  const componentFixtureScores: number[] = [];

  for (const fixture of fixtures) {
    const team = player.teams;
    const teamAttack = safe(fixture.isHome ? team?.strength_attack_home : team?.strength_attack_away, 1100);
    const teamDefence = safe(fixture.isHome ? team?.strength_defence_home : team?.strength_defence_away, 1100);
    const attackStrength = clamp(teamAttack / Math.max(850, fixture.opponentDefence), 0.72, 1.32);
    const defenceStrength = clamp(teamDefence / Math.max(850, fixture.opponentAttack), 0.72, 1.32);
    const homeAttack = fixture.isHome ? 1.05 : 0.96;
    const homeDefence = fixture.isHome ? 1.06 : 0.95;
    const fdrMultiplier = difficultyMultiplier(fixture.difficulty);

    const appearanceProbability = clamp(expectedMinutes / 25, 0, 1);
    const sixtyProbability = clamp((expectedMinutes - 35) / 30, 0, 1);
    const fixtureAppearance = appearanceProbability + sixtyProbability;
    const setPieceBoost = player.penalties_order === 1 ? 1.12 : 1;
    const fixtureAttack = (xg90 * goalPoints + xa90 * 3) * minuteShare * attackStrength * homeAttack * fdrMultiplier * setPieceBoost;
    const baseCleanSheetProbability = ({ 1: 0.44, 2: 0.37, 3: 0.30, 4: 0.23, 5: 0.16 } as Record<number, number>)[clamp(Math.round(fixture.difficulty), 1, 5)];
    const cleanSheetProbability = clamp(baseCleanSheetProbability * defenceStrength * homeDefence, 0.08, 0.58);
    const fixtureCleanSheet = cleanSheetPoints * cleanSheetProbability * sixtyProbability;
    const fixtureSaves = player.position === 'GKP' ? clamp(saves90 / 3, 0, 2) * minuteShare : 0;
    const fixtureBonus = clamp(bonus90, 0, 1.5) * minuteShare * (0.85 + fdrMultiplier * 0.15);
    const fixtureForm = recentForm * minuteShare * (0.88 + fdrMultiplier * 0.12);
    const fixtureSeason = clamp(points90, 0, 12) * minuteShare * (0.9 + fdrMultiplier * 0.1);
    const fixtureOfficial = clamp(officialEstimate, 0, 15) * minuteShare;

    appearance += fixtureAppearance;
    attacking += fixtureAttack;
    cleanSheet += fixtureCleanSheet;
    savePoints += fixtureSaves;
    bonus += fixtureBonus;
    recentFormTotal += fixtureForm;
    seasonRate += fixtureSeason;
    officialTotal += fixtureOfficial;
    componentFixtureScores.push(fixtureAppearance + fixtureAttack + fixtureCleanSheet + fixtureSaves + fixtureBonus);
  }

  const componentTotal = appearance + attacking + cleanSheet + savePoints + bonus;
  const rawPrediction = fixtureCount === 0 || availability === 0
    ? 0
    : 0.5 * componentTotal + 0.25 * recentFormTotal + 0.15 * seasonRate + 0.1 * officialTotal;
  const calibrationWeight = clamp(calibration.samples / 120, 0, 0.35);
  const calibrationAdjustment = clamp(calibration.bias, -1.25, 1.25) * calibrationWeight * fixtureCount;
  const predicted = clamp(rawPrediction + calibrationAdjustment, 0, fixtureCount > 1 ? 30 : 18);

  const ensembleSpread = standardDeviation([
    componentTotal,
    recentFormTotal,
    seasonRate,
    officialTotal,
  ]);
  const rotationPenalty = (1 - minuteShare) * 24;
  const availabilityPenalty = (1 - availability) * 30;
  const sampleBonus = clamp(calibration.samples / 20, 0, 12);
  const dataPenalty = minutes < 270 ? 12 : minutes < 720 ? 5 : 0;
  const confidence = fixtureCount === 0
    ? 96
    : Math.round(clamp(86 - rotationPenalty - availabilityPenalty - ensembleSpread * 3 - dataPenalty + sampleBonus, 28, 94));
  const uncertainty = Math.max(1.4, calibration.mae * 0.65 + ensembleSpread * 0.55 + (1 - minuteShare) * 2.6 + (1 - availability) * 3);
  const floor = fixtureCount === 0 ? 0 : clamp(predicted - uncertainty, 0, predicted);
  const ceiling = fixtureCount === 0 ? 0 : clamp(predicted + uncertainty * 1.7, predicted, fixtureCount > 1 ? 32 : 20);
  const risk: PlayerProjection['risk_level'] = availability < 0.75 || expectedMinutes < 45 || confidence < 50
    ? 'high'
    : expectedMinutes < 70 || confidence < 70
      ? 'medium'
      : 'low';

  const factors: ProjectionFactors = {
    appearance: round(appearance),
    attacking: round(attacking),
    cleanSheet: round(cleanSheet),
    saves: round(savePoints),
    bonus: round(bonus),
    recentForm: round(recentFormTotal),
    seasonRate: round(seasonRate),
    officialEstimate: round(officialTotal),
    calibration: round(calibrationAdjustment),
    availability: round(availability * 100, 0),
    fixtureCount,
    fixtures: fixtures.map(fixture => ({
      opponent: fixture.opponent,
      difficulty: fixture.difficulty,
      venue: fixture.isHome ? 'H' : 'A',
    })),
    flags,
  };

  return {
    player_id: player.id,
    predicted_points: round(predicted),
    predicted_floor: round(floor),
    predicted_ceiling: round(ceiling),
    expected_minutes: expectedMinutes,
    confidence,
    risk_level: risk,
    fixture_difficulty: fixtureCount > 0 ? round(fixtures.reduce((sum, fixture) => sum + fixture.difficulty, 0) / fixtureCount, 0) : null,
    fixture_count: fixtureCount,
    form_factor: round(clamp(recentForm / 10, 0, 1), 2),
    model_version: MODEL_VERSION,
    prediction_factors: factors,
    analysis: describeProjection(player, fixtures, factors, expectedMinutes, risk),
  };
}

export function selectOptimizedSquad(players: Array<ProjectionPlayer & PlayerProjection>) {
  const quotas: Record<Position, number> = { GKP: 2, DEF: 5, MID: 5, FWD: 3 };
  const candidates = players.filter(player => player.price > 0 && player.team_id != null);
  const squad: Array<ProjectionPlayer & PlayerProjection> = [];
  const teamCounts = new Map<number, number>();

  const canAdd = (player: ProjectionPlayer) => (teamCounts.get(player.team_id) || 0) < 3;
  const add = (player: ProjectionPlayer & PlayerProjection) => {
    squad.push(player);
    teamCounts.set(player.team_id, (teamCounts.get(player.team_id) || 0) + 1);
  };

  for (const position of Object.keys(quotas) as Position[]) {
    const pool = candidates
      .filter(player => player.position === position)
      .sort((a, b) => a.price - b.price || b.predicted_points - a.predicted_points);
    for (const player of pool) {
      if (squad.filter(item => item.position === position).length >= quotas[position]) break;
      if (canAdd(player)) add(player);
    }
  }

  if (squad.length !== 15) return [];

  let totalCost = squad.reduce((sum, player) => sum + player.price, 0);
  for (let iteration = 0; iteration < 100; iteration++) {
    let bestSwap: { outgoing: typeof squad[number]; incoming: typeof squad[number]; gain: number } | null = null;

    for (const outgoing of squad) {
      for (const incoming of candidates) {
        if (incoming.position !== outgoing.position || squad.some(player => player.id === incoming.id)) continue;
        if (totalCost - outgoing.price + incoming.price > 100) continue;
        const incomingTeamCount = (teamCounts.get(incoming.team_id) || 0) - (incoming.team_id === outgoing.team_id ? 1 : 0);
        if (incomingTeamCount >= 3) continue;
        const gain = incoming.predicted_points - outgoing.predicted_points;
        if (gain > 0.05 && (!bestSwap || gain > bestSwap.gain || (gain === bestSwap.gain && incoming.price < bestSwap.incoming.price))) {
          bestSwap = { outgoing, incoming, gain };
        }
      }
    }

    if (!bestSwap) break;
    const index = squad.findIndex(player => player.id === bestSwap!.outgoing.id);
    squad[index] = bestSwap.incoming;
    totalCost = totalCost - bestSwap.outgoing.price + bestSwap.incoming.price;
    teamCounts.set(bestSwap.outgoing.team_id, (teamCounts.get(bestSwap.outgoing.team_id) || 1) - 1);
    teamCounts.set(bestSwap.incoming.team_id, (teamCounts.get(bestSwap.incoming.team_id) || 0) + 1);
  }

  return squad;
}

export function selectStartingXI(squad: Array<ProjectionPlayer & PlayerProjection>) {
  const formations = [
    { DEF: 3, MID: 4, FWD: 3 },
    { DEF: 3, MID: 5, FWD: 2 },
    { DEF: 4, MID: 3, FWD: 3 },
    { DEF: 4, MID: 4, FWD: 2 },
    { DEF: 4, MID: 5, FWD: 1 },
    { DEF: 5, MID: 2, FWD: 3 },
    { DEF: 5, MID: 3, FWD: 2 },
    { DEF: 5, MID: 4, FWD: 1 },
  ];
  const byPosition = (position: Position) => squad
    .filter(player => player.position === position)
    .sort((a, b) => b.predicted_points - a.predicted_points);
  const goalkeeper = byPosition('GKP')[0];

  const options = formations.map(formation => {
    const players = [
      goalkeeper,
      ...byPosition('DEF').slice(0, formation.DEF),
      ...byPosition('MID').slice(0, formation.MID),
      ...byPosition('FWD').slice(0, formation.FWD),
    ].filter(Boolean) as Array<ProjectionPlayer & PlayerProjection>;
    return {
      formation: `${formation.DEF}-${formation.MID}-${formation.FWD}`,
      players,
      total: players.reduce((sum, player) => sum + player.predicted_points, 0),
    };
  }).filter(option => option.players.length === 11);

  return options.sort((a, b) => b.total - a.total)[0] || { formation: '4-4-2', players: [], total: 0 };
}
