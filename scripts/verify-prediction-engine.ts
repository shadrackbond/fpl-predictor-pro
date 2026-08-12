import assert from 'node:assert/strict';
import {
  projectPlayer,
  selectOptimizedSquad,
  selectStartingXI,
  type Position,
  type ProjectionFixture,
  type ProjectionPlayer,
} from '../supabase/functions/_shared/prediction-engine.ts';

const basePlayer: ProjectionPlayer = {
  id: 1,
  web_name: 'Test Player',
  team_id: 1,
  position: 'MID',
  price: 7.5,
  form: 6.2,
  total_points: 120,
  minutes: 1800,
  starts: 20,
  expected_goals: 8,
  expected_assists: 6,
  expected_goals_per_90: 0.4,
  expected_assists_per_90: 0.3,
  points_per_game: 5.7,
  ep_next: 5.5,
  status: 'a',
  chance_of_playing_next_round: 100,
  teams: {
    id: 1,
    short_name: 'TST',
    strength_attack_home: 1200,
    strength_attack_away: 1160,
    strength_defence_home: 1180,
    strength_defence_away: 1130,
  },
};

const easyFixture: ProjectionFixture = {
  opponent: 'EAS',
  difficulty: 2,
  isHome: true,
  opponentAttack: 1050,
  opponentDefence: 1020,
};

const blank = projectPlayer(basePlayer, [], 24);
assert.equal(blank.predicted_points, 0, 'blank gameweek must project zero points');
assert.equal(blank.fixture_count, 0);

const single = projectPlayer(basePlayer, [easyFixture], 24);
const double = projectPlayer(basePlayer, [easyFixture, { ...easyFixture, opponent: 'TWO', isHome: false }], 24);
assert.ok(single.predicted_points > 0, 'single fixture should produce a positive projection');
assert.ok(double.predicted_points > single.predicted_points, 'double gameweek should exceed the matching single fixture');
assert.ok(single.predicted_floor <= single.predicted_points && single.predicted_ceiling >= single.predicted_points);

const unavailable = projectPlayer({ ...basePlayer, status: 'i', chance_of_playing_next_round: 0 }, [easyFixture], 24);
assert.equal(unavailable.predicted_points, 0, 'unavailable player must project zero points');
assert.equal(unavailable.risk_level, 'high');

const positions: Position[] = ['GKP', 'DEF', 'MID', 'FWD'];
const candidates = Array.from({ length: 80 }, (_, index) => {
  const position = positions[index % positions.length];
  const player: ProjectionPlayer = {
    ...basePlayer,
    id: index + 1,
    team_id: index % 20 + 1,
    web_name: `Player ${index + 1}`,
    position,
    price: 4 + (index % 7) * 0.5,
    form: 2 + (index % 10) * 0.6,
  };
  return { ...player, ...projectPlayer(player, [easyFixture], 24) };
});

const squad = selectOptimizedSquad(candidates);
assert.equal(squad.length, 15, 'optimizer must return a complete squad');
assert.ok(squad.reduce((sum, player) => sum + player.price, 0) <= 100, 'squad must remain within budget');
assert.deepEqual(
  Object.fromEntries(positions.map(position => [position, squad.filter(player => player.position === position).length])),
  { GKP: 2, DEF: 5, MID: 5, FWD: 3 },
  'squad must meet FPL position quotas',
);
for (const teamId of new Set(squad.map(player => player.team_id))) {
  assert.ok(squad.filter(player => player.team_id === teamId).length <= 3, 'squad must respect the three-per-club limit');
}

const starting = selectStartingXI(squad);
assert.equal(starting.players.length, 11, 'starting XI must contain 11 players');
assert.match(starting.formation, /^[3-5]-[2-5]-[1-3]$/);

console.log('Prediction engine verification passed.');
