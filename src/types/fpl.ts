export interface Team {
  id: number;
  fpl_id: number;
  name: string;
  short_name: string;
  strength_overall: number | null;
  strength_attack_home: number | null;
  strength_attack_away: number | null;
  strength_defence_home: number | null;
  strength_defence_away: number | null;
}

export interface Player {
  id: number;
  fpl_id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team_id: number | null;
  position: 'GKP' | 'DEF' | 'MID' | 'FWD';
  price: number;
  total_points: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  bonus: number;
  form: number;
  selected_by_percent: number;
  status: string;
  photo: string | null;
  teams?: Team;
}

export interface Gameweek {
  id: number;
  fpl_id: number;
  name: string;
  deadline_time: string | null;
  is_current: boolean;
  is_next: boolean;
  finished: boolean;
  average_score: number | null;
  highest_score: number | null;
}

export interface Fixture {
  id: number;
  fpl_id: number;
  gameweek_id: number | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_team_difficulty: number | null;
  away_team_difficulty: number | null;
  kickoff_time: string | null;
  home_score: number | null;
  away_score: number | null;
  finished: boolean;
  home_team?: Team;
  away_team?: Team;
}

export interface PlayerPrediction {
  id: number;
  player_id: number;
  gameweek_id: number;
  predicted_points: number;
  fixture_difficulty: number | null;
  form_factor: number | null;
  ai_analysis: string | null;
  player?: Player;
}

export interface OptimalTeam {
  id: number;
  gameweek_id: number;
  player_ids: number[];
  starting_xi: number[];
  captain_id: number | null;
  vice_captain_id: number | null;
  total_predicted_points: number;
  team_rating: number;
  formation: string;
  analysis: string | null;
}

export type Position = 'GKP' | 'DEF' | 'MID' | 'FWD';

export const POSITION_COLORS: Record<Position, string> = {
  GKP: 'pos-gkp',
  DEF: 'pos-def',
  MID: 'pos-mid',
  FWD: 'pos-fwd',
};

export const POSITION_LABELS: Record<Position, string> = {
  GKP: 'Goalkeeper',
  DEF: 'Defender',
  MID: 'Midfielder',
  FWD: 'Forward',
};
