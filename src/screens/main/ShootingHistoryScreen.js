// ShootingHistoryScreen.js - View shooting statistics and history
import React, { useState, useEffect, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    RefreshControl,
    ActivityIndicator,
    Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { getUserShootingStats, getWorkoutHistory } from '../../services/firestoreService';
import { LineChart } from 'react-native-chart-kit';
import { getTheme } from '../../utils/theme';

const { width } = Dimensions.get('window');

const TIME_RANGES = [
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
    { id: 'all', label: 'All Time' },
];

const ShootingHistoryScreen = ({ navigation }) => {
    const { userData, isDarkMode, theme: contextTheme } = useAppContext();
    const theme = contextTheme || getTheme(isDarkMode || false);

    const [selectedRange, setSelectedRange] = useState('month');
    const [shootingStats, setShootingStats] = useState(null);
    const [recentSessions, setRecentSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch shooting data
    const fetchData = async () => {
        if (!userData?.uid) return;

        try {
            const [stats, history] = await Promise.all([
                getUserShootingStats(userData.uid, selectedRange),
                getWorkoutHistory(userData.uid, { limitCount: 50, category: 'Shooting' })
            ]);

            setShootingStats(stats);
            // Filter to only shooting workouts with stats
            const shootingSessions = history.filter(w =>
                w.shootingStats || w.category === 'Shooting'
            );
            setRecentSessions(shootingSessions.slice(0, 20));
        } catch (error) {
            console.error('Error fetching shooting data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [userData?.uid, selectedRange]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // Calculate accuracy percentage
    const accuracy = useMemo(() => {
        if (!shootingStats || shootingStats.totalShots === 0) return 0;
        return Math.round((shootingStats.makes / shootingStats.totalShots) * 100);
    }, [shootingStats]);

    // Generate chart data from recent sessions
    const chartData = useMemo(() => {
        if (recentSessions.length === 0) {
            return {
                labels: ['No Data'],
                datasets: [{ data: [0] }]
            };
        }

        // Get last 7 sessions with shooting data
        const sessionsWithData = recentSessions
            .filter(s => s.shootingStats && s.shootingStats.totalShots > 0)
            .slice(0, 7)
            .reverse();

        if (sessionsWithData.length === 0) {
            return {
                labels: ['No Data'],
                datasets: [{ data: [0] }]
            };
        }

        const labels = sessionsWithData.map((s, i) => {
            if (s.createdAt?.toDate) {
                const date = s.createdAt.toDate();
                return `${date.getMonth() + 1}/${date.getDate()}`;
            }
            return `S${i + 1}`;
        });

        const data = sessionsWithData.map(s => {
            const stats = s.shootingStats;
            const makes = stats.totalMakes || stats.makes || 0;
            const total = stats.totalShots || 1;
            return Math.round((makes / total) * 100);
        });

        return {
            labels,
            datasets: [{ data }]
        };
    }, [recentSessions]);

    // Format date
    const formatDate = (timestamp) => {
        if (!timestamp) return 'Unknown';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <StatusBar style={isDarkMode ? 'light' : 'dark'} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                        Loading shooting stats...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Shooting History</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.primary}
                    />
                }
            >
                {/* Time Range Selector */}
                <View style={styles.rangeSelector}>
                    {TIME_RANGES.map(range => (
                        <TouchableOpacity
                            key={range.id}
                            style={[
                                styles.rangeButton,
                                {
                                    backgroundColor: selectedRange === range.id
                                        ? theme.primary
                                        : theme.card,
                                    borderColor: selectedRange === range.id
                                        ? theme.primary
                                        : theme.border
                                }
                            ]}
                            onPress={() => setSelectedRange(range.id)}
                        >
                            <Text style={[
                                styles.rangeText,
                                { color: selectedRange === range.id ? '#FFF' : theme.text }
                            ]}>
                                {range.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Main Stats Card */}
                <View style={[styles.statsCard, { backgroundColor: theme.card }]}>
                    <View style={styles.mainStatRow}>
                        <View style={styles.mainStat}>
                            <Text style={[styles.mainStatValue, { color: theme.primary }]}>
                                {accuracy}%
                            </Text>
                            <Text style={[styles.mainStatLabel, { color: theme.textSecondary }]}>
                                Accuracy
                            </Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                        <View style={styles.mainStat}>
                            <Text style={[styles.mainStatValue, { color: theme.text }]}>
                                {shootingStats?.totalShots || 0}
                            </Text>
                            <Text style={[styles.mainStatLabel, { color: theme.textSecondary }]}>
                                Total Shots
                            </Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                        <View style={styles.mainStat}>
                            <Text style={[styles.mainStatValue, { color: '#4CAF50' }]}>
                                {shootingStats?.makes || 0}
                            </Text>
                            <Text style={[styles.mainStatLabel, { color: theme.textSecondary }]}>
                                Makes
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Trend Chart */}
                {chartData.datasets[0].data.length > 1 && (
                    <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
                        <Text style={[styles.chartTitle, { color: theme.text }]}>
                            Accuracy Trend
                        </Text>
                        <LineChart
                            data={chartData}
                            width={width - 64}
                            height={180}
                            yAxisSuffix="%"
                            chartConfig={{
                                backgroundColor: theme.card,
                                backgroundGradientFrom: theme.card,
                                backgroundGradientTo: theme.card,
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(255, 107, 0, ${opacity})`,
                                labelColor: () => theme.textSecondary,
                                style: { borderRadius: 16 },
                                propsForDots: {
                                    r: '5',
                                    strokeWidth: '2',
                                    stroke: theme.primary
                                }
                            }}
                            bezier
                            style={styles.chart}
                        />
                    </View>
                )}

                {/* Breakdown by Shot Type */}
                {shootingStats?.byType && Object.keys(shootingStats.byType).length > 0 && (
                    <View style={[styles.breakdownCard, { backgroundColor: theme.card }]}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>
                            By Shot Type
                        </Text>
                        {Object.entries(shootingStats.byType).map(([type, stats]) => {
                            const typeAccuracy = stats.total > 0
                                ? Math.round((stats.makes / stats.total) * 100)
                                : 0;
                            return (
                                <View key={type} style={styles.breakdownRow}>
                                    <View style={styles.breakdownInfo}>
                                        <Text style={[styles.breakdownType, { color: theme.text }]}>
                                            {type}
                                        </Text>
                                        <Text style={[styles.breakdownStats, { color: theme.textSecondary }]}>
                                            {stats.makes}/{stats.total} shots
                                        </Text>
                                    </View>
                                    <View style={styles.breakdownAccuracy}>
                                        <Text style={[styles.breakdownPercent, { color: theme.primary }]}>
                                            {typeAccuracy}%
                                        </Text>
                                        <View style={[styles.miniProgressBar, { backgroundColor: theme.backgroundSecondary }]}>
                                            <View
                                                style={[
                                                    styles.miniProgressFill,
                                                    { width: `${typeAccuracy}%`, backgroundColor: theme.primary }
                                                ]}
                                            />
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Recent Sessions */}
                <View style={styles.sessionsSection}>
                    <Text style={[styles.sectionTitle, { color: theme.text, marginHorizontal: 16 }]}>
                        Recent Sessions
                    </Text>
                    {recentSessions.length === 0 ? (
                        <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
                            <Ionicons name="basketball-outline" size={48} color={theme.textSecondary} />
                            <Text style={[styles.emptyTitle, { color: theme.text }]}>
                                No Shooting Sessions Yet
                            </Text>
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                Complete shooting workouts to see your history here.
                            </Text>
                        </View>
                    ) : (
                        recentSessions.slice(0, 10).map((session, index) => {
                            const stats = session.shootingStats;
                            const sessionAccuracy = stats && stats.totalShots > 0
                                ? Math.round(((stats.totalMakes || stats.makes || 0) / stats.totalShots) * 100)
                                : null;

                            return (
                                <View
                                    key={session.id || index}
                                    style={[styles.sessionCard, { backgroundColor: theme.card }]}
                                >
                                    <View style={styles.sessionHeader}>
                                        <View style={[styles.sessionIcon, { backgroundColor: theme.primary + '20' }]}>
                                            <Ionicons name="basketball" size={20} color={theme.primary} />
                                        </View>
                                        <View style={styles.sessionInfo}>
                                            <Text style={[styles.sessionTitle, { color: theme.text }]} numberOfLines={1}>
                                                {session.title || session.name || 'Shooting Practice'}
                                            </Text>
                                            <Text style={[styles.sessionDate, { color: theme.textSecondary }]}>
                                                {formatDate(session.createdAt)}
                                            </Text>
                                        </View>
                                        {sessionAccuracy !== null && (
                                            <View style={styles.sessionAccuracy}>
                                                <Text style={[styles.sessionAccuracyValue, { color: theme.primary }]}>
                                                    {sessionAccuracy}%
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    {stats && (
                                        <View style={styles.sessionStats}>
                                            <View style={styles.sessionStat}>
                                                <Text style={[styles.sessionStatValue, { color: theme.text }]}>
                                                    {stats.totalShots || 0}
                                                </Text>
                                                <Text style={[styles.sessionStatLabel, { color: theme.textSecondary }]}>
                                                    Shots
                                                </Text>
                                            </View>
                                            <View style={styles.sessionStat}>
                                                <Text style={[styles.sessionStatValue, { color: '#4CAF50' }]}>
                                                    {stats.totalMakes || stats.makes || 0}
                                                </Text>
                                                <Text style={[styles.sessionStatLabel, { color: theme.textSecondary }]}>
                                                    Makes
                                                </Text>
                                            </View>
                                            <View style={styles.sessionStat}>
                                                <Text style={[styles.sessionStatValue, { color: '#F44336' }]}>
                                                    {stats.totalMisses || stats.misses || 0}
                                                </Text>
                                                <Text style={[styles.sessionStatLabel, { color: theme.textSecondary }]}>
                                                    Misses
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    )}
                </View>

                {/* Bottom Padding */}
                <View style={styles.bottomPadding} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
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
        fontSize: 18,
        fontWeight: '600',
    },
    placeholder: {
        width: 32,
    },
    rangeSelector: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 8,
    },
    rangeButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
    },
    rangeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    statsCard: {
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    mainStatRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mainStat: {
        flex: 1,
        alignItems: 'center',
    },
    mainStatValue: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    mainStatLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: 40,
    },
    chartCard: {
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    chart: {
        borderRadius: 16,
        marginLeft: -8,
    },
    breakdownCard: {
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    breakdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E0E0E0',
    },
    breakdownInfo: {
        flex: 1,
    },
    breakdownType: {
        fontSize: 15,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    breakdownStats: {
        fontSize: 12,
        marginTop: 2,
    },
    breakdownAccuracy: {
        alignItems: 'flex-end',
    },
    breakdownPercent: {
        fontSize: 16,
        fontWeight: '600',
    },
    miniProgressBar: {
        width: 60,
        height: 4,
        borderRadius: 2,
        marginTop: 4,
        overflow: 'hidden',
    },
    miniProgressFill: {
        height: '100%',
        borderRadius: 2,
    },
    sessionsSection: {
        marginTop: 8,
    },
    sessionCard: {
        marginHorizontal: 16,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    sessionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sessionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    sessionInfo: {
        flex: 1,
    },
    sessionTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    sessionDate: {
        fontSize: 12,
        marginTop: 2,
    },
    sessionAccuracy: {
        marginLeft: 8,
    },
    sessionAccuracyValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    sessionStats: {
        flexDirection: 'row',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#E0E0E0',
    },
    sessionStat: {
        flex: 1,
        alignItems: 'center',
    },
    sessionStatValue: {
        fontSize: 18,
        fontWeight: '600',
    },
    sessionStatLabel: {
        fontSize: 11,
        marginTop: 2,
    },
    emptyState: {
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    bottomPadding: {
        height: 32,
    },
});

export default ShootingHistoryScreen;
