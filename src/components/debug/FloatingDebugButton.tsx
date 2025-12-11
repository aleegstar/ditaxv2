import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bug } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';

const FloatingDebugButton = () => {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Show debug button if:
    // 1. Running on Android native platform
    // 2. Debug mode is enabled via URL param or development environment
    const urlParams = new URLSearchParams(window.location.search);
    const debugMode = urlParams.get('debug') === '1' || import.meta.env.DEV;
    
    setShow(Capacitor.getPlatform() === 'android' && debugMode);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <Button
        onClick={() => navigate('/debug')}
        size="lg"
        className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 shadow-lg"
        title="Debug Console"
      >
        <Bug className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default FloatingDebugButton;