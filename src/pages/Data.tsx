import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';

export default function Data() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-4">Data</h1>
          <p className="text-muted-foreground">Pagină goală - gata pentru funcționalitate nouă</p>
        </div>
      </div>
    </DashboardLayout>
  );
}