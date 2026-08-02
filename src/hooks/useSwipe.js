import { useRef, useState } from 'react';

const SWIPE_THRESHOLD = 80; // pixels before it counts as a swipe

// Tracks a single pointer drag on a card and reports how far it's moved,
// so Card.jsx can follow the finger and decide save vs dismiss on release.
export function useSwipe({ onSwipeLeft, onSwipeRight }) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);

  const handlePointerDown = (e) => {
    startX.current = e.clientX;
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setDragX(e.clientX - startX.current);
  };

  const finish = () => {
    if (dragX > SWIPE_THRESHOLD) {
      onSwipeRight?.();
    } else if (dragX < -SWIPE_THRESHOLD) {
      onSwipeLeft?.();
    }
    setIsDragging(false);
    setDragX(0);
  };

  const handlePointerUp = () => finish();
  const handlePointerLeave = () => {
    if (isDragging) finish();
  };

  return {
    dragX,
    isDragging,
    swipeHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerLeave: handlePointerLeave,
    },
  };
}
