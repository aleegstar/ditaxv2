
import React from 'react';
import { EdgeFunctionTester } from '@/components/EdgeFunctionTester';

const EdgeFunctionDebug = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 pb-24 md:pb-4">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Edge Function Debugging
          </h1>
          <p className="text-white/60">
            Umfassende Diagnose der Payment Function
          </p>
        </div>
        
        <EdgeFunctionTester />
      </div>
    </div>
  );
};

export default EdgeFunctionDebug;
