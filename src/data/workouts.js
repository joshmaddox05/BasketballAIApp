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
        reps: 30
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
  },

  // ==================== ADDITIONAL SHOOTING WORKOUTS (5) ====================
  {
    id: 'shooting-9',
    title: 'Quick Release Training',
    description: 'Develop a lightning-fast release for catch-and-shoot situations. Perfect for players who want to get their shot off before defenders can close out.',
    category: workoutCategories.SHOOTING,
    level: difficultyLevels.INTERMEDIATE,
    duration: '30 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Form Speed Drill',
        instructions: 'Practice your shooting motion without the ball, focusing on speed while maintaining proper form. Do 50 repetitions.',
        tips: 'Your release should be fluid, not rushed. Speed comes from efficiency of motion.',
        duration: '5 min',
        type: 'repetition',
        reps: 50
      },
      {
        title: 'Quick Catch Practice',
        instructions: 'Have a partner pass you the ball. Catch and release as quickly as possible while maintaining form. Take 25 shots.',
        tips: 'Start with hands ready in shooting position before catching.',
        duration: '10 min',
        type: 'repetition',
        reps: 25
      },
      {
        title: 'Timed Release Drill',
        instructions: 'Set a 2-second timer. Catch the ball and get your shot off before the timer ends. Take 30 shots.',
        tips: 'Focus on footwork - have your feet set as you catch.',
        duration: '10 min',
        type: 'repetition',
        reps: 30
      },
      {
        title: 'Game Speed Practice',
        instructions: 'Simulate game situations with catch-and-shoot opportunities. Take 20 shots at game speed.',
        tips: 'Visualize a defender closing out on you.',
        duration: '5 min',
        type: 'repetition',
        reps: 20
      }
    ],
    equipment: ['Basketball', 'Hoop', 'Partner (recommended)', 'Timer'],
    coachNotes: 'A quick release is essential in modern basketball. Practice until it becomes second nature.',
    benefits: ['Faster release', 'Better catch-and-shoot', 'Game-ready shooting', 'Improved reaction time']
  },
  {
    id: 'shooting-10',
    title: 'Bank Shot Mastery',
    description: 'Master the lost art of the bank shot. Learn the angles and touch needed to use the backboard effectively.',
    category: workoutCategories.SHOOTING,
    level: difficultyLevels.INTERMEDIATE,
    duration: '25 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Close Range Bank Shots',
        instructions: 'From 5 feet away at a 45-degree angle, practice bank shots. Aim for the top corner of the square. Take 20 shots each side.',
        tips: 'The ball should hit the backboard softly with good arc.',
        duration: '8 min',
        type: 'repetition',
        reps: 40
      },
      {
        title: 'Mid-Range Bank Shots',
        instructions: 'Move to 10 feet away at various angles. Take 15 bank shots from each position.',
        tips: 'Adjust your aim point on the backboard based on the angle.',
        duration: '10 min',
        type: 'repetition',
        reps: 30
      },
      {
        title: 'Game Situation Banks',
        instructions: 'Practice bank shots off the dribble. Take 15 shots mixing angles and distances.',
        tips: 'Bank shots are especially effective when driving to the basket.',
        duration: '7 min',
        type: 'repetition',
        reps: 15
      }
    ],
    equipment: ['Basketball', 'Hoop'],
    coachNotes: 'Tim Duncan mastered the bank shot - it gives you a bigger target and higher percentage.',
    benefits: ['Higher percentage shots', 'More shooting options', 'Better touch', 'Expanded shot arsenal']
  },
  {
    id: 'shooting-11',
    title: 'Shot Correction Drill',
    description: 'Identify and fix common shooting mistakes. A systematic approach to improving your shooting form.',
    category: workoutCategories.SHOOTING,
    level: difficultyLevels.BEGINNER,
    duration: '25 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'One-Hand Form Shooting',
        instructions: 'Using only your shooting hand, take 25 close-range shots. Focus on elbow alignment and follow-through.',
        tips: 'Your elbow should be directly under the ball, not flared out.',
        duration: '8 min',
        type: 'repetition',
        reps: 25
      },
      {
        title: 'Guide Hand Check',
        instructions: 'Add your guide hand but focus on it not affecting the shot. Take 25 shots checking that guide hand releases cleanly.',
        tips: 'The guide hand should come off the ball before release.',
        duration: '7 min',
        type: 'repetition',
        reps: 25
      },
      {
        title: 'Balance and Base',
        instructions: 'Focus on your stance and balance. Take 20 shots with emphasis on consistent footwork.',
        tips: 'Your feet should be shoulder-width apart, knees slightly bent.',
        duration: '5 min',
        type: 'repetition',
        reps: 20
      },
      {
        title: 'Complete Form Practice',
        instructions: 'Put it all together. Take 30 shots focusing on all corrections.',
        tips: 'Go slow and prioritize form over makes.',
        duration: '5 min',
        type: 'repetition',
        reps: 30
      }
    ],
    equipment: ['Basketball', 'Hoop', 'Video camera (optional)'],
    coachNotes: 'Recording yourself can help identify issues you cannot feel. Good form leads to consistency.',
    benefits: ['Improved form', 'Identified weaknesses', 'Better consistency', 'Foundation for advanced skills']
  },
  {
    id: 'shooting-12',
    title: 'Deep Range Extension',
    description: 'Extend your shooting range beyond the three-point line. Build the leg strength and technique for deep shots.',
    category: workoutCategories.SHOOTING,
    level: difficultyLevels.ADVANCED,
    duration: '35 min',
    featured: true,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Progressive Distance',
        instructions: 'Start at the free throw line and gradually move back. Take 10 shots at each distance: free throw, mid-range, three-point, deep three.',
        tips: 'Focus on using your legs more as you move back.',
        duration: '15 min',
        type: 'repetition',
        reps: 40
      },
      {
        title: 'NBA Range Practice',
        instructions: 'From 25+ feet, take 25 shots focusing on maintaining form with the added distance.',
        tips: 'Generate power from your legs and core, not your arms.',
        duration: '10 min',
        type: 'repetition',
        reps: 25
      },
      {
        title: 'Logo Shots',
        instructions: 'From near half-court, practice the mechanics of very deep shots. Take 15 attempts.',
        tips: 'This is about building range - dont worry about percentage yet.',
        duration: '10 min',
        type: 'repetition',
        reps: 15
      }
    ],
    equipment: ['Basketball', 'Full court'],
    coachNotes: 'Players like Steph Curry and Damian Lillard have made deep threes a weapon. Build your range gradually.',
    benefits: ['Extended range', 'Better leg power', 'Confidence from distance', 'Defensive pressure creation']
  },
  {
    id: 'shooting-13',
    title: 'Floater & Runner Practice',
    description: 'Master the floater and running shots in the lane. Essential skills for scoring against bigger defenders.',
    category: workoutCategories.SHOOTING,
    level: difficultyLevels.INTERMEDIATE,
    duration: '30 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Stationary Floater Form',
        instructions: 'From the lane, practice the floater motion without moving. Focus on the high release point. Take 20 shots.',
        tips: 'The floater should have a high arc to go over defenders.',
        duration: '5 min',
        type: 'repetition',
        reps: 20
      },
      {
        title: 'One-Dribble Floater',
        instructions: 'Take one dribble into the lane and shoot a floater. Practice from both sides. Take 30 total shots.',
        tips: 'Push off your inside foot and extend upward.',
        duration: '10 min',
        type: 'repetition',
        reps: 30
      },
      {
        title: 'Running Floater',
        instructions: 'Drive from the three-point line and finish with a floater in the lane. Take 20 shots from each side.',
        tips: 'Control your speed - you need balance to execute the floater.',
        duration: '10 min',
        type: 'repetition',
        reps: 40
      },
      {
        title: 'Contested Floaters',
        instructions: 'Have a partner provide light contest as you shoot floaters. Take 15 shots.',
        tips: 'Use your body to create space before releasing.',
        duration: '5 min',
        type: 'repetition',
        reps: 15
      }
    ],
    equipment: ['Basketball', 'Hoop', 'Partner (optional)'],
    coachNotes: 'The floater is a must-have skill for guards. It allows you to score in the paint against bigger players.',
    benefits: ['Scoring in the lane', 'Avoiding blocks', 'Versatile finishing', 'Guard skill development']
  },

  // ==================== ADDITIONAL DRIBBLING WORKOUTS (5) ====================
  {
    id: 'dribbling-7',
    title: 'Point Guard Drills',
    description: 'Train like a point guard with ball handling drills designed to improve your ability to run an offense.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.INTERMEDIATE,
    duration: '35 min',
    featured: true,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Ball Control Warmup',
        instructions: 'Perform figure-8s, spider dribbles, and around-the-body dribbles for 5 minutes.',
        tips: 'Keep your head up throughout these warmup drills.',
        duration: '5 min',
        type: 'timed'
      },
      {
        title: 'Change of Direction',
        instructions: 'Dribble full court using a different move at each cone: crossover, between legs, behind back, spin. Repeat 10 times.',
        tips: 'Make each move sharp and decisive.',
        duration: '10 min',
        type: 'repetition',
        reps: 10
      },
      {
        title: 'Retreat Dribble',
        instructions: 'Practice the retreat dribble - moving backward while maintaining control. Go 15 feet back and forward. Repeat 15 times.',
        tips: 'Keep your body low and eyes up.',
        duration: '8 min',
        type: 'repetition',
        reps: 15
      },
      {
        title: 'Split the Defense',
        instructions: 'Set up two cones as defenders. Practice splitting through them with various dribble moves. 20 reps.',
        tips: 'Accelerate through the gap.',
        duration: '7 min',
        type: 'repetition',
        reps: 20
      },
      {
        title: 'Pick and Roll Handling',
        instructions: 'Practice dribbling around a screen (use cone). Make decisions: pull up, drive, or pass. 15 reps.',
        tips: 'Read the imaginary defense and make the right play.',
        duration: '5 min',
        type: 'repetition',
        reps: 15
      }
    ],
    equipment: ['Basketball', 'Cones', 'Full court'],
    coachNotes: 'Point guards need to control the game. These drills develop the skills needed to run an offense.',
    benefits: ['Point guard skills', 'Court vision', 'Decision making', 'Ball security']
  },
  {
    id: 'dribbling-8',
    title: 'Euro Step & Finish',
    description: 'Master the Euro step - one of the most effective moves in basketball for finishing at the rim.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.ADVANCED,
    duration: '30 min',
    featured: true,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Footwork Foundation',
        instructions: 'Without the ball, practice the Euro step footwork. Step wide to one side, then back across. 30 reps each direction.',
        tips: 'The first step should be long and to the side, the second step crosses back.',
        duration: '5 min',
        type: 'repetition',
        reps: 60
      },
      {
        title: 'With Ball - Walking',
        instructions: 'Add the basketball at walking speed. Take two dribbles, gather, and Euro step. 20 reps each side.',
        tips: 'Gather the ball low and explode into the move.',
        duration: '8 min',
        type: 'repetition',
        reps: 40
      },
      {
        title: 'Full Speed Euro Steps',
        instructions: 'Drive from the three-point line and finish with a Euro step layup. 15 reps each side.',
        tips: 'Sell the first step - make defenders commit.',
        duration: '10 min',
        type: 'repetition',
        reps: 30
      },
      {
        title: 'Euro Step Variations',
        instructions: 'Practice Euro step to reverse layup, Euro step to floater, and Euro step to power finish. 5 each.',
        tips: 'Being able to finish multiple ways makes the move even deadlier.',
        duration: '7 min',
        type: 'repetition',
        reps: 15
      }
    ],
    equipment: ['Basketball', 'Hoop', 'Full court'],
    coachNotes: 'The Euro step creates space and avoids charges. Master it to become a more effective scorer.',
    benefits: ['Elite finishing', 'Avoid charges', 'Create space', 'Versatile scoring']
  },
  {
    id: 'dribbling-9',
    title: 'Change of Pace Mastery',
    description: 'Learn to use speed changes to freeze defenders. Sometimes slowing down is the best way to get past someone.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.INTERMEDIATE,
    duration: '30 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Speed Ladder Dribbling',
        instructions: 'Dribble at 50% speed, then explode to 100% on command. Practice for 5 minutes.',
        tips: 'The contrast is what freezes defenders.',
        duration: '5 min',
        type: 'timed'
      },
      {
        title: 'Slow-to-Fast Drill',
        instructions: 'Dribble slowly for 3 dribbles, then explode past a cone. Repeat 20 times.',
        tips: 'Lower your dribble before accelerating.',
        duration: '8 min',
        type: 'repetition',
        reps: 20
      },
      {
        title: 'Hesitation Moves',
        instructions: 'Practice the hesitation dribble - pause like you are stopping, then explode. 25 reps.',
        tips: 'Sell the stop with your body language.',
        duration: '8 min',
        type: 'repetition',
        reps: 25
      },
      {
        title: 'In-and-Out Speed Change',
        instructions: 'Combine the in-and-out dribble with a speed change. 20 reps each hand.',
        tips: 'The in-and-out looks like a crossover, then you go same direction.',
        duration: '9 min',
        type: 'repetition',
        reps: 40
      }
    ],
    equipment: ['Basketball', 'Cones', 'Court space'],
    coachNotes: 'Change of pace is one of the most underrated skills. It makes your speed more effective.',
    benefits: ['Better first step', 'Freeze defenders', 'Efficient movement', 'Basketball IQ']
  },
  {
    id: 'dribbling-10',
    title: 'Double Move Combos',
    description: 'Chain multiple dribble moves together to create unstoppable combinations.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.ADVANCED,
    duration: '35 min',
    featured: false,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Basic Combinations',
        instructions: 'Practice: crossover to between legs, between legs to behind back, behind back to crossover. 15 each combo.',
        tips: 'Each move should flow into the next without pause.',
        duration: '10 min',
        type: 'repetition',
        reps: 45
      },
      {
        title: 'Triple Move Sequences',
        instructions: 'Add a third move to your combinations. Example: crossover, between legs, spin. 10 reps of 3 different combos.',
        tips: 'The third move often gets you past the defender.',
        duration: '10 min',
        type: 'repetition',
        reps: 30
      },
      {
        title: 'Game Speed Combos',
        instructions: 'Execute your combinations at full speed going to the basket. 15 reps.',
        tips: 'In games, you wont have time to think - make it automatic.',
        duration: '8 min',
        type: 'repetition',
        reps: 15
      },
      {
        title: 'Create Your Signature',
        instructions: 'Develop your own signature combination and practice it 25 times.',
        tips: 'The best players have go-to moves defenders cant stop.',
        duration: '7 min',
        type: 'repetition',
        reps: 25
      }
    ],
    equipment: ['Basketball', 'Cones', 'Full court'],
    coachNotes: 'The best ball handlers string moves together. Practice until combinations feel natural.',
    benefits: ['Elite handles', 'Unpredictability', 'Signature moves', 'Confidence with ball']
  },
  {
    id: 'dribbling-11',
    title: 'Tight Space Handling',
    description: 'Learn to maintain control in traffic and tight spaces. Essential for playing in crowded lanes.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.INTERMEDIATE,
    duration: '30 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Low Dribble Control',
        instructions: 'Dribble as low as possible while moving. Keep the ball below knee height for 5 minutes.',
        tips: 'Low dribbles are harder to steal in traffic.',
        duration: '5 min',
        type: 'timed'
      },
      {
        title: 'Cone Forest',
        instructions: 'Set up 10 cones randomly. Dribble through them without touching any. 10 trips through.',
        tips: 'Use your body to protect the ball.',
        duration: '8 min',
        type: 'repetition',
        reps: 10
      },
      {
        title: 'Power Dribble',
        instructions: 'Practice the power dribble - a strong, low dribble while absorbing contact. 30 reps.',
        tips: 'Pound the ball into the ground with force.',
        duration: '7 min',
        type: 'repetition',
        reps: 30
      },
      {
        title: 'Protect and Advance',
        instructions: 'Dribble while a partner tries to poke the ball away (light pressure). Maintain possession for 1 minute. Repeat 5 times.',
        tips: 'Keep your body between the defender and the ball.',
        duration: '10 min',
        type: 'repetition',
        reps: 5
      }
    ],
    equipment: ['Basketball', 'Cones', 'Partner'],
    coachNotes: 'Tight space handling separates good ball handlers from great ones. Dont avoid contact - learn to handle it.',
    benefits: ['Ball security', 'Traffic handling', 'Confidence in lane', 'Reduced turnovers']
  },

  // ==================== ADDITIONAL PHYSICAL WORKOUTS (5) ====================
  {
    id: 'physical-7',
    title: 'Basketball-Specific HIIT',
    description: 'High-intensity interval training designed specifically for basketball players. Build game-ready conditioning.',
    category: workoutCategories.PHYSICAL,
    level: difficultyLevels.INTERMEDIATE,
    duration: '25 min',
    featured: true,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Dynamic Warmup',
        instructions: 'High knees, butt kicks, lateral shuffles, and arm circles for 3 minutes.',
        tips: 'Get your heart rate up gradually.',
        duration: '3 min',
        type: 'timed'
      },
      {
        title: 'Sprint Intervals',
        instructions: 'Sprint baseline to baseline, walk back. Repeat 8 times.',
        tips: 'Give maximum effort on each sprint.',
        duration: '6 min',
        type: 'repetition',
        reps: 8
      },
      {
        title: 'Defensive Slides',
        instructions: '30 seconds of defensive slides, 15 seconds rest. Repeat 6 times.',
        tips: 'Stay low and dont cross your feet.',
        duration: '5 min',
        type: 'repetition',
        reps: 6
      },
      {
        title: 'Jump Series',
        instructions: '10 squat jumps, 10 tuck jumps, 10 split jumps. Repeat 3 sets.',
        tips: 'Focus on explosive power, not just completion.',
        duration: '6 min',
        type: 'repetition',
        reps: 90
      },
      {
        title: 'Cooldown',
        instructions: 'Light jogging and stretching for 5 minutes.',
        tips: 'Bring your heart rate down gradually.',
        duration: '5 min',
        type: 'timed'
      }
    ],
    equipment: ['Full court', 'Timer', 'Water bottle'],
    coachNotes: 'This workout simulates the stop-start nature of basketball. Build the conditioning to play hard all game.',
    benefits: ['Game conditioning', 'Explosive power', 'Recovery speed', 'Mental toughness']
  },
  {
    id: 'physical-8',
    title: 'Explosive First Step',
    description: 'Develop a lightning-quick first step to blow by defenders. Focuses on acceleration and explosiveness.',
    category: workoutCategories.PHYSICAL,
    level: difficultyLevels.ADVANCED,
    duration: '30 min',
    featured: true,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Stance Explosions',
        instructions: 'From triple threat position, explode forward for 3 steps. Reset and repeat 20 times.',
        tips: 'Drive off your back foot with maximum force.',
        duration: '5 min',
        type: 'repetition',
        reps: 20
      },
      {
        title: 'Reaction Starts',
        instructions: 'Have a partner give a visual or audio cue, then explode. 15 reps.',
        tips: 'The fastest players react instantly.',
        duration: '6 min',
        type: 'repetition',
        reps: 15
      },
      {
        title: 'Resistance Band Explosions',
        instructions: 'With a band around your waist (partner holding), explode forward against resistance. 15 reps.',
        tips: 'This builds the power for your first step.',
        duration: '7 min',
        type: 'repetition',
        reps: 15
      },
      {
        title: 'Multi-Directional Bursts',
        instructions: 'Explode in different directions: forward, left, right, 45-degree angles. 20 total bursts.',
        tips: 'You need to be explosive in all directions.',
        duration: '7 min',
        type: 'repetition',
        reps: 20
      },
      {
        title: 'First Step to Finish',
        instructions: 'Combine first step explosion with a finish at the rim. 10 reps each side.',
        tips: 'Put it all together in a game-like situation.',
        duration: '5 min',
        type: 'repetition',
        reps: 20
      }
    ],
    equipment: ['Basketball', 'Hoop', 'Resistance band', 'Partner'],
    coachNotes: 'A quick first step is often the difference between getting to the rim or getting stopped.',
    benefits: ['Quicker first step', 'Beat defenders', 'Explosive acceleration', 'Improved quickness']
  },
  {
    id: 'physical-9',
    title: 'Endurance Circuit',
    description: 'Build basketball stamina with this beginner-friendly circuit workout. Perfect for getting in playing shape.',
    category: workoutCategories.PHYSICAL,
    level: difficultyLevels.BEGINNER,
    duration: '25 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Light Jog',
        instructions: 'Jog around the court for 3 minutes to warm up.',
        tips: 'Keep a comfortable pace - you have a workout ahead.',
        duration: '3 min',
        type: 'timed'
      },
      {
        title: 'Walking Lunges',
        instructions: 'Lunge walk the length of the court. 4 trips total.',
        tips: 'Keep your front knee over your ankle.',
        duration: '5 min',
        type: 'repetition',
        reps: 4
      },
      {
        title: 'Lateral Movement',
        instructions: 'Defensive slides across the width of the court. 10 trips.',
        tips: 'Stay low and move your feet quickly.',
        duration: '4 min',
        type: 'repetition',
        reps: 10
      },
      {
        title: 'Basketball Push-ups',
        instructions: 'Push-ups with hands on a basketball (or regular if too difficult). 3 sets of 10.',
        tips: 'This adds core stability work to your push-ups.',
        duration: '5 min',
        type: 'repetition',
        reps: 30
      },
      {
        title: 'Court Sprints',
        instructions: 'Sprint baseline to free throw line, jog to half court, sprint to far free throw line, jog to end. 5 trips.',
        tips: 'This mimics the pace changes of a real game.',
        duration: '5 min',
        type: 'repetition',
        reps: 5
      },
      {
        title: 'Cool Down Walk',
        instructions: 'Walk around the court and stretch for 3 minutes.',
        tips: 'Let your heart rate come down gradually.',
        duration: '3 min',
        type: 'timed'
      }
    ],
    equipment: ['Full court', 'Basketball (optional)', 'Water bottle'],
    coachNotes: 'Consistency is key with conditioning. Do this workout 3 times per week to build your base.',
    benefits: ['Improved stamina', 'Better conditioning', 'Foundational fitness', 'Injury prevention']
  },
  {
    id: 'physical-10',
    title: 'Lateral Quickness Drill',
    description: 'Improve your side-to-side speed and agility. Essential for defensive movement and driving to the basket.',
    category: workoutCategories.PHYSICAL,
    level: difficultyLevels.INTERMEDIATE,
    duration: '25 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Lateral Bounds',
        instructions: 'Jump side to side, landing on one foot and sticking the landing. 20 each direction.',
        tips: 'Focus on balance and control on each landing.',
        duration: '5 min',
        type: 'repetition',
        reps: 40
      },
      {
        title: 'Speed Ladder Laterals',
        instructions: 'Move laterally through an agility ladder. 10 trips each direction.',
        tips: 'Quick feet, stay on the balls of your feet.',
        duration: '6 min',
        type: 'repetition',
        reps: 20
      },
      {
        title: 'Mirror Drill',
        instructions: 'With a partner, mirror their lateral movements for 30 seconds. Repeat 6 times.',
        tips: 'React as quickly as possible to direction changes.',
        duration: '6 min',
        type: 'repetition',
        reps: 6
      },
      {
        title: 'Cone Weaves',
        instructions: 'Set up 5 cones in a line. Weave through laterally as fast as possible. 10 trips.',
        tips: 'Stay low and push off the outside foot.',
        duration: '5 min',
        type: 'repetition',
        reps: 10
      },
      {
        title: 'Lateral Shuffle to Sprint',
        instructions: 'Shuffle laterally for 10 feet, then sprint forward. Alternate directions. 12 reps.',
        tips: 'This simulates transitioning from defense to offense.',
        duration: '3 min',
        type: 'repetition',
        reps: 12
      }
    ],
    equipment: ['Cones', 'Agility ladder', 'Partner', 'Court space'],
    coachNotes: 'Lateral quickness is crucial for both offense and defense. Train it specifically to see improvement.',
    benefits: ['Better defense', 'Improved agility', 'Quicker direction changes', 'Enhanced footwork']
  },
  {
    id: 'physical-11',
    title: 'Full-Body Power Training',
    description: 'Build explosive power throughout your body for dunking, rebounding, and physical play.',
    category: workoutCategories.PHYSICAL,
    level: difficultyLevels.ADVANCED,
    duration: '40 min',
    featured: false,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Power Warmup',
        instructions: 'Jump rope for 3 minutes, then dynamic stretches for 2 minutes.',
        tips: 'Prepare your muscles for explosive movements.',
        duration: '5 min',
        type: 'timed'
      },
      {
        title: 'Box Jumps',
        instructions: 'Jump onto a box or platform and step down. 4 sets of 8 reps.',
        tips: 'Land softly with bent knees. Increase box height as you improve.',
        duration: '8 min',
        type: 'repetition',
        reps: 32
      },
      {
        title: 'Medicine Ball Slams',
        instructions: 'Slam a medicine ball into the ground with full force. 3 sets of 12.',
        tips: 'Use your entire body - hips, core, and arms.',
        duration: '6 min',
        type: 'repetition',
        reps: 36
      },
      {
        title: 'Broad Jumps',
        instructions: 'Jump forward as far as possible, landing and immediately jumping again. 3 sets of 5.',
        tips: 'Swing your arms to generate momentum.',
        duration: '5 min',
        type: 'repetition',
        reps: 15
      },
      {
        title: 'Power Push-ups',
        instructions: 'Explosive push-ups where your hands leave the ground. 3 sets of 8.',
        tips: 'If too difficult, start on your knees.',
        duration: '5 min',
        type: 'repetition',
        reps: 24
      },
      {
        title: 'Single Leg Hops',
        instructions: 'Hop on one foot as high as possible. 10 on each leg, 3 sets.',
        tips: 'Focus on maximum height, not speed.',
        duration: '6 min',
        type: 'repetition',
        reps: 60
      },
      {
        title: 'Power Cool Down',
        instructions: 'Light stretching and foam rolling for 5 minutes.',
        tips: 'Recovery is crucial after power training.',
        duration: '5 min',
        type: 'timed'
      }
    ],
    equipment: ['Box or platform', 'Medicine ball', 'Jump rope', 'Foam roller'],
    coachNotes: 'Power training should be done when fresh. Allow 48 hours between sessions for recovery.',
    benefits: ['Explosive power', 'Vertical leap', 'Physical strength', 'Rebounding ability']
  },

  // ==================== DEFENSE WORKOUTS (5) ====================
  {
    id: 'defense-1',
    title: 'Defensive Stance Fundamentals',
    description: 'Master the basic defensive stance. The foundation of all good defense starts with proper positioning.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.BEGINNER,
    duration: '20 min',
    featured: true,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Stance Check',
        instructions: 'Hold defensive stance for 30 seconds, rest 15 seconds. Focus on form: feet wide, knees bent, butt down, hands active.',
        tips: 'Your weight should be on the balls of your feet.',
        duration: '5 min',
        type: 'repetition',
        reps: 6
      },
      {
        title: 'Slide Drill',
        instructions: 'In stance, slide 10 feet left, then right. Repeat 20 times.',
        tips: 'Never bring your feet together - maintain wide base.',
        duration: '5 min',
        type: 'repetition',
        reps: 20
      },
      {
        title: 'Drop Step Practice',
        instructions: 'Practice drop stepping (opening hips to run) when beaten. 15 reps each direction.',
        tips: 'The drop step prevents getting blown by.',
        duration: '5 min',
        type: 'repetition',
        reps: 30
      },
      {
        title: 'Stance Endurance',
        instructions: 'Hold defensive stance for 1 minute, focusing on not rising up.',
        tips: 'This builds the leg strength for sustained defense.',
        duration: '5 min',
        type: 'repetition',
        reps: 3
      }
    ],
    equipment: ['Court space', 'Timer'],
    coachNotes: 'Defense starts with stance. If your stance is wrong, everything else will be harder.',
    benefits: ['Proper positioning', 'Defensive foundation', 'Leg strength', 'Ready position']
  },
  {
    id: 'defense-2',
    title: 'Closeout Drills',
    description: 'Learn to closeout on shooters effectively without fouling or getting beaten off the dribble.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.BEGINNER,
    duration: '20 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Basic Closeouts',
        instructions: 'Start at the basket, sprint out to a cone, break down into stance. 20 reps.',
        tips: 'Sprint until the last few steps, then choppy steps to break down.',
        duration: '6 min',
        type: 'repetition',
        reps: 20
      },
      {
        title: 'Hand Up Closeouts',
        instructions: 'Same as before, but focus on getting a hand up to contest. 15 reps.',
        tips: 'One hand high to contest, one hand low to prevent the drive.',
        duration: '5 min',
        type: 'repetition',
        reps: 15
      },
      {
        title: 'Closeout and Slide',
        instructions: 'Closeout, then immediately slide in one direction as if the offense drove. 10 reps each direction.',
        tips: 'Be ready to move after the closeout.',
        duration: '5 min',
        type: 'repetition',
        reps: 20
      },
      {
        title: 'Live Closeouts',
        instructions: 'With a partner who can shoot or drive, practice live closeouts. 10 reps.',
        tips: 'Read the offensive players eyes and hips.',
        duration: '4 min',
        type: 'repetition',
        reps: 10
      }
    ],
    equipment: ['Cones', 'Partner (optional)', 'Basketball'],
    coachNotes: 'Bad closeouts lead to easy baskets. Control your momentum so you can react.',
    benefits: ['Contest shots', 'Prevent easy baskets', 'Defensive recovery', 'Active hands']
  },
  {
    id: 'defense-3',
    title: 'Lateral Slide Training',
    description: 'Improve your lateral movement speed for staying in front of quick guards.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.INTERMEDIATE,
    duration: '25 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Slide Warmup',
        instructions: 'Defensive slides across the lane, 10 trips.',
        tips: 'Get low and stay low throughout.',
        duration: '3 min',
        type: 'repetition',
        reps: 10
      },
      {
        title: 'Speed Slides',
        instructions: 'Slide as fast as possible for 5 seconds, rest 10 seconds. Repeat 10 times.',
        tips: 'Push hard off the trailing foot.',
        duration: '5 min',
        type: 'repetition',
        reps: 10
      },
      {
        title: 'Zig-Zag Slides',
        instructions: 'Slide diagonally forward, then back, creating a zig-zag pattern. Full court 5 times.',
        tips: 'This simulates cutting off a driving player.',
        duration: '5 min',
        type: 'repetition',
        reps: 5
      },
      {
        title: 'Reaction Slides',
        instructions: 'Partner points direction, you slide that way. React as quickly as possible. 30 commands.',
        tips: 'Stay low so you are ready to move any direction.',
        duration: '6 min',
        type: 'repetition',
        reps: 30
      },
      {
        title: 'Full Court Pursuit',
        instructions: 'Slide the full length of the court as fast as possible. 4 trips.',
        tips: 'This builds defensive endurance.',
        duration: '6 min',
        type: 'repetition',
        reps: 4
      }
    ],
    equipment: ['Full court', 'Partner (optional)'],
    coachNotes: 'The best defenders can move laterally as fast as guards can move with the ball.',
    benefits: ['Faster lateral movement', 'Stay in front', 'Defensive endurance', 'Quick feet']
  },
  {
    id: 'defense-4',
    title: 'Help Defense Positioning',
    description: 'Learn where to be when you are not guarding the ball. Good help defense wins championships.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.INTERMEDIATE,
    duration: '25 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Triangle Positioning',
        instructions: 'Practice being in the help triangle between your man, the ball, and the basket. Hold position 20 seconds, 8 reps.',
        tips: 'You should be able to see both your man and the ball.',
        duration: '5 min',
        type: 'repetition',
        reps: 8
      },
      {
        title: 'Jump to Ball',
        instructions: 'When the ball moves, jump toward it while maintaining vision of your man. Practice with passes. 20 reps.',
        tips: 'Always move when the ball moves.',
        duration: '6 min',
        type: 'repetition',
        reps: 20
      },
      {
        title: 'Help and Recover',
        instructions: 'Help on a driving player, then recover to your man. 15 reps.',
        tips: 'Help with your body, hands active but dont foul.',
        duration: '6 min',
        type: 'repetition',
        reps: 15
      },
      {
        title: 'Rotation Drill',
        instructions: 'With partners, practice rotating help defense as the ball moves. 5 minutes continuous.',
        tips: 'Communication is key - call out who has help.',
        duration: '5 min',
        type: 'timed'
      },
      {
        title: 'Help on Drives',
        instructions: 'Practice stepping in to take a charge or deter a drive. 10 reps.',
        tips: 'Set your feet before contact to draw the charge.',
        duration: '3 min',
        type: 'repetition',
        reps: 10
      }
    ],
    equipment: ['Full court', '2-4 partners', 'Basketball'],
    coachNotes: 'Great team defense requires everyone to be in the right position. Its not just about your man.',
    benefits: ['Team defense', 'Defensive IQ', 'Help positioning', 'Rotation awareness']
  },
  {
    id: 'defense-5',
    title: 'On-Ball Pressure Defense',
    description: 'Learn to apply intense pressure on the ball handler without fouling.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.ADVANCED,
    duration: '30 min',
    featured: true,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Trace the Ball',
        instructions: 'Practice mirroring the ball with your hand as a partner dribbles. 2 minutes continuous, 3 sets.',
        tips: 'Your hand should follow the ball like a shadow.',
        duration: '8 min',
        type: 'repetition',
        reps: 3
      },
      {
        title: 'Pressure Without Fouling',
        instructions: 'Guard a dribbler at full intensity. Focus on active hands without reaching. 1 minute each, 6 sets.',
        tips: 'Discipline is key - dont reach, move your feet.',
        duration: '8 min',
        type: 'repetition',
        reps: 6
      },
      {
        title: 'Force Direction',
        instructions: 'Practice forcing the dribbler to their weak hand or toward help. 15 reps.',
        tips: 'Position your body to take away their strong hand.',
        duration: '6 min',
        type: 'repetition',
        reps: 15
      },
      {
        title: 'Full Court Press',
        instructions: 'Apply full court pressure on a ball handler. 5 full court trips.',
        tips: 'Maintain intensity but stay under control.',
        duration: '5 min',
        type: 'repetition',
        reps: 5
      },
      {
        title: 'Steal Attempts',
        instructions: 'Practice timing steals when the dribbler exposes the ball. 10 attempts.',
        tips: 'Only go for steals when you can get the ball, not just a deflection.',
        duration: '3 min',
        type: 'repetition',
        reps: 10
      }
    ],
    equipment: ['Full court', 'Partner', 'Basketball'],
    coachNotes: 'Pressure defense disrupts offenses but requires conditioning and discipline.',
    benefits: ['Ball pressure', 'Force turnovers', 'Disrupt rhythm', 'Defensive intensity']
  },

  // ==================== PASSING WORKOUTS (5) ====================
  {
    id: 'passing-1',
    title: 'Chest Pass Fundamentals',
    description: 'Master the basic chest pass - the most common and reliable pass in basketball.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.BEGINNER,
    duration: '20 min',
    featured: true,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Form Practice',
        instructions: 'Against a wall, practice proper chest pass form. Thumbs down on follow-through. 50 passes.',
        tips: 'Step into your pass for power and accuracy.',
        duration: '5 min',
        type: 'repetition',
        reps: 50
      },
      {
        title: 'Partner Passing',
        instructions: 'With a partner at 15 feet, exchange chest passes. Focus on crisp, accurate passes. 50 each.',
        tips: 'Hit your partner in the chest every time.',
        duration: '6 min',
        type: 'repetition',
        reps: 50
      },
      {
        title: 'Moving Target',
        instructions: 'Partner moves laterally. Lead them with your pass. 30 passes.',
        tips: 'Pass to where they will be, not where they are.',
        duration: '5 min',
        type: 'repetition',
        reps: 30
      },
      {
        title: 'Quick Release',
        instructions: 'Catch and pass as quickly as possible. Focus on receiving and releasing in one motion. 40 passes.',
        tips: 'Soft hands to catch, quick hands to release.',
        duration: '4 min',
        type: 'repetition',
        reps: 40
      }
    ],
    equipment: ['Basketball', 'Wall or partner'],
    coachNotes: 'The chest pass is your bread and butter. Master it before moving to fancier passes.',
    benefits: ['Fundamental passing', 'Accuracy', 'Quick release', 'Team play']
  },
  {
    id: 'passing-2',
    title: 'Bounce Pass Accuracy',
    description: 'Perfect the bounce pass for getting the ball into the post and through traffic.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.BEGINNER,
    duration: '20 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Bounce Point Practice',
        instructions: 'Mark a spot on the floor 2/3 of the way to your target. Hit that spot with your bounce pass. 40 passes.',
        tips: 'The ball should bounce up to waist height for easy catching.',
        duration: '5 min',
        type: 'repetition',
        reps: 40
      },
      {
        title: 'Two-Hand Bounce Pass',
        instructions: 'Standard bounce pass to a partner. Snap your wrists and follow through low. 40 passes.',
        tips: 'A good bounce pass is harder to intercept than a chest pass.',
        duration: '5 min',
        type: 'repetition',
        reps: 40
      },
      {
        title: 'One-Hand Bounce Pass',
        instructions: 'Practice one-hand bounce passes with each hand. 20 each hand.',
        tips: 'One-hand passes are quicker in game situations.',
        duration: '5 min',
        type: 'repetition',
        reps: 40
      },
      {
        title: 'Post Entry Passes',
        instructions: 'Partner sets up in the post. Deliver bounce passes around an imaginary defender. 30 passes.',
        tips: 'Pass to the hand away from the defender.',
        duration: '5 min',
        type: 'repetition',
        reps: 30
      }
    ],
    equipment: ['Basketball', 'Partner'],
    coachNotes: 'Bounce passes are essential for feeding the post and passing through traffic.',
    benefits: ['Post feeding', 'Traffic passing', 'Accurate delivery', 'Reduced turnovers']
  },
  {
    id: 'passing-3',
    title: 'Skip Pass & Court Vision',
    description: 'Develop the ability to throw skip passes and see the whole court. A guard essential skill.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.INTERMEDIATE,
    duration: '25 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'Long Distance Passing',
        instructions: 'From one wing, throw skip passes to the opposite corner. 25 passes.',
        tips: 'Use a high arc and put snap on the ball.',
        duration: '6 min',
        type: 'repetition',
        reps: 25
      },
      {
        title: 'Cross-Court Vision',
        instructions: 'Look one way, pass the other. Practice disguising your skip pass. 20 passes.',
        tips: 'Your eyes can freeze defenders.',
        duration: '6 min',
        type: 'repetition',
        reps: 20
      },
      {
        title: 'Skip Pass off Dribble',
        instructions: 'Dribble toward one side, throw skip pass to the weak side. 20 passes.',
        tips: 'Draw the defense then find the open man.',
        duration: '6 min',
        type: 'repetition',
        reps: 20
      },
      {
        title: 'Full Court Vision',
        instructions: 'Practice outlet passes and full court skip passes. 15 passes.',
        tips: 'Hit your target in stride for fast break opportunities.',
        duration: '5 min',
        type: 'repetition',
        reps: 15
      },
      {
        title: 'No-Look Skip Pass',
        instructions: 'Throw skip passes without looking at your target. 10 attempts.',
        tips: 'Only do this when you are confident in your partners position.',
        duration: '2 min',
        type: 'repetition',
        reps: 10
      }
    ],
    equipment: ['Basketball', '2+ partners', 'Full court'],
    coachNotes: 'Skip passes create easy shots by swinging the ball faster than the defense can rotate.',
    benefits: ['Court vision', 'Long passes', 'Ball movement', 'Defensive breakdown']
  },
  {
    id: 'passing-4',
    title: 'Entry Pass Techniques',
    description: 'Learn various methods to get the ball inside to post players and cutters.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.INTERMEDIATE,
    duration: '25 min',
    featured: false,
    isPremium: false,
    requiredSubscription: 'free',
    steps: [
      {
        title: 'High-Low Entry',
        instructions: 'Pass from the high post to the low post. Practice over and around defenders. 25 passes.',
        tips: 'Use a quick overhead pass to get over fronting defenders.',
        duration: '6 min',
        type: 'repetition',
        reps: 25
      },
      {
        title: 'Wing Entry',
        instructions: 'From the wing, get the ball into the post against imaginary denial. 25 passes.',
        tips: 'Wait for the post player to seal their defender.',
        duration: '6 min',
        type: 'repetition',
        reps: 25
      },
      {
        title: 'Lob Entry',
        instructions: 'Practice lobbing the ball over fronting defenders. 15 passes.',
        tips: 'The post player needs to call for it and position correctly.',
        duration: '5 min',
        type: 'repetition',
        reps: 15
      },
      {
        title: 'Dribble Entry',
        instructions: 'Use a dribble to improve the passing angle, then deliver. 20 passes.',
        tips: 'Sometimes one dribble opens up the passing lane.',
        duration: '5 min',
        type: 'repetition',
        reps: 20
      },
      {
        title: 'Cutter Feeds',
        instructions: 'Hit a cutting teammate with a pass as they go to the basket. 15 passes.',
        tips: 'Timing is everything - pass into their path.',
        duration: '3 min',
        type: 'repetition',
        reps: 15
      }
    ],
    equipment: ['Basketball', '2+ partners', 'Half court'],
    coachNotes: 'Getting the ball inside creates high-percentage shots. Master these entry techniques.',
    benefits: ['Post feeding', 'Inside scoring', 'Pass timing', 'Offensive efficiency']
  },
  {
    id: 'passing-5',
    title: 'No-Look & Flashy Passes',
    description: 'Advanced passing techniques for players who have mastered the fundamentals.',
    category: workoutCategories.DRIBBLING,
    level: difficultyLevels.ADVANCED,
    duration: '30 min',
    featured: true,
    isPremium: true,
    requiredSubscription: 'premium',
    steps: [
      {
        title: 'Look-Away Passes',
        instructions: 'Look at one target, pass to another. Start with stationary receivers. 30 passes.',
        tips: 'You need to know exactly where your teammate is without looking.',
        duration: '7 min',
        type: 'repetition',
        reps: 30
      },
      {
        title: 'Behind-the-Back Pass',
        instructions: 'Practice behind-the-back passes to a partner. 20 with each hand.',
        tips: 'Use a wrapping motion, not a throw.',
        duration: '6 min',
        type: 'repetition',
        reps: 40
      },
      {
        title: 'Wrap-Around Pass',
        instructions: 'Pass around a defender (use cone) with a wrap-around motion. 25 passes.',
        tips: 'Get low and extend around the obstacle.',
        duration: '5 min',
        type: 'repetition',
        reps: 25
      },
      {
        title: 'Off-the-Dribble No-Look',
        instructions: 'Dribble toward a defender, look them off, and hit the open man without looking. 15 passes.',
        tips: 'This is the ultimate misdirection.',
        duration: '5 min',
        type: 'repetition',
        reps: 15
      },
      {
        title: 'Alley-Oop Passes',
        instructions: 'Practice throwing accurate lob passes for alley-oops. 15 attempts.',
        tips: 'The pass should reach its peak at the rim.',
        duration: '5 min',
        type: 'repetition',
        reps: 15
      },
      {
        title: 'Full Court Showtime',
        instructions: 'Combine all flashy passes in a full court setting. Get creative. 5 minutes.',
        tips: 'In games, only use these when appropriate - fundamentals first.',
        duration: '2 min',
        type: 'timed'
      }
    ],
    equipment: ['Basketball', '2+ partners', 'Full court', 'Cone'],
    coachNotes: 'Flashy passes are fun but only effective after mastering fundamentals. Use them wisely.',
    benefits: ['Misdirection', 'Highlight plays', 'Court vision', 'Teammate confidence']
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
  // Two-tier model: a paid (non-'free') subscription unlocks all workouts.
  const isPaid = !!subscription && subscription !== 'free';
  return comprehensiveWorkouts.filter(workout =>
    workout.requiredSubscription === 'free' || isPaid
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
