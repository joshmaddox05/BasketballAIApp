// SubscriptionScreen.js - Full-screen wrapper for the subscription paywall
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import SubscriptionModal from '../../components/shared/SubscriptionModal';

const SubscriptionScreen = () => {
    const navigation = useNavigation();

    const handleClose = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        }
    };

    return (
        <SubscriptionModal
            visible={true}
            onClose={handleClose}
            onUpgrade={handleClose}
        />
    );
};

export default SubscriptionScreen;
