-- ============================================================
--  MindSpark Game — Question Bank Seed (P1.2)
--  Seeds quiz_questions from the original lib/quizContent.ts set.
--  - 5 levels x (5 normal + 5 boss) = 50 questions
--  - Each set covers 5 distinct categories (one-per-category)
--  - "blank" prompts already rendered as "____"
--  - created_by = NULL marks these as system seed rows
--
--  Safe to re-run: it clears prior seed rows (created_by IS NULL) first.
--  Run AFTER 2026-06-revision.sql.
-- ============================================================

-- Runs against the database selected in phpMyAdmin (no USE needed).

DELETE FROM quiz_questions WHERE created_by IS NULL;

INSERT INTO quiz_questions (level_number, phase, category, prompt, options, correct_index) VALUES
-- ── Level 1 — Treasure Box Multiplication Quest ──────────────────────────────
(1,'normal','Division',      'The dragon has 42 gold coins. He puts them into 6 treasure boxes equally. How many coins are in each box?', '["6","7","8","9"]', 1),
(1,'normal','Multiplication','A robot has 8 wheels on each vehicle. How many wheels are there on 7 vehicles?', '["48","54","56","64"]', 2),
(1,'normal','Equal Sharing', 'The pirate shared 63 gems equally among 9 crew members. How many gems did each member get?', '["6","7","8","9"]', 1),
(1,'normal','Missing Number','Fill in the missing number: ____ x 7 = 49', '["5","6","7","8"]', 2),
(1,'normal','Grouping',      'A ninja collected 72 stars and placed them into 8 bags equally. How many stars are in each bag?', '["7","8","9","10"]', 2),
(1,'boss','Division',      'Fill in the missing number: 56 / ____ = 7', '["6","7","8","9"]', 2),
(1,'boss','Multiplication','A space explorer found 54 alien eggs. He packed them into 6 containers equally. How many eggs are in each container?', '["7","8","9","10"]', 2),
(1,'boss','Equal Sharing', 'Fill in the missing number: ____ x 9 = 72', '["6","7","8","9"]', 2),
(1,'boss','Missing Number','A wizard made 64 magic potions and placed them on 8 shelves equally. How many potions are on each shelf?', '["6","7","8","9"]', 2),
(1,'boss','Grouping',      'Fill in the missing number: 63 / ____ = 9', '["6","7","8","9"]', 1),
-- ── Level 2 — Division Heroes Adventure ──────────────────────────────────────
(2,'normal','Division',      'The superhero collected 84 energy crystals and shared them equally among 4 heroes. How many crystals did each hero get?', '["19","20","21","22"]', 2),
(2,'normal','Remainders',    'A pirate has 95 gold coins and puts them equally into 4 treasure chests. How many coins are in each chest, and how many are left over?', '["23 R3","24 R1","25 R0","22 R2"]', 0),
(2,'normal','Place Value',   'A robot factory made 360 toy robots. They are packed equally into 6 boxes. How many robots are in each box?', '["50","55","60","65"]', 2),
(2,'normal','Equal Sharing', 'Divide the number: 4,000 / 1,000 = ?', '["2","3","4","5"]', 2),
(2,'normal','Multiplication','The wizard baked 73 magic cookies and shared them equally among 8 students. How many cookies did each student get, and how many were left?', '["9 R1","8 R7","10 R3","9 R5"]', 0),
(2,'boss','Division',      'Divide the number: 540 / 10 = ?', '["54","45","64","504"]', 0),
(2,'boss','Remainders',    'A gamer earned 126 points and shared them equally among 7 teammates. How many points did each teammate receive?', '["16","17","18","19"]', 2),
(2,'boss','Place Value',   'Divide the number: 9,000 / 100 = ?', '["9","90","900","9000"]', 1),
(2,'boss','Equal Sharing', 'A farmer packed 58 apples equally into 6 baskets. How many apples are in each basket, and how many apples are left over?', '["8 R6","9 R4","10 R2","9 R2"]', 1),
(2,'boss','Multiplication','Divide the number: 2,400 / 100 = ?', '["24","240","204","20"]', 0),
-- ── Level 3 — Fraction and Number Fun Quest ──────────────────────────────────
(3,'normal','Estimation',  'Mia has 84 apples. She puts them equally into 4 baskets. About how many apples are in each basket?', '["10","20","30","40"]', 1),
(3,'normal','Division',    'A toy car shop packed 96 toy cars into 8 boxes equally. How many toy cars are in each box?', '["10","11","12","13"]', 2),
(3,'normal','Money Math',  'Ben earned PHP 135 from selling cookies. He shared the money equally with 5 friends. How much did each friend get?', '["PHP 25","PHP 27","PHP 30","PHP 35"]', 1),
(3,'normal','Fractions',   'Which fraction shows one whole pizza?', '["2/4","3/4","4/4","5/4"]', 2),
(3,'normal','Number Sense','Lily ate 6/4 slices of cake. What does this mean?', '["Less than 1 whole cake","Exactly 1 whole cake","More than 1 whole cake","No cake at all"]', 2),
(3,'boss','Estimation',  'Add the fractions: 2/8 + 3/8', '["4/8","5/8","6/8","7/8"]', 1),
(3,'boss','Division',    'Subtract the fractions: 7/10 - 2/10', '["3/10","4/10","5/10","6/10"]', 2),
(3,'boss','Money Math',  'Jake has 243 stickers. He shares them equally with 3 friends. How many stickers does each friend get?', '["71","81","91","101"]', 1),
(3,'boss','Fractions',   'Estimate the answer: 198 / 2 is about ?', '["50","80","100","120"]', 2),
(3,'boss','Number Sense','Add the fractions: 1/6 + 4/6', '["3/6","4/6","5/6","6/6"]', 2),
-- ── Level 4 — Shape Slide Explorer ───────────────────────────────────────────
(4,'normal','Translation', 'A square moves 2 steps to the right. What kind of movement is this?', '["Flip","Turn","Slide","Stretch"]', 2),
(4,'normal','Size & Shape', 'A triangle slides 3 steps up and then 2 steps right. Did the shape change its size?', '["Yes","No","Only its corners changed","Only its color changed"]', 1),
(4,'normal','Properties',   'A star slides to a new place on the grid. What stays the same after the slide?', '["Its shape","Its color","Its size","Both A and C"]', 3),
(4,'normal','Direction',    'A circle moves 4 steps left and 1 step down. What movement happened?', '["Flip","Slide","Turn","Spin"]', 1),
(4,'normal','Movement',     'A rectangle slides up on the map. Which direction did it move?', '["Down","Left","Up","Around"]', 2),
(4,'boss','Translation', 'A rocket shape slides 2 steps down and 3 steps left. How many directions did it move?', '["1","2","3","4"]', 1),
(4,'boss','Size & Shape', 'A cat-shaped figure slides to the right. What happens to the shape?', '["It changes shape","It gets bigger","It stays the same","It disappears"]', 2),
(4,'boss','Properties',   'Which movement is a slide?', '["Turning a shape","Flipping a shape","Moving a shape without turning it","Stretching a shape"]', 2),
(4,'boss','Direction',    'A game piece moves 5 steps right and 2 steps up. This is called a:', '["Flip","Translation","Rotation","Reflection"]', 1),
(4,'boss','Movement',     'A square slides across the grid. Which of these changes?', '["Position","Shape","Size","Corners"]', 0),
-- ── Level 5 — Symmetry Super Challenge ───────────────────────────────────────
(5,'normal','Symmetry',          'Which shape has a line of symmetry?', '["Uneven shape","Heart","Zigzag shape","Random scribble"]', 1),
(5,'normal','Lines of Symmetry', 'A square can be folded into matching halves. How many lines of symmetry does a square have?', '["1","2","3","4"]', 3),
(5,'normal','Shape Properties',  'A line of symmetry divides a shape into:', '["Different parts","Equal matching parts","Tiny pieces","Curved lines"]', 1),
(5,'normal','Mirror Image',      'Which shape has no line of symmetry?', '["Circle","Rectangle","Triangle with equal sides","Scalene triangle"]', 3),
(5,'normal','Reasoning',         'If one side of a picture is missing, what can help complete it?', '["A ruler only","A line of symmetry","A random drawing","A shadow"]', 1),
(5,'boss','Symmetry',          'A butterfly has matching wings on both sides. What does this show?', '["Rotation","Sliding","Symmetry","Measurement"]', 2),
(5,'boss','Lines of Symmetry', 'A rectangle has how many lines of symmetry?', '["1","2","3","4"]', 1),
(5,'boss','Shape Properties',  'Which shape has many lines of symmetry?', '["Circle","Trapezoid","Uneven polygon","Open curve"]', 0),
(5,'boss','Mirror Image',      'When completing a symmetric picture, the missing side should be:', '["Bigger","Different","A mirror image","Upside down"]', 2),
(5,'boss','Reasoning',         'Which object shows line symmetry?', '["A balanced capital letter A","A crooked tree","A random cloud","A messy scribble"]', 0);
