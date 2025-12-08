// AllChallengesScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    FlatList,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
    Image,
    RefreshControl,
    Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { hasAccess } from '../../utils/subscription';
import {
    getChallenges,
    getUserChallenges,
    joinChallenge,
    listenToUserChallenges,
    getFriends,
    getFriendRequests,
    acceptFriendRequest,
    declineFriendRequest,
    listenToFriendRequests,
    getDailyChallenge,
    getDailyChallengeProgress
} from '../../services/firestoreService';
import { OpponentSelector, ChallengeInviteModal } from '../../components/challenges';
import { LinearGradient } from 'expo-linear-gradient';
import { TourStep } from '../../components/tour';

// Challenge type tabs
const CHALLENGE_TYPES = [
    { id: 'all', label: 'All' },
    { id: 'solo', label: 'Solo' },
    { id: 'head_to_head', label: 'Head-to-Head' },
    { id: 'group', label: 'Group' },
];

// Mock challenges data - will be replaced with Firestore data
const MOCK_CHALLENGES = [
    {
        id: 'challenge_1',
        title: 'Perfect Your Free Throw',
        description: 'Master the art of free throw shooting with daily practice drills',
        category: 'Shooting',
        type: 'solo',
        difficulty: 'Beginner',
        duration: 30,
        participantCount: 1253,
        rewards: { points: 500, badge: 'Free Throw Master' },
        isExclusive: false,
        image: null,
    },
    {
        id: 'challenge_2',
        title: '7-Day Dribbling Challenge',
        description: 'Improve your ball handling skills in just one week',
        category: 'Dribbling',
        type: 'solo',
        difficulty: 'Beginner',
        duration: 7,
        participantCount: 876,
        rewards: { points: 250, badge: 'Ball Handler' },
        isExclusive: false,
        image: null,
    },
    {
        id: 'challenge_3',
        title: 'Elite Shooting Championship',
        description: 'Compete against the best shooters in a 14-day shooting competition',
        category: 'Shooting',
        type: 'group',
        difficulty: 'Advanced',
        duration: 14,
        participantCount: 342,
        rewards: { points: 1000, badge: 'Elite Shooter' },
        isExclusive: true,
        requiredTier: 'premium',
        image: null,
    },
    {
        id: 'challenge_4',
        title: '1v1 Conditioning Battle',
        description: 'Challenge a friend to a head-to-head fitness competition',
        category: 'Physical',
        type: 'head_to_head',
        difficulty: 'Intermediate',
        duration: 7,
        participantCount: 0,
        rewards: { points: 300, badge: 'Fitness Warrior' },
        isExclusive: false,
        image: null,
    },
    {
        id: 'challenge_5',
        title: 'Pro Training Circuit',
        description: 'Complete professional-level training drills over 21 days',
        category: 'Physical',
        type: 'solo',
        difficulty: 'Expert',
        duration: 21,
        participantCount: 156,
        rewards: { points: 750, badge: 'Pro Athlete' },
        isExclusive: true,
        requiredTier: 'premium',
        image: null,
    },
    {
        id: 'challenge_6',
        title: 'Shooting Showdown',
        description: 'Go head-to-head with another player in a shooting competition',
        category: 'Shooting',
        type: 'head_to_head',
        difficulty: 'Intermediate',
        duration: 5,
        participantCount: 0,
        rewards: { points: 200, badge: 'Sharpshooter' },
        isExclusive: false,
        image: null,
    },
];

// Mock user challenge progress - will be replaced with Firestore data
const MOCK_USER_CHALLENGES = [
    {
        challengeId: 'challenge_1',
        status: 'active',
        currentDay: 12,
        totalScore: 850,
        joinedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    },
    {
        challengeId: 'challenge_2',
        status: 'completed',
        currentDay: 7,
        totalScore: 250,
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
];

const AllChallengesScreen = ({ navigation }) => {
    const { theme, isDarkMode, userData, user } = useAppContext();
    const [selectedType, setSelectedType] = useState('all');
    const [challenges, setChallenges] = useState([]);
    const [userChallengesData, setUserChallengesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [joiningChallenge, setJoiningChallenge] = useState(null);
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [showFriendsModal, setShowFriendsModal] = useState(false);
    const [showInvitesModal, setShowInvitesModal] = useState(false);
    const [selectedFriendForChallenge, setSelectedFriendForChallenge] = useState(null);
    const [processingRequest, setProcessingRequest] = useState(null);
    const [dailyChallenge, setDailyChallenge] = useState(null);
    const [dailyChallengeProgress, setDailyChallengeProgress] = useState(null);

    const userSubscription = userData?.subscription || 'free';

    // Load challenges and user progress
    useEffect(() => {
        let unsubscribeUserChallenges = null;
        let unsubscribeFriendRequests = null;

        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch all challenges from Firestore
                const firestoreChallenges = await getChallenges();

                // Use Firestore data if available, otherwise fall back to mock data
                if (firestoreChallenges && firestoreChallenges.length > 0) {
                    setChallenges(firestoreChallenges);
                } else {
                    // Fall back to mock data if no Firestore challenges exist yet
                    setChallenges(MOCK_CHALLENGES);
                }

                // Load user's challenge progress if logged in
                if (user?.uid) {
                    const userProgress = await getUserChallenges(user.uid);
                    setUserChallengesData(userProgress || []);

                    // Load friends list
                    const friendsList = await getFriends(user.uid);
                    setFriends(friendsList || []);

                    // Load friend requests
                    const requests = await getFriendRequests(user.uid);
                    setFriendRequests(requests || []);

                    // Load daily challenge
                    const dailyChallengeResult = await getDailyChallenge();
                    if (dailyChallengeResult.success && dailyChallengeResult.challenge) {
                        setDailyChallenge(dailyChallengeResult.challenge);

                        // Load user's progress on daily challenge
                        const progressResult = await getDailyChallengeProgress(user.uid);
                        if (progressResult.success && progressResult.progress) {
                            setDailyChallengeProgress(progressResult.progress);
                        }
                    }

                    // Set up real-time listener for user challenges
                    unsubscribeUserChallenges = listenToUserChallenges(user.uid, (progress) => {
                        setUserChallengesData(progress || []);
                    });

                    // Set up real-time listener for friend requests
                    unsubscribeFriendRequests = listenToFriendRequests(user.uid, (requests) => {
                        setFriendRequests(requests || []);
                    });
                } else {
                    // Use mock data for logged out users
                    setUserChallengesData(MOCK_USER_CHALLENGES);
                }
            } catch (error) {
                console.error('Error loading challenges:', error);
                // Fall back to mock data on error
                setChallenges(MOCK_CHALLENGES);
                setUserChallengesData(MOCK_USER_CHALLENGES);
            } finally {
                setLoading(false);
            }
        };

        loadData();

        return () => {
            if (unsubscribeUserChallenges) {
                unsubscribeUserChallenges();
            }
            if (unsubscribeFriendRequests) {
                unsubscribeFriendRequests();
            }
        };
    }, [user?.uid]);

    // Use userChallengesData for compatibility with existing code
    const userChallenges = userChallengesData.map(uc => ({
        challengeId: uc.id || uc.challengeId,
        status: uc.status,
        currentDay: uc.currentDay,
        totalScore: uc.totalScore,
        joinedAt: uc.joinedAt,
        completedAt: uc.completedAt,
    }));

    // Filter challenges by type
    const filteredChallenges = selectedType === 'all'
        ? challenges
        : challenges.filter(c => c.type === selectedType);

    // Get user's active challenges
    const activeChallenges = userChallenges
        .filter(uc => uc.status === 'active')
        .map(uc => ({
            ...challenges.find(c => c.id === uc.challengeId),
            progress: uc,
        }))
        .filter(c => c.id); // Filter out undefined

    // Get user's completed challenges
    const completedChallenges = userChallenges
        .filter(uc => uc.status === 'completed')
        .map(uc => ({
            ...challenges.find(c => c.id === uc.challengeId),
            progress: uc,
        }))
        .filter(c => c.id);

    // Get available challenges (not currently active - allow re-joining completed ones)
    const activeIds = userChallenges
        .filter(uc => uc.status === 'active')
        .map(uc => uc.challengeId);

    // Split available challenges into free and premium, putting premium at bottom
    // Sort free challenges by difficulty (Beginner first)
    const availableChallengesUnsorted = filteredChallenges.filter(c => !activeIds.includes(c.id));
    const freeChallenges = availableChallengesUnsorted.filter(c => !c.isExclusive || hasAccess(userSubscription, c.requiredTier));
    const premiumChallenges = availableChallengesUnsorted.filter(c => c.isExclusive && !hasAccess(userSubscription, c.requiredTier));

    // Sort by difficulty: Beginner → Intermediate → Advanced → Expert
    const difficultyOrder = { 'beginner': 0, 'intermediate': 1, 'advanced': 2, 'expert': 3 };
    const sortByDifficulty = (a, b) => {
        const aOrder = difficultyOrder[a.difficulty?.toLowerCase()] ?? 4;
        const bOrder = difficultyOrder[b.difficulty?.toLowerCase()] ?? 4;
        return aOrder - bOrder;
    };

    const sortedFreeChallenges = [...freeChallenges].sort(sortByDifficulty);
    const sortedPremiumChallenges = [...premiumChallenges].sort(sortByDifficulty);
    const availableChallenges = [...sortedFreeChallenges, ...sortedPremiumChallenges];

    // Track which challenges the user has previously completed (for showing "Rejoin" button)
    const completedIds = userChallenges
        .filter(uc => uc.status === 'completed')
        .map(uc => uc.challengeId);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            // Refresh challenges from Firestore
            const firestoreChallenges = await getChallenges();
            if (firestoreChallenges && firestoreChallenges.length > 0) {
                setChallenges(firestoreChallenges);
            }

            // Refresh user challenges, friends, and friend requests
            if (user?.uid) {
                const userProgress = await getUserChallenges(user.uid);
                setUserChallengesData(userProgress || []);

                const friendsList = await getFriends(user.uid);
                setFriends(friendsList || []);

                const requests = await getFriendRequests(user.uid);
                setFriendRequests(requests || []);
            }
        } catch (error) {
            console.error('Error refreshing:', error);
        } finally {
            setRefreshing(false);
        }
    }, [user?.uid]);

    const handleJoinChallenge = async (challenge) => {
        if (!user?.uid) {
            Alert.alert('Sign In Required', 'Please sign in to join challenges.');
            return;
        }

        if (challenge.isExclusive && !hasAccess(userSubscription, challenge.requiredTier)) {
            // Show subscription modal or navigate to upgrade
            navigation.navigate('Profile', { screen: 'Settings', params: { openSubscription: true }, initial: false });
            return;
        }

        if (challenge.type === 'head_to_head') {
            // Navigate to challenge detail with H2H mode - will show opponent selector
            navigation.navigate('ChallengeDetail', {
                challengeId: challenge.id,
                showOpponentSelector: true,
            });
            return;
        }

        // Join the challenge
        setJoiningChallenge(challenge.id);
        try {
            await joinChallenge(user.uid, challenge.id, {
                title: challenge.title,
                type: challenge.type
            });

            // Refresh user challenges
            const userProgress = await getUserChallenges(user.uid);
            setUserChallengesData(userProgress || []);

            Alert.alert(
                'Challenge Joined!',
                `You've joined "${challenge.title}". Good luck!`,
                [{ text: 'Start Now', onPress: () => handleChallengePress(challenge, { currentDay: 1 }) }]
            );
        } catch (error) {
            console.error('Error joining challenge:', error);
            Alert.alert('Error', 'Failed to join challenge. Please try again.');
        } finally {
            setJoiningChallenge(null);
        }
    };

    const handleChallengePress = (challenge, progress = null) => {
        navigation.navigate('ChallengeDetail', {
            challengeId: challenge.id,
            challenge,
            progress,
        });
    };

    const handleChallengeFriend = (friend) => {
        // Show H2H challenges for this friend
        setSelectedFriendForChallenge(friend);
        // Navigate to first available H2H challenge
        const h2hChallenges = challenges.filter(c => c.type === 'head_to_head');
        if (h2hChallenges.length > 0) {
            navigation.navigate('ChallengeDetail', {
                challengeId: h2hChallenges[0].id,
                challenge: h2hChallenges[0],
                showOpponentSelector: true,
                preselectedOpponent: friend,
            });
        } else {
            Alert.alert('No H2H Challenges', 'No head-to-head challenges available at the moment.');
        }
    };

    const handleSelectOpponent = (opponent) => {
        setShowFriendsModal(false);
        // Show H2H challenge selection for this opponent
        const h2hChallenges = challenges.filter(c => c.type === 'head_to_head');
        if (h2hChallenges.length > 0) {
            navigation.navigate('ChallengeDetail', {
                challengeId: h2hChallenges[0].id,
                challenge: h2hChallenges[0],
                showOpponentSelector: true,
                preselectedOpponent: opponent,
            });
        }
    };

    const handleAcceptFriendRequest = async (request) => {
        if (!user?.uid) return;
        
        setProcessingRequest(request.id);
        try {
            await acceptFriendRequest(user.uid, request.id);
            
            // Refresh friends list
            const friendsList = await getFriends(user.uid);
            setFriends(friendsList || []);
            
            Alert.alert(
                'Friend Added!',
                `You are now friends with ${request.fromDisplayName}. Challenge them to a head-to-head battle!`
            );
        } catch (error) {
            console.error('Error accepting friend request:', error);
            Alert.alert('Error', 'Failed to accept friend request. Please try again.');
        } finally {
            setProcessingRequest(null);
        }
    };

    const handleDeclineFriendRequest = async (request) => {
        if (!user?.uid) return;
        
        setProcessingRequest(request.id);
        try {
            await declineFriendRequest(user.uid, request.id);
        } catch (error) {
            console.error('Error declining friend request:', error);
            Alert.alert('Error', 'Failed to decline friend request. Please try again.');
        } finally {
            setProcessingRequest(null);
        }
    };

    const getCategoryColor = (category) => {
        switch (category?.toLowerCase()) {
            case 'shooting': return '#FF6B00';
            case 'dribbling': return '#4CAF50';
            case 'physical': return '#2196F3';
            case 'defense': return '#9C27B0';
            case 'passing': return '#FF9800';
            default: return '#FF6B00';
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'solo': return 'person';
            case 'head_to_head': return 'people';
            case 'group': return 'people-circle';
            default: return 'trophy';
        }
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty?.toLowerCase()) {
            case 'beginner': return '#4CAF50';
            case 'intermediate': return '#FF9800';
            case 'advanced': return '#F44336';
            case 'expert': return '#9C27B0';
            default: return '#666';
        }
    };

    const renderTypeTab = ({ item }) => {
        const isSelected = selectedType === item.id;
        return (
            <TouchableOpacity
                style={[
                    styles.typeTab,
                    isSelected && styles.typeTabSelected,
                    { backgroundColor: isSelected ? theme.primary : theme.card }
                ]}
                onPress={() => setSelectedType(item.id)}
            >
                <Text style={[
                    styles.typeTabText,
                    { color: isSelected ? '#FFF' : theme.textSecondary }
                ]}>
                    {item.label}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderFriendCard = ({ item }) => (
        <TouchableOpacity
            style={[styles.friendCard, { backgroundColor: theme.card }]}
            onPress={() => handleChallengeFriend(item)}
        >
            {item.profileImage ? (
                <Image source={{ uri: item.profileImage }} style={styles.friendAvatar} />
            ) : (
                <View style={[styles.friendAvatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons name="person" size={24} color={theme.primary} />
                </View>
            )}
            <Text style={[styles.friendName, { color: theme.text }]} numberOfLines={1}>
                {item.displayName || 'Anonymous'}
            </Text>
            <TouchableOpacity
                style={[styles.quickChallengeButton, { backgroundColor: theme.primary }]}
                onPress={() => handleChallengeFriend(item)}
            >
                <Ionicons name="flash" size={14} color="#FFF" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderChallengeCard = ({ item, isActive = false, isCompleted = false }) => {
        const challenge = item.progress ? item : item;
        const progress = item.progress || null;
        const isLocked = challenge.isExclusive && !hasAccess(userSubscription, challenge.requiredTier);
        const hasPreviouslyCompleted = completedIds.includes(challenge.id);
        const daysLeft = progress ? challenge.duration - progress.currentDay : challenge.duration;
        const progressPercent = progress ? (progress.currentDay / challenge.duration) * 100 : 0;

        return (
            <TouchableOpacity
                style={[
                    styles.challengeCard,
                    { backgroundColor: theme.card },
                    isLocked && styles.lockedChallengeCard
                ]}
                onPress={() => isLocked
                    ? navigation.navigate('Profile', { screen: 'Settings', params: { openSubscription: true }, initial: false })
                    : handleChallengePress(challenge, progress)
                }
                activeOpacity={isLocked ? 0.8 : 0.7}
            >

                {/* Premium banner for locked challenges */}
                {isLocked && (
                    <View style={styles.premiumBanner}>
                        <Ionicons name="diamond" size={14} color="#FFF" />
                        <Text style={styles.premiumBannerText}>Premium Challenge</Text>
                    </View>
                )}

                {/* Header with badges */}
                <View style={[styles.cardHeader, isLocked && { marginTop: 24 }]}>
                    <View style={styles.badgeRow}>
                        {/* Category badge */}
                        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(challenge.category) + '20' }]}>
                            <Text style={[styles.categoryBadgeText, { color: getCategoryColor(challenge.category) }]}>
                                {challenge.category}
                            </Text>
                        </View>

                        {/* Type badge */}
                        <View style={[styles.typeBadge, { backgroundColor: theme.backgroundSecondary }]}>
                            <Ionicons name={getTypeIcon(challenge.type)} size={12} color={theme.textSecondary} />
                            <Text style={[styles.typeBadgeText, { color: theme.textSecondary }]}>
                                {challenge.type === 'head_to_head' ? 'H2H' : challenge.type.charAt(0).toUpperCase() + challenge.type.slice(1)}
                            </Text>
                        </View>

                        {/* Difficulty badge */}
                        <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(challenge.difficulty) + '20' }]}>
                            <Text style={[styles.difficultyBadgeText, { color: getDifficultyColor(challenge.difficulty) }]}>
                                {challenge.difficulty}
                            </Text>
                        </View>
                    </View>

                    {/* Premium star for exclusive (but unlocked) challenges */}
                    {challenge.isExclusive && !isLocked && (
                        <View style={styles.premiumStar}>
                            <Ionicons name="star" size={16} color="#FFD700" />
                        </View>
                    )}
                </View>

                {/* Title and description */}
                <Text style={[styles.challengeTitle, { color: theme.text }]} numberOfLines={1}>
                    {challenge.title}
                </Text>
                <Text style={[styles.challengeDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                    {challenge.description}
                </Text>

                {/* Progress bar for active challenges */}
                {isActive && progress && (
                    <View style={styles.progressSection}>
                        <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
                            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: theme.primary }]} />
                        </View>
                        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                            Day {progress.currentDay} of {challenge.duration}
                        </Text>
                    </View>
                )}

                {/* Completed badge */}
                {isCompleted && (
                    <View style={styles.completedSection}>
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        <Text style={[styles.completedText, { color: '#4CAF50' }]}>
                            Completed - {progress?.totalScore} pts
                        </Text>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.cardFooter}>
                    <View style={styles.statsRow}>
                        {challenge.type !== 'head_to_head' && (
                            <View style={styles.statItem}>
                                <Ionicons name="people-outline" size={14} color={theme.textSecondary} />
                                <Text style={[styles.statText, { color: theme.textSecondary }]}>
                                    {challenge.participantCount.toLocaleString()}
                                </Text>
                            </View>
                        )}
                        <View style={styles.statItem}>
                            <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                            <Text style={[styles.statText, { color: theme.textSecondary }]}>
                                {isActive ? `${daysLeft} days left` : `${challenge.duration} days`}
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="trophy-outline" size={14} color={theme.primary} />
                            <Text style={[styles.statText, { color: theme.primary }]}>
                                {challenge.rewards.points} pts
                            </Text>
                        </View>
                    </View>

                    {/* Action button */}
                    {!isActive && !isCompleted && !isLocked && (
                        <TouchableOpacity
                            style={[styles.joinButton, { backgroundColor: theme.primary }]}
                            onPress={() => handleJoinChallenge(challenge)}
                            disabled={joiningChallenge === challenge.id}
                        >
                            {joiningChallenge === challenge.id ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={styles.joinButtonText}>
                                    {challenge.type === 'head_to_head'
                                        ? 'Challenge'
                                        : hasPreviouslyCompleted
                                            ? 'Rejoin'
                                            : 'Join'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                    {/* Unlock button for locked premium challenges */}
                    {isLocked && (
                        <TouchableOpacity
                            style={styles.unlockButton}
                            onPress={() => navigation.navigate('Profile', { screen: 'Settings', params: { openSubscription: true }, initial: false })}
                        >
                            <Ionicons name="lock-open-outline" size={14} color="#FFF" />
                            <Text style={styles.unlockButtonText}>Upgrade</Text>
                        </TouchableOpacity>
                    )}
                    {isActive && (
                        <TouchableOpacity
                            style={[styles.continueButton, { backgroundColor: theme.primary }]}
                            onPress={() => handleChallengePress(challenge, progress)}
                        >
                            <Text style={styles.continueButtonText}>Continue</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderFriendRequestCard = ({ item }) => {
        const isProcessing = processingRequest === item.id;
        
        return (
            <View style={[styles.friendRequestCard, { backgroundColor: theme.card }]}>
                <View style={styles.friendRequestInfo}>
                    {item.fromProfileImage ? (
                        <Image source={{ uri: item.fromProfileImage }} style={styles.friendRequestAvatar} />
                    ) : (
                        <View style={[styles.friendRequestAvatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
                            <Ionicons name="person" size={20} color={theme.primary} />
                        </View>
                    )}
                    <View style={styles.friendRequestDetails}>
                        <Text style={[styles.friendRequestName, { color: theme.text }]} numberOfLines={1}>
                            {item.fromDisplayName || 'Anonymous'}
                        </Text>
                        <Text style={[styles.friendRequestLabel, { color: theme.textSecondary }]}>
                            wants to be your friend
                        </Text>
                    </View>
                </View>
                <View style={styles.friendRequestActions}>
                    {isProcessing ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                        <>
                            <TouchableOpacity
                                style={[styles.friendRequestDeclineButton, { borderColor: theme.border }]}
                                onPress={() => handleDeclineFriendRequest(item)}
                            >
                                <Ionicons name="close" size={18} color={theme.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.friendRequestAcceptButton, { backgroundColor: theme.primary }]}
                                onPress={() => handleAcceptFriendRequest(item)}
                            >
                                <Ionicons name="checkmark" size={18} color="#FFF" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        );
    };

    const renderSectionHeader = (title, count, onViewAll = null) => (
        <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
                <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>{count}</Text>
            </View>
            {onViewAll && (
                <TouchableOpacity onPress={onViewAll}>
                    <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Challenges</Text>
                <View style={styles.headerActions}>
                    {/* Invites button with badge */}
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => setShowInvitesModal(true)}
                    >
                        <Ionicons name="mail-outline" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerButton}>
                        <Ionicons name="filter-outline" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Type tabs - wrapped with TourStep for onboarding */}
            <TourStep stepId="challenge-type-tabs">
                <View style={styles.typeTabs}>
                    <FlatList
                        data={CHALLENGE_TYPES}
                        renderItem={renderTypeTab}
                        keyExtractor={item => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.typeTabsContent}
                    />
                </View>
            </TourStep>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.primary}
                    />
                }
            >
                {/* Daily Challenge Card - wrapped with TourStep for onboarding */}
                {dailyChallenge && (
                    <TourStep stepId="daily-challenge-card">
                        <TouchableOpacity
                            style={styles.dailyChallengeCard}
                            onPress={() => navigation.navigate('DailyChallengeDetail', { challenge: dailyChallenge, progress: dailyChallengeProgress })}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#9C27B0', '#E040FB']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.dailyChallengeGradient}
                            >
                                <View style={styles.dailyChallengeHeader}>
                                    <View style={styles.dailyChallengeBadge}>
                                        <Ionicons name="flash" size={14} color="#FFD700" />
                                        <Text style={styles.dailyChallengeBadgeText}>Daily Challenge</Text>
                                    </View>
                                    <Text style={styles.dailyChallengeReward}>
                                        +{dailyChallenge.rewards?.xp || 75} XP
                                    </Text>
                                </View>

                                <Text style={styles.dailyChallengeTitle}>{dailyChallenge.title}</Text>
                                <Text style={styles.dailyChallengeDescription} numberOfLines={2}>
                                    {dailyChallenge.description}
                                </Text>

                                <View style={styles.dailyChallengeFooter}>
                                    <View style={styles.dailyChallengeStats}>
                                        <View style={styles.dailyChallengeStat}>
                                            <Ionicons name="trophy-outline" size={14} color="rgba(255,255,255,0.8)" />
                                            <Text style={styles.dailyChallengeStatText}>
                                                {dailyChallenge.targetValue} {dailyChallenge.targetMetric}
                                            </Text>
                                        </View>
                                        <View style={styles.dailyChallengeStat}>
                                            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
                                            <Text style={styles.dailyChallengeStatText}>
                                                ~{dailyChallenge.estimatedTime || 15} min
                                            </Text>
                                        </View>
                                    </View>

                                {dailyChallengeProgress?.completed ? (
                                    <View style={styles.dailyChallengeCompletedBadge}>
                                        <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                                        <Text style={styles.dailyChallengeCompletedText}>Done!</Text>
                                    </View>
                                ) : (
                                    <View style={styles.dailyChallengeStartButton}>
                                        <Text style={styles.dailyChallengeStartText}>Start</Text>
                                        <Ionicons name="arrow-forward" size={16} color="#9C27B0" />
                                    </View>
                                )}
                            </View>

                            {/* Progress bar if in progress */}
                            {dailyChallengeProgress && !dailyChallengeProgress.completed && dailyChallengeProgress.currentValue > 0 && (
                                <View style={styles.dailyChallengeProgressContainer}>
                                    <View style={styles.dailyChallengeProgressBar}>
                                        <View
                                            style={[
                                                styles.dailyChallengeProgressFill,
                                                { width: `${Math.min((dailyChallengeProgress.currentValue / dailyChallenge.targetValue) * 100, 100)}%` }
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.dailyChallengeProgressText}>
                                        {dailyChallengeProgress.currentValue}/{dailyChallenge.targetValue}
                                    </Text>
                                </View>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                    </TourStep>
                )}

                {/* Friend Requests Section */}
                {friendRequests.length > 0 && (
                    <View style={styles.section}>
                        {renderSectionHeader('Friend Requests', friendRequests.length)}
                        <FlatList
                            data={friendRequests}
                            renderItem={renderFriendRequestCard}
                            keyExtractor={item => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalListContent}
                        />
                    </View>
                )}

                {/* Friends Section - Challenge Your Friends */}
                {friends.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionHeaderLeft}>
                                <Text style={[styles.sectionTitle, { color: theme.text }]}>Challenge Friends</Text>
                                <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>{friends.length}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowFriendsModal(true)}>
                                <View style={styles.addFriendButton}>
                                    <Ionicons name="person-add" size={16} color={theme.primary} />
                                    <Text style={[styles.addFriendText, { color: theme.primary }]}>Add</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={friends.slice(0, 10)}
                            renderItem={renderFriendCard}
                            keyExtractor={item => item.uid}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalListContent}
                        />
                    </View>
                )}

                {/* No Friends Yet - CTA */}
                {friends.length === 0 && user?.uid && (
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={[styles.findFriendsCard, { backgroundColor: theme.card }]}
                            onPress={() => setShowFriendsModal(true)}
                        >
                            <View style={[styles.findFriendsIcon, { backgroundColor: theme.primary + '15' }]}>
                                <Ionicons name="people" size={32} color={theme.primary} />
                            </View>
                            <Text style={[styles.findFriendsTitle, { color: theme.text }]}>
                                Find Friends to Challenge
                            </Text>
                            <Text style={[styles.findFriendsSubtitle, { color: theme.textSecondary }]}>
                                Search for other players and start head-to-head battles
                            </Text>
                            <View style={[styles.findFriendsButton, { backgroundColor: theme.primary }]}>
                                <Ionicons name="search" size={16} color="#FFF" />
                                <Text style={styles.findFriendsButtonText}>Search Players</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Active Challenges */}
                {activeChallenges.length > 0 && (
                    <View style={styles.section}>
                        {renderSectionHeader('Your Active Challenges', activeChallenges.length)}
                        {activeChallenges.map(challenge => (
                            <View key={challenge.id}>
                                {renderChallengeCard({ item: challenge, isActive: true })}
                            </View>
                        ))}
                    </View>
                )}

                {/* Available Challenges */}
                <View style={styles.section}>
                    {renderSectionHeader('Available Challenges', availableChallenges.length)}
                    {availableChallenges.length > 0 ? (
                        availableChallenges.map(challenge => (
                            <View key={challenge.id}>
                                {renderChallengeCard({ item: challenge })}
                            </View>
                        ))
                    ) : (
                        <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
                            <Ionicons name="trophy-outline" size={48} color={theme.textSecondary} />
                            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                                No challenges available for this category
                            </Text>
                        </View>
                    )}
                </View>

                {/* Completed Challenges */}
                {completedChallenges.length > 0 && (
                    <View style={styles.section}>
                        {renderSectionHeader('Completed', completedChallenges.length)}
                        {completedChallenges.map(challenge => (
                            <View key={challenge.id}>
                                {renderChallengeCard({ item: challenge, isCompleted: true })}
                            </View>
                        ))}
                    </View>
                )}

                {/* Bottom spacer */}
                <View style={{ height: 30 }} />
            </ScrollView>

            {/* Opponent Selector Modal */}
            <OpponentSelector
                visible={showFriendsModal}
                onClose={() => setShowFriendsModal(false)}
                onSelectOpponent={handleSelectOpponent}
                challengeTitle="Head-to-Head Challenge"
            />

            {/* Challenge Invites Modal */}
            <ChallengeInviteModal
                visible={showInvitesModal}
                onClose={() => setShowInvitesModal(false)}
                onAcceptChallenge={(challengeId) => {
                    setShowInvitesModal(false);
                    navigation.navigate('ChallengeDetail', { challengeId });
                }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerButton: {
        padding: 8,
    },
    filterButton: {
        padding: 8,
    },
    typeTabs: {
        paddingVertical: 8,
    },
    typeTabsContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    typeTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    typeTabSelected: {
        // Additional styles handled inline
    },
    typeTabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    section: {
        marginTop: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    sectionCount: {
        fontSize: 14,
    },
    challengeCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    lockedChallengeCard: {
        borderWidth: 1.5,
        borderColor: '#9C27B0',
        opacity: 0.9,
    },
    premiumBanner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#9C27B0',
        paddingVertical: 6,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        zIndex: 10,
    },
    premiumBannerText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    unlockButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#9C27B0',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    unlockButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    categoryBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    categoryBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    typeBadgeText: {
        fontSize: 11,
        fontWeight: '500',
    },
    difficultyBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    difficultyBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    premiumStar: {
        marginLeft: 8,
    },
    challengeTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 4,
    },
    challengeDescription: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    progressSection: {
        marginBottom: 12,
    },
    progressBar: {
        height: 6,
        borderRadius: 3,
        marginBottom: 6,
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
    },
    completedSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    completedText: {
        fontSize: 14,
        fontWeight: '600',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 12,
    },
    joinButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    joinButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    continueButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    continueButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyState: {
        padding: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyStateText: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 12,
    },
    // Friends section styles
    horizontalListContent: {
        paddingRight: 16,
    },
    addFriendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    addFriendText: {
        fontSize: 14,
        fontWeight: '600',
    },
    friendCard: {
        width: 100,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginRight: 10,
    },
    friendAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginBottom: 8,
    },
    friendAvatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    friendName: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 8,
    },
    quickChallengeButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Friend request styles
    friendRequestCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        marginRight: 12,
        minWidth: 260,
    },
    friendRequestInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    friendRequestAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    friendRequestAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    friendRequestDetails: {
        marginLeft: 10,
        flex: 1,
    },
    friendRequestName: {
        fontSize: 14,
        fontWeight: '600',
    },
    friendRequestLabel: {
        fontSize: 12,
        marginTop: 2,
    },
    friendRequestActions: {
        flexDirection: 'row',
        gap: 8,
    },
    friendRequestDeclineButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    friendRequestAcceptButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Find friends CTA styles
    findFriendsCard: {
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
    },
    findFriendsIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    findFriendsTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    findFriendsSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
    },
    findFriendsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 8,
    },
    findFriendsButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
    },
    // Daily Challenge Card Styles
    dailyChallengeCard: {
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#9C27B0',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    dailyChallengeGradient: {
        padding: 18,
    },
    dailyChallengeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    dailyChallengeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    dailyChallengeBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 5,
    },
    dailyChallengeReward: {
        color: '#FFD700',
        fontSize: 14,
        fontWeight: '700',
    },
    dailyChallengeTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 6,
    },
    dailyChallengeDescription: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 14,
    },
    dailyChallengeFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dailyChallengeStats: {
        flexDirection: 'row',
        gap: 16,
    },
    dailyChallengeStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    dailyChallengeStatText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
    },
    dailyChallengeStartButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 6,
    },
    dailyChallengeStartText: {
        color: '#9C27B0',
        fontSize: 14,
        fontWeight: '700',
    },
    dailyChallengeCompletedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        gap: 6,
    },
    dailyChallengeCompletedText: {
        color: '#4CAF50',
        fontSize: 14,
        fontWeight: '700',
    },
    dailyChallengeProgressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
    },
    dailyChallengeProgressBar: {
        flex: 1,
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 3,
        marginRight: 10,
        overflow: 'hidden',
    },
    dailyChallengeProgressFill: {
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 3,
    },
    dailyChallengeProgressText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
});

export default AllChallengesScreen;
