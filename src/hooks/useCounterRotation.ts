import { useState, useEffect, useCallback } from 'react';

interface CounterRotationStyle {
  width: string;
  height: string;
  transform: string;
  position: 'absolute';
  top: string;
  left: string;
  transformOrigin: string;
}

function calculateStyle(): CounterRotationStyle | null {
  if (typeof window === 'undefined') return null;

  let width = window.innerWidth;
  let height = window.innerHeight;

  if (window.visualViewport) {
    width = window.visualViewport.width;
    height = window.visualViewport.height;
  }

  const isLandscape = width > height;

  if (!isLandscape) {
    return {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      transform: 'none',
      transformOrigin: 'center center'
    };
  }

  let angle = 90; // Default to 90 if we can't detect
  
  if (window.screen && window.screen.orientation && typeof window.screen.orientation.angle === 'number') {
    angle = window.screen.orientation.angle;
  } else if (typeof window.orientation !== 'undefined') {
    angle = Number(window.orientation);
  }

  // If the device is in landscape, we want it to display as if it was locked in portrait.
  // We need to rotate the UI by 90 or -90 degrees depending on the physical orientation.
  let counterAngle = -90;
  if (angle === 270 || angle === -90) {
    counterAngle = 90;
  }

  return {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: `${height}px`,
    height: `${width}px`,
    transform: `translate(-50%, -50%) rotate(${counterAngle}deg)`,
    transformOrigin: 'center center'
  };
}

export function useCounterRotation(active: boolean) {
  const [style, setStyle] = useState<CounterRotationStyle | null>(() => {
    if (!active || typeof window === 'undefined') return null;
    return calculateStyle();
  });

  const updateStyle = useCallback(() => {
    if (!active) {
      setStyle(null);
      return;
    }
    setStyle(calculateStyle());
  }, [active]);

  useEffect(() => {
    if (!active) {
      setStyle(null);
      return;
    }

    updateStyle();

    // Listen to various events to ensure we catch changes
    window.addEventListener('orientationchange', updateStyle);
    window.addEventListener('resize', updateStyle);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateStyle);
    }

    // Sometimes the resize event fires before the dimensions are fully updated
    const timeout1 = setTimeout(updateStyle, 50);
    const timeout2 = setTimeout(updateStyle, 200);

    return () => {
      window.removeEventListener('orientationchange', updateStyle);
      window.removeEventListener('resize', updateStyle);
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', updateStyle);
      }
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [active, updateStyle]);

  return style;
}
