import React from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { N8NCanvas } from '@/components/workflow/n8n/N8NCanvas';

const Workflow = () => {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <DashboardLayout>
      <div className="fixed top-0 right-0 bottom-0 overflow-hidden bg-[#1a1a1a]"
      style={{ left: "var(--sidebar-width, 16rem)" }}
      >
        <N8NCanvas initialProjectId={projectId} />
      </div>
    </DashboardLayout>
  );
};

export default Workflow;
