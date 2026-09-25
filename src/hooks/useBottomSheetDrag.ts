import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseBottomSheetDragOptions {
  collapsedHeight?: number; // Height in px when collapsed (default: 100)
  expandedHeightRatio?: number; // Ratio of screen height when expanded (default: 0.72)
  maxExpandedHeight?: number; // Absolute max height in px (default: 680)
  resetDependency?: any; // Dependency to reset to collapsed (e.g. building.id)
  onExpandChange?: (isExpanded: boolean) => void;
}

export function useBottomSheetDrag(options: UseBottomSheetDragOptions = {}) {
  const {
    collapsedHeight = 100,
    expandedHeightRatio = 0.72,
    maxExpandedHeight = 680,
    resetDependency,
    onExpandChange,
  } = options;

  const panelRef = useRef<HTMLElement | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [sheetHeight, setSheetHeight] = useState<number>(collapsedHeight);

  const isDraggingRef = useRef<boolean>(false);
  const startYRef = useRef<number>(0);
  const startHRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const getExpandedHeight = useCallback(() => {
    if (typeof window === 'undefined') return 520;
    const computed = Math.round(window.innerHeight * expandedHeightRatio);
    return Math.min(computed, maxExpandedHeight);
  }, [expandedHeightRatio, maxExpandedHeight]);

  // Handle window resizing (mobile breakpoint < 768px)
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        // Desktop: clear inline styles completely
        if (panelRef.current) {
          panelRef.current.style.height = '';
          panelRef.current.style.transition = '';
        }
      } else {
        // Mobile: update height according to current expansion state
        const targetH = isExpanded ? getExpandedHeight() : collapsedHeight;
        setSheetHeight(targetH);
        if (panelRef.current) {
          panelRef.current.style.height = `${targetH}px`;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isExpanded, collapsedHeight, getExpandedHeight]);

  // Reset to collapsed whenever the selected object changes (e.g. tapping another building/zone/territory)
  useEffect(() => {
    if (resetDependency) {
      setIsExpanded(false);
      setSheetHeight(collapsedHeight);
      onExpandChange?.(false);
      if (panelRef.current && window.innerWidth < 768) {
        panelRef.current.style.transition = 'height 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
        panelRef.current.style.height = `${collapsedHeight}px`;
      }
    }
  }, [resetDependency, collapsedHeight]);

  const snapTo = useCallback((expanded: boolean) => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return;
    const targetH = expanded ? getExpandedHeight() : collapsedHeight;
    setIsExpanded(expanded);
    setSheetHeight(targetH);
    onExpandChange?.(expanded);

    if (panelRef.current) {
      panelRef.current.style.transition = 'height 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      panelRef.current.style.height = `${targetH}px`;
    }
  }, [collapsedHeight, getExpandedHeight, onExpandChange]);

  const toggleExpand = useCallback(() => {
    snapTo(!isExpanded);
  }, [isExpanded, snapTo]);

  const expand = useCallback(() => {
    snapTo(true);
  }, [snapTo]);

  const collapse = useCallback(() => {
    snapTo(false);
  }, [snapTo]);

  // Drag Gesture Initiation (Touch / Pointer)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return;
    if (e.button !== 0) return; // Only primary pointer

    const clientY = e.clientY;
    startYRef.current = clientY;
    startHRef.current = panelRef.current ? panelRef.current.offsetHeight : sheetHeight;
    startTimeRef.current = Date.now();
    isDraggingRef.current = true;
    setIsDragging(true);

    if (panelRef.current) {
      panelRef.current.style.transition = 'none';
    }

    const minH = collapsedHeight;
    const maxAllowed = Math.round(window.innerHeight * 0.85);

    const onPointerMove = (moveEv: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const currentY = moveEv.clientY;
      // Dragging UP means currentY < startY => deltaY > 0 => height increases
      const deltaY = startYRef.current - currentY;
      let targetH = startHRef.current + deltaY;

      // Add elastic rubber-band resistance beyond bounds
      if (targetH < minH) {
        targetH = minH - (minH - targetH) * 0.2;
      } else if (targetH > maxAllowed) {
        targetH = maxAllowed + (targetH - maxAllowed) * 0.2;
      }

      if (panelRef.current) {
        panelRef.current.style.height = `${Math.round(targetH)}px`;
      }
    };

    const onPointerUp = (upEv: PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      const endY = upEv.clientY;
      const totalDeltaY = startYRef.current - endY;
      const duration = Date.now() - startTimeRef.current;

      if (panelRef.current) {
        panelRef.current.style.transition = 'height 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      }

      // Check if it was a quick tap (< 8px movement and < 300ms)
      if (Math.abs(totalDeltaY) < 8 && duration < 300) {
        const nextExpanded = !isExpanded;
        snapTo(nextExpanded);
        return;
      }

      // Drag gesture: determine snap target based on delta
      let shouldExpand = isExpanded;
      const threshold = 35; // px movement threshold to trigger snap

      if (isExpanded) {
        // If expanded and dragged down past threshold -> collapse
        if (totalDeltaY < -threshold) {
          shouldExpand = false;
        } else {
          shouldExpand = true;
        }
      } else {
        // If collapsed and dragged up past threshold -> expand
        if (totalDeltaY > threshold) {
          shouldExpand = true;
        } else {
          shouldExpand = false;
        }
      }

      snapTo(shouldExpand);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }, [collapsedHeight, getExpandedHeight, isExpanded, sheetHeight, snapTo]);

  // Header pointer handler: initiates drag only if not touching interactive controls
  const handleHeaderPointerDown = useCallback((e: React.PointerEvent) => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a, svg')) {
      return;
    }
    handlePointerDown(e);
  }, [handlePointerDown]);

  return {
    panelRef,
    isMobile,
    isExpanded,
    isDragging,
    sheetHeight,
    toggleExpand,
    expand,
    collapse,
    snapTo,
    handlePointerDown,
    handleHeaderPointerDown,
  };
}
