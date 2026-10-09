/**
 * Reports where a finger is on `surface`, in viewport coordinates. Touch events are used rather
 * than pointer events because they keep arriving while the page scrolls under the finger, so an
 * effect can react to a swipe without blocking the scroll. `onEnd` fires shortly after the finger
 * lifts, leaving a tap long enough to be seen.
 */
export function followTouch(surface, onMove, onEnd, linger = 450) {
  let timer = 0;
  const move = event => {
    clearTimeout(timer);
    const touch = event.touches[0];
    if (touch) onMove(touch.clientX, touch.clientY);
  };
  const end = () => {
    clearTimeout(timer);
    timer = setTimeout(onEnd, linger);
  };
  surface.addEventListener('touchstart', move, { passive: true });
  surface.addEventListener('touchmove', move, { passive: true });
  surface.addEventListener('touchend', end, { passive: true });
  surface.addEventListener('touchcancel', end, { passive: true });
}
