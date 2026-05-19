export interface QuizQuestion {
  id: string
  prompt: string
  options: readonly string[]
  correctOptionIndex: number
}

export interface QuizLevel {
  id: number
  title: string
  environmentImagePath: string
  bossImagePath: string
  avatarImagePath: string
  normalQuestions: readonly QuizQuestion[]
  bossQuestions: readonly QuizQuestion[]
}

export const quizAssetReport = {
  sourceDocumentPath: "/QUIZZES 1-5.docx",
  environmentImagePaths: [
    "/BACKGROUND FOREST 1/FOREST 1/2304x1296.png",
    "/BACKGROUND FOREST 1/FOREST 2/2304x1296.png",
    "/BACKGROUND FOREST 1/FOREST 3/2304x1296.png",
    "/BACKGROUND FOREST 1/FOREST 4/2304x1296.png",
    "/BACKGROUND FOREST 1/FOREST 5/2304x1296.png",
  ],
  bossImagePaths: [
    "/AVATAR CHARACTERS/BOSS CHARACTER 5/FOREST GOLEM (LEVEL 1)/Golem_1/PNG/PNG Sequences/Idle/0_Golem_Idle_000.png",
    "/AVATAR CHARACTERS/BOSS CHARACTER 5/Minotaur_1 (LEVEL 2)/PNG/PNG Sequences/Idle/0_Minotaur_Idle_000.png",
    "/AVATAR CHARACTERS/BOSS CHARACTER 5/WRAIGHT_3 (LEVEL 3)/PNG/Wraith_03 LEVEL 3/PNG Sequences/Idle/Wraith_03_Idle_000.png",
    "/AVATAR CHARACTERS/BOSS CHARACTER 5/Fallen_Angels_3 (LEVEL 4)/PNG/PNG Sequences/Idle/0_Fallen_Angels_Idle_000.png",
    "/AVATAR CHARACTERS/BOSS CHARACTER 5/Dark_Oracle_3 (LEVEL 5)/PNG/PNG Sequences/Idle/0_Dark_Oracle_Idle_000.png",
  ],
  avatarImagePaths: [
    "/AVATAR CHARACTERS/3 AVATAR/2D-KNIGHT BOY CHARACTER/_PNG/1_KNIGHT_ AVATAR/Knight_01__IDLE_000.png",
    "/AVATAR CHARACTERS/3 AVATAR/2D-FAIRY CHARACTER/_PNG/FAIRY AVATAR 1/Fairy_01__IDLE_000.png",
    "/AVATAR CHARACTERS/3 AVATAR/2D-ELF CHARACTER/_PNG/ELF AVATAR 1/Elf_01__IDLE_000.png",
  ],
} as const

export const quizLevels = [
  {
    id: 1,
    title: "Treasure Box Multiplication Quest",
    environmentImagePath: "/BACKGROUND FOREST 1/FOREST 1/2304x1296.png",
    bossImagePath:
      "/AVATAR CHARACTERS/BOSS CHARACTER 5/FOREST GOLEM (LEVEL 1)/Golem_1/PNG/PNG Sequences/Idle/0_Golem_Idle_000.png",
    avatarImagePath:
      "/AVATAR CHARACTERS/3 AVATAR/2D-KNIGHT BOY CHARACTER/_PNG/1_KNIGHT_ AVATAR/Knight_01__IDLE_000.png",
    normalQuestions: [
      {
        id: "level-1-normal-1",
        prompt:
          "The dragon has 42 gold coins. He puts them into 6 treasure boxes equally. How many coins are in each box?",
        options: ["6", "7", "8", "9"],
        correctOptionIndex: 1,
      },
      {
        id: "level-1-normal-2",
        prompt: "A robot has 8 wheels on each vehicle. How many wheels are there on 7 vehicles?",
        options: ["48", "54", "56", "64"],
        correctOptionIndex: 2,
      },
      {
        id: "level-1-normal-3",
        prompt:
          "The pirate shared 63 gems equally among 9 crew members. How many gems did each member get?",
        options: ["6", "7", "8", "9"],
        correctOptionIndex: 1,
      },
      {
        id: "level-1-normal-4",
        prompt: "Fill in the missing number: blank x 7 = 49",
        options: ["5", "6", "7", "8"],
        correctOptionIndex: 2,
      },
      {
        id: "level-1-normal-5",
        prompt:
          "A ninja collected 72 stars and placed them into 8 bags equally. How many stars are in each bag?",
        options: ["7", "8", "9", "10"],
        correctOptionIndex: 2,
      },
    ],
    bossQuestions: [
      {
        id: "level-1-boss-1",
        prompt: "Fill in the missing number: 56 / blank = 7",
        options: ["6", "7", "8", "9"],
        correctOptionIndex: 2,
      },
      {
        id: "level-1-boss-2",
        prompt:
          "A space explorer found 54 alien eggs. He packed them into 6 containers equally. How many eggs are in each container?",
        options: ["7", "8", "9", "10"],
        correctOptionIndex: 2,
      },
      {
        id: "level-1-boss-3",
        prompt: "Fill in the missing number: blank x 9 = 72",
        options: ["6", "7", "8", "9"],
        correctOptionIndex: 2,
      },
      {
        id: "level-1-boss-4",
        prompt:
          "A wizard made 64 magic potions and placed them on 8 shelves equally. How many potions are on each shelf?",
        options: ["6", "7", "8", "9"],
        correctOptionIndex: 2,
      },
      {
        id: "level-1-boss-5",
        prompt: "Fill in the missing number: 63 / blank = 9",
        options: ["6", "7", "8", "9"],
        correctOptionIndex: 1,
      },
    ],
  },
  {
    id: 2,
    title: "Division Heroes Adventure",
    environmentImagePath: "/BACKGROUND FOREST 1/FOREST 2/2304x1296.png",
    bossImagePath:
      "/AVATAR CHARACTERS/BOSS CHARACTER 5/Minotaur_1 (LEVEL 2)/PNG/PNG Sequences/Idle/0_Minotaur_Idle_000.png",
    avatarImagePath:
      "/AVATAR CHARACTERS/3 AVATAR/2D-FAIRY CHARACTER/_PNG/FAIRY AVATAR 1/Fairy_01__IDLE_000.png",
    normalQuestions: [
      {
        id: "level-2-normal-1",
        prompt:
          "The superhero collected 84 energy crystals and shared them equally among 4 heroes. How many crystals did each hero get?",
        options: ["19", "20", "21", "22"],
        correctOptionIndex: 2,
      },
      {
        id: "level-2-normal-2",
        prompt:
          "A pirate has 95 gold coins and puts them equally into 4 treasure chests. How many coins are in each chest, and how many are left over?",
        options: ["23 R3", "24 R1", "25 R0", "22 R2"],
        correctOptionIndex: 0,
      },
      {
        id: "level-2-normal-3",
        prompt:
          "A robot factory made 360 toy robots. They are packed equally into 6 boxes. How many robots are in each box?",
        options: ["50", "55", "60", "65"],
        correctOptionIndex: 2,
      },
      {
        id: "level-2-normal-4",
        prompt: "Divide the number: 4,000 / 1,000 = ?",
        options: ["2", "3", "4", "5"],
        correctOptionIndex: 2,
      },
      {
        id: "level-2-normal-5",
        prompt:
          "The wizard baked 73 magic cookies and shared them equally among 8 students. How many cookies did each student get, and how many were left?",
        options: ["9 R1", "8 R7", "10 R3", "9 R5"],
        correctOptionIndex: 0,
      },
    ],
    bossQuestions: [
      {
        id: "level-2-boss-1",
        prompt: "Divide the number: 540 / 10 = ?",
        options: ["54", "45", "64", "504"],
        correctOptionIndex: 0,
      },
      {
        id: "level-2-boss-2",
        prompt:
          "A gamer earned 126 points and shared them equally among 7 teammates. How many points did each teammate receive?",
        options: ["16", "17", "18", "19"],
        correctOptionIndex: 2,
      },
      {
        id: "level-2-boss-3",
        prompt: "Divide the number: 9,000 / 100 = ?",
        options: ["9", "90", "900", "9000"],
        correctOptionIndex: 1,
      },
      {
        id: "level-2-boss-4",
        prompt:
          "A farmer packed 58 apples equally into 6 baskets. How many apples are in each basket, and how many apples are left over?",
        options: ["8 R6", "9 R4", "10 R2", "9 R2"],
        correctOptionIndex: 1,
      },
      {
        id: "level-2-boss-5",
        prompt: "Divide the number: 2,400 / 100 = ?",
        options: ["24", "240", "204", "20"],
        correctOptionIndex: 0,
      },
    ],
  },
  {
    id: 3,
    title: "Fraction and Number Fun Quest",
    environmentImagePath: "/BACKGROUND FOREST 1/FOREST 3/2304x1296.png",
    bossImagePath:
      "/AVATAR CHARACTERS/BOSS CHARACTER 5/WRAIGHT_3 (LEVEL 3)/PNG/Wraith_03 LEVEL 3/PNG Sequences/Idle/Wraith_03_Idle_000.png",
    avatarImagePath:
      "/AVATAR CHARACTERS/3 AVATAR/2D-ELF CHARACTER/_PNG/ELF AVATAR 1/Elf_01__IDLE_000.png",
    normalQuestions: [
      {
        id: "level-3-normal-1",
        prompt:
          "Mia has 84 apples. She puts them equally into 4 baskets. About how many apples are in each basket?",
        options: ["10", "20", "30", "40"],
        correctOptionIndex: 1,
      },
      {
        id: "level-3-normal-2",
        prompt:
          "A toy car shop packed 96 toy cars into 8 boxes equally. How many toy cars are in each box?",
        options: ["10", "11", "12", "13"],
        correctOptionIndex: 2,
      },
      {
        id: "level-3-normal-3",
        prompt:
          "Ben earned PHP 135 from selling cookies. He shared the money equally with 5 friends. How much did each friend get?",
        options: ["PHP 25", "PHP 27", "PHP 30", "PHP 35"],
        correctOptionIndex: 1,
      },
      {
        id: "level-3-normal-4",
        prompt: "Which fraction shows one whole pizza?",
        options: ["2/4", "3/4", "4/4", "5/4"],
        correctOptionIndex: 2,
      },
      {
        id: "level-3-normal-5",
        prompt: "Lily ate 6/4 slices of cake. What does this mean?",
        options: [
          "Less than 1 whole cake",
          "Exactly 1 whole cake",
          "More than 1 whole cake",
          "No cake at all",
        ],
        correctOptionIndex: 2,
      },
    ],
    bossQuestions: [
      {
        id: "level-3-boss-1",
        prompt: "Add the fractions: 2/8 + 3/8",
        options: ["4/8", "5/8", "6/8", "7/8"],
        correctOptionIndex: 1,
      },
      {
        id: "level-3-boss-2",
        prompt: "Subtract the fractions: 7/10 - 2/10",
        options: ["3/10", "4/10", "5/10", "6/10"],
        correctOptionIndex: 2,
      },
      {
        id: "level-3-boss-3",
        prompt:
          "Jake has 243 stickers. He shares them equally with 3 friends. How many stickers does each friend get?",
        options: ["71", "81", "91", "101"],
        correctOptionIndex: 1,
      },
      {
        id: "level-3-boss-4",
        prompt: "Estimate the answer: 198 / 2 is about ?",
        options: ["50", "80", "100", "120"],
        correctOptionIndex: 2,
      },
      {
        id: "level-3-boss-5",
        prompt: "Add the fractions: 1/6 + 4/6",
        options: ["3/6", "4/6", "5/6", "6/6"],
        correctOptionIndex: 2,
      },
    ],
  },
  {
    id: 4,
    title: "Shape Slide Explorer",
    environmentImagePath: "/BACKGROUND FOREST 1/FOREST 4/2304x1296.png",
    bossImagePath:
      "/AVATAR CHARACTERS/BOSS CHARACTER 5/Fallen_Angels_3 (LEVEL 4)/PNG/PNG Sequences/Idle/0_Fallen_Angels_Idle_000.png",
    avatarImagePath:
      "/AVATAR CHARACTERS/3 AVATAR/2D-KNIGHT BOY CHARACTER/_PNG/1_KNIGHT_ AVATAR/Knight_01__IDLE_000.png",
    normalQuestions: [
      {
        id: "level-4-normal-1",
        prompt: "A square moves 2 steps to the right. What kind of movement is this?",
        options: ["Flip", "Turn", "Slide", "Stretch"],
        correctOptionIndex: 2,
      },
      {
        id: "level-4-normal-2",
        prompt:
          "A triangle slides 3 steps up and then 2 steps right. Did the shape change its size?",
        options: ["Yes", "No", "Only its corners changed", "Only its color changed"],
        correctOptionIndex: 1,
      },
      {
        id: "level-4-normal-3",
        prompt: "A star slides to a new place on the grid. What stays the same after the slide?",
        options: ["Its shape", "Its color", "Its size", "Both A and C"],
        correctOptionIndex: 3,
      },
      {
        id: "level-4-normal-4",
        prompt: "A circle moves 4 steps left and 1 step down. What movement happened?",
        options: ["Flip", "Slide", "Turn", "Spin"],
        correctOptionIndex: 1,
      },
      {
        id: "level-4-normal-5",
        prompt: "A rectangle slides up on the map. Which direction did it move?",
        options: ["Down", "Left", "Up", "Around"],
        correctOptionIndex: 2,
      },
    ],
    bossQuestions: [
      {
        id: "level-4-boss-1",
        prompt: "A rocket shape slides 2 steps down and 3 steps left. How many directions did it move?",
        options: ["1", "2", "3", "4"],
        correctOptionIndex: 1,
      },
      {
        id: "level-4-boss-2",
        prompt: "A cat-shaped figure slides to the right. What happens to the shape?",
        options: ["It changes shape", "It gets bigger", "It stays the same", "It disappears"],
        correctOptionIndex: 2,
      },
      {
        id: "level-4-boss-3",
        prompt: "Which movement is a slide?",
        options: [
          "Turning a shape",
          "Flipping a shape",
          "Moving a shape without turning it",
          "Stretching a shape",
        ],
        correctOptionIndex: 2,
      },
      {
        id: "level-4-boss-4",
        prompt: "A game piece moves 5 steps right and 2 steps up. This is called a:",
        options: ["Flip", "Translation", "Rotation", "Reflection"],
        correctOptionIndex: 1,
      },
      {
        id: "level-4-boss-5",
        prompt: "A square slides across the grid. Which of these changes?",
        options: ["Position", "Shape", "Size", "Corners"],
        correctOptionIndex: 0,
      },
    ],
  },
  {
    id: 5,
    title: "Symmetry Super Challenge",
    environmentImagePath: "/BACKGROUND FOREST 1/FOREST 5/2304x1296.png",
    bossImagePath:
      "/AVATAR CHARACTERS/BOSS CHARACTER 5/Dark_Oracle_3 (LEVEL 5)/PNG/PNG Sequences/Idle/0_Dark_Oracle_Idle_000.png",
    avatarImagePath:
      "/AVATAR CHARACTERS/3 AVATAR/2D-FAIRY CHARACTER/_PNG/FAIRY AVATAR 1/Fairy_01__IDLE_000.png",
    normalQuestions: [
      {
        id: "level-5-normal-1",
        prompt: "Which shape has a line of symmetry?",
        options: ["Uneven shape", "Heart", "Zigzag shape", "Random scribble"],
        correctOptionIndex: 1,
      },
      {
        id: "level-5-normal-2",
        prompt:
          "A square can be folded into matching halves. How many lines of symmetry does a square have?",
        options: ["1", "2", "3", "4"],
        correctOptionIndex: 3,
      },
      {
        id: "level-5-normal-3",
        prompt: "A line of symmetry divides a shape into:",
        options: ["Different parts", "Equal matching parts", "Tiny pieces", "Curved lines"],
        correctOptionIndex: 1,
      },
      {
        id: "level-5-normal-4",
        prompt: "Which shape has no line of symmetry?",
        options: ["Circle", "Rectangle", "Triangle with equal sides", "Scalene triangle"],
        correctOptionIndex: 3,
      },
      {
        id: "level-5-normal-5",
        prompt: "If one side of a picture is missing, what can help complete it?",
        options: ["A ruler only", "A line of symmetry", "A random drawing", "A shadow"],
        correctOptionIndex: 1,
      },
    ],
    bossQuestions: [
      {
        id: "level-5-boss-1",
        prompt: "A butterfly has matching wings on both sides. What does this show?",
        options: ["Rotation", "Sliding", "Symmetry", "Measurement"],
        correctOptionIndex: 2,
      },
      {
        id: "level-5-boss-2",
        prompt: "A rectangle has how many lines of symmetry?",
        options: ["1", "2", "3", "4"],
        correctOptionIndex: 1,
      },
      {
        id: "level-5-boss-3",
        prompt: "Which shape has many lines of symmetry?",
        options: ["Circle", "Trapezoid", "Uneven polygon", "Open curve"],
        correctOptionIndex: 0,
      },
      {
        id: "level-5-boss-4",
        prompt: "When completing a symmetric picture, the missing side should be:",
        options: ["Bigger", "Different", "A mirror image", "Upside down"],
        correctOptionIndex: 2,
      },
      {
        id: "level-5-boss-5",
        prompt: "Which object shows line symmetry?",
        options: ["A balanced capital letter A", "A crooked tree", "A random cloud", "A messy scribble"],
        correctOptionIndex: 0,
      },
    ],
  },
] as const satisfies readonly QuizLevel[]

export const levelCount = quizLevels.length
