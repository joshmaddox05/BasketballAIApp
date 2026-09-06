// src/navigation/SharedStackNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import shared screens
import AddGoalScreen from '../screens/shared/AddGoalScreen';
import ShootingAnalysisScreen from '../screens/shared/ShootingAnalysisScreen';
import WorkoutDetailScreen from '../screens/shared/WorkoutDetailScreen';
import SubscriptionScreen from '../screens/shared/SubscriptionScreen';
import ActiveWorkoutScreen from '../screens/main/ActiveWorkoutScreen';

// Import video screens
import VideoLibraryScreen from '../screens/main/VideoLibraryScreen';
import VideoDetailScreen from '../screens/main/VideoDetailScreen';
import YouTubeTestScreen from '../screens/main/YouTubeTestScreen';

// Import build workout screens
import BuildWorkoutScreen from '../screens/main/BuildWorkoutScreen';
import CustomPlanDetailScreen from '../screens/main/CustomPlanDetailScreen';
import CustomPlanDayScreen from '../screens/main/CustomPlanDayScreen';

// Import role management + messaging screens
import ScoutReportsScreen from '../screens/main/ScoutReportsScreen';
import MessagingScreen from '../screens/main/MessagingScreen';
import ProgressReportScreen from '../screens/main/ProgressReportScreen';
import SimCoachFilmLibraryScreen from '../screens/main/SimCoachFilmLibraryScreen';
import SimCoachFilmTaggingScreen from '../screens/main/SimCoachFilmTaggingScreen';
import SimCoachTeamModelScreen from '../screens/main/SimCoachTeamModelScreen';
import SimCoachGamePlanBuilderScreen from '../screens/main/SimCoachGamePlanBuilderScreen';
import SimCoachOpponentsScreen from '../screens/main/SimCoachOpponentsScreen';
import SimCoachOpponentModelScreen from '../screens/main/SimCoachOpponentModelScreen';
import SimCoachWhatIfScreen from '../screens/main/SimCoachWhatIfScreen';
import SimCoachCompareScreen from '../screens/main/SimCoachCompareScreen';
import SimCoachSessionsScreen from '../screens/main/SimCoachSessionsScreen';
import SimCoachSessionDetailScreen from '../screens/main/SimCoachSessionDetailScreen';
import SimCoachSessionRespondScreen from '../screens/main/SimCoachSessionRespondScreen';

// Import DBE module screens (shared across tabs)
import ShotDNAScreen from '../screens/main/ShotDNAScreen';
import ShotDNAArchetypeScreen from '../screens/main/ShotDNAArchetypeScreen';
import ShotDNAHistoryScreen from '../screens/main/ShotDNAHistoryScreen';
import ArchetypeSelectScreen from '../screens/main/ArchetypeSelectScreen';
import EvalRankScreen from '../screens/main/EvalRankScreen';
import EvalRankDetailScreen from '../screens/main/EvalRankDetailScreen';
import EvalRankBadgesScreen from '../screens/main/EvalRankBadgesScreen';
import Blueprint360Screen from '../screens/main/Blueprint360Screen';
import Blueprint360PlanDetailScreen from '../screens/main/Blueprint360PlanDetailScreen';
import SimCoachScreen from '../screens/main/SimCoachScreen';
import SimCoachScenarioScreen from '../screens/main/SimCoachScenarioScreen';
import SimCoachResultsScreen from '../screens/main/SimCoachResultsScreen';
import ScoutLabScreen from '../screens/main/ScoutLabScreen';
import ScoutLabProfileScreen from '../screens/main/ScoutLabProfileScreen';
import ScoutLabSearchScreen from '../screens/main/ScoutLabSearchScreen';
import ScoutProspectDetailScreen from '../screens/main/ScoutProspectDetailScreen';
import ParentScoutLabScreen from '../screens/main/ParentScoutLabScreen';
import EditAthleteProfileScreen from '../screens/main/EditAthleteProfileScreen';
import CoachMarketScreen from '../screens/main/CoachMarketScreen';
import CoachMarketListingScreen from '../screens/main/CoachMarketListingScreen';
import CoachMarketDashboardScreen from '../screens/main/CoachMarketDashboardScreen';
import CoachSessionsScreen from '../screens/main/CoachSessionsScreen';
import CoachInviteScreen from '../screens/main/CoachInviteScreen';
import AssignWorkoutScreen from '../screens/main/AssignWorkoutScreen';
import CoachAssignmentReviewScreen from '../screens/main/CoachAssignmentReviewScreen';
import PlayerAssignmentsScreen from '../screens/main/PlayerAssignmentsScreen';
import CoachSubmissionDetailScreen from '../screens/main/CoachSubmissionDetailScreen';
import ScoutReportDetailScreen from '../screens/main/ScoutReportDetailScreen';
import MyWorkoutsScreen from '../screens/main/MyWorkoutsScreen';
import CustomWorkoutCreatorScreen from '../screens/main/CustomWorkoutCreatorScreen';
import CreateDrillScreen from '../screens/main/CreateDrillScreen';
import EditDrillScreen from '../screens/main/EditDrillScreen';
import CoachPublicProfileScreen from '../screens/main/CoachPublicProfileScreen';
import HoopCommunityScreen from '../screens/main/HoopCommunityScreen';
import MentorshipScreen from '../screens/main/MentorshipScreen';
import LegacyVaultScreen from '../screens/main/LegacyVaultScreen';
import LegacyVaultArticleScreen from '../screens/main/LegacyVaultArticleScreen';
import Blueprint360MilestoneScreen from '../screens/main/Blueprint360MilestoneScreen';

// Import connection (role-linking) screens
import LinkAccountScreen from '../screens/main/LinkAccountScreen';
import ConnectionsScreen from '../screens/main/ConnectionsScreen';

// Import Training + Challenges screens (formerly tab-local; now shared so modules can reach them
// after the Training/Challenges tabs were folded into Blueprint360 / HoopCommunity).
import TrainingScreen from '../screens/main/TrainingScreen';
import TrainingCategoryScreen from '../screens/main/TrainingCategoryScreen';
import TrainingFiltersScreen from '../screens/main/TrainingFiltersScreen';
import BrowseWorkoutsScreen from '../screens/main/BrowseWorkoutsScreen';
import CategoryWorkoutsScreen from '../screens/main/CategoryWorkoutsScreen';
import AllWorkoutsScreen from '../screens/main/AllWorkoutsScreen';
import AllChallengesScreen from '../screens/main/AllChallengesScreen';
import ChallengeDetailScreen from '../screens/main/ChallengeDetailScreen';
import DailyChallengeDetailScreen from '../screens/main/DailyChallengeDetailScreen';

// Create a stack for shared screens
const SharedStack = createStackNavigator();

// This stack won't be used directly but its screen definitions will be referenced in other navigators
export const sharedScreens = [
    {
        name: 'Subscription',
        component: SubscriptionScreen,
        options: { headerShown: false }
    },
    {
        name: 'AddGoal',
        component: AddGoalScreen,
        options: { headerShown: false }
    },
    {
        name: 'ShootingAnalysis',
        component: ShootingAnalysisScreen,
        options: { headerShown: false }
    },
    {
        name: 'WorkoutDetail',
        component: WorkoutDetailScreen,
        options: { headerShown: false }
    },
    {
        name: 'ActiveWorkout',
        component: ActiveWorkoutScreen,
        options: { headerShown: false }
    },
    {
        name: 'VideoLibrary',
        component: VideoLibraryScreen,
        options: { headerShown: false }
    },
    {
        name: 'VideoDetail',
        component: VideoDetailScreen,
        options: { headerShown: false }
    },
    {
        name: 'YouTubeTest',
        component: YouTubeTestScreen,
        options: { headerShown: false }
    },
    {
        name: 'BuildWorkout',
        component: BuildWorkoutScreen,
        options: { headerShown: false }
    },
    {
        name: 'CustomPlanDetail',
        component: CustomPlanDetailScreen,
        options: { headerShown: false }
    },
    {
        name: 'CustomPlanDay',
        component: CustomPlanDayScreen,
        options: { headerShown: false }
    },
    // DBE Module screens
    { name: 'ShotDNA', component: ShotDNAScreen, options: { headerShown: false } },
    { name: 'ShotDNAArchetype', component: ShotDNAArchetypeScreen, options: { headerShown: false } },
    { name: 'ShotDNAHistory', component: ShotDNAHistoryScreen, options: { headerShown: false } },
    { name: 'ArchetypeSelect', component: ArchetypeSelectScreen, options: { headerShown: false } },
    { name: 'EvalRank', component: EvalRankScreen, options: { headerShown: false } },
    { name: 'EvalRankDetail', component: EvalRankDetailScreen, options: { headerShown: false } },
    { name: 'EvalRankBadges', component: EvalRankBadgesScreen, options: { headerShown: false } },
    { name: 'Blueprint360', component: Blueprint360Screen, options: { headerShown: false } },
    { name: 'Blueprint360PlanDetail', component: Blueprint360PlanDetailScreen, options: { headerShown: false } },
    { name: 'Blueprint360Milestones', component: Blueprint360MilestoneScreen, options: { headerShown: false } },
    { name: 'SimCoach', component: SimCoachScreen, options: { headerShown: false } },
    { name: 'SimCoachScenario', component: SimCoachScenarioScreen, options: { headerShown: false } },
    { name: 'SimCoachResults', component: SimCoachResultsScreen, options: { headerShown: false } },
    { name: 'ScoutLab', component: ScoutLabScreen, options: { headerShown: false } },
    { name: 'ScoutLabProfile', component: ScoutLabProfileScreen, options: { headerShown: false } },
    { name: 'ScoutProspectDetail', component: ScoutProspectDetailScreen, options: { headerShown: false } },
    { name: 'ParentScoutLab', component: ParentScoutLabScreen, options: { headerShown: false } },
    { name: 'EditAthleteProfile', component: EditAthleteProfileScreen, options: { headerShown: false } },
    { name: 'ScoutLabSearch', component: ScoutLabSearchScreen, options: { headerShown: false } },
    { name: 'CoachMarket', component: CoachMarketScreen, options: { headerShown: false } },
    { name: 'CoachMarketListing', component: CoachMarketListingScreen, options: { headerShown: false } },
    { name: 'CoachMarketDashboard', component: CoachMarketDashboardScreen, options: { headerShown: false } },
    { name: 'CoachSessions', component: CoachSessionsScreen, options: { headerShown: false } },
    { name: 'CoachInvite', component: CoachInviteScreen, options: { headerShown: false } },
    { name: 'AssignWorkout', component: AssignWorkoutScreen, options: { headerShown: false } },
    { name: 'CoachAssignmentReview', component: CoachAssignmentReviewScreen, options: { headerShown: false } },
    { name: 'PlayerAssignments', component: PlayerAssignmentsScreen, options: { headerShown: false } },
    { name: 'CoachSubmissionDetail', component: CoachSubmissionDetailScreen, options: { headerShown: false } },
    { name: 'ScoutReportDetail', component: ScoutReportDetailScreen, options: { headerShown: false } },
    { name: 'CreateDrill', component: CreateDrillScreen, options: { headerShown: false } },
    { name: 'EditDrill', component: EditDrillScreen, options: { headerShown: false } },
    { name: 'CoachPublicProfile', component: CoachPublicProfileScreen, options: { headerShown: false } },
    { name: 'HoopCommunity', component: HoopCommunityScreen, options: { headerShown: false } },
    { name: 'Mentorship', component: MentorshipScreen, options: { headerShown: false } },
    { name: 'LegacyVault', component: LegacyVaultScreen, options: { headerShown: false } },
    { name: 'LegacyVaultArticle', component: LegacyVaultArticleScreen, options: { headerShown: false } },
    // Role management + new SimCoach screens
    { name: 'ScoutReports', component: ScoutReportsScreen, options: { headerShown: false } },
    { name: 'Messaging', component: MessagingScreen, options: { headerShown: false } },
    { name: 'ProgressReport', component: ProgressReportScreen, options: { headerShown: false } },
    { name: 'SimCoachFilmLibrary', component: SimCoachFilmLibraryScreen, options: { headerShown: false } },
    { name: 'SimCoachFilmTagging', component: SimCoachFilmTaggingScreen, options: { headerShown: false } },
    { name: 'SimCoachTeamModel', component: SimCoachTeamModelScreen, options: { headerShown: false } },
    { name: 'SimCoachGamePlanBuilder', component: SimCoachGamePlanBuilderScreen, options: { headerShown: false } },
    { name: 'SimCoachOpponents', component: SimCoachOpponentsScreen, options: { headerShown: false } },
    { name: 'SimCoachOpponentModel', component: SimCoachOpponentModelScreen, options: { headerShown: false } },
    { name: 'SimCoachWhatIf', component: SimCoachWhatIfScreen, options: { headerShown: false } },
    { name: 'SimCoachCompare', component: SimCoachCompareScreen, options: { headerShown: false } },
    { name: 'SimCoachSessions', component: SimCoachSessionsScreen, options: { headerShown: false } },
    { name: 'SimCoachSessionDetail', component: SimCoachSessionDetailScreen, options: { headerShown: false } },
    { name: 'SimCoachSessionRespond', component: SimCoachSessionRespondScreen, options: { headerShown: false } },
    // Connections (role linking)
    { name: 'LinkAccount', component: LinkAccountScreen, options: { headerShown: false } },
    { name: 'Connections', component: ConnectionsScreen, options: { headerShown: false } },
    // Custom workout authoring. Both screens existed but were registered nowhere,
    // so TrainingScreen's "My Workouts" button and every CustomWorkoutCreator
    // entry point threw at runtime. Training is a primary tab again, which puts
    // that crash one tap from the tab bar.
    { name: 'MyWorkouts', component: MyWorkoutsScreen, options: { headerShown: false } },
    { name: 'CustomWorkoutCreator', component: CustomWorkoutCreatorScreen, options: { headerShown: false } },
    // Training experience (folded into Blueprint360) — reachable app-wide
    { name: 'Training', component: TrainingScreen, options: { headerShown: false } },
    { name: 'TrainingCategory', component: TrainingCategoryScreen, options: { headerShown: false } },
    { name: 'TrainingFilters', component: TrainingFiltersScreen, options: { headerShown: false } },
    { name: 'BrowseWorkouts', component: BrowseWorkoutsScreen, options: { headerShown: false } },
    { name: 'CategoryWorkouts', component: CategoryWorkoutsScreen, options: { headerShown: false } },
    { name: 'AllWorkouts', component: AllWorkoutsScreen, options: { headerShown: false } },
    // Challenges experience (folded into HoopCommunity) — reachable app-wide
    { name: 'Challenges', component: AllChallengesScreen, options: { headerShown: false } },
    { name: 'ChallengeDetail', component: ChallengeDetailScreen, options: { headerShown: false } },
    { name: 'DailyChallengeDetail', component: DailyChallengeDetailScreen, options: { headerShown: false } },
];

// A utility function to add shared screens to any stack navigator
export const addSharedScreensToStack = (Stack) => {
    return sharedScreens.map((screen) => (
        <Stack.Screen
            key={screen.name}
            name={screen.name}
            component={screen.component}
            options={screen.options}
        />
    ));
};

// This navigator isn't used directly, but we'll export it in case it's needed
const SharedStackNavigator = () => {
    return (
        <SharedStack.Navigator screenOptions={{ headerShown: false }}>
            {addSharedScreensToStack(SharedStack)}
        </SharedStack.Navigator>
    );
};

export default SharedStackNavigator;