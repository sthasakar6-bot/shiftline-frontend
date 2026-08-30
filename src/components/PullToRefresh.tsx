import { useEffect, useRef, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

const PULL_THRESHOLD = 70;
const MAX_PULL = 100;

export default function PullToRefresh({ children }: { children: ReactNode }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    function handleTouchStart(e: TouchEvent) {
      if (refreshingRef.current) return;
      if (window.scrollY <= 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      } else {
        startY.current = null;
        pulling.current = false;
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (!pulling.current || startY.current === null || refreshingRef.current) return;
      if (window.scrollY > 0) {
        pulling.current = false;
        setPullDistance(0);
        return;
      }
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      e.preventDefault();
      setPullDistance(Math.min(delta * 0.5, MAX_PULL));
    }

    function handleTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      startY.current = null;
      setPullDistance((current) => {
        if (current >= PULL_THRESHOLD) {
          refreshingRef.current = true;
          setRefreshing(true);
          window.setTimeout(() => window.location.reload(), 350);
          return PULL_THRESHOLD;
        }
        return 0;
      });
    }

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <>
      <div
        className={`ptr-indicator${pullDistance > 0 || refreshing ? " visible" : ""}`}
        style={{ transform: `translate(-50%, ${Math.max(pullDistance - 34, -40)}px)` }}
      >
        <RefreshCw
          size={20}
          className={refreshing ? "ptr-icon spinning" : "ptr-icon"}
          style={refreshing ? undefined : { transform: `rotate(${progress * 360}deg)` }}
        />
      </div>
      {children}
    </>
  );
}
