import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';

export interface TestCallHistoryItem {
  id: string;
  conversationId: string;
  agentId: string;
  phoneNumber: string;
  timestamp: string;
  cost?: number;
}

export const useTestCallHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<TestCallHistoryItem[]>([]);

  const storageKey = `test_call_history_${user?.id || 'guest'}`;

  useEffect(() => {
    if (user) {
      const savedHistory = localStorage.getItem(storageKey);
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory));
        } catch (error) {
          console.error('Error parsing test call history:', error);
          setHistory([]);
        }
      }
    }
  }, [user, storageKey]);

  const addToHistory = (item: Omit<TestCallHistoryItem, 'id' | 'timestamp'>) => {
    const newItem: TestCallHistoryItem = {
      ...item,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [newItem, ...history].slice(0, 10); // Keep only last 10 calls
    setHistory(updatedHistory);
    localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
  };

  const updateHistoryItem = (conversationId: string, updates: Partial<TestCallHistoryItem>) => {
    const updatedHistory = history.map(item => 
      item.conversationId === conversationId 
        ? { ...item, ...updates }
        : item
    );
    setHistory(updatedHistory);
    localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(storageKey);
  };

  return {
    history,
    addToHistory,
    updateHistoryItem,
    clearHistory,
  };
};