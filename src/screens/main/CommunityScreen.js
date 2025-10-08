// CommunityScreen.js
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Image,
    FlatList,
    TextInput,
    ActivityIndicator,
    SafeAreaView,
    StatusBar,
    Modal,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const CommunityScreen = ({ navigation }) => {
    const { userData } = useAppContext();

    // State for different sections
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('feed'); // feed, challenges, mentors, events
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Mock data for community posts
    const [posts, setPosts] = useState([
        {
            id: '1',
            user: {
                id: 'user1',
                name: 'Michael Jordan',
                image: null,
                level: 'Advanced'
            },
            content: 'Just finished a 2-hour shooting session. Improved my three-point percentage to 75%. What drills are you all using to improve shooting consistency?',
            timestamp: '2023-06-15T14:30:00',
            likes: 24,
            comments: 8,
            isLiked: false,
            category: 'Training'
        },
        {
            id: '2',
            user: {
                id: 'user2',
                name: 'Lisa Thompson',
                image: null,
                level: 'Intermediate'
            },
            content: 'Anyone have recommendations for good pre-game meals? I\'m trying to optimize my energy levels for longer games.',
            timestamp: '2023-06-14T10:15:00',
            likes: 18,
            comments: 15,
            isLiked: true,
            category: 'Nutrition'
        },
        {
            id: '3',
            user: {
                id: 'user3',
                name: 'Coach Johnson',
                image: null,
                level: 'Expert'
            },
            content: 'Here\'s a quick ball handling drill I use with my college players. 2 minutes of crossovers, 2 minutes of between the legs, 2 minutes of behind the back. 3 sets with 30 second breaks. Try it and let me know how it works for you!',
        timestamp: '2023-06-13T16:45:00',
        likes: 42,
        comments: 12,
        isLiked: false,
        category: 'Coaching'
}
]);

    // Mock data for challenges
    const challenges = [
        {
            id: '1',
            title: 'Perfect Your Free Throw',
            description: 'Complete 100 free throws with at least 80% accuracy',
            participants: 245,
            daysLeft: 12,
            prize: 'Gold Badge + 500 Points',
            isJoined: true,
            progress: 65,
            image: null
        },
        {
            id: '2',
            title: '30-Day Dribbling Challenge',
            description: 'Complete daily dribbling exercises for 30 consecutive days',
            participants: 189,
            daysLeft: 25,
            prize: 'Silver Badge + 300 Points',
            isJoined: false,
            progress: 0,
            image: null
        },
        {
            id: '3',
            title: 'Jump Shot Master',
            description: 'Upload your best jump shot video for community voting',
            participants: 78,
            daysLeft: 5,
            prize: 'Featured in App + 1000 Points',
            isJoined: false,
            progress: 0,
            image: null
        }
    ];

    // Mock data for mentors
    const mentors = [
        {
            id: '1',
            name: 'Coach Johnson',
            specialization: 'Shooting Coach',
            experience: '15 years',
            rating: 4.9,
            reviews: 124,
            image: null,
            availability: 'Available',
            price: 'Free / $20 per session'
        },
        {
            id: '2',
            name: 'Marcus Williams',
            specialization: 'NBA Player',
            experience: '8 years pro',
            rating: 4.8,
            reviews: 87,
            image: null,
            availability: 'Limited',
            price: '$50 per session'
        },
        {
            id: '3',
            name: 'Sarah Davis',
            specialization: 'College Coach',
            experience: '10 years',
            rating: 4.7,
            reviews: 93,
            image: null,
            availability: 'Available',
            price: '$15 per session'
        }
    ];

    // Mock data for events
    const events = [
        {
            id: '1',
            title: 'Pro Shooting Techniques',
            host: 'Coach Johnson',
            date: '2023-06-20T19:00:00',
            duration: '45 min',
            participants: 156,
            isRegistered: true,
            type: 'Webinar',
            image: null
        },
        {
            id: '2',
            title: 'Q&A with NBA Player',
            host: 'Marcus Williams',
            date: '2023-06-25T18:30:00',
            duration: '60 min',
            participants: 324,
            isRegistered: false,
            type: 'Live Q&A',
            image: null
        },
        {
            id: '3',
            title: 'Mental Preparation for Games',
            host: 'Dr. Taylor',
            date: '2023-06-22T17:00:00',
            duration: '50 min',
            participants: 98,
            isRegistered: false,
            type: 'Workshop',
            image: null
        }
    ];

    // Categories for filtering posts
    const categories = [
        { id: 'all', name: 'All' },
        { id: 'training', name: 'Training' },
        { id: 'nutrition', name: 'Nutrition' },
        { id: 'coaching', name: 'Coaching' },
        { id: 'mental', name: 'Mental' },
        { id: 'equipment', name: 'Equipment' }
    ];

    const [selectedCategory, setSelectedCategory] = useState('all');

    // Handle liking a post
    const handleLikePost = (postId) => {
        setPosts(posts.map(post => {
            if (post.id === postId) {
                const isCurrentlyLiked = post.isLiked;
                return {
                    ...post,
                    isLiked: !isCurrentlyLiked,
                    likes: isCurrentlyLiked ? post.likes - 1 : post.likes + 1
                };
            }
            return post;
        }));
    };

    // Handle showing comment modal
    const handleShowComments = (post) => {
        setSelectedPost(post);
        setShowCommentModal(true);
    };

    // Handle submitting a comment
    const handleSubmitComment = () => {
        if (!commentText.trim()) {
            return;
        }

        // In a real app, would send to API
        setPosts(posts.map(post => {
            if (post.id === selectedPost.id) {
                return {
                    ...post,
                    comments: post.comments + 1
                };
            }
            return post;
        }));

        setCommentText('');
        setShowCommentModal(false);

        // Show success message
        Alert.alert('Comment Posted', 'Your comment has been added to the discussion.');
    };

    // Handle joining a challenge
    const handleJoinChallenge = (challengeId) => {
        // In a real app, would send to API
        Alert.alert(
            'Join Challenge',
            'Are you ready to take on this challenge?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Join',
                    onPress: () => {
                        Alert.alert('Challenge Joined', 'Good luck! You can track your progress in the Challenges tab.');
                    }
                }
            ]
        );
    };

    // Handle connecting with a mentor
    const handleConnectMentor = (mentor) => {
        Alert.alert(
            'Connect with Mentor',
            `Would you like to schedule a session with ${mentor.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Schedule',
                    onPress: () => {
                        // In a real app, would navigate to scheduling screen
                        Alert.alert('Coming Soon', 'Mentor scheduling will be available in the next update.');
                    }
                }
            ]
        );
    };

    // Handle registering for an event
    const handleRegisterEvent = (event) => {
        if (event.isRegistered) {
            Alert.alert(
                'Already Registered',
                `You're already registered for "${event.title}". A reminder will be sent before the event starts.`
            );
        } else {
            Alert.alert(
                'Register for Event',
                `Would you like to register for "${event.title}"?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Register',
                        onPress: () => {
                            Alert.alert('Registration Successful', 'You have been registered for the event. A reminder will be sent before it starts.');
                        }
                    }
                ]
            );
        }
    };

    // Format date to relative time (e.g., "2 hours ago")
    const formatRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) {
            return `${diffInSeconds} seconds ago`;
        }

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
        }

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) {
            return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
        }

        return date.toLocaleDateString();
    };

    // Format event date
    const formatEventDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Generate initials from name
    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('');
    };

    // Render the top tab navigation
    const renderTabs = () => {
        return (
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'feed' && styles.activeTab]}
                    onPress={() => setActiveTab('feed')}
                >
                    <Ionicons
                        name={activeTab === 'feed' ? 'people' : 'people-outline'}
                        size={22}
                        color={activeTab === 'feed' ? '#FF6B00' : '#666'}
                    />
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'feed' && styles.activeTabText
                        ]}
                    >
                        Feed
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'challenges' && styles.activeTab]}
                    onPress={() => setActiveTab('challenges')}
                >
                    <Ionicons
                        name={activeTab === 'challenges' ? 'trophy' : 'trophy-outline'}
                        size={22}
                        color={activeTab === 'challenges' ? '#FF6B00' : '#666'}
                    />
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'challenges' && styles.activeTabText
                        ]}
                    >
                        Challenges
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'mentors' && styles.activeTab]}
                    onPress={() => setActiveTab('mentors')}
                >
                    <Ionicons
                        name={activeTab === 'mentors' ? 'school' : 'school-outline'}
                        size={22}
                        color={activeTab === 'mentors' ? '#FF6B00' : '#666'}
                    />
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'mentors' && styles.activeTabText
                        ]}
                    >
                        Mentors
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'events' && styles.activeTab]}
                    onPress={() => setActiveTab('events')}
                >
                    <Ionicons
                        name={activeTab === 'events' ? 'calendar' : 'calendar-outline'}
                        size={22}
                        color={activeTab === 'events' ? '#FF6B00' : '#666'}
                    />
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'events' && styles.activeTabText
                        ]}
                    >
                        Events
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    // Render the community feed section
    const renderFeed = () => {
        // Filter posts by category if not "all"
        const filteredPosts = selectedCategory === 'all'
            ? posts
            : posts.filter(post => post.category.toLowerCase() === selectedCategory);

        return (
            <View style={styles.feedContainer}>
                {/* Create post box */}
                <View style={styles.createPostContainer}>
                    <View style={styles.createPostHeader}>
                        <View style={styles.userAvatarContainer}>
                            {userData.profileImage ? (
                                <Image source={userData.profileImage} style={styles.userAvatar} />
                            ) : (
                                <View style={styles.userAvatarPlaceholder}>
                                    <Text style={styles.userInitials}>{getInitials(userData.name)}</Text>
                                </View>
                            )}
                        </View>
                        <TouchableOpacity
                            style={styles.postInputContainer}
                            onPress={() => navigation.navigate('CreatePost')}
                        >
                            <Text style={styles.postInputPlaceholder}>Share your training progress or ask a question...</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.postOptionsContainer}>
                        <TouchableOpacity style={styles.postOption}>
                            <Ionicons name="image-outline" size={18} color="#666" />
                            <Text style={styles.postOptionText}>Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.postOption}>
                            <Ionicons name="videocam-outline" size={18} color="#666" />
                            <Text style={styles.postOptionText}>Video</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.postOption}>
                            <Ionicons name="stats-chart-outline" size={18} color="#666" />
                            <Text style={styles.postOptionText}>Stats</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Category filter */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoriesContainer}
                    contentContainerStyle={styles.categoriesContent}
                >
                    {categories.map(category => (
                        <TouchableOpacity
                            key={category.id}
                            style={[
                                styles.categoryChip,
                                selectedCategory === category.id && styles.activeCategoryChip
                            ]}
                            onPress={() => setSelectedCategory(category.id)}
                        >
                            <Text
                                style={[
                                    styles.categoryChipText,
                                    selectedCategory === category.id && styles.activeCategoryChipText
                                ]}
                            >
                                {category.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Posts list */}
                {filteredPosts.length > 0 ? (
                    filteredPosts.map(post => (
                        <View key={post.id} style={styles.postCard}>
                            <View style={styles.postHeader}>
                                <View style={styles.postUser}>
                                    {post.user.image ? (
                                        <Image source={post.user.image} style={styles.postUserAvatar} />
                                    ) : (
                                        <View style={styles.postUserAvatarPlaceholder}>
                                            <Text style={styles.postUserInitials}>{getInitials(post.user.name)}</Text>
                                        </View>
                                    )}
                                    <View style={styles.postUserInfo}>
                                        <Text style={styles.postUserName}>{post.user.name}</Text>
                                        <View style={styles.postUserMeta}>
                                            <Text style={styles.postUserLevel}>{post.user.level}</Text>
                                            <Text style={styles.postTimestamp}>{formatRelativeTime(post.timestamp)}</Text>
                                        </View>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.postOptionsButton}>
                                    <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.postContent}>{post.content}</Text>

                            <View style={styles.postActions}>
                                <TouchableOpacity
                                    style={styles.postAction}
                                    onPress={() => handleLikePost(post.id)}
                                >
                                    <Ionicons
                                        name={post.isLiked ? "heart" : "heart-outline"}
                                        size={20}
                                        color={post.isLiked ? "#F44336" : "#666"}
                                    />
                                    <Text
                                        style={[
                                            styles.postActionText,
                                            post.isLiked && { color: "#F44336" }
                                        ]}
                                    >
                                        {post.likes}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.postAction}
                                    onPress={() => handleShowComments(post)}
                                >
                                    <Ionicons name="chatbubble-outline" size={20} color="#666" />
                                    <Text style={styles.postActionText}>{post.comments}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.postAction}>
                                    <Ionicons name="share-social-outline" size={20} color="#666" />
                                    <Text style={styles.postActionText}>Share</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyStateContainer}>
                        <Text style={styles.emptyStateText}>No posts in this category yet.</Text>
                        <TouchableOpacity
                            style={styles.emptyStateButton}
                            onPress={() => navigation.navigate('CreatePost')}
                        >
                            <Text style={styles.emptyStateButtonText}>Create the First Post</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    // Render the challenges section
    const renderChallenges = () => {
        return (
            <View style={styles.challengesContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Active Challenges</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('AllChallenges')}>
                        <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                </View>

                {challenges.map(challenge => (
                    <View key={challenge.id} style={styles.challengeCard}>
                        <View style={styles.challengeImageContainer}>
                            {challenge.image ? (
                                <Image source={challenge.image} style={styles.challengeImage} />
                            ) : (
                                <View style={styles.challengeImagePlaceholder}>
                                    <Ionicons name="trophy" size={50} color="#FFD700" />
                                </View>
                            )}
                            <View style={styles.challengeBadge}>
                                <Text style={styles.challengeBadgeText}>{challenge.daysLeft} days left</Text>
                            </View>
                        </View>

                        <View style={styles.challengeContent}>
                            <Text style={styles.challengeTitle}>{challenge.title}</Text>
                            <Text style={styles.challengeDescription}>{challenge.description}</Text>

                            <View style={styles.challengeMeta}>
                                <View style={styles.challengeMetaItem}>
                                    <Ionicons name="people-outline" size={16} color="#666" />
                                    <Text style={styles.challengeMetaText}>{challenge.participants} participants</Text>
                                </View>
                                <View style={styles.challengeMetaItem}>
                                    <Ionicons name="gift-outline" size={16} color="#666" />
                                    <Text style={styles.challengeMetaText}>{challenge.prize}</Text>
                                </View>
                            </View>

                            {challenge.isJoined ? (
                                <View style={styles.challengeProgressContainer}>
                                    <View style={styles.challengeProgressInfo}>
                                        <Text style={styles.challengeProgressText}>Your progress</Text>
                                        <Text style={styles.challengeProgressPercentage}>{challenge.progress}%</Text>
                                    </View>
                                    <View style={styles.challengeProgressBar}>
                                        <View
                                            style={[
                                                styles.challengeProgressFill,
                                                { width: `${challenge.progress}%` }
                                            ]}
                                        />
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.joinChallengeButton}
                                    onPress={() => handleJoinChallenge(challenge.id)}
                                >
                                    <Text style={styles.joinChallengeButtonText}>Join Challenge</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ))}

                <View style={styles.leaderboardContainer}>
                    <View style={styles.leaderboardHeader}>
                        <Text style={styles.leaderboardTitle}>Challenge Leaderboard</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.leaderboardContent}>
                        <View style={styles.leaderboardItem}>
                            <View style={styles.leaderboardRank}>
                                <Text style={styles.leaderboardRankText}>1</Text>
                            </View>
                            <View style={styles.leaderboardUserContainer}>
                                {/* Replace with actual image if available */}
                                <View style={styles.leaderboardUserAvatar}>
                                    <Text style={styles.leaderboardUserInitials}>JK</Text>
                                </View>
                                <View style={styles.leaderboardUserInfo}>
                                    <Text style={styles.leaderboardUserName}>John Kim</Text>
                                    <Text style={styles.leaderboardUserStats}>92 points • Advanced</Text>
                                </View>
                            </View>
                            <View style={styles.leaderboardBadge}>
                                <Ionicons name="trophy" size={18} color="#FFD700" />
                            </View>
                        </View>

                        <View style={styles.leaderboardItem}>
                            <View style={styles.leaderboardRank}>
                                <Text style={styles.leaderboardRankText}>2</Text>
                            </View>
                            <View style={styles.leaderboardUserContainer}>
                                {/* Replace with actual image if available */}
                                <View style={styles.leaderboardUserAvatar}>
                                    <Text style={styles.leaderboardUserInitials}>LT</Text>
                                </View>
                                <View style={styles.leaderboardUserInfo}>
                                    <Text style={styles.leaderboardUserName}>Lisa Thompson</Text>
                                    <Text style={styles.leaderboardUserStats}>87 points • Intermediate</Text>
                                </View>
                            </View>
                            <View style={styles.leaderboardBadge}>
                                <Ionicons name="trophy" size={18} color="#C0C0C0" />
                            </View>
                        </View>

                        <View style={styles.leaderboardItem}>
                            <View style={styles.leaderboardRank}>
                                <Text style={styles.leaderboardRankText}>3</Text>
                            </View>
                            <View style={styles.leaderboardUserContainer}>
                                {/* Replace with actual image if available */}
                                <View style={styles.leaderboardUserAvatar}>
                                    <Text style={styles.leaderboardUserInitials}>MJ</Text>
                                </View>
                                <View style={styles.leaderboardUserInfo}>
                                    <Text style={styles.leaderboardUserName}>Michael Jordan</Text>
                                    <Text style={styles.leaderboardUserStats}>82 points • Advanced</Text>
                                </View>
                            </View>
                            <View style={styles.leaderboardBadge}>
                                <Ionicons name="trophy" size={18} color="#CD7F32" />
                            </View>
                        </View>

                        <TouchableOpacity style={styles.yourRankingButton}>
                            <Text style={styles.yourRankingButtonText}>View Your Ranking</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    // Render the mentors section
    const renderMentors = () => {
        return (
            <View style={styles.mentorsContainer}>
                <View style={styles.mentorshipInfoContainer}>
                    <Text style={styles.mentorshipTitle}>Basketball Mentorship</Text>
                    <Text style={styles.mentorshipDescription}>
                        Connect with professional coaches and players for personalized training, feedback, and advice.
                    </Text>
                    <TouchableOpacity style={styles.becomeAMentorButton}>
                        <Text style={styles.becomeAMentorButtonText}>Become a Mentor</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Featured Mentors</Text>
                    <TouchableOpacity>
                        <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                </View>

                {mentors.map(mentor => (
                    <View key={mentor.id} style={styles.mentorCard}>
                        <View style={styles.mentorInfo}>
                            <View style={styles.mentorImageContainer}>
                                {mentor.image ? (
                                    <Image source={mentor.image} style={styles.mentorImage} />
                                ) : (
                                    <View style={styles.mentorImagePlaceholder}>
                                        <Text style={styles.mentorInitials}>{getInitials(mentor.name)}</Text>
                                    </View>
                                )}
                                <View
                                    style={[
                                        styles.availabilityIndicator,
                                        { backgroundColor: mentor.availability === 'Available' ? '#4CAF50' : '#FF9800' }
                                    ]}
                                />
                            </View>

                            <View style={styles.mentorDetails}>
                                <Text style={styles.mentorName}>{mentor.name}</Text>
                                <Text style={styles.mentorSpecialization}>{mentor.specialization}</Text>
                                <View style={styles.mentorRatingContainer}>
                                    <Ionicons name="star" size={14} color="#FFD700" />
                                    <Text style={styles.mentorRating}>
                                        {mentor.rating} • {mentor.reviews} reviews
                                    </Text>
                                </View>
                                <View style={styles.mentorExperienceContainer}>
                                    <Ionicons name="briefcase-outline" size={14} color="#666" />
                                    <Text style={styles.mentorExperience}>{mentor.experience}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.mentorActions}>
                            <Text style={styles.mentorPrice}>{mentor.price}</Text>
                            <TouchableOpacity
                                style={styles.connectButton}
                                onPress={() => handleConnectMentor(mentor)}
                            >
                                <Text style={styles.connectButtonText}>Connect</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                <View style={styles.findMentorContainer}>
                    <Text style={styles.findMentorTitle}>Looking for a specific expertise?</Text>
                    <TouchableOpacity style={styles.findMentorButton}>
                        <Text style={styles.findMentorButtonText}>Find a Mentor</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.testimonialContainer}>
                    <Text style={styles.testimonialTitle}>What Our Users Say</Text>

                    <View style={styles.testimonialCard}>
                        <Text style={styles.testimonialQuote}>
                            "Working with Coach Johnson completely transformed my shooting form. I saw a 15% improvement in my three-point percentage in just one month!"
                        </Text>
                        <View style={styles.testimonialAuthor}>
                            <View style={styles.testimonialAuthorImage}>
                                <Text style={styles.testimonialAuthorInitials}>MJ</Text>
                            </View>
                            <View style={styles.testimonialAuthorInfo}>
                                <Text style={styles.testimonialAuthorName}>Michael Jordan</Text>
                                <Text style={styles.testimonialAuthorDetails}>Advanced Player</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    // Render the events section
    const renderEvents = () => {
        return (
            <View style={styles.eventsContainer}>
                <View style={styles.upcomingEventContainer}>
                    <Text style={styles.upcomingEventTitle}>Next Live Event</Text>

                    <View style={styles.featuredEventCard}>
                        <View style={styles.featuredEventImageContainer}>
                            <View style={styles.featuredEventImage}>
                                <Ionicons name="videocam" size={40} color="#FFF" />
                            </View>
                            <View style={styles.featuredEventBadge}>
                                <Text style={styles.featuredEventBadgeText}>LIVE</Text>
                            </View>
                        </View>

                        <View style={styles.featuredEventContent}>
                            <Text style={styles.featuredEventType}>{events[0].type}</Text>
                            <Text style={styles.featuredEventTitle}>{events[0].title}</Text>

                            <View style={styles.featuredEventDetails}>
                                <View style={styles.featuredEventDetail}>
                                    <Ionicons name="person-outline" size={16} color="#666" />
                                    <Text style={styles.featuredEventDetailText}>
                                        {events[0].host}
                                    </Text>
                                </View>
                                <View style={styles.featuredEventDetail}>
                                    <Ionicons name="calendar-outline" size={16} color="#666" />
                                    <Text style={styles.featuredEventDetailText}>
                                        {formatEventDate(events[0].date)}
                                    </Text>
                                </View>
                                <View style={styles.featuredEventDetail}>
                                    <Ionicons name="time-outline" size={16} color="#666" />
                                    <Text style={styles.featuredEventDetailText}>
                                        {events[0].duration}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.registerEventButton}
                                onPress={() => handleRegisterEvent(events[0])}
                            >
                                <Text style={styles.registerEventButtonText}>
                                    {events[0].isRegistered ? 'Set Reminder' : 'Register Now'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={styles.upcomingEventsContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Upcoming Events</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    {events.slice(1).map(event => (
                        <View key={event.id} style={styles.eventItem}>
                            <View style={styles.eventDateContainer}>
                                <Text style={styles.eventMonth}>
                                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                                </Text>
                                <Text style={styles.eventDay}>
                                    {new Date(event.date).getDate()}
                                </Text>
                            </View>

                            <View style={styles.eventInfo}>
                                <Text style={styles.eventType}>{event.type}</Text>
                                <Text style={styles.eventTitle}>{event.title}</Text>
                                <View style={styles.eventMeta}>
                                    <Text style={styles.eventHost}>By {event.host}</Text>
                                    <Text style={styles.eventTime}>
                                        {new Date(event.date).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.eventRegisterButton,
                                    event.isRegistered && styles.eventRegisteredButton
                                ]}
                                onPress={() => handleRegisterEvent(event)}
                            >
                                <Text
                                    style={[
                                        styles.eventRegisterButtonText,
                                        event.isRegistered && styles.eventRegisteredButtonText
                                    ]}
                                >
                                    {event.isRegistered ? 'Registered' : 'Register'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>

                <View style={styles.pastEventsContainer}>
                    <Text style={styles.pastEventsTitle}>Past Events</Text>

                    <TouchableOpacity style={styles.pastEventItem}>
                        <View style={styles.pastEventImageContainer}>
                            <View style={styles.pastEventImage}>
                                <Ionicons name="play-circle" size={24} color="#FFF" />
                            </View>
                        </View>

                        <View style={styles.pastEventInfo}>
                            <Text style={styles.pastEventTitle}>Defensive Strategies Workshop</Text>
                            <Text style={styles.pastEventMeta}>Coach Davis • June 10</Text>
                        </View>

                        <Ionicons name="chevron-forward" size={20} color="#666" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.pastEventItem}>
                        <View style={styles.pastEventImageContainer}>
                            <View style={styles.pastEventImage}>
                                <Ionicons name="play-circle" size={24} color="#FFF" />
                            </View>
                        </View>

                        <View style={styles.pastEventInfo}>
                            <Text style={styles.pastEventTitle}>Nutrition for Basketball Players</Text>
                            <Text style={styles.pastEventMeta}>Dr. Smith • June 5</Text>
                        </View>

                        <Ionicons name="chevron-forward" size={20} color="#666" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.viewAllPastEventsButton}>
                        <Text style={styles.viewAllPastEventsText}>View All Past Events</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Community</Text>
                <TouchableOpacity style={styles.notificationsButton}>
                    <Ionicons name="notifications-outline" size={24} color="#333" />
                    <View style={styles.notificationBadge}>
                        <Text style={styles.notificationBadgeText}>3</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            {renderTabs()}

            {/* Content based on active tab */}
            <ScrollView
                style={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'feed' && renderFeed()}
                {activeTab === 'challenges' && renderChallenges()}
                {activeTab === 'mentors' && renderMentors()}
                {activeTab === 'events' && renderEvents()}
            </ScrollView>

            {/* Comment Modal */}
            <Modal
                visible={showCommentModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCommentModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Comments</Text>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setShowCommentModal(false)}
                            >
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.commentsContainer}>
                            <View style={styles.commentItem}>
                                <View style={styles.commentUserAvatar}>
                                    <Text style={styles.commentUserInitials}>JD</Text>
                                </View>
                                <View style={styles.commentContent}>
                                    <Text style={styles.commentUserName}>John Doe</Text>
                                    <Text style={styles.commentText}>
                                        I've been working on my three-point shooting as well. Have you tried the corner three drill?
                                    </Text>
                                    <View style={styles.commentActions}>
                                        <Text style={styles.commentTime}>2 hours ago</Text>
                                        <TouchableOpacity>
                                            <Text style={styles.commentReplyButton}>Reply</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.commentItem}>
                                <View style={styles.commentUserAvatar}>
                                    <Text style={styles.commentUserInitials}>AS</Text>
                                </View>
                                <View style={styles.commentContent}>
                                    <Text style={styles.commentUserName}>Alex Smith</Text>
                                    <Text style={styles.commentText}>
                                        I found that focusing on my follow-through really helped improve my consistency.
                                    </Text>
                                    <View style={styles.commentActions}>
                                        <Text style={styles.commentTime}>5 hours ago</Text>
                                        <TouchableOpacity>
                                            <Text style={styles.commentReplyButton}>Reply</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.addCommentContainer}>
                            <View style={styles.currentUserAvatar}>
                                <Text style={styles.currentUserInitials}>{getInitials(userData.name)}</Text>
                            </View>
                            <TextInput
                                style={styles.commentInput}
                                placeholder="Add a comment..."
                                value={commentText}
                                onChangeText={setCommentText}
                                multiline
                            />
                            <TouchableOpacity
                                style={styles.postCommentButton}
                                onPress={handleSubmitComment}
                                disabled={!commentText.trim()}
                            >
                                <Ionicons
                                    name="send"
                                    size={20}
                                    color={commentText.trim() ? "#FF6B00" : "#CCC"}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    notificationsButton: {
        position: 'relative',
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#F44336',
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#FF6B00',
    },
    tabText: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    activeTabText: {
        color: '#FF6B00',
        fontWeight: '600',
    },
    contentContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },

    // Feed Tab Styles
    feedContainer: {
        padding: 12,
    },
    createPostContainer: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    createPostHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    userAvatarContainer: {
        marginRight: 10,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    userAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userInitials: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    postInputContainer: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    postInputPlaceholder: {
        color: '#999',
        fontSize: 14,
    },
    postOptionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 12,
    },
    postOption: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    postOptionText: {
        marginLeft: 4,
        color: '#666',
        fontSize: 14,
    },
    categoriesContainer: {
        marginBottom: 12,
    },
    categoriesContent: {
        paddingVertical: 8,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        backgroundColor: '#F0F0F0',
    },
    activeCategoryChip: {
        backgroundColor: '#FFF0E6',
    },
    categoryChipText: {
        color: '#666',
        fontSize: 14,
    },
    activeCategoryChipText: {
        color: '#FF6B00',
        fontWeight: '600',
    },
    postCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    postHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    postUser: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    postUserAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    postUserAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
    },
    postUserInitials: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    postUserInfo: {
        marginLeft: 10,
    },
    postUserName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    postUserMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    postUserLevel: {
        fontSize: 12,
        color: '#666',
        marginRight: 8,
    },
    postTimestamp: {
        fontSize: 12,
        color: '#999',
    },
    postOptionsButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    postContent: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
        marginBottom: 16,
    },
    postActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 12,
    },
    postAction: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 24,
    },
    postActionText: {
        color: '#666',
        marginLeft: 4,
        fontSize: 14,
    },
    emptyStateContainer: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        marginTop: 20,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 16,
    },
    emptyStateButton: {
        backgroundColor: '#FF6B00',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    emptyStateButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
    },

    // Challenges Tab Styles
    challengesContainer: {
        padding: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    seeAllText: {
        fontSize: 14,
        color: '#FF6B00',
        fontWeight: '500',
    },
    challengeCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        overflow: 'hidden',
    },
    challengeImageContainer: {
        height: 160,
        position: 'relative',
    },
    challengeImage: {
        width: '100%',
        height: '100%',
    },
    challengeImagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
    },
    challengeBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    challengeBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    challengeContent: {
        padding: 16,
    },
    challengeTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    challengeDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 12,
    },
    challengeMeta: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    challengeMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    challengeMetaText: {
        fontSize: 12,
        color: '#666',
        marginLeft: 4,
    },
    challengeProgressContainer: {
        marginTop: 4,
    },
    challengeProgressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    challengeProgressText: {
        fontSize: 12,
        color: '#666',
    },
    challengeProgressPercentage: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FF6B00',
    },
    challengeProgressBar: {
        height: 6,
        backgroundColor: '#F0F0F0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    challengeProgressFill: {
        height: '100%',
        backgroundColor: '#FF6B00',
        borderRadius: 3,
    },
    joinChallengeButton: {
        backgroundColor: '#FF6B00',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    joinChallengeButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    leaderboardContainer: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    leaderboardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    leaderboardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    leaderboardContent: {
        marginBottom: 8,
    },
    leaderboardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    leaderboardRank: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    leaderboardRankText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
    },
    leaderboardUserContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    leaderboardUserAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    leaderboardUserInitials: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    leaderboardUserInfo: {
        flex: 1,
    },
    leaderboardUserName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    leaderboardUserStats: {
        fontSize: 12,
        color: '#666',
    },
    leaderboardBadge: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    yourRankingButton: {
        backgroundColor: '#F0F0F0',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    yourRankingButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },

    // Mentors Tab Styles
    mentorsContainer: {
        padding: 12,
    },
    mentorshipInfoContainer: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    mentorshipTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    mentorshipDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 16,
    },
    becomeAMentorButton: {
        backgroundColor: '#F0F0F0',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    becomeAMentorButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
    mentorCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    mentorInfo: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    mentorImageContainer: {
        position: 'relative',
        marginRight: 12,
    },
    mentorImage: {
        width: 70,
        height: 70,
        borderRadius: 35,
    },
    mentorImagePlaceholder: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mentorInitials: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 24,
    },
    availabilityIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    mentorDetails: {
        flex: 1,
    },
    mentorName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    mentorSpecialization: {
        fontSize: 14,
        color: '#666',
        marginBottom: 6,
    },
    mentorRatingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    mentorRating: {
        fontSize: 12,
        color: '#666',
        marginLeft: 4,
    },
    mentorExperienceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mentorExperience: {
        fontSize: 12,
        color: '#666',
        marginLeft: 4,
    },
    mentorActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 12,
    },
    mentorPrice: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
    },
    connectButton: {
        backgroundColor: '#FF6B00',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    connectButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    findMentorContainer: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        alignItems: 'center',
    },
    findMentorTitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    findMentorButton: {
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    findMentorButtonText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    testimonialContainer: {
        marginBottom: 16,
    },
    testimonialTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    testimonialCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    testimonialQuote: {
        fontSize: 14,
        color: '#333',
        fontStyle: 'italic',
        lineHeight: 22,
        marginBottom: 16,
    },
    testimonialAuthor: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    testimonialAuthorImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    testimonialAuthorInitials: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    testimonialAuthorInfo: {
        flex: 1,
    },
    testimonialAuthorName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    testimonialAuthorDetails: {
        fontSize: 12,
        color: '#666',
    },

    // Events Tab Styles
    eventsContainer: {
        padding: 12,
    },
    upcomingEventContainer: {
        marginBottom: 16,
    },
    upcomingEventTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    featuredEventCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        overflow: 'hidden',
    },
    featuredEventImageContainer: {
        height: 180,
        backgroundColor: '#FF6B00',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    featuredEventImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    featuredEventBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#F44336',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
    },
    featuredEventBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    featuredEventContent: {
        padding: 16,
    },
    featuredEventType: {
        fontSize: 12,
        color: '#FF6B00',
        fontWeight: '600',
        marginBottom: 4,
    },
    featuredEventTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    featuredEventDetails: {
        marginBottom: 16,
    },
    featuredEventDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    featuredEventDetailText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
    },
    registerEventButton: {
        backgroundColor: '#FF6B00',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    registerEventButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    upcomingEventsContainer: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    eventItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    eventDateContainer: {
        width: 50,
        height: 60,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    eventMonth: {
        fontSize: 12,
        color: '#666',
        textTransform: 'uppercase',
    },
    eventDay: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    eventInfo: {
        flex: 1,
        marginRight: 12,
    },
    eventType: {
        fontSize: 12,
        color: '#FF6B00',
        marginBottom: 2,
    },
    eventTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    eventMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    eventHost: {
        fontSize: 12,
        color: '#666',
    },
    eventTime: {
        fontSize: 12,
        color: '#666',
    },
    eventRegisterButton: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#FF6B00',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        justifyContent: 'center',
    },
    eventRegisterButtonText: {
        color: '#FF6B00',
        fontSize: 12,
        fontWeight: '600',
    },
    eventRegisteredButton: {
        backgroundColor: '#FFF0E6',
        borderWidth: 0,
    },
    eventRegisteredButtonText: {
        color: '#FF6B00',
    },
    pastEventsContainer: {
        marginBottom: 16,
    },
    pastEventsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    pastEventItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    pastEventImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
        overflow: 'hidden',
    },
    pastEventImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#DDD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pastEventInfo: {
        flex: 1,
    },
    pastEventTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    pastEventMeta: {
        fontSize: 12,
        color: '#666',
    },
    viewAllPastEventsButton: {
        backgroundColor: '#F0F0F0',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    viewAllPastEventsText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    },

    // Comment Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        height: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalCloseButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentsContainer: {
        flex: 1,
        padding: 16,
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    commentUserAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    commentUserInitials: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    commentContent: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 12,
    },
    commentUserName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    commentText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
        marginBottom: 8,
    },
    commentActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    commentTime: {
        fontSize: 12,
        color: '#999',
    },
    commentReplyButton: {
        fontSize: 12,
        color: '#FF6B00',
        fontWeight: '600',
    },
    addCommentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    currentUserAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    currentUserInitials: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    commentInput: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 12,
        maxHeight: 100,
    },
    postCommentButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default CommunityScreen;
