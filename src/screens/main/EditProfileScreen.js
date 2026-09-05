// EditProfileScreen.js - Edit user profile information
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    TextInput,
    SafeAreaView,
    Alert,
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAppContext } from '../../context/AppContext';
import { updateUserProfile, getUserProfile } from '../../services/firestoreService';
import { getTheme } from '../../utils/theme';
import { uploadProfileImage } from '../../utils/profileImage';
import { composeHeight, splitHeight } from '../../services/blueprint/archetypeAssignment';
import { GRADE_LEVELS, POSITIONS, FEET_OPTIONS, INCH_OPTIONS } from '../../utils/constants';

const EditProfileScreen = ({ navigation }) => {
    const { userData, user, isDarkMode, theme: contextTheme, updateUserDataLocally } = useAppContext();
    const theme = contextTheme || getTheme(isDarkMode || false);

    const [displayName, setDisplayName] = useState(userData?.displayName || userData?.name || '');
    const [profileImage, setProfileImage] = useState(userData?.photoURL || null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Training preferences
    const [trainingDays, setTrainingDays] = useState(userData?.preferences?.trainingDays || []);
    const [preferredDuration, setPreferredDuration] = useState(userData?.preferences?.preferredDuration || 30);
    const [gradeLevel, setGradeLevel] = useState(userData?.gradeLevel ?? null);
    // Position and height were previously parent-write-only (EditAthleteProfileScreen),
    // so a solo player could never supply the archetype engine's strongest signal.
    const [position, setPosition] = useState(userData?.position || null);
    const [heightFeet, setHeightFeet] = useState(() => splitHeight(userData?.height).feet);
    const [heightInches, setHeightInches] = useState(() => splitHeight(userData?.height).inches);
    const [coachType, setCoachType] = useState(userData?.coachType || 'org');
    const [bio, setBio] = useState(userData?.bio || '');

    const isPlayer = !userData?.role || userData?.role === 'player';
    const isCoach = userData?.role === 'coach';
    const COACH_TYPES = [
        { value: 'org', label: 'Organization Coach' },
        { value: 'trainer', label: 'Skills Trainer' },
    ];
    const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const DURATION_OPTIONS = [15, 30, 45, 60, 90];

    useEffect(() => {
        // Check if any changes have been made
        const nameChanged = displayName !== (userData?.displayName || userData?.name || '');
        // Check if image changed - handle both object and string types
        const currentImageUri = typeof profileImage === 'object' ? profileImage?.uri : profileImage;
        const imageChanged = currentImageUri !== (userData?.photoURL || null);
        const daysChanged = JSON.stringify(trainingDays) !== JSON.stringify(userData?.preferences?.trainingDays || []);
        const durationChanged = preferredDuration !== (userData?.preferences?.preferredDuration || 30);
        const gradeChanged = gradeLevel !== (userData?.gradeLevel ?? null);
        const positionChanged = position !== (userData?.position || null);
        const heightChanged = composeHeight(heightFeet, heightInches) !== (userData?.height || null);
        const coachTypeChanged = coachType !== (userData?.coachType || 'org');
        const bioChanged = bio !== (userData?.bio || '');

        // positionChanged and heightChanged were computed and then left out of this
        // disjunction, so Save stayed disabled for anyone whose only edit was their
        // position or height — the two fields the archetype engine weighs most, and
        // the two this screen exists to collect.
        setHasChanges(
            nameChanged || imageChanged || daysChanged || durationChanged || gradeChanged
            || positionChanged || heightChanged || coachTypeChanged || bioChanged
        );
    }, [displayName, profileImage, trainingDays, preferredDuration, gradeLevel, position, heightFeet, heightInches, coachType, bio, userData]);

    const pickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permissionResult.granted) {
                Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile picture.');
                return;
            }

            // Use the new MediaType API instead of deprecated MediaTypeOptions
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                // Store the URI for display and upload
                setProfileImage({
                    uri: result.assets[0].uri,
                });
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

    const toggleTrainingDay = (day) => {
        if (trainingDays.includes(day)) {
            setTrainingDays(trainingDays.filter(d => d !== day));
        } else {
            setTrainingDays([...trainingDays, day]);
        }
    };


    const handleSave = async () => {
        if (!displayName.trim()) {
            Alert.alert('Error', 'Please enter a display name.');
            return;
        }

        setIsLoading(true);

        try {
            let photoURL = userData?.photoURL || null;

            // Upload new profile image if changed
            if (profileImage) {
                // Check if it's a new image from image picker (has uri property)
                if (typeof profileImage === 'object' && profileImage.uri) {
                    try {
                        photoURL = await uploadProfileImage(user.uid, profileImage.uri);
                    } catch (uploadError) {
                        console.error('Error uploading image:', uploadError);
                        Alert.alert('Warning', 'Failed to upload profile picture, but other changes will be saved.');
                    }
                } else if (typeof profileImage === 'string' && profileImage.startsWith('http')) {
                    // It's an existing URL, keep it
                    photoURL = profileImage;
                }
            }

            // Prepare the update object
            const profileUpdate = {
                displayName: displayName.trim(),
                name: displayName.trim(),
                photoURL,
                preferences: {
                    ...userData?.preferences,
                    trainingDays,
                    preferredDuration,
                }
            };

            // Grade level is a player attribute that drives scout discoverability
            if (isPlayer && gradeLevel != null) {
                profileUpdate.gradeLevel = gradeLevel;
            }

            // Archetype inputs. Height is written in the same `6'2"` free-text format
            // EditAthleteProfileScreen uses, so a parent edit and a player edit agree
            // and archetypeAssignment.parseHeightToInches only has one format to read.
            if (isPlayer) {
                if (position) profileUpdate.position = position;
                const composed = composeHeight(heightFeet, heightInches);
                if (composed) profileUpdate.height = composed;
            }

            // Coach sub-type (organization vs skills trainer) + public bio
            if (isCoach) {
                profileUpdate.coachType = coachType;
                profileUpdate.bio = bio.trim();
            }

            // Update profile in Firestore
            await updateUserProfile(user.uid, profileUpdate);

            // Immediately update local state so changes reflect across the app
            updateUserDataLocally(profileUpdate);

            Alert.alert('Success', 'Profile updated successfully!', [
                {
                    text: 'OK',
                    onPress: () => navigation.goBack()
                }
            ]);
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Profile</Text>
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={!hasChanges || isLoading}
                    style={styles.saveButton}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                        <Text style={[
                            styles.saveText,
                            { color: hasChanges ? theme.primary : theme.textSecondary }
                        ]}>
                            Save
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Profile Image Section */}
                    <View style={styles.imageSection}>
                        <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
                            {profileImage ? (
                                <Image
                                    source={{ uri: typeof profileImage === 'object' ? profileImage.uri : profileImage }}
                                    style={styles.profileImage}
                                />
                            ) : (
                                <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.primary }]}>
                                    <Text style={styles.profileInitials}>
                                        {getInitials(displayName)}
                                    </Text>
                                </View>
                            )}
                            <View style={[styles.editImageBadge, { backgroundColor: theme.primary }]}>
                                <Ionicons name="camera" size={16} color="#FFF" />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={pickImage}>
                            <Text style={[styles.changePhotoText, { color: theme.primary }]}>
                                Change Photo
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Display Name Section */}
                    <View style={[styles.section, { backgroundColor: theme.card }]}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Display Name</Text>
                        <TextInput
                            style={[styles.textInput, {
                                backgroundColor: theme.backgroundSecondary,
                                color: theme.text,
                                borderColor: theme.border
                            }]}
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder="Enter your name"
                            placeholderTextColor={theme.textSecondary}
                            autoCapitalize="words"
                            maxLength={50}
                        />
                    </View>

                    {/* Position & Height (player only — the archetype engine's strongest
                        signals, and previously only a linked parent could set them) */}
                    {isPlayer && (
                        <View style={[styles.section, { backgroundColor: theme.card }]}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Position & Size</Text>
                            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                                These sharpen your archetype, which sets your shot menu and drill volume
                            </Text>

                            <View style={styles.durationContainer}>
                                {POSITIONS.map((p) => (
                                    <TouchableOpacity
                                        key={p.value}
                                        style={[
                                            styles.durationButton,
                                            {
                                                backgroundColor: position === p.value
                                                    ? theme.primary
                                                    : theme.backgroundSecondary,
                                                borderColor: position === p.value
                                                    ? theme.primary
                                                    : theme.border
                                            }
                                        ]}
                                        onPress={() => setPosition(position === p.value ? null : p.value)}
                                    >
                                        <Text style={[
                                            styles.durationText,
                                            { color: position === p.value ? '#FFF' : theme.text }
                                        ]}>
                                            {p.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginTop: 14 }]}>
                                Height
                            </Text>
                            <View style={styles.durationContainer}>
                                {FEET_OPTIONS.map((f) => (
                                    <TouchableOpacity
                                        key={`ft-${f}`}
                                        style={[
                                            styles.durationButton,
                                            {
                                                backgroundColor: heightFeet === f
                                                    ? theme.primary
                                                    : theme.backgroundSecondary,
                                                borderColor: heightFeet === f ? theme.primary : theme.border
                                            }
                                        ]}
                                        onPress={() => setHeightFeet(heightFeet === f ? null : f)}
                                    >
                                        <Text style={[
                                            styles.durationText,
                                            { color: heightFeet === f ? '#FFF' : theme.text }
                                        ]}>
                                            {f}'
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {heightFeet != null && (
                                <View style={styles.durationContainer}>
                                    {INCH_OPTIONS.map((i) => (
                                        <TouchableOpacity
                                            key={`in-${i}`}
                                            style={[
                                                styles.durationButton,
                                                {
                                                    backgroundColor: heightInches === i
                                                        ? theme.primary
                                                        : theme.backgroundSecondary,
                                                    borderColor: heightInches === i ? theme.primary : theme.border
                                                }
                                            ]}
                                            onPress={() => setHeightInches(i)}
                                        >
                                            <Text style={[
                                                styles.durationText,
                                                { color: heightInches === i ? '#FFF' : theme.text }
                                            ]}>
                                                {i}"
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Grade Level Section (player only — drives recruiting eligibility) */}
                    {isPlayer && (
                        <View style={[styles.section, { backgroundColor: theme.card }]}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Grade Level</Text>
                            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                                Recruiting eligibility is high-school only (grades 9–12)
                            </Text>
                            <View style={styles.durationContainer}>
                                {GRADE_LEVELS.map((grade) => (
                                    <TouchableOpacity
                                        key={grade.value}
                                        style={[
                                            styles.durationButton,
                                            {
                                                backgroundColor: gradeLevel === grade.value
                                                    ? theme.primary
                                                    : theme.backgroundSecondary,
                                                borderColor: gradeLevel === grade.value
                                                    ? theme.primary
                                                    : theme.border
                                            }
                                        ]}
                                        onPress={() => setGradeLevel(grade.value)}
                                    >
                                        <Text style={[
                                            styles.durationText,
                                            { color: gradeLevel === grade.value ? '#FFF' : theme.text }
                                        ]}>
                                            {grade.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Coach Sub-type Section (coach only) */}
                    {isCoach && (
                        <View style={[styles.section, { backgroundColor: theme.card }]}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Coach Type</Text>
                            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                                Organization coaches run teams; skills trainers develop individuals
                            </Text>
                            <View style={styles.durationContainer}>
                                {COACH_TYPES.map((ct) => (
                                    <TouchableOpacity
                                        key={ct.value}
                                        style={[
                                            styles.durationButton,
                                            {
                                                backgroundColor: coachType === ct.value ? theme.primary : theme.backgroundSecondary,
                                                borderColor: coachType === ct.value ? theme.primary : theme.border,
                                            },
                                        ]}
                                        onPress={() => setCoachType(ct.value)}
                                    >
                                        <Text style={[
                                            styles.durationText,
                                            { color: coachType === ct.value ? '#FFF' : theme.text },
                                        ]}>
                                            {ct.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 16 }]}>Public Bio</Text>
                            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                                Shown on your public coach profile in CoachMarket
                            </Text>
                            <TextInput
                                style={[styles.textInput, {
                                    backgroundColor: theme.backgroundSecondary,
                                    color: theme.text,
                                    borderColor: theme.border,
                                    minHeight: 80,
                                    textAlignVertical: 'top',
                                }]}
                                value={bio}
                                onChangeText={setBio}
                                placeholder="Tell athletes about your coaching background…"
                                placeholderTextColor={theme.textSecondary}
                                multiline
                                maxLength={300}
                            />
                        </View>
                    )}

                    {/* Training Preferences Section */}
                    <View style={[styles.section, { backgroundColor: theme.card }]}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Training Days</Text>
                        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                            Which days do you prefer to train?
                        </Text>
                        <View style={styles.daysContainer}>
                            {DAYS_OF_WEEK.map((day) => (
                                <TouchableOpacity
                                    key={day}
                                    style={[
                                        styles.dayButton,
                                        {
                                            backgroundColor: trainingDays.includes(day)
                                                ? theme.primary
                                                : theme.backgroundSecondary,
                                            borderColor: trainingDays.includes(day)
                                                ? theme.primary
                                                : theme.border
                                        }
                                    ]}
                                    onPress={() => toggleTrainingDay(day)}
                                >
                                    <Text style={[
                                        styles.dayText,
                                        { color: trainingDays.includes(day) ? '#FFF' : theme.text }
                                    ]}>
                                        {day}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Preferred Duration Section */}
                    <View style={[styles.section, { backgroundColor: theme.card }]}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferred Workout Duration</Text>
                        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                            How long do you typically want to train?
                        </Text>
                        <View style={styles.durationContainer}>
                            {DURATION_OPTIONS.map((duration) => (
                                <TouchableOpacity
                                    key={duration}
                                    style={[
                                        styles.durationButton,
                                        {
                                            backgroundColor: preferredDuration === duration
                                                ? theme.primary
                                                : theme.backgroundSecondary,
                                            borderColor: preferredDuration === duration
                                                ? theme.primary
                                                : theme.border
                                        }
                                    ]}
                                    onPress={() => setPreferredDuration(duration)}
                                >
                                    <Text style={[
                                        styles.durationText,
                                        { color: preferredDuration === duration ? '#FFF' : theme.text }
                                    ]}>
                                        {duration} min
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Account Info Section */}
                    <View style={[styles.section, { backgroundColor: theme.card }]}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Account Info</Text>
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Email</Text>
                            <Text style={[styles.infoValue, { color: theme.text }]}>
                                {user?.email || 'Not set'}
                            </Text>
                        </View>
                        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Member Since</Text>
                            <Text style={[styles.infoValue, { color: theme.text }]}>
                                {userData?.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.bottomSpace} />
                </ScrollView>
            </KeyboardAvoidingView>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '600',
    },
    saveButton: {
        padding: 4,
        minWidth: 50,
        alignItems: 'flex-end',
    },
    saveText: {
        fontSize: 17.5,
        fontWeight: '600',
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    imageSection: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    imageContainer: {
        position: 'relative',
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    profileImagePlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileInitials: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFF',
    },
    editImageBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    changePhotoText: {
        marginTop: 12,
        fontSize: 17.5,
        fontWeight: '500',
    },
    section: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 17.5,
        fontWeight: '600',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 16,
        marginBottom: 12,
    },
    textInput: {
        fontSize: 17.5,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginTop: 8,
    },
    daysContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dayButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    dayText: {
        fontSize: 14,
        fontWeight: '600',
    },
    durationContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    durationButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    durationText: {
        fontSize: 16,
        fontWeight: '500',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    infoLabel: {
        fontSize: 16,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '500',
    },
    bottomSpace: {
        height: 40,
    },
});

export default EditProfileScreen;
