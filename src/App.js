// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AppProvider } from './context/AppContext';
import AppNavigator from '../src/navigation/AppNavigator';

export default function App() {
    return (
        <AppProvider>
                <AppNavigator />
        </AppProvider>
    );
}