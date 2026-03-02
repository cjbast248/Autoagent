
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Award, TrendingUp, TrendingDown } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  rank: number;
  calls: number;
  satisfaction: number;
  conversion: number;
  isCurrentUser?: boolean;
}

const PerformanceSection = () => {
  const teamMembers: TeamMember[] = [
    {
      id: '1',
      name: 'Sarah Chen',
      avatar: '',
      rank: 1,
      calls: 147,
      satisfaction: 95,
      conversion: 23,
    },
    {
      id: '2',
      name: 'Mike Johnson',
      avatar: '',
      rank: 2,
      calls: 134,
      satisfaction: 92,
      conversion: 21,
    },
    {
      id: '3',
      name: 'Emma Wilson',
      avatar: '',
      rank: 3,
      calls: 128,
      satisfaction: 89,
      conversion: 19,
      isCurrentUser: true,
    },
  ];

  const personalMetrics = {
    calls: { current: 128, target: 150, change: 12 },
    satisfaction: { current: 89, target: 90, change: -2 },
    conversion: { current: 19, target: 25, change: 3 },
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-gray-500 font-bold">#{rank}</span>;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Performance Metrics</h2>

      {/* Team Leaderboard */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Team Leaderboard</h3>
        <div className="space-y-3">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className={`p-3 rounded-lg border transition-all ${
                member.isCurrentUser
                  ? 'bg-blue-50 border-blue-200 shadow-sm'
                  : 'bg-gray-50 border-gray-200'
              } ${member.rank <= 3 ? 'ring-2 ring-yellow-200' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {getRankIcon(member.rank)}
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${member.isCurrentUser ? 'text-blue-700' : ''}`}>
                      {member.name}
                      {member.isCurrentUser && <Badge className="ml-2 text-xs">You</Badge>}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600 mt-1">
                    <span>{member.calls} calls</span>
                    <span>{member.satisfaction}% satisfaction</span>
                    <span>{member.conversion}% conversion</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Individual Performance */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Your Performance</h3>
        <div className="space-y-4">
          {Object.entries(personalMetrics).map(([key, data]) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize">{key}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {data.current}/{data.target}
                  </span>
                  <div className={`flex items-center gap-1 text-xs ${
                    data.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {data.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(data.change)}%
                  </div>
                </div>
              </div>
              <Progress value={(data.current / data.target) * 100} className="h-2" />
            </div>
          ))}
        </div>
      </Card>

      {/* Team Velocity Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Team Velocity</h3>
        <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Interactive velocity chart placeholder</p>
        </div>
      </Card>
    </div>
  );
};

export default PerformanceSection;
