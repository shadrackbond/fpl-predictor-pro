import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Share2, Download, Twitter, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ShareTeamButtonProps {
  teamName?: string;
  points?: number;
  rank?: number;
  gameweek?: string;
  containerRef?: React.RefObject<HTMLDivElement>;
}

export function ShareTeamButton({ 
  teamName = 'My FPL Team', 
  points, 
  rank,
  gameweek,
  containerRef 
}: ShareTeamButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateShareText = () => {
    const lines = [`🏆 ${teamName}`];
    if (gameweek) lines.push(`📅 ${gameweek}`);
    if (points !== undefined) lines.push(`⚽ ${points.toLocaleString()} points`);
    if (rank !== undefined) lines.push(`📊 Rank: ${rank.toLocaleString()}`);
    lines.push('', '🔮 Powered by FPL Predictor');
    return lines.join('\n');
  };

  const handleCopyText = async () => {
    const text = generateShareText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Team info copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleShareTwitter = () => {
    const text = generateShareText();
    const url = encodeURIComponent(window.location.href);
    const tweetText = encodeURIComponent(text);
    window.open(
      `https://twitter.com/intent/tweet?text=${tweetText}&url=${url}`,
      '_blank',
      'width=550,height=420'
    );
  };

  const handleDownloadImage = async () => {
    if (!containerRef?.current) {
      toast.error('Team view not available for screenshot');
      return;
    }

    setIsGenerating(true);
    try {
      // Dynamic import for html-to-image to reduce bundle size
      const { toPng } = await import('html-to-image');
      
      const dataUrl = await toPng(containerRef.current, {
        quality: 0.95,
        backgroundColor: '#0a0a0f',
        pixelRatio: 2,
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `fpl-team-${gameweek?.replace(/\s+/g, '-').toLowerCase() || 'snapshot'}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success('Team image downloaded!');
    } catch (error) {
      console.error('Failed to generate image:', error);
      toast.error('Failed to generate team image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      handleCopyText();
      return;
    }

    const text = generateShareText();
    try {
      await navigator.share({
        title: teamName,
        text: text,
        url: window.location.href,
      });
    } catch (error) {
      // User cancelled or share failed silently
      if ((error as Error).name !== 'AbortError') {
        handleCopyText();
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleNativeShare} className="gap-2 cursor-pointer">
          <Share2 className="w-4 h-4" />
          Share Team
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShareTwitter} className="gap-2 cursor-pointer">
          <Twitter className="w-4 h-4" />
          Share on X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyText} className="gap-2 cursor-pointer">
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy Text'}
        </DropdownMenuItem>
        {containerRef && (
          <DropdownMenuItem 
            onClick={handleDownloadImage} 
            className="gap-2 cursor-pointer"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isGenerating ? 'Generating...' : 'Download Image'}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
