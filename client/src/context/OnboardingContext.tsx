import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const ONBOARDING_STORAGE_KEY = 'feature_portal_onboarding_completed';

export interface TourStep {
  id: string;
  targetSelector?: string;
  title: string;
  description: string;
  progress: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'new-request',
    targetSelector: '[data-tour="new-request"]',
    title: '💡 Create a Feature Request',
    description:
      'Have an idea or improvement? Submit a feature request with a title, description, and category. Your idea can then be discovered and supported by the community.',
    progress: '1 of 5',
  },
  {
    id: 'upvote',
    targetSelector: '[data-tour="upvote"]',
    title: '👍 Support ideas with an Upvote',
    description:
      "See a feature you'd like? Upvote it to show the product team that it's important to you. Each user can vote only once per request.",
    progress: '2 of 5',
  },
  {
    id: 'comments',
    targetSelector: '[data-tour="comments"]',
    title: '💬 Join the Discussion',
    description:
      'Share your thoughts, ask questions, and reply to other users through threaded discussions.',
    progress: '3 of 5',
  },
  {
    id: 'roadmap',
    targetSelector: '[data-tour="roadmap"]',
    title: '🗺️ Follow the Product Roadmap',
    description:
      'Track feature progress as requests move through the roadmap: Under Review → Planned → In Progress → Completed.',
    progress: '4 of 5',
  },
  {
    id: 'finish',
    title: "🚀 You're ready!",
    description:
      'Submit ideas, support features with upvotes, join discussions, and follow their progress on the public roadmap.',
    progress: '5 of 5',
  },
];

interface OnboardingContextType {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep;
  totalSteps: number;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  finishTour: () => void;
  goToStep: (index: number) => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  // Check first-time visit logic on initial load
  useEffect(() => {
    try {
      const isCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!isCompleted) {
        // Automatically start tutorial on first visit after brief initial mount
        const timer = setTimeout(() => {
          // If not on feed, navigate to feed first
          if (window.location.pathname !== '/feed' && window.location.pathname !== '/') {
            navigate('/feed');
          }
          setCurrentStepIndex(0);
          setIsActive(true);
        }, 700);

        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore localStorage read errors in restricted contexts
    }
  }, [navigate]);

  const startTour = useCallback(() => {
    // If not on feed, navigate to feed so all cards/elements are present
    if (location.pathname !== '/feed') {
      navigate('/feed');
    }
    setCurrentStepIndex(0);
    setIsActive(true);
  }, [location.pathname, navigate]);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.min(TOUR_STEPS.length - 1, prev + 1));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const skipTour = useCallback(() => {
    setIsActive(false);
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const finishTour = useCallback(() => {
    setIsActive(false);
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < TOUR_STEPS.length) {
      setCurrentStepIndex(index);
    }
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStepIndex,
        currentStep: TOUR_STEPS[currentStepIndex],
        totalSteps: TOUR_STEPS.length,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        finishTour,
        goToStep,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
