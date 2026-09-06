// translations.js - English and French translations
export const translations = {
  en: {
    // Common
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    done: 'Done',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',

    // Navigation
    home: 'Home',
    training: 'Training',
    progress: 'Progress',
    community: 'Community',
    profile: 'Profile',

    // Home Screen
    welcomeBack: 'Welcome Back',
    todaysTip: "Today's Tip",
    recentActivity: 'Recent Activity',
    featuredWorkouts: 'Featured Workouts',
    viewAll: 'View All',
    start: 'Start',

    // Training Screen
    allWorkouts: 'All Workouts',
    shooting: 'Shooting',
    dribbling: 'Dribbling',
    defense: 'Defense',
    fitness: 'Fitness',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    filterBy: 'Filter By',
    category: 'Category',
    difficulty: 'Difficulty',
    duration: 'Duration',

    // Progress Screen
    yourProgress: 'Your Progress',
    shootingAccuracy: 'Shooting Accuracy',
    totalWorkouts: 'Total Workouts',
    currentStreak: 'Current Streak',
    days: 'days',
    goals: 'Goals',
    achievements: 'Achievements',
    statistics: 'Statistics',

    // Community Screen
    communityFeed: 'Community Feed',
    challenges: 'Challenges',
    leaderboard: 'Leaderboard',
    shareProgress: 'Share Progress',
    joinChallenge: 'Join Challenge',

    // Profile Screen
    myProfile: 'My Profile',
    editProfile: 'Edit Profile',
    settings: 'Settings',
    subscription: 'Subscription',
    notifications: 'Notifications',
    darkMode: 'Dark Mode',
    language: 'Language',
    logout: 'Logout',

    // Subscription
    currentPlan: 'Current Plan',
    upgradePlan: 'Upgrade Plan',
    freePlan: 'Free',
    basicPlan: 'Basic',
    premiumPlan: 'Premium',
    proPlan: 'Pro',
    month: '/month',
    year: '/year',
    unlockPremium: 'Unlock Premium Features',
    subscriptionRequired: 'Subscription Required',
    subscriptionMessage: 'This feature requires a premium subscription. Upgrade to unlock all features!',
    upgradeNow: 'Upgrade Now',
    upgradeRequired: 'Upgrade Required',
    upgradeTo: 'Upgrade to',
    maybeLater: 'Maybe Later',

    // Features
    basicWorkouts: 'Access to 3 starter workouts',
    communityAccess: 'Community feed & leaderboards',
    progressTracking: 'Basic stats & workout history',
    unlimitedWorkouts: 'Full workout library (50+ drills)',
    noAds: 'Ad-free experience',
    basicAiAnalysis: 'AI shot form tips',
    advancedAiAnalysis: 'Detailed AI shot breakdown & comparisons',
    personalizedTraining: 'Custom AI-generated training plans',
    mentorSessions: 'Live 1-on-1 coach video sessions',
    exclusiveChallenges: 'Premium weekly challenges & rewards',
    prioritySupport: '24/7 priority support',

    // Module features. These six render on the Pro card and are the reason to
    // upgrade — they had no key in any locale, so i18n-js emitted its literal
    // `[missing "en.shotDNA" translation]` placeholder onto the paywall.
    shotDNA: 'ShotDNA — your shooting fingerprint over time',
    evalRank: 'EvalRank — your verified player grade',
    blueprint360: 'Blueprint360 — the plan built from your data',
    simCoach: 'SimCoach — decision reps against real scenarios',
    scoutLab: 'ScoutLab — get seen by verified scouts',
    exportData: 'Export your full training history',

    // Plan descriptions
    freePlanDesc: 'Get started with basketball training basics',
    basicPlanDesc: 'Unlock the full workout library and remove ads',
    premiumPlanDesc: 'Advanced AI analysis plus coaching support',
    proPlanDesc: 'Everything included with unlimited coaching access',

    // Auth
    login: 'Login',
    register: 'Register',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    forgotPassword: 'Forgot Password?',

    // Onboarding
    welcome: 'Welcome',
    getStarted: 'Get Started',
    next: 'Next',
    skip: 'Skip',

    // Alerts
    logoutConfirm: 'Are you sure you want to logout?',
    deleteConfirm: 'Are you sure you want to delete this?',
    subscriptionUpgrade: 'Upgrade your subscription to access this feature',
    profileUpdated: 'Your profile has been successfully updated',
  },

  fr: {
    // Common
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    edit: 'Modifier',
    done: 'Terminé',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',

    // Navigation
    home: 'Accueil',
    training: 'Entraînement',
    progress: 'Progrès',
    community: 'Communauté',
    profile: 'Profil',

    // Home Screen
    welcomeBack: 'Bon retour',
    todaysTip: "Conseil du jour",
    recentActivity: 'Activité récente',
    featuredWorkouts: 'Entraînements en vedette',
    viewAll: 'Voir tout',
    start: 'Commencer',

    // Training Screen
    allWorkouts: 'Tous les entraînements',
    shooting: 'Tir',
    dribbling: 'Dribble',
    defense: 'Défense',
    fitness: 'Forme physique',
    beginner: 'Débutant',
    intermediate: 'Intermédiaire',
    advanced: 'Avancé',
    filterBy: 'Filtrer par',
    category: 'Catégorie',
    difficulty: 'Difficulté',
    duration: 'Durée',

    // Progress Screen
    yourProgress: 'Vos progrès',
    shootingAccuracy: 'Précision de tir',
    totalWorkouts: 'Total des entraînements',
    currentStreak: 'Série actuelle',
    days: 'jours',
    goals: 'Objectifs',
    achievements: 'Réalisations',
    statistics: 'Statistiques',

    // Community Screen
    communityFeed: 'Fil communautaire',
    challenges: 'Défis',
    leaderboard: 'Classement',
    shareProgress: 'Partager les progrès',
    joinChallenge: 'Rejoindre le défi',

    // Profile Screen
    myProfile: 'Mon profil',
    editProfile: 'Modifier le profil',
    settings: 'Paramètres',
    subscription: 'Abonnement',
    notifications: 'Notifications',
    darkMode: 'Mode sombre',
    language: 'Langue',
    logout: 'Déconnexion',

    // Subscription
    currentPlan: 'Plan actuel',
    upgradePlan: 'Améliorer le plan',
    freePlan: 'Gratuit',
    basicPlan: 'Basique',
    premiumPlan: 'Premium',
    proPlan: 'Pro',
    month: '/mois',
    year: '/an',
    unlockPremium: 'Débloquer les fonctionnalités Premium',
    subscriptionRequired: 'Abonnement requis',
    subscriptionMessage: 'Cette fonctionnalité nécessite un abonnement premium. Mettez à niveau pour débloquer toutes les fonctionnalités!',
    upgradeNow: 'Mettre à niveau maintenant',
    upgradeRequired: 'Mise à niveau requise',
    upgradeTo: 'Passer à',
    maybeLater: 'Peut-être plus tard',

    // Features
    basicWorkouts: 'Accès à 3 entraînements de départ',
    communityAccess: 'Fil communautaire et classements',
    progressTracking: 'Statistiques de base et historique',
    unlimitedWorkouts: 'Bibliothèque complète (50+ exercices)',
    noAds: 'Expérience sans publicité',
    basicAiAnalysis: 'Conseils IA sur la forme de tir',
    advancedAiAnalysis: 'Analyse détaillée IA et comparaisons',
    personalizedTraining: 'Plans d\'entraînement personnalisés par IA',
    mentorSessions: 'Sessions vidéo 1-à-1 avec coach',
    exclusiveChallenges: 'Défis premium hebdomadaires et récompenses',
    prioritySupport: 'Support prioritaire 24/7',

    // Fonctionnalités des modules (voir la note dans le bloc `en`).
    shotDNA: 'ShotDNA — l\'empreinte de votre tir au fil du temps',
    evalRank: 'EvalRank — votre note de joueur vérifiée',
    blueprint360: 'Blueprint360 — le plan bâti sur vos données',
    simCoach: 'SimCoach — des répétitions de décision en situation réelle',
    scoutLab: 'ScoutLab — soyez repéré par des recruteurs vérifiés',
    exportData: 'Exportez tout votre historique d\'entraînement',

    // Plan descriptions
    freePlanDesc: 'Commencez avec les bases de l\'entraînement',
    basicPlanDesc: 'Débloquez toute la bibliothèque sans publicité',
    premiumPlanDesc: 'Analyse IA avancée plus support coaching',
    proPlanDesc: 'Tout inclus avec coaching illimité',

    // Auth
    login: 'Connexion',
    register: 'S\'inscrire',
    email: 'Email',
    password: 'Mot de passe',
    name: 'Nom',
    forgotPassword: 'Mot de passe oublié?',

    // Onboarding
    welcome: 'Bienvenue',
    getStarted: 'Commencer',
    next: 'Suivant',
    skip: 'Passer',

    // Alerts
    logoutConfirm: 'Êtes-vous sûr de vouloir vous déconnecter?',
    deleteConfirm: 'Êtes-vous sûr de vouloir supprimer ceci?',
    subscriptionUpgrade: 'Améliorez votre abonnement pour accéder à cette fonctionnalité',
    profileUpdated: 'Votre profil a été mis à jour avec succès',
  }
};

