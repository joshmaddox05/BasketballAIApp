// workouts.js - Comprehensive workout library
export const workoutCategories = {
  SHOOTING: 'shooting',
  DRIBBLING: 'dribbling',
  PHYSICAL: 'physical',
  STRATEGY: 'strategy',
  MENTAL: 'mental',
  NUTRITION: 'nutrition'
};

export const difficultyLevels = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced'
};

export const comprehensiveWorkouts = [
  // ==================== SHOOTING WORKOUTS (8) ====================
  {
    id: 'shooting-1',
    title: 'Perfect Form Shooting',
    description: 'Master the fundamentals of proper shooting form with this comprehensive drill that focuses on stance, grip, and follow-through.',
    category: workoutCategories.SHOOTING,
    level: difficultyLevels.BEGINNER,
    duration: '30 min',
    featured: true,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Warm-up Stance',
        instructions: 'Stand 5 feet from the basket with feet shoulder-width apart, dominant foot slightly forward. Hold the ball with shooting hand under the ball and guide hand on the side.',
        tips: 'Keep your knees slightly bent and maintain good balance. Your shooting hand should form a "C" shape under the ball.',
        duration: '5 min',
        type: 'instruction'
      },
      {
        title: 'Form Shooting Close Range',
        instructions: 'Take 20 shots from 3 feet away, focusing only on perfect form. Hold your follow-through until the ball hits the rim or goes in.',
        tips: 'Keep your elbow in, eyes on the target, and follow through with your wrist. The ball should roll off your fingertips.',
        duration: '10 min',
        type: 'repetition',
        rreps: 20
      },
      {
        title: 'Mid-Range Form',
        instructions: 'Move to 8 feet from the basket. Take 25 shots maintaining the same form you practiced up close.',
        tips: 'Use your legs for power. The ball should have a high arc and soft touch.',
        duration: '10 min',
        type: 'repetition',
        reps: 25
      },
      {
        title: 'Cool Down',
        instructions: 'Finish with 10 free throws, focusing on consistency and routine.',
        tips: 'Develop a pre-shot routine that you can repeat every time.',
        duration: '5 min',
        type: 'repetition',
        reps: 10
      }
    ],
    equipment: ['Basketball', 'Hoop', 'Water bottle'],
    coachNotes: 'This workout is perfect for beginners looking to build a solid foundation for their shooting technique. Consistency is key - it\'s better to take fewer shots with perfect form than many shots with poor form.',
    benefits: ['Improved shooting form', 'Better muscle memory', 'Increased accuracy', 'Consistent release'],
    videoUrl: 'https://www.youtube.com/watch?v=example1'
  },
  {
    id: 'shooting-2',
    title: 'Free Throw Mastery',
    description: 'Develop consistency and confidence at the free throw line with this systematic approach to perfecting your free throw technique.',
    category: workoutCategories.SHOOTING,
    level: difficultyLevels.BEGINNER,
    duration: '25 min',
    featured: true,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Routine Development',
        instructions: 'Practice your pre-shot routine 10 times without shooting. Focus on consistent positioning and breathing.',
        tips: 'Your routine should be the same every time: same number of dribbles, same breathing pattern, same focus point.',
        duration: '5 min',
        type: 'instruction'
      },
      {
        title: 'Form Practice',
        instructions: 'Take 30 free throws focusing on perfect form. Track your makes and misses.',
        tips: 'Keep your shooting elbow in line with the basket. Follow through with your wrist pointing down.',
        duration: '15 min',
        type: 'repetition',
        reps: 30,
        videoReference: require('../../assets/FormShootingDemoFiveFeet.mp4')
      },
      {
        title: 'Pressure Practice',
        instructions: 'Simulate game pressure by making 10 consecutive free throws. If you miss, start over.',
        tips: 'Take your time and trust your routine. Don\'t rush under pressure.',
        duration: '5 min',
        type: 'challenge',
        target: 10
      }
    ],
    equipment: ['Basketball', 'Hoop', 'Water bottle'],
    coachNotes: 'Free throws are mental as much as physical. Develop a routine and stick to it. Practice under pressure to build confidence.',
    benefits: ['Improved free throw percentage', 'Better routine consistency', 'Increased confidence', 'Mental toughness'],
    videoUrl: 'https://www.youtube.com/watch?v=example2'
  },
  {
    id: 'shooting-3',
    title: 'Three-Point Specialist',
    description: 'Develop your long-range shooting with this comprehensive three-point training program that builds both accuracy and confidence.',
    category: workoutCategories.SHOOTING,
    level: difficultyLevels.INTERMEDIATE,
    duration: '40 min',
    featured: true,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Corner Three Practice',
        instructions: 'Take 15 shots from each corner, focusing on quick release and proper form.',
        tips: 'Plant your feet quickly and find balance before shooting. Use your legs for power.',
        duration: '10 min',
        type: 'repetition',
        reps: 30
      },
      {
        title: 'Wing Three Practice',
        instructions: 'Take 20 shots from each wing position, maintaining consistent form.',
        tips: 'Keep your shooting hand under the ball and guide hand on the side. Follow through with confidence.',
        duration: '15 min',
        type: 'repetition',
        reps: 40
      },
      {
        title: 'Top of Key Practice',
        instructions: 'Take 25 shots from the top of the key, focusing on arc and distance.',
        tips: 'The ball should have a high arc to increase your chances of making the shot.',
        duration: '10 min',
        type: 'repetition',
        reps: 25
      },
      {
        title: 'Game Situation Practice',
        instructions: 'Practice catch-and-shoot threes with a partner. Take 20 shots total.',
        tips: 'Be ready to shoot as soon as you catch the ball. Don\'t hesitate.',
        duration: '5 min',
        type: 'repetition',
        reps: 20
      }
    ],
    equipment: ['Basketball', 'Hoop', 'Partner (optional)', 'Water bottle'],
    coachNotes: 'Three-point shooting requires both physical strength and mental confidence. Practice from all angles to become a complete shooter.',
    benefits: ['Improved three-point accuracy', 'Better range', 'Increased confidence', 'Game-ready shooting'],
    videoUrl: 'https://www.youtube.com/watch?v=example3'
  },
  {
    id: 'shooting-4',
    title: 'Mid-Range Mastery',
    description: 'Perfect your mid-range shooting with this focused workout that emphasizes footwork, balance, and shot selection.',
    category: workoutCategories.SHOOTING,
    level: difficultyLevels.INTERMEDIATE,
    duration: '35 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Elbow Shooting',
        instructions: 'Take 20 shots from each elbow, focusing on proper footwork and balance.',
        tips: 'Square your shoulders to the basket and use your legs for power.',
        duration: '10 min',
        type: 'repetition',
        reps: 40
      },
      {
        title: 'Pull-Up Jumpers',
        instructions: 'Practice pull-up jumpers from mid-range. Take 25 shots total.',
        tips: 'Stop quickly and maintain balance. Don\'t rush your shot.',
        duration: '15 min',
        type: 'repetition',
        reps: 25
      },
      {
        title: 'Fadeaway Practice',
        instructions: 'Practice fadeaway jumpers from mid-range. Take 15 shots total.',
        tips: 'Create space with your body and maintain good balance. Follow through with confidence.',
        duration: '10 min',
        type: 'repetition',
        reps: 15
      }
    ],
    equipment: ['Basketball', 'Hoop', 'Water bottle'],
    coachNotes: 'Mid-range shooting is often overlooked but crucial for a complete offensive game. Focus on footwork and balance.',
    benefits: ['Improved mid-range accuracy', 'Better footwork', 'Increased shot variety', 'Game-ready moves'],
    videoUrl: 'https://www.youtube.com/watch?v=example4'
  },
  {
    id: 'shooting-5',
    title: 'Off-Dribble Shooting',
    description: 'Master shooting off the dribble with this advanced workout that combines ball handling and shooting skills.',
    category: workoutCategories.SHOOTING,
    level: difficultyLevels.ADVANCED,
    duration: '45 min',
    featured: true,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Crossover Pull-Up',
        instructions: 'Practice crossover dribble followed by pull-up jumper. Take 20 shots total.',
        tips: 'Keep your dribble low and controlled. Stop quickly after the crossover.',
        duration: '15 min',
        type: 'repetition',
        reps: 20
      },
      {
        title: 'Step-Back Shooting',
        instructions: 'Practice step-back jumpers from various distances. Take 25 shots total.',
        tips: 'Create space with your step-back and maintain balance. Don\'t rush your shot.',
        duration: '15 min',
        type: 'repetition',
        reps: 25
      },
      {
        title: 'Hesitation Pull-Up',
        instructions: 'Practice hesitation dribble followed by pull-up jumper. Take 20 shots total.',
        tips: 'Use the hesitation to freeze the defender, then explode into your shot.',
        duration: '15 min',
        type: 'repetition',
        reps: 20
      }
    ],
    equipment: ['Basketball', 'Hoop', 'Water bottle'],
    coachNotes: 'Shooting off the dribble is essential for creating your own shot. Practice different moves to become unpredictable.',
    benefits: ['Improved off-dribble shooting', 'Better ball handling', 'Increased shot creation', 'Advanced moves'],
    videoUrl: 'https://www.youtube.com/watch?v=example5'
  },
  {
    id: 'shooting-6',
    title: 'Catch and Shoot',
    description: 'Perfect your catch-and-shoot technique with this focused workout that emphasizes quick release and proper footwork.',
    category: workoutCategories.SHOOTING,
    level: difficultyLevels.INTERMEDIATE,
    duration: '30 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Stationary Catch and Shoot',
        instructions: 'Have a partner pass you the ball. Catch and shoot immediately. Take 30 shots total.',
        tips: 'Be ready to shoot as soon as you catch the ball. Don\'t hesitate.',
        duration: '15 min',
        type: 'repetition',
        reps: 30
      },
      {
        title: 'Moving Catch and Shoot',
        instructions: 'Move around the perimeter and catch passes for shots. Take 25 shots total.',
        tips: 'Keep your feet ready and your hands up. Catch the ball in shooting position.',
        duration: '15 min',
        type: 'repetition',
        reps: 25
      }
    ],
    equipment: ['Basketball', 'Hoop', 'Partner', 'Water bottle'],
    coachNotes: 'Catch-and-shoot is a fundamental skill that requires quick decision-making and consistent form.',
    benefits: ['Improved catch-and-shoot', 'Better footwork', 'Increased quickness', 'Team play skills'],
    videoUrl: 'https://www.youtube.com/watch?v=example6'
  },
  {
    id: 'shooting-7',
    title: 'Game Situation Shooting',
    description: 'Practice shooting in realistic game situations with this comprehensive workout that simulates various game scenarios.',
    category: workoutCategories.SHOOTING,
    level: difficultyLevels.ADVANCED,
    duration: '50 min',
    featured: true,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'End of Shot Clock',
        instructions: 'Practice shooting with limited time. You have 3 seconds to get a shot off. Take 20 shots total.',
        tips: 'Stay calm under pressure. Trust your form and don\'t rush.',
        duration: '15 min',
        type: 'repetition',
        reps: 20
      },
      {
        title: 'Clutch Free Throws',
        instructions: 'Practice free throws under pressure. Make 10 in a row or start over. Repeat 3 times.',
        tips: 'Take your time and trust your routine. Don\'t let pressure affect your form.',
        duration: '15 min',
        type: 'challenge',
        target: 30
      },
      {
        title: 'Game-Winning Shot',
        instructions: 'Practice taking the final shot. Simulate different game situations. Take 15 shots total.',
        tips: 'Visualize success. Stay confident and trust your training.',
        duration: '20 min',
        type: 'repetition',
        reps: 15
      }
    ],
    equipment: ['Basketball', 'Hoop', 'Timer', 'Water bottle'],
    coachNotes: 'Game situation shooting requires mental toughness as much as physical skill. Practice under pressure to build confidence.',
    benefits: ['Improved clutch shooting', 'Better mental toughness', 'Increased confidence', 'Game-ready skills'],
    videoUrl: 'https://www.youtube.com/watch?v=example7'
  },
  {
    id: 'shooting-8',
    title: 'Advanced Shooting Techniques',
    description: 'Master advanced shooting techniques including bank shots, runners, and difficult angle shots.',
    category: workoutCategories.SHOOTING,
    level: difficultyLevels.ADVANCED,
    duration: '40 min',
    featured: false,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Bank Shot Practice',
        instructions: 'Practice bank shots from various angles. Take 20 shots total.',
        tips: 'Aim for the top corner of the square on the backboard. Use proper arc.',
        duration: '15 min',
        type: 'repetition',
        reps: 20
      },
      {
        title: 'Runner Practice',
        instructions: 'Practice running one-handed shots (runners) from various distances. Take 25 shots total.',
        tips: 'Use your body to create space and maintain balance. Follow through with confidence.',
        duration: '15 min',
        type: 'repetition',
        reps: 25
      },
      {
        title: 'Difficult Angle Shots',
        instructions: 'Practice shots from difficult angles and positions. Take 20 shots total.',
        tips: 'Adjust your form for different angles. Maintain good balance and follow-through.',
        duration: '10 min',
        type: 'repetition',
        reps: 20
      }
    ],
    equipment: ['Basketball', 'Hoop', 'Water bottle'],
    coachNotes: 'Advanced shooting techniques give you more options in game situations. Practice these shots to become a complete scorer.',
    benefits: ['Advanced shooting skills', 'More shot options', 'Better adaptability', 'Complete offensive game'],
    videoUrl: 'https://www.youtube.com/watch?v=example8'
  },

  // ==================== DRIBBLING WORKOUTS (6) ====================
  {
    id: 'dribbling-1',
    title: 'Basic Ball Handling',
    description: 'Master the fundamentals of ball handling with this comprehensive workout that builds confidence and control.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.BEGINNER,
    duration: '30 min',
    featured: true,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Stationary Dribbling',
        instructions: 'Dribble the ball in place with your dominant hand for 2 minutes, then switch to your non-dominant hand for 2 minutes.',
        tips: 'Keep your eyes up, not on the ball. Use your fingertips, not your palm.',
        duration: '4 min',
        type: 'timed'
      },
      {
        title: 'Crossovers',
        instructions: 'Practice crossover dribbles in place. Perform 50 crossovers with each hand.',
        tips: 'Keep the ball low and controlled. Protect the ball with your non-dribbling hand.',
        duration: '10 min',
        type: 'repetition',
        reps: 100
      },
      {
        title: 'Between the Legs',
        instructions: 'Practice between-the-legs dribbles. Perform 30 with each hand.',
        tips: 'Keep your knees slightly bent and maintain good balance.',
        duration: '8 min',
        type: 'repetition',
        reps: 60
      },
      {
        title: 'Behind the Back',
        instructions: 'Practice behind-the-back dribbles. Perform 20 with each hand.',
        tips: 'Start slow and increase speed as you get comfortable.',
        duration: '8 min',
        type: 'repetition',
        reps: 40
      }
    ],
    equipment: ['Basketball', 'Open space', 'Water bottle'],
    coachNotes: 'Ball handling is the foundation of basketball. Practice with both hands equally to become a complete player.',
    benefits: ['Improved ball control', 'Better hand-eye coordination', 'Increased confidence', 'Foundation skills'],
    videoUrl: 'https://www.youtube.com/watch?v=example9'
  },
  {
    id: 'dribbling-2',
    title: 'Advanced Handles',
    description: 'Take your ball handling to the next level with this advanced workout that combines multiple moves and game situations.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.INTERMEDIATE,
    duration: '40 min',
    featured: true,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Combo Moves',
        instructions: 'Practice combining different dribble moves: crossover to between the legs, behind the back to crossover, etc. Perform 20 of each combination.',
        tips: 'Make each move look the same until the last second. Keep defenders guessing.',
        duration: '20 min',
        type: 'repetition',
        reps: 60
      },
      {
        title: 'Speed Dribbling',
        instructions: 'Practice dribbling at full speed up and down the court. Change hands at half court. Repeat 10 times.',
        tips: 'Push the ball slightly ahead when moving at speed. Keep your body low.',
        duration: '10 min',
        type: 'repetition',
        reps: 10
      },
      {
        title: 'Game Moves',
        instructions: 'Practice game-specific moves: hesitation, in-and-out, spin move. Perform 15 of each move.',
        tips: 'Make your moves look realistic. Practice with game speed and intensity.',
        duration: '10 min',
        type: 'repetition',
        reps: 45
      }
    ],
    equipment: ['Basketball', 'Full court', 'Water bottle'],
    coachNotes: 'Advanced ball handling requires creativity and confidence. Practice these moves until they become second nature.',
    benefits: ['Advanced ball handling', 'Better creativity', 'Increased confidence', 'Game-ready moves'],
    videoUrl: 'https://www.youtube.com/watch?v=example10'
  },
  {
    id: 'dribbling-3',
    title: 'Two-Ball Dribbling',
    description: 'Master two-ball dribbling to improve your coordination, ambidexterity, and overall ball handling skills.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.INTERMEDIATE,
    duration: '35 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Stationary Two-Ball',
        instructions: 'Dribble two basketballs simultaneously in place for 3 minutes. Keep both balls at the same height.',
        tips: 'Focus on equal control of both balls. Look ahead, not down at the balls.',
        duration: '3 min',
        type: 'timed'
      },
      {
        title: 'Alternating Two-Ball',
        instructions: 'Dribble two balls with alternating rhythms for 5 minutes. One ball high, one ball low.',
        tips: 'Start slow and increase speed as you get comfortable.',
        duration: '5 min',
        type: 'timed'
      },
      {
        title: 'Walking Two-Ball',
        instructions: 'Walk while dribbling two balls. Go up and down the court 5 times.',
        tips: 'Keep both balls controlled and at the same height.',
        duration: '15 min',
        type: 'repetition',
        reps: 5
      },
      {
        title: 'Two-Ball Crossovers',
        instructions: 'Practice crossover dribbles with both balls simultaneously. Perform 20 crossovers.',
        tips: 'Keep your body balanced and both balls controlled.',
        duration: '12 min',
        type: 'repetition',
        reps: 20
      }
    ],
    equipment: ['2 Basketballs', 'Open court space', 'Water bottle'],
    coachNotes: 'Two-ball dribbling is excellent for developing ambidexterity and overall ball control. It\'s challenging but very effective.',
    benefits: ['Improved ambidexterity', 'Better coordination', 'Enhanced ball control', 'Advanced skills'],
    videoUrl: 'https://www.youtube.com/watch?v=example11'
  },
  {
    id: 'dribbling-4',
    title: 'Speed and Agility Dribbling',
    description: 'Combine dribbling with speed and agility training to become a more dynamic ball handler.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.ADVANCED,
    duration: '45 min',
    featured: true,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Cone Dribbling',
        instructions: 'Set up cones in a zigzag pattern. Dribble through the cones as fast as possible. Repeat 10 times.',
        tips: 'Keep the ball close to your body and use quick, controlled dribbles.',
        duration: '15 min',
        type: 'repetition',
        reps: 10
      },
      {
        title: 'Full Court Speed',
        instructions: 'Dribble at full speed from baseline to baseline. Change hands at half court. Repeat 15 times.',
        tips: 'Push the ball ahead of you and chase it. Maintain control at high speed.',
        duration: '15 min',
        type: 'repetition',
        reps: 15
      },
      {
        title: 'Defensive Pressure',
        instructions: 'Practice dribbling while a partner applies light defensive pressure. Focus on protecting the ball.',
        tips: 'Keep your body between the defender and the ball. Use your off-hand to protect.',
        duration: '15 min',
        type: 'instruction'
      }
    ],
    equipment: ['Basketball', 'Cones', 'Partner', 'Full court', 'Water bottle'],
    coachNotes: 'Speed and agility dribbling prepares you for game situations where you need to handle the ball under pressure.',
    benefits: ['Improved speed', 'Better agility', 'Enhanced ball control', 'Game-ready skills'],
    videoUrl: 'https://www.youtube.com/watch?v=example12'
  },
  {
    id: 'dribbling-5',
    title: 'Game Situation Dribbling',
    description: 'Practice dribbling in realistic game situations including fast breaks, pick and rolls, and isolation plays.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.ADVANCED,
    duration: '40 min',
    featured: false,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Fast Break Dribbling',
        instructions: 'Practice dribbling at full speed in a fast break situation. Start from the baseline and finish with a layup. Repeat 20 times.',
        tips: 'Keep your head up to see the court. Make quick decisions.',
        duration: '15 min',
        type: 'repetition',
        reps: 20
      },
      {
        title: 'Pick and Roll Dribbling',
        instructions: 'Practice dribbling around a screen (use a cone or partner). Make the right decision: shoot, pass, or continue dribbling. Repeat 15 times.',
        tips: 'Read the defense and make the right play. Don\'t force anything.',
        duration: '15 min',
        type: 'repetition',
        reps: 15
      },
      {
        title: 'Isolation Dribbling',
        instructions: 'Practice one-on-one dribbling moves. Use different moves to create space and get to the basket. Repeat 10 times.',
        tips: 'Be creative and unpredictable. Use your moves to create advantages.',
        duration: '10 min',
        type: 'repetition',
        reps: 10
      }
    ],
    equipment: ['Basketball', 'Cones or partner', 'Full court', 'Water bottle'],
    coachNotes: 'Game situation dribbling helps you apply your skills in realistic scenarios. Practice making good decisions under pressure.',
    benefits: ['Game-ready dribbling', 'Better decision making', 'Improved court awareness', 'Realistic practice'],
    videoUrl: 'https://www.youtube.com/watch?v=example13'
  },
  {
    id: 'dribbling-6',
    title: 'Weak Hand Development',
    description: 'Develop your weak hand to become a more complete and unpredictable ball handler.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.INTERMEDIATE,
    duration: '35 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Weak Hand Stationary',
        instructions: 'Dribble with your weak hand only for 5 minutes. Focus on control and consistency.',
        tips: 'Don\'t look at the ball. Trust your weak hand and build confidence.',
        duration: '5 min',
        type: 'timed'
      },
      {
        title: 'Weak Hand Crossovers',
        instructions: 'Practice crossover dribbles using your weak hand. Perform 50 crossovers.',
        tips: 'Keep the ball low and controlled. Don\'t rush the movement.',
        duration: '10 min',
        type: 'repetition',
        reps: 50
      },
      {
        title: 'Weak Hand Moves',
        instructions: 'Practice between the legs and behind the back with your weak hand. Perform 30 of each move.',
        tips: 'Start slow and increase speed as you get comfortable.',
        duration: '15 min',
        type: 'repetition',
        reps: 60
      },
      {
        title: 'Weak Hand Game Situations',
        instructions: 'Practice game moves with your weak hand: hesitation, in-and-out, spin move. Perform 10 of each.',
        tips: 'Make your weak hand moves look as natural as your strong hand.',
        duration: '5 min',
        type: 'repetition',
        reps: 30
      }
    ],
    equipment: ['Basketball', 'Open space', 'Water bottle'],
    coachNotes: 'Developing your weak hand makes you twice as dangerous on the court. Practice until both hands feel natural.',
    benefits: ['Improved weak hand', 'Better ambidexterity', 'Increased unpredictability', 'Complete ball handling'],
    videoUrl: 'https://www.youtube.com/watch?v=example14'
  },

  // ==================== PHYSICAL WORKOUTS (6) ====================
  {
    id: 'physical-1',
    title: 'Basketball Strength Training',
    description: 'Build functional strength specifically for basketball with this comprehensive strength training program.',
    category: workoutCategories.PHYSICAL,
    level: difficultyLevels.INTERMEDIATE,
    duration: '45 min',
    featured: true,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Warm-up',
        instructions: 'Perform 5 minutes of light cardio and dynamic stretching to prepare your body for strength training.',
        tips: 'Focus on movements that mimic basketball actions: arm circles, leg swings, hip circles.',
        duration: '5 min',
        type: 'instruction'
      },
      {
        title: 'Lower Body Strength',
        instructions: 'Perform squats, lunges, and calf raises. 3 sets of 12-15 reps for each exercise.',
        tips: 'Focus on proper form and controlled movements. Use your body weight or light weights.',
        duration: '20 min',
        type: 'repetition',
        reps: 108
      },
      {
        title: 'Upper Body Strength',
        instructions: 'Perform push-ups, pull-ups, and shoulder presses. 3 sets of 8-12 reps for each exercise.',
        tips: 'Maintain good form throughout. If you can\'t do pull-ups, use assisted pull-ups or lat pulldowns.',
        duration: '15 min',
        type: 'repetition',
        reps: 84
      },
      {
        title: 'Cool Down',
        instructions: 'Perform 5 minutes of static stretching focusing on the muscles you just worked.',
        tips: 'Hold each stretch for 30 seconds. Focus on your legs, back, and shoulders.',
        duration: '5 min',
        type: 'instruction'
      }
    ],
    equipment: ['Weights (optional)', 'Pull-up bar', 'Water bottle', 'Yoga mat'],
    coachNotes: 'Basketball-specific strength training improves your performance on the court. Focus on functional movements that translate to basketball skills.',
    benefits: ['Increased strength', 'Better performance', 'Injury prevention', 'Improved power'],
    videoUrl: 'https://www.youtube.com/watch?v=example15'
  },
  {
    id: 'physical-2',
    title: 'Agility and Quickness',
    description: 'Improve your agility, quickness, and reaction time with this dynamic workout designed for basketball players.',
    category: workoutCategories.PHYSICAL,
    level: difficultyLevels.INTERMEDIATE,
    duration: '35 min',
    featured: true,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Ladder Drills',
        instructions: 'Perform various ladder drills: two feet in each box, lateral shuffles, in-and-out. 3 sets of each drill.',
        tips: 'Keep your feet quick and light. Focus on speed and precision.',
        duration: '15 min',
        type: 'instruction'
      },
      {
        title: 'Cone Drills',
        instructions: 'Set up cones in various patterns and perform agility drills: zigzag runs, figure-8s, T-drills. 3 sets of each.',
        tips: 'Stay low and change direction quickly. Use your arms to help with balance.',
        duration: '15 min',
        type: 'instruction'
      },
      {
        title: 'Reaction Drills',
        instructions: 'Have a partner call out directions or use a reaction ball. React as quickly as possible to the stimulus.',
        tips: 'Stay on the balls of your feet and be ready to move in any direction.',
        duration: '5 min',
        type: 'instruction'
      }
    ],
    equipment: ['Agility ladder', 'Cones', 'Partner', 'Reaction ball (optional)', 'Water bottle'],
    coachNotes: 'Agility and quickness are crucial for basketball. These drills improve your ability to change direction and react quickly.',
    benefits: ['Improved agility', 'Better quickness', 'Enhanced reaction time', 'Increased foot speed'],
    videoUrl: 'https://www.youtube.com/watch?v=example16'
  },
  {
    id: 'physical-3',
    title: 'Vertical Jump Training',
    description: 'Increase your vertical jump with this specialized training program that combines plyometrics and strength training.',
    category: workoutCategories.PHYSICAL,
    level: difficultyLevels.ADVANCED,
    duration: '40 min',
    featured: true,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Warm-up',
        instructions: 'Perform 10 minutes of dynamic warm-up including leg swings, high knees, and butt kicks.',
        tips: 'Prepare your muscles for explosive movements. Don\'t skip the warm-up.',
        duration: '10 min',
        type: 'instruction'
      },
      {
        title: 'Plyometric Exercises',
        instructions: 'Perform box jumps, depth jumps, and single-leg hops. 3 sets of 8-10 reps for each exercise.',
        tips: 'Focus on explosive movements and landing softly. Quality over quantity.',
        duration: '20 min',
        type: 'repetition',
        reps: 78
      },
      {
        title: 'Jump Technique',
        instructions: 'Practice proper jumping technique: approach, takeoff, and landing. Perform 20 practice jumps.',
        tips: 'Use your arms to help generate power. Land on both feet with knees slightly bent.',
        duration: '10 min',
        type: 'repetition',
        reps: 20
      }
    ],
    equipment: ['Plyometric boxes', 'Open space', 'Water bottle'],
    coachNotes: 'Vertical jump training requires proper technique and progressive overload. Start with lower boxes and gradually increase height.',
    benefits: ['Increased vertical jump', 'Better explosiveness', 'Improved power', 'Enhanced athleticism'],
    videoUrl: 'https://www.youtube.com/watch?v=example17'
  },
  {
    id: 'physical-4',
    title: 'Basketball Conditioning',
    description: 'Build basketball-specific endurance with this conditioning workout that simulates game situations.',
    category: workoutCategories.PHYSICAL,
    level: difficultyLevels.INTERMEDIATE,
    duration: '30 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Suicide Runs',
        instructions: 'Perform suicide runs (baseline to free throw line and back, to half court and back, to opposite free throw line and back, to opposite baseline and back). Complete 5 sets.',
        tips: 'Maintain good form even when you\'re tired. Touch each line with your hand.',
        duration: '10 min',
        type: 'repetition',
        reps: 5
      },
      {
        title: 'Defensive Slides',
        instructions: 'Perform defensive slides across the court. Go back and forth 10 times.',
        tips: 'Stay low and keep your hands up. Don\'t cross your feet.',
        duration: '10 min',
        type: 'repetition',
        reps: 10
      },
      {
        title: 'Full Court Sprints',
        instructions: 'Sprint from baseline to baseline. Walk back to recover. Complete 8 sprints.',
        tips: 'Give maximum effort on each sprint. Use the walk back as recovery time.',
        duration: '10 min',
        type: 'repetition',
        reps: 8
      }
    ],
    equipment: ['Full basketball court', 'Water bottle'],
    coachNotes: 'Basketball conditioning prepares you for the demands of the game. Focus on maintaining intensity throughout the workout.',
    benefits: ['Improved endurance', 'Better game fitness', 'Increased stamina', 'Enhanced performance'],
    videoUrl: 'https://www.youtube.com/watch?v=example18'
  },
  {
    id: 'physical-5',
    title: 'Core Strength for Basketball',
    description: 'Develop a strong core that supports all your basketball movements with this comprehensive core workout.',
    category: workoutCategories.PHYSICAL,
    level: difficultyLevels.INTERMEDIATE,
    duration: '25 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Plank Variations',
        instructions: 'Hold a standard plank for 60 seconds, then side planks for 30 seconds each side. Repeat 3 times.',
        tips: 'Keep your body in a straight line. Don\'t let your hips sag or pike up.',
        duration: '8 min',
        type: 'timed'
      },
      {
        title: 'Russian Twists',
        instructions: 'Perform Russian twists with a medicine ball or basketball. 3 sets of 20 reps.',
        tips: 'Keep your feet off the ground and rotate your torso. Don\'t just move your arms.',
        duration: '6 min',
        type: 'repetition',
        reps: 60
      },
      {
        title: 'Mountain Climbers',
        instructions: 'Perform mountain climbers for 30 seconds, rest for 30 seconds. Repeat 5 times.',
        tips: 'Keep your core tight and maintain a plank position. Drive your knees to your chest.',
        duration: '5 min',
        type: 'timed'
      },
      {
        title: 'Dead Bug',
        instructions: 'Perform the dead bug exercise. 3 sets of 10 reps on each side.',
        tips: 'Keep your lower back pressed to the floor. Move slowly and with control.',
        duration: '6 min',
        type: 'repetition',
        reps: 60
      }
    ],
    equipment: ['Yoga mat', 'Medicine ball or basketball', 'Water bottle'],
    coachNotes: 'A strong core is essential for basketball. It helps with balance, power transfer, and injury prevention.',
    benefits: ['Stronger core', 'Better balance', 'Improved power transfer', 'Injury prevention'],
    videoUrl: 'https://www.youtube.com/watch?v=example19'
  },
  {
    id: 'physical-6',
    title: 'Flexibility and Mobility',
    description: 'Improve your flexibility and mobility to prevent injuries and enhance your basketball performance.',
    category: workoutCategories.PHYSICAL,
    level: difficultyLevels.BEGINNER,
    duration: '30 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Dynamic Warm-up',
        instructions: 'Perform 10 minutes of dynamic stretching including leg swings, arm circles, and hip circles.',
        tips: 'Move through your full range of motion. Don\'t hold static stretches during warm-up.',
        duration: '10 min',
        type: 'instruction'
      },
      {
        title: 'Hip Mobility',
        instructions: 'Perform hip mobility exercises: hip circles, leg swings, and hip flexor stretches. Hold each stretch for 30 seconds.',
        tips: 'Focus on opening up your hips. This is crucial for basketball movements.',
        duration: '10 min',
        type: 'instruction'
      },
      {
        title: 'Static Stretching',
        instructions: 'Perform static stretches for all major muscle groups. Hold each stretch for 30-60 seconds.',
        tips: 'Don\'t bounce during static stretches. Hold the stretch and breathe deeply.',
        duration: '10 min',
        type: 'instruction'
      }
    ],
    equipment: ['Yoga mat', 'Water bottle'],
    coachNotes: 'Flexibility and mobility are often overlooked but crucial for basketball performance and injury prevention.',
    benefits: ['Improved flexibility', 'Better mobility', 'Injury prevention', 'Enhanced performance'],
    videoUrl: 'https://www.youtube.com/watch?v=example20'
  },

  // ==================== STRATEGY WORKOUTS (4) ====================
  {
    id: 'strategy-1',
    title: 'Offensive Sets and Plays',
    description: 'Learn and practice common offensive sets and plays used in basketball.',
    category: workoutCategories.STRATEGY,
    level: difficultyLevels.INTERMEDIATE,
    duration: '40 min',
    featured: true,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Pick and Roll',
        instructions: 'Practice the basic pick and roll with a partner. Focus on timing and communication. Run 20 pick and rolls.',
        tips: 'The screener should set a solid screen and roll to the basket. The ball handler should use the screen effectively.',
        duration: '15 min',
        type: 'repetition',
        reps: 20
      },
      {
        title: 'Give and Go',
        instructions: 'Practice the give and go play. Pass the ball and cut to the basket. Run 15 give and go plays.',
        tips: 'Make a good pass and immediately cut to the basket. Time your cut with the pass.',
        duration: '10 min',
        type: 'repetition',
        reps: 15
      },
      {
        title: 'Motion Offense',
        instructions: 'Practice basic motion offense principles: cutting, screening, and spacing. Run through the offense for 15 minutes.',
        tips: 'Keep moving and maintain good spacing. Read the defense and react accordingly.',
        duration: '15 min',
        type: 'instruction'
      }
    ],
    equipment: ['Basketball', 'Partner or team', 'Full court', 'Water bottle'],
    coachNotes: 'Understanding offensive sets and plays makes you a more valuable team player. Practice these fundamentals regularly.',
    benefits: ['Better team play', 'Improved court awareness', 'Enhanced basketball IQ', 'Team chemistry'],
    videoUrl: 'https://www.youtube.com/watch?v=example21'
  },
  {
    id: 'strategy-2',
    title: 'Defensive Schemes',
    description: 'Learn and practice different defensive schemes and principles.',
    category: workoutCategories.STRATEGY,
    level: difficultyLevels.INTERMEDIATE,
    duration: '35 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Man-to-Man Defense',
        instructions: 'Practice man-to-man defensive principles: staying between your man and the basket, contesting shots, and helping teammates. Practice for 15 minutes.',
        tips: 'Stay in a defensive stance and keep your hands active. Communicate with your teammates.',
        duration: '15 min',
        type: 'instruction'
      },
      {
        title: 'Zone Defense',
        instructions: 'Practice zone defensive principles: protecting your area, communicating, and rotating. Practice for 10 minutes.',
        tips: 'Know your responsibilities in the zone. Move as a unit and communicate constantly.',
        duration: '10 min',
        type: 'instruction'
      },
      {
        title: 'Defensive Drills',
        instructions: 'Practice defensive slides, closeouts, and help defense. Perform each drill for 5 minutes.',
        tips: 'Stay low and move your feet. Don\'t reach with your hands.',
        duration: '10 min',
        type: 'instruction'
      }
    ],
    equipment: ['Basketball', 'Partner or team', 'Full court', 'Water bottle'],
    coachNotes: 'Good defense wins games. Practice these defensive principles to become a complete player.',
    benefits: ['Better defense', 'Improved team play', 'Enhanced basketball IQ', 'Complete player'],
    videoUrl: 'https://www.youtube.com/watch?v=example22'
  },
  {
    id: 'strategy-3',
    title: 'Court Awareness and Vision',
    description: 'Develop your court awareness and ability to see the entire court.',
    category: workoutCategories.STRATEGY,
    level: difficultyLevels.ADVANCED,
    duration: '30 min',
    featured: true,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Peripheral Vision Drills',
        instructions: 'Practice dribbling while looking at different points on the court. Keep your head up and see the whole court.',
        tips: 'Don\'t look at the ball while dribbling. Use your peripheral vision to see teammates and defenders.',
        duration: '10 min',
        type: 'instruction'
      },
      {
        title: 'Passing Drills',
        instructions: 'Practice making passes to teammates without looking directly at them. Use your court vision to find open players.',
        tips: 'Keep your head up and scan the court. Make quick decisions and accurate passes.',
        duration: '10 min',
        type: 'instruction'
      },
      {
        title: 'Game Situation Practice',
        instructions: 'Practice reading the defense and making the right play. Focus on seeing the whole court and making good decisions.',
        tips: 'Read the defense and react accordingly. Don\'t force plays that aren\'t there.',
        duration: '10 min',
        type: 'instruction'
      }
    ],
    equipment: ['Basketball', 'Partner or team', 'Full court', 'Water bottle'],
    coachNotes: 'Court awareness is what separates good players from great players. Practice seeing the whole court and making good decisions.',
    benefits: ['Better court vision', 'Improved decision making', 'Enhanced basketball IQ', 'Elite awareness'],
    videoUrl: 'https://www.youtube.com/watch?v=example23'
  },
  {
    id: 'strategy-4',
    title: 'Game Management',
    description: 'Learn how to manage different game situations including clock management, foul situations, and end-of-game scenarios.',
    category: workoutCategories.STRATEGY,
    level: difficultyLevels.ADVANCED,
    duration: '25 min',
    featured: false,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Clock Management',
        instructions: 'Practice different clock situations: when to speed up, when to slow down, and when to take timeouts.',
        tips: 'Understand the game situation and manage the clock accordingly. Don\'t rush when you\'re ahead.',
        duration: '10 min',
        type: 'instruction'
      },
      {
        title: 'Foul Situations',
        instructions: 'Practice different foul situations: when to foul, when to avoid fouls, and how to play with foul trouble.',
        tips: 'Know the game situation and your team\'s foul count. Make smart decisions about when to be aggressive.',
        duration: '10 min',
        type: 'instruction'
      },
      {
        title: 'End-of-Game Scenarios',
        instructions: 'Practice end-of-game situations: when you\'re ahead, when you\'re behind, and when the game is tied.',
        tips: 'Stay calm under pressure and make good decisions. Trust your training and your teammates.',
        duration: '5 min',
        type: 'instruction'
      }
    ],
    equipment: ['Basketball', 'Partner or team', 'Full court', 'Water bottle'],
    coachNotes: 'Game management is crucial for winning close games. Practice these situations to become a better game manager.',
    benefits: ['Better game management', 'Improved decision making', 'Enhanced basketball IQ', 'Clutch performance'],
    videoUrl: 'https://www.youtube.com/watch?v=example24'
  },

  // ==================== MENTAL WORKOUTS (3) ====================
  {
    id: 'mental-1',
    title: 'Visualization and Mental Preparation',
    description: 'Develop your mental game through visualization and mental preparation techniques.',
    category: workoutCategories.MENTAL,
    level: difficultyLevels.BEGINNER,
    duration: '20 min',
    featured: true,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Relaxation and Focus',
        instructions: 'Find a quiet place and practice deep breathing for 5 minutes. Focus on clearing your mind and preparing for basketball.',
        tips: 'Breathe deeply and slowly. Let go of any distractions or negative thoughts.',
        duration: '5 min',
        type: 'instruction'
      },
      {
        title: 'Visualization Practice',
        instructions: 'Visualize yourself performing basketball skills perfectly: shooting, dribbling, passing, and playing defense.',
        tips: 'See yourself succeeding in your mind. Make the visualization as detailed as possible.',
        duration: '10 min',
        type: 'instruction'
      },
      {
        title: 'Game Situation Visualization',
        instructions: 'Visualize yourself in different game situations: making clutch shots, playing good defense, and helping your team win.',
        tips: 'See yourself handling pressure situations with confidence and composure.',
        duration: '5 min',
        type: 'instruction'
      }
    ],
    equipment: ['Quiet space', 'Comfortable seating'],
    coachNotes: 'Mental preparation is just as important as physical preparation. Practice visualization to improve your mental game.',
    benefits: ['Better mental focus', 'Increased confidence', 'Improved performance', 'Mental toughness'],
    videoUrl: 'https://www.youtube.com/watch?v=example25'
  },
  {
    id: 'mental-2',
    title: 'Confidence Building',
    description: 'Build your confidence on the basketball court through positive thinking and mental exercises.',
    category: workoutCategories.MENTAL,
    level: difficultyLevels.INTERMEDIATE,
    duration: '25 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Positive Affirmations',
        instructions: 'Write down 10 positive affirmations about your basketball abilities. Repeat them out loud for 5 minutes.',
        tips: 'Use present tense and positive language. Believe in what you\'re saying.',
        duration: '5 min',
        type: 'instruction'
      },
      {
        title: 'Success Visualization',
        instructions: 'Visualize yourself succeeding in basketball. See yourself making shots, playing good defense, and helping your team win.',
        tips: 'Make the visualization as realistic as possible. Include all your senses.',
        duration: '10 min',
        type: 'instruction'
      },
      {
        title: 'Confidence Building Exercises',
        instructions: 'Practice confidence-building exercises: standing tall, making eye contact, and speaking with authority.',
        tips: 'Your body language affects your confidence. Practice confident body language.',
        duration: '10 min',
        type: 'instruction'
      }
    ],
    equipment: ['Paper and pen', 'Mirror', 'Quiet space'],
    coachNotes: 'Confidence is crucial for basketball success. Practice these exercises to build and maintain your confidence.',
    benefits: ['Increased confidence', 'Better self-belief', 'Improved performance', 'Mental strength'],
    videoUrl: 'https://www.youtube.com/watch?v=example26'
  },
  {
    id: 'mental-3',
    title: 'Pre-Game Routine',
    description: 'Develop a consistent pre-game routine that prepares you mentally and physically for competition.',
    category: workoutCategories.MENTAL,
    level: difficultyLevels.INTERMEDIATE,
    duration: '30 min',
    featured: false,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Physical Preparation',
        instructions: 'Develop a consistent physical warm-up routine: stretching, light shooting, and mental preparation.',
        tips: 'Do the same routine before every game. Consistency builds confidence.',
        duration: '15 min',
        type: 'instruction'
      },
      {
        title: 'Mental Preparation',
        instructions: 'Develop a mental preparation routine: visualization, positive thinking, and focus exercises.',
        tips: 'Prepare your mind for competition. Stay positive and focused.',
        duration: '10 min',
        type: 'instruction'
      },
      {
        title: 'Routine Practice',
        instructions: 'Practice your complete pre-game routine. Make it a habit that you can rely on.',
        tips: 'The more you practice your routine, the more automatic it becomes.',
        duration: '5 min',
        type: 'instruction'
      }
    ],
    equipment: ['Basketball', 'Quiet space', 'Timer'],
    coachNotes: 'A consistent pre-game routine helps you prepare mentally and physically for competition. Practice it regularly.',
    benefits: ['Better preparation', 'Increased consistency', 'Improved performance', 'Mental readiness'],
    videoUrl: 'https://www.youtube.com/watch?v=example27'
  },

  // ==================== NUTRITION WORKOUTS (3) ====================
  {
    id: 'nutrition-1',
    title: 'Pre-Game Nutrition',
    description: 'Learn about proper pre-game nutrition to fuel your body for optimal performance.',
    category: workoutCategories.NUTRITION,
    level: difficultyLevels.BEGINNER,
    duration: '15 min',
    featured: true,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Pre-Game Meal Planning',
        instructions: 'Learn about proper pre-game meal timing and composition. Plan your pre-game meal for your next game.',
        tips: 'Eat 3-4 hours before the game. Focus on carbohydrates and lean protein.',
        duration: '5 min',
        type: 'instruction'
      },
      {
        title: 'Hydration Strategy',
        instructions: 'Develop a hydration strategy for game day. Learn about proper fluid intake before, during, and after games.',
        tips: 'Start hydrating 24 hours before the game. Drink water consistently throughout the day.',
        duration: '5 min',
        type: 'instruction'
      },
      {
        title: 'Pre-Game Snacks',
        instructions: 'Learn about appropriate pre-game snacks for energy and performance.',
        tips: 'Choose easily digestible foods. Avoid high-fat or high-fiber foods close to game time.',
        duration: '5 min',
        type: 'instruction'
      }
    ],
    equipment: ['Notebook', 'Water bottle'],
    coachNotes: 'Proper nutrition is crucial for basketball performance. Learn about fueling your body for optimal results.',
    benefits: ['Better energy', 'Improved performance', 'Optimal hydration', 'Proper fueling'],
    videoUrl: 'https://www.youtube.com/watch?v=example28'
  },
  {
    id: 'nutrition-2',
    title: 'Recovery Nutrition',
    description: 'Learn about post-game and post-workout nutrition for optimal recovery and muscle building.',
    category: workoutCategories.NUTRITION,
    level: difficultyLevels.INTERMEDIATE,
    duration: '20 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Post-Game Meal',
        instructions: 'Learn about the importance of post-game nutrition and what to eat for optimal recovery.',
        tips: 'Eat within 30 minutes of finishing the game. Focus on protein and carbohydrates.',
        duration: '5 min',
        type: 'instruction'
      },
      {
        title: 'Hydration Recovery',
        instructions: 'Learn about proper hydration after games and workouts to replace lost fluids and electrolytes.',
        tips: 'Drink water and consider sports drinks for electrolyte replacement.',
        duration: '5 min',
        type: 'instruction'
      },
      {
        title: 'Recovery Supplements',
        instructions: 'Learn about supplements that can aid in recovery, such as protein powder and creatine.',
        tips: 'Supplements should complement a good diet, not replace it. Consult with a nutritionist if needed.',
        duration: '5 min',
        type: 'instruction'
      },
      {
        title: 'Sleep and Recovery',
        instructions: 'Learn about the importance of sleep for recovery and performance.',
        tips: 'Aim for 7-9 hours of sleep per night. Sleep is when your body repairs and recovers.',
        duration: '5 min',
        type: 'instruction'
      }
    ],
    equipment: ['Notebook', 'Water bottle'],
    coachNotes: 'Recovery nutrition is just as important as pre-game nutrition. Learn how to properly fuel your recovery.',
    benefits: ['Better recovery', 'Improved performance', 'Optimal hydration', 'Muscle building'],
    videoUrl: 'https://www.youtube.com/watch?v=example29'
  },
  {
    id: 'nutrition-3',
    title: 'Daily Nutrition for Basketball',
    description: 'Learn about daily nutrition strategies for basketball players to maintain energy and support training.',
    category: workoutCategories.NUTRITION,
    level: difficultyLevels.INTERMEDIATE,
    duration: '25 min',
    featured: false,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Daily Meal Planning',
        instructions: 'Learn about proper daily meal planning for basketball players. Focus on balanced nutrition.',
        tips: 'Eat regular meals and snacks throughout the day. Don\'t skip meals.',
        duration: '8 min',
        type: 'instruction'
      },
      {
        title: 'Macronutrient Balance',
        instructions: 'Learn about the importance of carbohydrates, protein, and fats for basketball performance.',
        tips: 'Balance your macronutrients based on your training schedule and goals.',
        duration: '7 min',
        type: 'instruction'
      },
      {
        title: 'Micronutrients and Hydration',
        instructions: 'Learn about vitamins, minerals, and proper hydration for basketball players.',
        tips: 'Eat a variety of fruits and vegetables. Stay hydrated throughout the day.',
        duration: '5 min',
        type: 'instruction'
      },
      {
        title: 'Nutrition Tracking',
        instructions: 'Learn about tracking your nutrition to ensure you\'re meeting your needs.',
        tips: 'Use a food diary or app to track your intake. Monitor your energy levels and performance.',
        duration: '5 min',
        type: 'instruction'
      }
    ],
    equipment: ['Notebook', 'Food diary or app', 'Water bottle'],
    coachNotes: 'Daily nutrition is the foundation of your performance. Learn how to fuel your body properly every day.',
    benefits: ['Better daily energy', 'Improved performance', 'Optimal nutrition', 'Healthy habits'],
    videoUrl: 'https://www.youtube.com/watch?v=example30'
  }
];

// Helper functions for workout management
export const getWorkoutsByCategory = (category) => {
  return comprehensiveWorkouts.filter(workout => workout.category === category);
};

export const getWorkoutsByLevel = (level) => {
  return comprehensiveWorkouts.filter(workout => workout.level === level);
};

export const getFeaturedWorkouts = () => {
  return comprehensiveWorkouts.filter(workout => workout.featured);
};

export const getWorkoutById = (id) => {
  return comprehensiveWorkouts.find(workout => workout.id === id);
};

export const getWorkoutsBySubscription = (subscription) => {
  return comprehensiveWorkouts.filter(workout => 
    workout.requiredSubscription === 'free' || 
    (subscription === 'premium' && workout.requiredSubscription === 'premium')
  );
};

export const searchWorkouts = (query) => {
  const lowercaseQuery = query.toLowerCase();
  return comprehensiveWorkouts.filter(workout => 
    workout.title.toLowerCase().includes(lowercaseQuery) ||
    workout.description.toLowerCase().includes(lowercaseQuery) ||
    workout.category.toLowerCase().includes(lowercaseQuery)
  );
};
