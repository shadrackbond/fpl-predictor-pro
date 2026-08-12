# FPL Edge

FPL Edge is an explainable Fantasy Premier League decision workspace. It combines official FPL data, an ensemble expected-points model, squad optimization, transfer planning, captaincy analysis, fixture difficulty, availability, price monitoring, mini-league tracking, and measured model performance.

## What changed in v2.0

- Replaced free-form AI point guesses with a deterministic, testable ensemble model.
- Added expected minutes, availability probability, xG/xA per 90, team strength, venue, fixture difficulty, set pieces, saves, recent form, season rates, and official expected points.
- Correctly handles blank and double gameweeks.
- Calibrates future projections using measured historical bias by position.
- Adds a prediction floor, ceiling, confidence score, risk level, fixture count, model version, and explainable component breakdown.
- Replaced the greedy team picker with a valid £100m optimizer that enforces 2 GKP, 5 DEF, 5 MID, 3 FWD, and no more than three players per club.
- Selects the strongest valid formation and adjusts captaincy for confidence and downside.
- Uses MAE, RMSE, within-two-points rate, calibration bias, and a symmetric model score instead of the old unstable percentage formula.
- Reorganized the interface into Squad, Analysis, Planning, and Performance workspaces.
- Added projection filters, expandable drivers, CSV export, deep-linkable workspace URLs, and lazy-loaded views.

## Prediction model

Each player projection blends four independent estimates:

1. A component model for appearances, attacking returns, clean sheets, saves, and bonus.
2. Recent FPL form, adjusted for expected minutes and fixture strength.
3. Season points per 90, adjusted for the selected gameweek.
4. The official FPL expected-points estimate as a low-weight reference.

The model then applies a conservative historical calibration adjustment. It is intentionally explainable: open any projection row to inspect its fixtures, expected minutes, risk flags, component values, and model version.

## Stack

- React 18, TypeScript, Vite, TanStack Query
- Tailwind CSS and Radix UI
- Supabase Auth, Postgres, and Edge Functions
- Official Fantasy Premier League API
- Recharts for model-performance visualization

## Local setup

Requirements: Node.js 20 LTS or newer, npm, a Supabase project, and the Supabase CLI for backend deployment.

```bash
npm ci
cp .env.example .env
npm run dev
```

Set these frontend variables in `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

## Deploy the backend update

Link the project and apply the new database columns before deploying the functions:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy fetch-fpl-data
supabase functions deploy generate-predictions
supabase functions deploy update-actual-results
```

The projection engine no longer needs an LLM key. Other optional AI-assistant functions in the repository may still require the provider secret already used by the project.

After deployment:

1. Sign in to FPL Edge.
2. Select **Sync FPL data** to populate the new availability and per-90 fields.
3. Select the target gameweek.
4. Select **Generate projections**.
5. After a gameweek is officially finished, open **Model accuracy** and select **Score selected GW**.

Scoring an unfinished gameweek is blocked because partial live scores would create misleading accuracy and calibration data.

## Verification

```bash
npm run typecheck
npm run test:model
npm run build
```

The model verification covers blank gameweeks, doubles, unavailable players, prediction ranges, the £100m budget, position quotas, club limits, and starting-XI validity.

## Important files

- `supabase/functions/_shared/prediction-engine.ts` — pure projection and squad-optimization logic.
- `supabase/functions/generate-predictions/index.ts` — database orchestration and calibration.
- `supabase/functions/fetch-fpl-data/index.ts` — official FPL data ingestion.
- `supabase/functions/update-actual-results/index.ts` — completed-gameweek scoring.
- `supabase/migrations/20260812223000_prediction_engine_v2.sql` — v2 schema update.
- `src/components/PredictionsTable.tsx` — projection decision table.
- `src/components/AccuracyDashboard.tsx` — model monitoring.
- `scripts/verify-prediction-engine.ts` — model regression checks.

## Disclaimer

FPL projections are probabilistic estimates, not guarantees. Late team news, tactical changes, postponed fixtures, and unexpected rotation can materially affect outcomes. Refresh official data close to the deadline.
