
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseIdleTimerProps {
  timeout: number; // in milliseconds
  onIdle: () => void;
  onWarning?: () => void;
  warningTime?: number; // in milliseconds before timeout
}

export function useIdleTimer({ timeout, onIdle, onWarning, warningTime }: UseIdleTimerProps) {
  const [isIdle, setIsIdle] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeout);
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const eventsAttachedRef = useRef(false);
  // Ref to read isIdle without triggering useEffect re-runs on every activity
  const isIdleRef = useRef(false);

  // Memoized cleanup function
  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (!mountedRef.current) return;
    
    isIdleRef.current = false;
    setIsIdle(false);
    setIsWarning(false);
    setTimeLeft(timeout);

    // Clear existing timers
    clearAllTimers();

    // Set warning timer if specified
    if (onWarning && warningTime) {
      warningTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        
        setIsWarning(true);
        onWarning();
        
        // Start countdown interval
        const warningDuration = timeout - warningTime;
        setTimeLeft(warningDuration);
        
        intervalRef.current = setInterval(() => {
          if (!mountedRef.current) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
          }
          
          setTimeLeft((prev) => {
            if (prev <= 1000) {
              if (intervalRef.current) clearInterval(intervalRef.current);
              return 0;
            }
            return prev - 1000;
          });
        }, 1000);
      }, warningTime);
    }

    // Set idle timer
    timeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      isIdleRef.current = true;
      setIsIdle(true);
      onIdle();
    }, timeout);
  }, [timeout, onIdle, onWarning, warningTime, clearAllTimers]);

  const extendSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  const stopTimer = useCallback(() => {
    clearAllTimers();
    if (mountedRef.current) {
      setIsIdle(false);
      setIsWarning(false);
    }
  }, [clearAllTimers]);

  useEffect(() => {
    mountedRef.current = true;
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      if (!mountedRef.current) return;
      // Read isIdle via ref — prevents this effect from re-running on every mouse move
      if (!isIdleRef.current) {
        resetTimer();
      }
    };

    // Prevent double-attaching event listeners
    if (!eventsAttachedRef.current) {
      events.forEach(event => {
        document.addEventListener(event, handleActivity, { passive: true, capture: true });
      });
      eventsAttachedRef.current = true;
    }

    // Start the timer
    resetTimer();

    // Cleanup
    return () => {
      mountedRef.current = false;
      eventsAttachedRef.current = false;
      
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      clearAllTimers();
    };
  // isIdle removed from deps — we read it via isIdleRef to prevent render-storm on every activity
  }, [resetTimer, clearAllTimers]);

  return {
    isIdle,
    isWarning,
    timeLeft,
    extendSession,
    stopTimer
  };
}
