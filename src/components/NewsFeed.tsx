import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNewsArticles, useScrapeNews } from '@/hooks/useDifferentials';
import { Newspaper, ExternalLink, RefreshCw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function NewsFeed() {
  const { data: articles, isLoading } = useNewsArticles();
  const scrapeNews = useScrapeNews();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">FPL News Feed</h2>
          <p className="text-muted-foreground">Latest news from top football sources</p>
        </div>
        <Button
          variant="outline"
          onClick={() => scrapeNews.mutate()}
          disabled={scrapeNews.isPending}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${scrapeNews.isPending ? 'animate-spin' : ''}`} />
          {scrapeNews.isPending ? 'Scraping...' : 'Refresh News'}
        </Button>
      </div>

      {!articles || articles.length === 0 ? (
        <Card className="glass border-border/30">
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
              <Newspaper className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">No News Yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Click "Refresh News" to scrape the latest FPL news and player updates from multiple sources.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {articles.map(article => (
            <Card key={article.id} className="glass border-border/30 hover:border-border/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {article.source}
                      </Badge>
                      {article.relevance_score > 0 && (
                        <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">
                          {article.player_mentions?.length || 0} players mentioned
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="font-semibold leading-tight">
                      {article.title || 'Untitled Article'}
                    </h3>
                    
                    {article.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {article.content.slice(0, 200)}...
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(article.scraped_at), { addSuffix: true })}
                      </span>
                      {article.url && (
                        <a 
                          href={article.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Read full article
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
