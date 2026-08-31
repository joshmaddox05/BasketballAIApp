// TourProvider.js - Context provider for managing onboarding tour state
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InteractionManager, Dimensions } from 'react-native';
import { TOUR_STEPS } from './tourConfig';
import { useAppContext } from '../../context/AppContext';

// expo-speech resolves its native module at import time, which throws on a dev
// client that hasn't been rebuilt yet. Load it lazily so the tour still works
// (just without narration) until the native rebuild ships.
let Speech = null;
try {
    Speech = require('expo-speech');
} catch (error) {
    // native module absent until rebuild — narration disabled
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

const TourContext = createContext(null);

const DEFAULT_TOUR_STORAGE_KEY = 'hasSeenTour';

// Safely stop any in-progress narration (native module may be absent before a rebuild)
const stopSpeech = () => {
    try {
        Speech?.stop();
    } catch (error) {
        // no-op: speech unavailable
    }
};

// `steps` and `storageKey` let each role mount its own tour on the same engine.
// Defaults preserve the original player tour behavior.
export const TourProvider = ({
    children,
    navigationRef,
    steps = TOUR_STEPS,
    storageKey = DEFAULT_TOUR_STORAGE_KEY,
}) => {
    const { voiceMuted } = useAppContext();

    const [isTourActive, setIsTourActive] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [hasSeenTour, setHasSeenTour] = useState(true); // Default to true to prevent flash
    const [isLoading, setIsLoading] = useState(true);
    const [targetMeasurement, setTargetMeasurement] = useState(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [currentTab, setCurrentTab] = useState('Home');

    // Store refs for all tour step targets
    const targetRefs = useRef({});

    // Scroll ref registry: { [tabName]: { ref: ScrollViewRef, scrollY: number } }
    const scrollRefs = useRef({});

    // Load tour preference on mount
    useEffect(() => {
        const loadTourPreference = async () => {
            try {
                const storedValue = await AsyncStorage.getItem(storageKey);
                const hasSeen = storedValue === 'true';
                setHasSeenTour(hasSeen);
            } catch (error) {
                console.error('Error loading tour preference:', error);
                setHasSeenTour(false);
            } finally {
                setIsLoading(false);
            }
        };

        loadTourPreference();
    }, [storageKey]);

    // Handle tab change notification from MainNavigator
    const handleTabChange = useCallback((tabName) => {
        setCurrentTab(tabName);
    }, []);

    // Check if user navigated to the expected tab for current step
    useEffect(() => {
        if (!isTourActive || isTransitioning) return;

        const currentStepData = steps[currentStepIndex];
        if (!currentStepData?.isTabStep || !currentStepData?.waitForTab) return;

        // User navigated to the expected tab - advance to next step
        if (currentTab === currentStepData.waitForTab) {
            const advanceToNextStep = async () => {
                setIsTransitioning(true);

                const nextIndex = currentStepIndex + 1;
                if (nextIndex >= steps.length) {
                    await endTour(true);
                    return;
                }

                // Wait for screen to mount after tab change
                await new Promise(resolve => setTimeout(resolve, 800));

                setCurrentStepIndex(nextIndex);
                const nextStep = steps[nextIndex];

                // Measure the next target
                await measureTarget(nextStep.id);
                setIsTransitioning(false);
            };

            advanceToNextStep();
        }
    }, [currentTab, isTourActive, currentStepIndex, isTransitioning, steps]);

    // Speak the current step aloud (unless muted); stop when tour ends / step changes
    useEffect(() => {
        stopSpeech();
        if (isTourActive && !voiceMuted && currentStepIndex != null) {
            const step = steps[currentStepIndex];
            if (step) {
                try {
                    Speech?.speak(`${step.title}. ${step.description}`, { rate: 0.95 });
                } catch (error) {
                    // no-op: speech unavailable
                }
            }
        }
        return () => stopSpeech();
    }, [currentStepIndex, isTourActive, voiceMuted, steps]);

    // Register a target ref for a tour step
    const registerTarget = useCallback((stepId, ref) => {
        targetRefs.current[stepId] = ref;
    }, []);

    // Unregister a target ref
    const unregisterTarget = useCallback((stepId) => {
        delete targetRefs.current[stepId];
    }, []);

    // Register a scroll ref for a tab
    const registerScrollRef = useCallback((tabName, ref) => {
        scrollRefs.current[tabName] = { ref, scrollY: 0 };
    }, []);

    // Unregister a scroll ref for a tab
    const unregisterScrollRef = useCallback((tabName) => {
        delete scrollRefs.current[tabName];
    }, []);

    // Update the current scroll offset for a tab
    const updateScrollY = useCallback((tabName, y) => {
        if (scrollRefs.current[tabName]) {
            scrollRefs.current[tabName].scrollY = y;
        }
    }, []);

    // Measure a target element with retry logic, auto-scrolling if needed
    const measureTarget = useCallback((stepId, maxAttempts = 25) => {
        return new Promise((resolve) => {
            let attempts = 0;

            const doMeasure = (ref, onResult) => {
                ref.current.measureInWindow((x, y, width, height) => {
                    onResult(x, y, width, height);
                });
            };

            const tryMeasure = () => {
                const ref = targetRefs.current[stepId];

                if (!ref?.current) {
                    if (attempts < maxAttempts) {
                        attempts++;
                        // Increase delay for first few attempts to allow screen to mount
                        const delay = attempts < 5 ? 200 : 150;
                        setTimeout(tryMeasure, delay);
                    } else {
                        console.warn(`Tour: Could not find target ref for step "${stepId}"`);
                        resolve(null);
                    }
                    return;
                }

                doMeasure(ref, (x, y, width, height) => {
                    if (width > 0 && height > 0) {
                        // Check if element is below the visible fold
                        const isBelowFold = y + height > SCREEN_HEIGHT - 150;
                        if (isBelowFold) {
                            // Find the step's tab to look up its scroll ref
                            const step = steps.find(s => s.id === stepId);
                            const tabEntry = step?.tab ? scrollRefs.current[step.tab] : null;
                            if (tabEntry?.ref?.current) {
                                const delta = (y + height) - (SCREEN_HEIGHT - 200);
                                const newScrollY = tabEntry.scrollY + delta;
                                tabEntry.ref.current.scrollTo({ y: newScrollY, animated: true });
                                // Wait for scroll animation then re-measure
                                setTimeout(() => {
                                    doMeasure(ref, (x2, y2, w2, h2) => {
                                        if (w2 > 0 && h2 > 0) {
                                            const measurement = { x: x2, y: y2, width: w2, height: h2 };
                                            setTargetMeasurement(measurement);
                                            resolve(measurement);
                                        } else {
                                            const measurement = { x, y, width, height };
                                            setTargetMeasurement(measurement);
                                            resolve(measurement);
                                        }
                                    });
                                }, 400);
                                return;
                            }
                        }
                        const measurement = { x, y, width, height };
                        setTargetMeasurement(measurement);
                        resolve(measurement);
                    } else if (attempts < maxAttempts) {
                        attempts++;
                        setTimeout(tryMeasure, 150);
                    } else {
                        console.warn(`Tour: Invalid measurement for step "${stepId}"`);
                        resolve(null);
                    }
                });
            };

            InteractionManager.runAfterInteractions(tryMeasure);
        });
    }, [steps]);

    // Navigate to the correct tab for a step
    const navigateToStep = useCallback(async (step) => {
        if (!step.tab || !navigationRef?.current) return;

        try {
            navigationRef.current.navigate(step.tab);
            // Wait for navigation animation and screen mount to complete
            await new Promise(resolve => setTimeout(resolve, 800));
        } catch (error) {
            console.error('Tour: Navigation error:', error);
        }
    }, [navigationRef]);

    // Start the tour
    const startTour = useCallback(async () => {
        if (isTourActive) return;

        // Mark tour as seen immediately so mid-tour app kills don't re-trigger it
        try {
            await AsyncStorage.setItem(storageKey, 'true');
            setHasSeenTour(true);
        } catch (error) {
            console.error('Error saving tour preference:', error);
        }

        setCurrentStepIndex(0);
        setIsTransitioning(true);
        setIsTourActive(true);

        const firstStep = steps[0];

        // Check if first step is a tab step (user needs to tap tab)
        if (firstStep.isTabStep) {
            // For tab steps, just measure the tab target - wait for user to tap
            await new Promise(resolve => setTimeout(resolve, 300));
            await measureTarget(firstStep.id);
            setIsTransitioning(false);
            return;
        }

        // Navigate to first step's tab and measure
        await navigateToStep(firstStep);

        // Additional delay to ensure component is registered
        await new Promise(resolve => setTimeout(resolve, 500));

        // Now try to measure
        const measurement = await measureTarget(firstStep.id);

        // If measurement failed, skip to next step or end tour
        if (!measurement) {
            console.warn('Tour: First step measurement failed, ending tour');
            setIsTourActive(false);
            setIsTransitioning(false);
            return;
        }

        setIsTransitioning(false);
    }, [isTourActive, navigateToStep, measureTarget, steps, storageKey]);

    // Go to next step
    const goToNextStep = useCallback(async () => {
        if (isTransitioning) return;

        const nextIndex = currentStepIndex + 1;

        if (nextIndex >= steps.length) {
            // Tour complete
            await endTour(true);
            return;
        }

        setIsTransitioning(true);
        const nextStep = steps[nextIndex];

        // Check if next step is a tab step (user needs to tap tab)
        if (nextStep.isTabStep) {
            // For tab steps, update index and measure the tab target
            // Don't navigate - wait for user to tap the tab
            setCurrentStepIndex(nextIndex);
            await measureTarget(nextStep.id);
            setIsTransitioning(false);
            return;
        }

        // Navigate if needed (different tab)
        const currentStepData = steps[currentStepIndex];
        if (nextStep.tab && nextStep.tab !== currentStepData?.tab) {
            await navigateToStep(nextStep);
            // Extra delay after tab change for screen mount
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        // Update step index
        setCurrentStepIndex(nextIndex);

        // Measure new target
        const measurement = await measureTarget(nextStep.id);

        // If measurement failed, try to continue to next step
        if (!measurement) {
            console.warn(`Tour: Step "${nextStep.id}" measurement failed, skipping to next`);
            setIsTransitioning(false);

            // If this was the last step, end tour
            if (nextIndex >= steps.length - 1) {
                await endTour(true);
                return;
            }

            // Recursively try next step
            setTimeout(() => goToNextStep(), 100);
            return;
        }

        setIsTransitioning(false);
    }, [currentStepIndex, isTransitioning, navigateToStep, measureTarget, endTour, steps]);

    // Go to previous step
    const goToPreviousStep = useCallback(async () => {
        if (isTransitioning || currentStepIndex === 0) return;

        setIsTransitioning(true);
        const prevIndex = currentStepIndex - 1;
        const prevStep = steps[prevIndex];

        // Navigate to previous step's tab if different
        const currentStep = steps[currentStepIndex];
        if (prevStep.tab !== currentStep.tab) {
            await navigateToStep(prevStep);
        }

        setCurrentStepIndex(prevIndex);
        await measureTarget(prevStep.id);

        setIsTransitioning(false);
    }, [currentStepIndex, isTransitioning, navigateToStep, measureTarget, steps]);

    // End the tour
    const endTour = useCallback(async (completed = true) => {
        stopSpeech();
        setIsTourActive(false);
        setCurrentStepIndex(0);
        setTargetMeasurement(null);
        setIsTransitioning(false);

        if (completed) {
            try {
                await AsyncStorage.setItem(storageKey, 'true');
                setHasSeenTour(true);
            } catch (error) {
                console.error('Error saving tour preference:', error);
            }
        }
    }, [storageKey]);

    // Reset tour (for retaking)
    const resetTour = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(storageKey);
            setHasSeenTour(false);
        } catch (error) {
            console.error('Error resetting tour preference:', error);
        }
    }, [storageKey]);

    // Skip tour
    const skipTour = useCallback(async () => {
        await endTour(true); // Mark as seen even when skipped
    }, [endTour]);

    // Stop any narration if the provider unmounts mid-tour
    useEffect(() => {
        return () => stopSpeech();
    }, []);

    // Get current step data
    const currentStep = steps[currentStepIndex] || null;
    const totalSteps = steps.length;

    const value = {
        // State
        isTourActive,
        currentStepIndex,
        currentStep,
        totalSteps,
        hasSeenTour,
        isLoading,
        targetMeasurement,
        isTransitioning,

        // Actions
        startTour,
        endTour,
        skipTour,
        resetTour,
        goToNextStep,
        goToPreviousStep,
        registerTarget,
        unregisterTarget,
        measureTarget,
        handleTabChange,
        registerScrollRef,
        unregisterScrollRef,
        updateScrollY,
    };

    return (
        <TourContext.Provider value={value}>
            {children}
        </TourContext.Provider>
    );
};

export const useTour = () => {
    const context = useContext(TourContext);
    if (!context) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
};

export default TourProvider;
