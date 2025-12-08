// TourStep.js - Wrapper component for tour target elements
import React, { useRef, useEffect } from 'react';
import { View } from 'react-native';
import { useTour } from './TourProvider';

const TourStep = ({ stepId, children, style }) => {
    const ref = useRef(null);
    const { registerTarget, unregisterTarget, isTourActive, currentStep, measureTarget } = useTour();

    // Register this target when mounted
    useEffect(() => {
        if (stepId) {
            registerTarget(stepId, ref);
        }

        return () => {
            if (stepId) {
                unregisterTarget(stepId);
            }
        };
    }, [stepId, registerTarget, unregisterTarget]);

    // Re-measure when this step becomes active
    useEffect(() => {
        if (isTourActive && currentStep?.id === stepId) {
            // Small delay to ensure layout is complete
            const timer = setTimeout(() => {
                measureTarget(stepId);
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [isTourActive, currentStep, stepId, measureTarget]);

    return (
        <View
            ref={ref}
            style={style}
            collapsable={false} // Required for Android measurement
        >
            {children}
        </View>
    );
};

export default TourStep;
