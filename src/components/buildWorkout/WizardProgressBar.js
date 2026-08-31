// WizardProgressBar.js - Step indicator for the workout builder wizard
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const WizardProgressBar = ({ currentStep, totalSteps = 3, stepLabels = ['Duration', 'Focus', 'Preview'] }) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isUpcoming = stepNumber > currentStep;

        return (
          <React.Fragment key={stepNumber}>
            {/* Step Circle */}
            <View style={styles.stepContainer}>
              <View
                style={[
                  styles.circle,
                  isCompleted && styles.circleCompleted,
                  isCurrent && styles.circleCurrent,
                  isUpcoming && styles.circleUpcoming
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      isCurrent && styles.stepNumberCurrent,
                      isUpcoming && styles.stepNumberUpcoming
                    ]}
                  >
                    {stepNumber}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isCompleted && styles.stepLabelCompleted,
                  isCurrent && styles.stepLabelCurrent,
                  isUpcoming && styles.stepLabelUpcoming
                ]}
              >
                {stepLabels[index]}
              </Text>
            </View>

            {/* Connector Line */}
            {stepNumber < totalSteps && (
              <View
                style={[
                  styles.connector,
                  isCompleted && styles.connectorCompleted
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20
  },
  stepContainer: {
    alignItems: 'center'
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderWidth: 2,
    borderColor: '#3A3A3A'
  },
  circleCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50'
  },
  circleCurrent: {
    backgroundColor: '#8A1C22',
    borderColor: '#8A1C22'
  },
  circleUpcoming: {
    backgroundColor: '#1A1A1A',
    borderColor: '#3A3A3A'
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888'
  },
  stepNumberCurrent: {
    color: '#FFFFFF'
  },
  stepNumberUpcoming: {
    color: '#666666'
  },
  stepLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '500',
    color: '#888888'
  },
  stepLabelCompleted: {
    color: '#4CAF50'
  },
  stepLabelCurrent: {
    color: '#8A1C22'
  },
  stepLabelUpcoming: {
    color: '#666666'
  },
  connector: {
    width: 40,
    height: 2,
    backgroundColor: '#3A3A3A',
    marginHorizontal: 8,
    marginBottom: 20
  },
  connectorCompleted: {
    backgroundColor: '#4CAF50'
  }
});

export default WizardProgressBar;
