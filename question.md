MINDSPARK MATH: FINAL GAMEPLAY & DATABASE SPECIFICATIONS
100% Aligned sa Papel ug sa System Implementation

1. QUIZ PART GAME (QUESTIONS 1 TO 5)
I-display sa upper part sa screen : LEVEL, QUIZ, STARS, POINTS.
About tung gems pud gud sir wala man gud siya sa papers namo sir and also no HP BASED MECHANICS dire sa quiz part sir.
•	LEVEL: I-display kung unsa nga level ang ginadula karon (e.g., Level 1).
•	QUIZ: I-display ang karon nga question placement (e.g., Quiz 1, Quiz 2, ug unsa na siya nga quiz).
•	STARS Logic: If mag-answer sa Quiz 1 tapos tama, makadawat og 1 star. If maka-answer siya og tama sa tanan (Q1-Q5), naa na siyay 5 Stars daan sa dili pa mosulod sa Boss Battle. Inig human sa Question 5, naay mugawas nga trigger warning notification sa screen: "Warning! Boss Battle Phase"
•	POINTS Logic: Ang scoring magsugod sa Q1=100 points, Q2=200 points, Q3=300 points, hangtod moabot og total nga 1000 points sa Question 10 kung tama sa tanan question. (Kini nga POINTS kay ONLY VISUAL LANG sa screen sir para more interested ang mga estudent. DILI KINI I-SAVE SA DATABASE, ug automatic mobalik sa zero (0) inig sugod sa Next Level o kung mag-re-take sa quiz sir.)
2. BOSS BATTLE GAME (QUESTIONS 6 TO 10)
I-display gihapon sa upper part ang: LEVEL, QUIZ, STARS, POINTS. Apan dugangan kini og visual indicators para sa STUDENT HP ug BOSS HP.
•	Visual Display: Pwede mo gamit og horizontal bar o visual line icon lines sir instead of (wordings) para mas child-friendly tan-awon ang HP.
•	If TAMA ang Student: Naay mugawas nga attack animation o sound effect/music gikan sa student, ug ang Boss adunay animation o music/sounds pud nga nasakitan bisan og gamay.
•	If MALI ang Student: Ang student makadawat og animation o gamay nga music/sound nga nasakitan, unya ang Boss maoy motira nga naay kauban nga sound effect.
•	(Bisan og walay tama ang student sa boss battle phase (or nahurot iyang HP) apan aduna siyay nakuha nga score gikan sa quiz part, still proceed gihapon diretso sa Level Completeness screen sir 
3. LEVEL COMPLETENESS & EVALUATION LOGIC
Inig kahuman sa tibuok level, ang evaluation system mag-base sa kinatibuk-ang score o stars nga nakuha (max of 10) aron i-display ang star rating:
Total Score / Star Base	Star Rating Output	Performance Classification
5 Score	⭐ (1 Star)	Low Performance
6 or 8 Score	⭐⭐ (2 Stars)	Moderate Performance
9 or 10 Score	⭐⭐⭐ (3 Stars)	High Performance

-------------------------------------------------------------------------
                        LEVEL 1 COMPLETE!

                      ⭐⭐ (2 Stars Rating)
                      Stars Earned: +6 Stars
                     Points: 600 (Visual Only)

                   🏅 NEW BADGE UNLOCKED!
            [ BADGE IMAGE: MULTIPLICATION MASTER ]

             "Congratulations! You mastered Level 1!"

                          [ NEXT LEVEL ]
-------------------------------------------------------------------------
(So with regards sa unlocking of level sir, pwede sir na I general nalng siya sir like, if I unlock ni maam ang level 1 sa tanan student na handle na niya dile na i mano2 ug unlock sa teacher per student sir, para mas dali. If ever lang sir)
Tapos inig click sa next level gani sir naay pop up mo gawas na "Wait a moment, Challenger! The next level is still locked by your teacher." then naay OK button tapos pag click mo balik sa Dashboard tapos If ready na ang next level pag click sa next level proceed ditso.
Level 2 Complete:  
Badge Image: DIVISION DEFENDER
Subtext: "Congratulations! You defended Level 2!"
·  Level 3 Complete:·  
Badge Image: FRACTION CHAMPION
Subtext: "Congratulations! You conquered Level 3!"
·  Level 4 Complete:  
Badge Image: SHAPE SHIFTER
Subtext: "Congratulations! You mastered Level 4!"
·  Level 5 Complete:
Badge Image: SYMMETRY SCOUT
Subtext: "Congratulations! You completed the final Level!"
4. RE-ATTEMPT & SHOP CHARACTER UNLOCK LOGIC
•	Unlimited Re-attempts: Unlimited mag re attemp sa mga quiz and level.
•	Database Score Saving: Bisan kapila pa sila mag-re-attempt sa same level, ang i-save lang sa system isip level score kay kung unsa ang HIGHEST jud nga attempt score/star aron dili ma-overwrite ang ilang scre.
•	Continuous points  Accumulation: Kada  mag-re-attempt ug magdula ang student, ang matag starspoint (stars) nga iyang makuha kay mag add saa iyang account hangtod sa mapalit niya ang iyang gusto nga character sa Shop.
•	Character Unlock Matrix: Mao kini ang pinal ug sundon nga kantidad sa pag-unlock sa duha ka premium characters:
•	1st Character: Ma-unlock gamit ang 20 Stars/Points
•	2nd Character: Ma-unlock gamit ang 40 Stars/Points

5. Mid-Game EXIT & RE ENTRY SA GAME
Exit sa Quiz Phase (Q1–Q5): Automatic reset diritso sa Question 1 (no database storage)
Exit sa Boss Battle (Q6–Q10): Ma-save isip checkpoint ang agi sa quiz. Inig balik sa student, diretso siya sa Question 6 ang mga stars na earned during quiz.

 

regarding sa erd wordings na gi butang nimo sa system sir pwede nako makuha asa direa na part ang mga names sir. Like nagbuhat man gud kog names sa ERD sir kay ana ka ako nlng magbuhat diha na part mao ni nabuhat sir


pwede nako mahibal-an sir unsa name ani pasabot sir. based sa process kay isa raman gud ang ERD ug ang Data Dictionary sir.

character_data
character_unlocks
classrooms
game_progress
items
quiz_attempts
student_badges
student_wallets
teacher_level_unlocks
users


example sir
user- is ang student tama ba sir or apil na dire ang teacher ug parent?
classromm- is ang section?
avatar- character_data?
like ing ana sir


==========================================================================
ANSWERS / MAPPING: System Table Names → ERD Entity Names
==========================================================================

| System Table Name       | ERD Entity Name     | Pasabot / Explanation                                                                 |
|-------------------------|---------------------|---------------------------------------------------------------------------------------|
| users                   | Teacher + Student + Parent | Usa ra ka table ang `users` sa system. Apil na dire ang teacher, student, ug parent. Gi-differentiate lang sila pinaagi sa `role` column (teacher/student). Ang parent info kay naa sa `parent_email` column sa same table. Sa ERD, gi-separate sila into 3 entities para clarity sa documentation. |
| classrooms              | Section             | OO TAMA. `classrooms` = `Section` sa ERD. Naa siyay `name` (section_name) ug `teacher_id` (foreign key sa teacher). |
| character_data          | Avatar              | OO TAMA. `character_data` = `Avatar` sa ERD. Mao ni ang character/avatar sa student — naa siyay name, class (warrior/mage/rogue/archer), stats, etc. |
| character_unlocks       | Student_Unlock      | `character_unlocks` = `Student_Unlock` sa ERD. Mao ni ang record kung unsa nga character/avatar ang gi-unlock sa student gamit sa ilang stars. |
| quiz_attempts           | Level_Attempt       | `quiz_attempts` = `Level_Attempt` sa ERD. Mao ni ang record sa kada attempt sa student — level, score, is_correct, hearts_remaining, etc. |
| game_progress           | Level (partially)   | `game_progress` = related sa `Level` entity sa ERD. Nag-track ni sa progress sa student — completed levels, level stars, current zone. |
| teacher_level_unlocks   | Level.unlocked      | Mao ni ang controls kung unlocked ba ang level. Sa ERD, kini ang `unlocked` field sa Level table. Ang teacher mag-unlock sa level para sa tanan students. |
| items                   | Question            | Sa ERD, ang `Question` table kay mao ang quiz questions. Sa system, ang `items` table kay for game items (weapons, armor, etc.) — SEPARATE ni sa questions. Ang questions kay gi-handle sa code directly (JSON/hardcoded). Kung gusto i-map sa ERD, ang Question table kay wala pa sa schema as separate table — embedded sa game logic. |
| student_badges          | (Wala explicit sa ERD) | Mao ni ang badges nga ma-earn per level (Multiplication Master, Division Defender, etc.). Wala siya as separate entity sa ERD pero naa sa system. |
| student_wallets         | Student.total_points + Student.total_stars | `student_wallets` = ang `total_points` ug `total_stars` fields sa Student entity sa ERD. Mao ni ang stars/points nga magamit para mag-unlock og characters sa Shop. |

==========================================================================
SUMMARY (Simple Version):
==========================================================================

users              → Teacher, Student, ug Parent (tanan usa ra ka table, gi-separate sa ERD)
classrooms         → Section ✅
character_data     → Avatar ✅
character_unlocks  → Student_Unlock ✅
quiz_attempts      → Level_Attempt ✅
game_progress      → Level (progress tracking)
teacher_level_unlocks → Level.unlocked (teacher controls)
items              → Game Items (weapons/armor) — DILI Question sa ERD
student_badges     → Badges per level (wala sa ERD pero naa sa system)
student_wallets    → Student total_stars / total_points ✅

