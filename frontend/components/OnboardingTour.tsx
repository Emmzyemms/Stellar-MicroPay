"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/contexts/I18nContext";

interface TourStep {
  id: string;
  titleKey: string;
  descriptionKey: string;
  target: string; // CSS selector
  position: "top" | "bottom" | "left" | "right";
}

const tourSteps: TourStep[] = [
  {
    id: "balance",
    titleKey: "onboarding.steps.balance.title",
    descriptionKey: "onboarding.steps.balance.description",
    target: ".balance-card",
    position: "bottom",
  },
  {
    id: "send-form",
    titleKey: "onboarding.steps.sendForm.title",
    descriptionKey: "onboarding.steps.sendForm.description",
    target: ".send-payment-form",
    position: "right",
  },
  {
    id: "transactions",
    titleKey: "onboarding.steps.transactions.title",
    descriptionKey: "onboarding.steps.transactions.description",
    target: "a[href='/transactions']",
    position: "bottom",
  },
];

interface OnboardingTourProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingTour({ isVisible, onComplete, onSkip }: OnboardingTourProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const step = tourSteps[currentStep];
    const targetElement = document.querySelector(step.target);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      targetElement.classList.add("tour-highlight");
    }

    return () => {
      if (targetElement) {
        targetElement.classList.remove("tour-highlight");
      }
    };
  }, [currentStep, isVisible]);

  if (!isVisible) return null;

  const step = tourSteps[currentStep];
  const targetElement = document.querySelector(step.target);
  if (!targetElement) return null;

  const rect = targetElement.getBoundingClientRect();

  const getTooltipPosition = () => {
    const offset = 10;
    switch (step.position) {
      case "top":
        return {
          top: rect.top - offset,
          left: rect.left + rect.width / 2,
          transform: "translateX(-50%) translateY(-100%)",
        };
      case "bottom":
        return {
          top: rect.bottom + offset,
          left: rect.left + rect.width / 2,
          transform: "translateX(-50%)",
        };
      case "left":
        return {
          top: rect.top + rect.height / 2,
          left: rect.left - offset,
          transform: "translateX(-100%) translateY(-50%)",
        };
      case "right":
        return {
          top: rect.top + rect.height / 2,
          left: rect.right + offset,
          transform: "translateY(-50%)",
        };
    }
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    setCurrentStep((stepIndex) => Math.max(0, stepIndex - 1));
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40 pointer-events-none" />

      {/* Tooltip */}
      <div
        className="fixed z-50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-4 rounded-lg shadow-lg max-w-xs"
        style={getTooltipPosition()}
      >
        <h3 className="font-semibold text-lg mb-2">{t(step.titleKey)}</h3>
        <p className="text-sm mb-4">{t(step.descriptionKey)}</p>
        <div className="flex justify-between items-center">
          <button
            onClick={handleSkip}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {t("onboarding.skipTour")}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {t("onboarding.stepProgress", {
                current: currentStep + 1,
                total: tourSteps.length,
              })}
            </span>
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("common.back")}
            </button>
            <button
              onClick={handleNext}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              {currentStep === tourSteps.length - 1
                ? t("onboarding.finish")
                : t("onboarding.next")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}