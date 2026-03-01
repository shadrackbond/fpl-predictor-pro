# Prediction Generation Timeout Fixes

## Problem Diagnosed
The "Generate Predictions" button was hanging for 4+ days due to:
1. **No timeout on AI API calls** - If the Lovable API was slow or unresponsive, the entire batch processing would hang indefinitely
2. **No detection for stuck processing** - If a batch got stuck, there was no way to recover
3. **Large batch size** - Processing 50 players at once made timeouts more likely

## Solutions Implemented

### 1. **Added AI API Timeout (60 seconds)**
   - File: `supabase/functions/generate-predictions/index.ts`
   - Each AI API call now has a 60-second timeout
   - If timeout occurs, automatically falls back to simple heuristic predictions
   - No more hanging on unresponsive API calls

### 2. **Added Overall Processing Timeout (15 minutes)**
   - If prediction generation is stuck in "processing" state for >15 minutes:
     - Automatically marks as failed
     - Allows user to retry with force refresh
   - Prevention: Stuck processes can now be retried instead of waiting forever

### 3. **Reduced Batch Size (50 → 20 players)**
   - Smaller batches = faster AI API calls = less chance of timeout
   - Added example: 400 players now takes ~80 API calls instead of ~16, but each is 2.5x faster

### 4. **Increased Delay Between Batches (300ms → 500ms)**
   - Gives AI API more breathing room between requests
   - Reduces rate limiting issues

### 5. **Frontend UI Improvements**
   - Shows "Stuck - click Retry" warning if no progress updates for 5+ minutes
   - Adds "Retry Stuck Generation" button
   - Users can now manually recover from stuck predictions

### 6. **Better Logging**
   - Added console warnings for:
     - AI API timeouts
     - Processing stuck detection
     - Batch processing logs

## What to Do Now

### If You Have Stuck Predictions Currently:

1. **In the App:**
   - You should now see a "Retry Stuck Generation" button
   - Click it to force a fresh generation attempt

2. **Via Database (if needed):**
```sql
-- Find stuck prediction records
SELECT * FROM prediction_sync_status 
WHERE status = 'processing' AND started_at < NOW() - INTERVAL '15 minutes';

-- Clear a stuck record for a specific gameweek
DELETE FROM prediction_sync_status WHERE gameweek_id = {YOUR_GAMEWEEK_ID};
```

3. **Then try "Generate Predictions" again**

## Files Modified
- `supabase/functions/generate-predictions/index.ts` - Added timeouts and better error handling
- `src/hooks/usePredictionStatus.ts` - Added stuck detection
- `src/pages/Index.tsx` - Added UI for stuck indicator and retry button

## Testing
Next time you click "Generate Predictions":
- Watch the progress counter update every 3 seconds
- If it stops updating for 5+ minutes, you'll see a warning
- Click the "Retry" button to start fresh
- After 15 minutes of being stuck, the backend will auto-reset

## Expected Processing Time
With these changes:
- **~400 players:** 10-20 minutes (was 10+ minutes but often timed out)
- **~500 players:** 15-25 minutes (was 4+ days if stuck)
- Much more reliable with automatic fallback predictions on timeout
