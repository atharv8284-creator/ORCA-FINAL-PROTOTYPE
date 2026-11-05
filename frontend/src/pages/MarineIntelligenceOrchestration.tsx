import React from 'react';
import { CentralLeadOrchestratorPanel } from '../components/orchestration/CentralLeadOrchestratorPanel';

export const MarineIntelligenceOrchestration: React.FC = () => {
  return (
    <div className="space-y-6 pb-12">
      <CentralLeadOrchestratorPanel initialZoneId="zone-01" />
    </div>
  );
};
