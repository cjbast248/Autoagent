
import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Lightbulb, HelpCircle, Flag, Info, ThumbsUp, Heart, Zap, MessageSquare } from 'lucide-react';

interface Post {
  id: string;
  type: 'achievement' | 'insight' | 'question' | 'milestone' | 'system';
  user: {
    name: string;
    avatar: string;
    online: boolean;
  };
  timestamp: string;
  content: string;
  attachments?: string[];
  reactions: {
    thumbsUp: number;
    heart: number;
    celebrate: number;
    lightbulb: number;
  };
  comments: number;
}

const TeamActivityFeed = () => {
  const [posts] = useState<Post[]>([
    {
      id: '1',
      type: 'achievement',
      user: { name: 'Sarah Chen', avatar: '', online: true },
      timestamp: '2 hours ago',
      content: 'Just hit a 95% customer satisfaction rate this week! 🎉',
      reactions: { thumbsUp: 12, heart: 8, celebrate: 15, lightbulb: 2 },
      comments: 5
    },
    {
      id: '2',
      type: 'insight',
      user: { name: 'Mike Johnson', avatar: '', online: false },
      timestamp: '4 hours ago',
      content: 'Found that starting calls with a weather comment increases engagement by 20%. Weather = instant connection!',
      reactions: { thumbsUp: 8, heart: 3, celebrate: 2, lightbulb: 18 },
      comments: 12
    },
    {
      id: '3',
      type: 'question',
      user: { name: 'Emma Wilson', avatar: '', online: true },
      timestamp: '6 hours ago',
      content: 'Any tips for handling price objections in the first 30 seconds? Struggling with immediate pushback.',
      reactions: { thumbsUp: 5, heart: 2, celebrate: 0, lightbulb: 7 },
      comments: 8
    }
  ]);

  const getPostIcon = (type: string) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case 'achievement': return <Trophy className={`${iconClass} text-yellow-500`} />;
      case 'insight': return <Lightbulb className={`${iconClass} text-blue-500`} />;
      case 'question': return <HelpCircle className={`${iconClass} text-green-500`} />;
      case 'milestone': return <Flag className={`${iconClass} text-purple-500`} />;
      case 'system': return <Info className={`${iconClass} text-gray-500`} />;
      default: return null;
    }
  };

  const getPostTypeLabel = (type: string) => {
    const labels = {
      achievement: 'Achievement',
      insight: 'Insight',
      question: 'Question',
      milestone: 'Milestone',
      system: 'System'
    };
    return labels[type as keyof typeof labels] || 'Post';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Team Activity</h2>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
          + New Post
        </Button>
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="p-4 hover:shadow-md transition-shadow">
            {/* Post Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={post.user.avatar} />
                  <AvatarFallback>{post.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                {post.user.online && (
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{post.user.name}</span>
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                    {getPostIcon(post.type)}
                    {getPostTypeLabel(post.type)}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">{post.timestamp}</p>
              </div>
            </div>

            {/* Post Content */}
            <div className="mb-4">
              <p className="text-gray-900 leading-relaxed">{post.content}</p>
            </div>

            {/* Reactions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  <ThumbsUp className="h-4 w-4" />
                  {post.reactions.thumbsUp}
                </button>
                <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600 transition-colors">
                  <Heart className="h-4 w-4" />
                  {post.reactions.heart}
                </button>
                <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-yellow-600 transition-colors">
                  <Zap className="h-4 w-4" />
                  {post.reactions.celebrate}
                </button>
                <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-purple-600 transition-colors">
                  <Lightbulb className="h-4 w-4" />
                  {post.reactions.lightbulb}
                </button>
              </div>
              <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                <MessageSquare className="h-4 w-4" />
                {post.comments} comments
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TeamActivityFeed;
