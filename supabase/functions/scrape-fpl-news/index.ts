import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NEWS_SOURCES = [
  { name: 'BBC Sport', url: 'bbc.co.uk/sport/football', searchQuery: 'Premier League FPL' },
  { name: 'Sky Sports', url: 'skysports.com/premier-league', searchQuery: 'Premier League fantasy' },
  { name: 'Fantasy Football Scout', url: 'fantasyfootballscout.co.uk', searchQuery: 'FPL tips GW' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting FPL news scraping...');

    // Fetch player names for matching
    const { data: players } = await supabase
      .from('players')
      .select('id, web_name, first_name, second_name, team_id');

    const playerNames = players?.map(p => ({
      id: p.id,
      names: [p.web_name, `${p.first_name} ${p.second_name}`, p.second_name].filter(Boolean)
    })) || [];

    // Get current gameweek
    const { data: currentGW } = await supabase
      .from('gameweeks')
      .select('id')
      .or('is_current.eq.true,is_next.eq.true')
      .order('fpl_id', { ascending: false })
      .limit(1)
      .single();

    const gameweekId = currentGW?.id;

    const allArticles: any[] = [];
    const playerMentions: Map<number, { count: number; sentiment: string; sources: string[] }> = new Map();

    // Search for FPL news using Firecrawl
    for (const source of NEWS_SOURCES) {
      try {
        console.log(`Searching ${source.name}...`);
        
        const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `${source.searchQuery} site:${source.url}`,
            limit: 5,
            scrapeOptions: {
              formats: ['markdown'],
            },
          }),
        });

        if (!searchResponse.ok) {
          console.error(`Search failed for ${source.name}:`, await searchResponse.text());
          continue;
        }

        const searchData = await searchResponse.json();
        const results = searchData.data || [];

        for (const result of results) {
          const article = {
            source: source.name,
            title: result.title || 'Untitled',
            content: result.markdown?.slice(0, 2000) || result.description || '',
            url: result.url,
            published_at: new Date().toISOString(),
            scraped_at: new Date().toISOString(),
            relevance_score: 0,
            player_mentions: [] as number[],
          };

          // Find player mentions
          const contentLower = (article.content + ' ' + article.title).toLowerCase();
          for (const player of playerNames) {
            for (const name of player.names) {
              if (contentLower.includes(name.toLowerCase())) {
                article.player_mentions.push(player.id);
                
                const existing = playerMentions.get(player.id) || { count: 0, sentiment: 'neutral', sources: [] };
                existing.count++;
                existing.sources.push(source.name);
                playerMentions.set(player.id, existing);
                break;
              }
            }
          }

          article.relevance_score = Math.min(10, article.player_mentions.length * 2);
          allArticles.push(article);
        }
      } catch (error) {
        console.error(`Error scraping ${source.name}:`, error);
      }
    }

    console.log(`Scraped ${allArticles.length} articles`);

    // Analyze sentiment using Lovable AI for articles with player mentions
    const articlesWithMentions = allArticles.filter(a => a.player_mentions.length > 0).slice(0, 10);
    
    if (articlesWithMentions.length > 0 && lovableApiKey) {
      console.log('Analyzing sentiment with AI...');
      
      for (const article of articlesWithMentions) {
        try {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: 'Analyze FPL news for player sentiment. Return JSON: { "sentiment": "positive"|"negative"|"neutral"|"mixed", "key_info": "brief summary", "injury_mentioned": boolean, "form_mentioned": boolean }'
                },
                {
                  role: 'user',
                  content: `Article: ${article.title}\n\nContent: ${article.content.slice(0, 1000)}`
                }
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content || '';
            
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                
                // Update player mentions with sentiment
                for (const playerId of article.player_mentions) {
                  const existing = playerMentions.get(playerId);
                  if (existing) {
                    existing.sentiment = analysis.sentiment || 'neutral';
                    playerMentions.set(playerId, existing);
                  }
                }
              }
            } catch (parseError) {
              console.log('Could not parse AI response for sentiment');
            }
          }
        } catch (aiError) {
          console.error('AI analysis error:', aiError);
        }
      }
    }

    // Save articles to database
    if (allArticles.length > 0) {
      const { error: insertError } = await supabase
        .from('news_articles')
        .insert(allArticles.map(a => ({
          source: a.source,
          title: a.title,
          content: a.content,
          url: a.url,
          published_at: a.published_at,
          scraped_at: a.scraped_at,
          relevance_score: a.relevance_score,
          player_mentions: a.player_mentions,
        })));

      if (insertError) {
        console.error('Error saving articles:', insertError);
      }
    }

    // Update player hype scores
    if (gameweekId && playerMentions.size > 0) {
      console.log(`Updating hype for ${playerMentions.size} players...`);
      
      for (const [playerId, data] of playerMentions) {
        const hypeScore = Math.min(100, data.count * 15 + (data.sentiment === 'positive' ? 20 : data.sentiment === 'negative' ? -10 : 0));
        const trendingDirection = data.count >= 3 ? 'up' : data.count >= 1 ? 'stable' : 'down';
        
        const { error: upsertError } = await supabase
          .from('player_hype')
          .upsert({
            player_id: playerId,
            gameweek_id: gameweekId,
            hype_score: hypeScore,
            mentions: data.count,
            sentiment: data.sentiment,
            sources: data.sources,
            trending_direction: trendingDirection,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'player_id,gameweek_id',
          });

        if (upsertError) {
          console.error(`Error upserting hype for player ${playerId}:`, upsertError);
        }
      }
    }

    console.log('News scraping complete!');

    return new Response(JSON.stringify({
      success: true,
      articles_scraped: allArticles.length,
      players_mentioned: playerMentions.size,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scrape-fpl-news:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
