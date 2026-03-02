import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Play, CheckCircle, XCircle } from 'lucide-react';

export interface AgentTest {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  type: 'contains' | 'exact' | 'regex';
  status?: 'passed' | 'failed' | 'pending';
  lastRun?: string;
}

interface AgentTestsManagerProps {
  tests: AgentTest[];
  onTestsChange: (tests: AgentTest[]) => void;
  onRunTest?: (test: AgentTest) => Promise<boolean>;
}

export const AgentTestsManager: React.FC<AgentTestsManagerProps> = ({
  tests,
  onTestsChange,
  onRunTest,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTest, setNewTest] = useState<Partial<AgentTest>>({
    name: '',
    input: '',
    expectedOutput: '',
    type: 'contains',
  });
  const [runningTestId, setRunningTestId] = useState<string | null>(null);

  const handleCreateTest = () => {
    if (!newTest.name || !newTest.input) return;

    const test: AgentTest = {
      id: `test_${Date.now()}`,
      name: newTest.name,
      input: newTest.input,
      expectedOutput: newTest.expectedOutput || '',
      type: newTest.type || 'contains',
      status: 'pending',
    };

    onTestsChange([...tests, test]);
    setNewTest({ name: '', input: '', expectedOutput: '', type: 'contains' });
    setIsCreateModalOpen(false);
  };

  const handleDeleteTest = (testId: string) => {
    onTestsChange(tests.filter((t) => t.id !== testId));
  };

  const handleRunTest = async (test: AgentTest) => {
    if (!onRunTest) return;
    
    setRunningTestId(test.id);
    try {
      const passed = await onRunTest(test);
      onTestsChange(
        tests.map((t) =>
          t.id === test.id
            ? { ...t, status: passed ? 'passed' : 'failed', lastRun: new Date().toISOString() }
            : t
        )
      );
    } finally {
      setRunningTestId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tests List */}
      {tests.length > 0 ? (
        <div className="space-y-2">
          {tests.map((test) => (
            <div
              key={test.id}
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                {test.status === 'passed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                {test.status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
                {test.status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-gray-300" />}
                <div>
                  <div className="text-sm font-medium text-gray-900">{test.name}</div>
                  <div className="text-xs text-gray-500 truncate max-w-md">{test.input}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRunTest(test)}
                  disabled={runningTestId === test.id}
                  className="h-8"
                >
                  <Play className="w-3.5 h-3.5 mr-1" />
                  {runningTestId === test.id ? 'Running...' : 'Run'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTest(test.id)}
                  className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Create Button (shown inline when tests exist) */}
      {tests.length > 0 && (
        <Button
          variant="outline"
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full h-10 border-dashed"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add test
        </Button>
      )}

      {/* Create Test Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 bg-white rounded-xl overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-lg font-semibold text-gray-900">Create Test</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Define test cases to validate your agent's responses.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Test Name</Label>
              <Input
                value={newTest.name || ''}
                onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                placeholder="e.g., Greeting response test"
                className="h-10 border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">User Input</Label>
              <Textarea
                value={newTest.input || ''}
                onChange={(e) => setNewTest({ ...newTest, input: e.target.value })}
                placeholder="e.g., Hello, how are you?"
                className="min-h-[80px] border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Expected Response</Label>
              <Textarea
                value={newTest.expectedOutput || ''}
                onChange={(e) => setNewTest({ ...newTest, expectedOutput: e.target.value })}
                placeholder="e.g., Hello! I'm doing great"
                className="min-h-[80px] border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Match Type</Label>
              <Select
                value={newTest.type || 'contains'}
                onValueChange={(value) => setNewTest({ ...newTest, type: value as AgentTest['type'] })}
              >
                <SelectTrigger className="h-10 border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="exact">Exact Match</SelectItem>
                  <SelectItem value="regex">Regex</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="h-9">
              Cancel
            </Button>
            <Button onClick={handleCreateTest} className="h-9 bg-gray-900 hover:bg-gray-800">
              Create Test
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Export the create modal opener for external use
export const useAgentTestsModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    setIsOpen,
  };
};
