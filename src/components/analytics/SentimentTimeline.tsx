
import React from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface SentimentTimelineProps {
  data: number[];
}

const SentimentTimeline = ({ data }: SentimentTimelineProps) => {
  const chartData = data.map((value, index) => ({
    time: index,
    sentiment: value,
    label: `${Math.floor(index * 30)}s`
  }));

  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <XAxis 
            dataKey="label" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#6B7280' }}
          />
          <YAxis 
            domain={[0, 1]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#6B7280' }}
          />
          <Tooltip 
            labelFormatter={(value) => `Time: ${value}`}
            formatter={(value: number) => [
              `${(value * 100).toFixed(0)}%`, 
              'Sentiment'
            ]}
          />
          <defs>
            <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0.8}/>
            </linearGradient>
          </defs>
          <Line 
            type="monotone" 
            dataKey="sentiment" 
            stroke="url(#sentimentGradient)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 4, fill: '#007AFF' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SentimentTimeline;
