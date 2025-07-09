import { useEffect, useState, useRef } from 'react';

export function useIOSKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only run on iOS devices
    if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      return;
    }

    let initialViewportHeight = window.innerHeight;
    
    const handleViewportChange = () => {
      if (window.visualViewport) {
        const currentHeight = window.visualViewport.height;
        const heightDiff = initialViewportHeight - currentHeight;
        
        if (heightDiff > 150) {
          // Keyboard is open
          setKeyboardHeight(heightDiff);
          setIsKeyboardOpen(true);
          
          // Position input above keyboard
          if (inputRef.current) {
            inputRef.current.style.position = 'fixed';
            inputRef.current.style.bottom = `${heightDiff}px`;
            inputRef.current.style.zIndex = '10000';
            inputRef.current.style.width = '100%';
            inputRef.current.style.left = '0';
            inputRef.current.style.right = '0';
          }
          
          // Prevent body scroll but maintain layout
          document.body.style.overflow = 'hidden';
          document.body.style.height = '100vh';
          
        } else {
          // Keyboard is closed
          setKeyboardHeight(0);
          setIsKeyboardOpen(false);
          
          // Reset input position
          if (inputRef.current) {
            inputRef.current.style.position = 'fixed';
            inputRef.current.style.bottom = '0px';
            inputRef.current.style.zIndex = '1000';
          }
          
          // Reset body
          document.body.style.overflow = '';
          document.body.style.height = '';
        }
      }
    };

    // Initial setup
    if (window.visualViewport) {
      initialViewportHeight = window.visualViewport.height;
      window.visualViewport.addEventListener('resize', handleViewportChange);
    }

    // Cleanup
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      }
      
      // Reset all styles
      document.body.style.overflow = '';
      document.body.style.height = '';
      
      if (inputRef.current) {
        inputRef.current.style.position = 'fixed';
        inputRef.current.style.bottom = '0px';
        inputRef.current.style.zIndex = '1000';
      }
    };
  }, []);

  return {
    keyboardHeight,
    isKeyboardOpen,
    inputRef
  };
}