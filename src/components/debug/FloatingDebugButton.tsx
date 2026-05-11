import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bug } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';

const FloatingDebugButton = () => {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // SECURITY: only expose debug button in dev builds on Android native.
    // The previous `?debug=1` URL param bypass has been removed to prevent
    // production exposure of debugging surfaces.
    setShow(Capacitor.getPlatform() === 'android' && import.meta.env.DEV);
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