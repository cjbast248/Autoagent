
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Star, Clock, Target, Users } from 'lucide-react';

interface KudosCard {
  id: string;
  giver: { name: string; avatar: string };
  receiver: { name: string; avatar: string };
  type: string;
  message: string;
  timestamp: string;
  reactions: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  progress: number;
  total: number;
  rarity: 'common' | 'rare' | 'epic';
  unlocked: boolean;
}

interface TeamGoal {
  id: string;
  title: string;
  progress: number;
  target: number;
  timeRemaining: string;
  participants: string[];
  reward: string;
}

const RecognitionSystem = () => {
  const [kudosCards] = useState<KudosCard[]>([
    {
      id: '1',
      giver: { name: 'Mike Johnson', avatar: '' },
      receiver: { name: 'Sarah Chen', avatar: '' },
      type: 'Teamwork',
      message: 'Helped me close a difficult deal with her expertise!',
      timestamp: '1 hour ago',
      reactions: 8
    },
    {
      id: '2',
      giver: { name: 'Emma Wilson', avatar: '' },
      receiver: { name: 'Alex Kumar', avatar: '' },
      type: 'Innovation',
      message: 'Created an amazing new script template',
      timestamp: '3 hours ago',
      reactions: 12
    }
  ]);

  const [achievements] = useState<Achievement[]>([
    {
      id: '1',
      name: 'Call Master',
      description: 'Complete 100 calls in a week',
      progress: 87,
      total: 100,
      rarity: 'common',
      unlocked: false
    },
    {
      id: '2',
      name: 'Customer Whisperer',
      description: 'Achieve 95% satisfaction rate',
      progress: 100,
      total: 100,
      rarity: 'rare',
      unlocked: true
    },
    {
      id: '3',
      name: 'Conversion King',
      description: 'Convert 30% of leads in a month',
      progress: 23,
      total: 30,
      rarity: 'epic',
      unlocked: false
    }
  ]);

  const [teamGoal] = useState<TeamGoal>({
    id: '1',
    title: 'Monthly Team Target',
    progress: 1847,
    target: 2500,
    timeRemaining: '12 days',
    participants: ['Sarah', 'Mike', 'Emma', 'Alex', 'Lisa'],
    reward: '$500 Team Bonus'
  });

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-700';
      case 'rare': return 'bg-blue-100 text-blue-700';
      case 'epic': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recognition & Goals</h2>
        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 rounded-full">
          <Plus className="h-4 w-4 mr-1" />
          Give Kudos
        </Button>
      </div>

      {/* Kudos Wall */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Recent Kudos</h3>
        <div className="space-y-3">
          {kudosCards.map((kudo) => (
            <div key={kudo.id} className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
              <div className="flex items-start gap-3">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={kudo.giver.avatar} />
                  <AvatarFallback className="text-xs">{kudo.giver.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{kudo.giver.name}</span>
                    <span className="text-xs text-gray-500">→</span>
                    <span className="text-sm font-medium">{kudo.receiver.name}</span>
                    <Badge variant="secondary" className="text-xs">{kudo.type}</Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{kudo.message}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{kudo.timestamp}</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs">{kudo.reactions}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Achievement Badges */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Achievements</h3>
        <div className="space-y-3">
          {achievements.map((achievement) => (
            <div key={achievement.id} className={`p-3 rounded-lg border-2 ${
              achievement.unlocked ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{achievement.name}</span>
                  <Badge className={`text-xs ${getRarityColor(achievement.rarity)}`}>
                    {achievement.rarity}
                  </Badge>
                </div>
                {achievement.unlocked && <Star className="h-4 w-4 text-yellow-500" />}
              </div>
              <p className="text-xs text-gray-600 mb-2">{achievement.description}</p>
              <div className="flex items-center justify-between">
                <Progress value={(achievement.progress / achievement.total) * 100} className="flex-1 mr-2 h-1" />
                <span className="text-xs text-gray-500">
                  {achievement.progress}/{achievement.total}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Team Goals */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Team Goal</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">{teamGoal.title}</span>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Clock className="h-3 w-3" />
              {teamGoal.timeRemaining}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{teamGoal.progress.toLocaleString()}/{teamGoal.target.toLocaleString()}</span>
            </div>
            <Progress value={(teamGoal.progress / teamGoal.target) * 100} className="h-3" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-gray-500" />
              <span className="text-xs text-gray-600">{teamGoal.participants.length} participants</span>
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600">
              <Target className="h-3 w-3" />
              {teamGoal.reward}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RecognitionSystem;
