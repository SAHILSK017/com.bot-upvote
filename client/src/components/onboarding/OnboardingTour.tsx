import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  RocketIcon,
  CheckCircle2Icon,
  XIcon,
} from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_OFFSET = 16;
const TOOLTIP_WIDTH = 380;

export function OnboardingTour() {
  const {
    isActive,
    currentStepIndex,
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    skipTour,
    finishTour,
  } = useOnboarding();

  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' | 'mobile' }>({
    top: 0,
    left: 0,
    placement: 'bottom',
  });

  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const isReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Measure and position current target element
  const measureTarget = useCallback((el: Element) => {
    const rect = el.getBoundingClientRect();
    const newTargetRect: TargetRect = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      right: rect.right,
    };
    setTargetRect(newTargetRect);

    // Calculate tooltip position
    const isMobile = window.innerWidth < 640;
    if (isMobile) {
      setTooltipPos({ top: 0, left: 0, placement: 'mobile' });
      return;
    }

    const estimatedTooltipHeight = 220;
    const spaceBelow = window.innerHeight - newTargetRect.bottom;
    const spaceAbove = newTargetRect.top;

    let top: number;
    let placement: 'top' | 'bottom' = 'bottom';

    if (spaceBelow >= estimatedTooltipHeight + TOOLTIP_OFFSET || spaceBelow >= spaceAbove) {
      // Place below target
      top = newTargetRect.bottom + TOOLTIP_OFFSET;
      placement = 'bottom';
    } else {
      // Place above target
      top = newTargetRect.top - estimatedTooltipHeight - TOOLTIP_OFFSET;
      placement = 'top';
    }

    // Center horizontally relative to target, clamped within screen margins
    let left = newTargetRect.left + newTargetRect.width / 2 - TOOLTIP_WIDTH / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - estimatedTooltipHeight - 16));

    setTooltipPos({ top, left, placement });
  }, []);

  // Update target when step changes
  useEffect(() => {
    if (!isActive) {
      setTargetRect(null);
      return;
    }

    // Final step (Step 5): centered dialog, no target element
    if (!currentStep.targetSelector) {
      setTargetRect(null);
      setIsMeasuring(false);
      return;
    }

    setIsMeasuring(true);
    let attempts = 0;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    function findAndPosition() {
      const el = document.querySelector(currentStep.targetSelector!);
      if (el) {
        if (pollTimer) clearInterval(pollTimer);
        // Scroll element smoothly into center view
        el.scrollIntoView({
          behavior: isReducedMotion ? 'auto' : 'smooth',
          block: 'center',
          inline: 'center',
        });

        // Measure once scroll settles
        setTimeout(
          () => {
            measureTarget(el);
            setIsMeasuring(false);
          },
          isReducedMotion ? 60 : 350
        );
        return true;
      }
      return false;
    }

    const foundImmediately = findAndPosition();
    if (!foundImmediately) {
      // If dynamic cards are loading asynchronously, poll briefly
      pollTimer = setInterval(() => {
        attempts++;
        const found = findAndPosition();
        if (found || attempts > 20) {
          if (pollTimer) clearInterval(pollTimer);
          if (!found) {
            // Target not found (e.g. database has no posts for upvote/comments)
            // Gracefully move forward
            setIsMeasuring(false);
            if (currentStep.id === 'upvote' || currentStep.id === 'comments') {
              nextStep();
            }
          }
        }
      }, 100);
    }

    return () => {
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [isActive, currentStep, isReducedMotion, measureTarget, nextStep]);

  // Recalculate on scroll and resize
  useEffect(() => {
    if (!isActive || !currentStep.targetSelector) return;

    function handleUpdate() {
      const el = document.querySelector(currentStep.targetSelector!);
      if (el) {
        measureTarget(el);
      }
    }

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, { passive: true });
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate);
    };
  }, [isActive, currentStep.targetSelector, measureTarget]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        skipTour();
      } else if (e.key === 'ArrowRight' && currentStepIndex < totalSteps - 1) {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft' && currentStepIndex > 0) {
        e.preventDefault();
        prevStep();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStepIndex, totalSteps, nextStep, prevStep, skipTour]);

  if (!isActive) return null;

  const isFinalStep = currentStepIndex === totalSteps - 1;

  return createPortal(
    <aside
      className="onboarding-portal"
      aria-label="Interactive Onboarding Tour"
      aria-modal="true"
      role="dialog"
    >
      {/* 1. Backdrop Overlay with SVG Cutout Mask */}
      <svg
        className="fixed inset-0 z-[9998] size-full pointer-events-none"
        style={{ width: '100vw', height: '100vh' }}
      >
        <defs>
          <mask id="onboarding-spotlight-mask">
            {/* White area = dimmed backdrop */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cutout = transparent window over target */}
            {targetRect && (
              <rect
                x={targetRect.left - SPOTLIGHT_PADDING}
                y={targetRect.top - SPOTLIGHT_PADDING}
                width={targetRect.width + SPOTLIGHT_PADDING * 2}
                height={targetRect.height + SPOTLIGHT_PADDING * 2}
                rx="12"
                ry="12"
                fill="black"
                className={cn(!isReducedMotion && 'transition-all duration-300 ease-out')}
              />
            )}
          </mask>
        </defs>

        {/* Translucent Dark Overlay */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.72)"
          mask="url(#onboarding-spotlight-mask)"
          className="pointer-events-auto cursor-default"
          onClick={(e) => {
            // Prevent clicks outside
            e.stopPropagation();
          }}
        />
      </svg>

      {/* 2. Glowing Animated Spotlight Border Ring */}
      {targetRect && !isFinalStep && (
        <>
          <div
            style={{
              top: targetRect.top - SPOTLIGHT_PADDING,
              left: targetRect.left - SPOTLIGHT_PADDING,
              width: targetRect.width + SPOTLIGHT_PADDING * 2,
              height: targetRect.height + SPOTLIGHT_PADDING * 2,
            }}
            className={cn(
              'fixed z-[9999] pointer-events-none rounded-xl border-2 border-primary ring-4 ring-primary/25 shadow-[0_0_25px_rgba(13,148,136,0.4)]',
              !isReducedMotion && 'transition-all duration-300 ease-out'
            )}
          />

          {/* Invisible target shield preventing accidental click during tutorial */}
          <div
            style={{
              top: targetRect.top - SPOTLIGHT_PADDING,
              left: targetRect.left - SPOTLIGHT_PADDING,
              width: targetRect.width + SPOTLIGHT_PADDING * 2,
              height: targetRect.height + SPOTLIGHT_PADDING * 2,
            }}
            className="fixed z-[9999] pointer-events-auto cursor-default"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            title="Highlighted element for tutorial"
          />
        </>
      )}

      {/* 3. Step 1-4 Floating Tooltip Card */}
      {!isFinalStep && (
        <div
          ref={tooltipRef}
          style={
            tooltipPos.placement === 'mobile'
              ? {}
              : {
                  top: tooltipPos.top,
                  left: tooltipPos.left,
                  width: TOOLTIP_WIDTH,
                }
          }
          className={cn(
            'fixed z-[10000] overflow-hidden rounded-2xl border border-border bg-white shadow-2xl p-5',
            'transition-all duration-300 ease-out animate-fade-up',
            tooltipPos.placement === 'mobile'
              ? 'bottom-4 left-4 right-4 max-w-lg mx-auto'
              : '',
            isMeasuring && 'opacity-0 scale-95 pointer-events-none'
          )}
        >
          {/* Progress Header */}
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
              {currentStep.progress}
            </span>

            <button
              type="button"
              onClick={skipTour}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md"
              aria-label="Close tutorial"
              title="Close tutorial"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          {/* Body */}
          <div className="pt-3 pb-4">
            <h4 className="text-base font-extrabold tracking-tight text-foreground leading-snug">
              {currentStep.title}
            </h4>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">
              {currentStep.description}
            </p>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between border-t border-border/80 pt-3.5">
            <button
              type="button"
              onClick={skipTour}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Skip tutorial
            </button>

            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={prevStep}
                  className="rounded-lg text-xs font-semibold border-border bg-white hover:bg-slate-50 cursor-pointer"
                >
                  <span>← Back</span>
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                onClick={nextStep}
                className="btn-primary-glow inline-flex items-center gap-1.5 rounded-lg text-xs font-bold shadow-xs px-3.5 cursor-pointer"
              >
                <span>Next →</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Step 5 Final Centered Dialog */}
      {isFinalStep && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-[90vw] max-w-md overflow-hidden rounded-2xl border border-border bg-white shadow-2xl p-6 sm:p-7 animate-fade-up">
          <div className="flex flex-col items-center text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs mb-4">
              <RocketIcon className="size-7" />
            </div>

            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 mb-2">
              {currentStep.progress}
            </span>

            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              {currentStep.title}
            </h3>

            <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-muted-foreground max-w-sm">
              {currentStep.description}
            </p>

            <div className="mt-6 w-full flex items-center justify-center">
              <Button
                type="button"
                size="default"
                onClick={finishTour}
                className="btn-primary-glow w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold shadow-md py-2.5 cursor-pointer"
              >
                <CheckCircle2Icon className="size-4" />
                <span>Start exploring</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </aside>,
    document.body
  );
}
