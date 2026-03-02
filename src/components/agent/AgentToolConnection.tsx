import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AgentToolConnectionProps {
  agentData: any;
  setAgentData: React.Dispatch<React.SetStateAction<any>>;
}

const AgentToolConnection: React.FC<AgentToolConnectionProps> = ({
  agentData,
  setAgentData
}) => {
  // This component has been simplified - SMS tool removed as requested
  return null;
};

export default AgentToolConnection;