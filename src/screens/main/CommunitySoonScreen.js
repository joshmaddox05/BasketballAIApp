// CommunitySoonScreen.js - Attractive "Coming Soon" screen for community features
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { getTheme } from '../../utils/theme';

const { width, height } = Dimensions.get('window');

const CommunitySoonScreen = ({ navigation }) => {
  const { theme: contextTheme, isDarkMode } = useAppContext();
  const theme = contextTheme || getTheme(isDarkMode || false);
  
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleEmailSignup = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    // In a real app, this would save to Firebase or send to your backend
    Alert.alert(
      'Thanks for signing up!',
      'We\'ll notify you when community features are ready.',
      [{ text: 'OK', onPress: () => setIsSubscribed(true) }]
    );
  };

  const handleSocialFollow = (platform) => {
    // In a real app, this would open the respective social media app
    Alert.alert(
      'Follow Us',
      `This would open our ${platform} page. Stay tuned for updates!`,
      [{ text: 'OK' }]
    );
  };

  const features = [
    {
      icon: 'chatbubbles',
      title: 'Player Feed',
      description: 'Share your progress, achievements, and training videos with the community'
    },
    {
      icon: 'trophy',
      title: 'Challenges',
      description: 'Participate in daily, weekly, and monthly basketball challenges'
    },
    {
      icon: 'people',
      title: 'Find Mentors',
      description: 'Connect with experienced players and coaches for guidance'
    },
    {
      icon: 'calendar',
      title: 'Local Events',
      description: 'Discover basketball events, tournaments, and pickup games in your area'
    },
    {
      icon: 'star',
      title: 'Achievements',
      description: 'Earn badges and recognition for your dedication and improvement'
    },
    {
      icon: 'videocam',
      title: 'Video Sharing',
      description: 'Share your best shots, moves, and training sessions with the community'
    }
  ];

  const timeline = [
    {
      phase: 'Phase 1',
      title: 'Player Feed & Basic Sharing',
      description: 'Share posts, photos, and achievements',
      status: 'In Development',
      estimatedDate: 'Q2 2024'
    },
    {
      phase: 'Phase 2',
      title: 'Challenges & Competitions',
      description: 'Daily challenges and community competitions',
      status: 'Planned',
      estimatedDate: 'Q3 2024'
    },
    {
      phase: 'Phase 3',
      title: 'Mentorship & Events',
      description: 'Connect with mentors and discover local events',
      status: 'Planned',
      estimatedDate: 'Q4 2024'
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Community</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Hero Section */}
        <View style={[styles.heroSection, { backgroundColor: theme.card }]}>
          <View style={styles.heroContent}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="people" size={60} color={theme.primary} />
            </View>
            <Text style={[styles.heroTitle, { color: theme.text }]}>
              Community Features Coming Soon!
            </Text>
            <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
              We're building an amazing community where basketball players can connect, 
              share, and grow together. Get ready for something special!
            </Text>
          </View>
        </View>

        {/* Features Preview */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            What's Coming
          </Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View 
                key={index} 
                style={[styles.featureCard, { backgroundColor: theme.card }]}
              >
                <View style={[styles.featureIcon, { backgroundColor: theme.primary + '20' }]}>
                  <Ionicons name={feature.icon} size={24} color={theme.primary} />
                </View>
                <Text style={[styles.featureTitle, { color: theme.text }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
                  {feature.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timelineSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Development Timeline
          </Text>
          <View style={styles.timeline}>
            {timeline.map((item, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <Text style={[styles.timelinePhase, { color: theme.primary }]}>
                      {item.phase}
                    </Text>
                    <View style={[
                      styles.statusBadge, 
                      { 
                        backgroundColor: index === 0 ? theme.success + '20' : theme.backgroundSecondary,
                        borderColor: index === 0 ? theme.success : theme.border
                      }
                    ]}>
                      <Text style={[
                        styles.statusText, 
                        { color: index === 0 ? theme.success : theme.textSecondary }
                      ]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.timelineTitle, { color: theme.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.timelineDescription, { color: theme.textSecondary }]}>
                    {item.description}
                  </Text>
                  <Text style={[styles.timelineDate, { color: theme.primary }]}>
                    {item.estimatedDate}
                  </Text>
                </View>
                {index < timeline.length - 1 && (
                  <View style={[styles.timelineConnector, { backgroundColor: theme.border }]} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Email Signup */}
        <View style={[styles.signupSection, { backgroundColor: theme.card }]}>
          <Text style={[styles.signupTitle, { color: theme.text }]}>
            Be the First to Know
          </Text>
          <Text style={[styles.signupSubtitle, { color: theme.textSecondary }]}>
            Get notified when community features are ready and receive exclusive early access.
          </Text>
          
          {!isSubscribed ? (
            <View style={styles.emailInputContainer}>
              <TextInput
                style={[styles.emailInput, { 
                  backgroundColor: theme.background, 
                  color: theme.text,
                  borderColor: theme.border
                }]}
                placeholder="Enter your email address"
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.signupButton, { backgroundColor: theme.primary }]}
                onPress={handleEmailSignup}
              >
                <Text style={styles.signupButtonText}>Notify Me</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.subscribedContainer, { backgroundColor: theme.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={24} color={theme.success} />
              <Text style={[styles.subscribedText, { color: theme.success }]}>
                Thanks! We'll notify you when it's ready.
              </Text>
            </View>
          )}
        </View>

        {/* Social Media */}
        <View style={styles.socialSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Follow Our Journey
          </Text>
          <Text style={[styles.socialSubtitle, { color: theme.textSecondary }]}>
            Stay connected and get behind-the-scenes updates on our development progress.
          </Text>
          
          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: theme.card }]}
              onPress={() => handleSocialFollow('Instagram')}
            >
              <Ionicons name="logo-instagram" size={24} color="#E4405F" />
              <Text style={[styles.socialButtonText, { color: theme.text }]}>Instagram</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: theme.card }]}
              onPress={() => handleSocialFollow('Twitter')}
            >
              <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
              <Text style={[styles.socialButtonText, { color: theme.text }]}>Twitter</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: theme.card }]}
              onPress={() => handleSocialFollow('TikTok')}
            >
              <Ionicons name="logo-tiktok" size={24} color="#000000" />
              <Text style={[styles.socialButtonText, { color: theme.text }]}>TikTok</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom CTA */}
        <View style={[styles.bottomCTA, { backgroundColor: theme.primary + '10' }]}>
          <Text style={[styles.ctaTitle, { color: theme.text }]}>
            Ready to Join the Community?
          </Text>
          <Text style={[styles.ctaSubtitle, { color: theme.textSecondary }]}>
            While we're building the community features, keep training and improving your game!
          </Text>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('Training', { screen: 'TrainingMain' })}
          >
            <Text style={styles.ctaButtonText}>Continue Training</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 34,
  },
  heroSection: {
    margin: 20,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: (width - 60) / 2,
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  timelineSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  timeline: {
    marginTop: 10,
  },
  timelineItem: {
    position: 'relative',
  },
  timelineContent: {
    paddingLeft: 20,
    paddingBottom: 20,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timelinePhase: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  timelineDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  timelineDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  timelineConnector: {
    position: 'absolute',
    left: 9,
    top: 40,
    width: 2,
    height: 40,
  },
  signupSection: {
    margin: 20,
    padding: 25,
    borderRadius: 16,
  },
  signupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  signupSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  emailInputContainer: {
    gap: 15,
  },
  emailInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  signupButton: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  signupButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subscribedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  subscribedText: {
    fontSize: 16,
    fontWeight: '600',
  },
  socialSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  socialSubtitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginHorizontal: 5,
    gap: 8,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomCTA: {
    margin: 20,
    padding: 25,
    borderRadius: 16,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  ctaSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 12,
    gap: 10,
  },
  ctaButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CommunitySoonScreen;
