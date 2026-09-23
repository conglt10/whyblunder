/**
 * coach-manager.js - Interactive Sparring Coach Manager for WhyBlunder.
 * Powers level-tuned AI play, pedagogical blunder injection ("Bait & Spot"),
 * dual speech bubble commentary, interactive hints, and takebacks.
 * Compatible with Browser and Node.js.
 */
(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        const exported = factory();
        root.CoachManager = exported.CoachManager || exported;
        root.COACH_PERSONAS = exported.COACH_PERSONAS;
    }
}(typeof self !== 'undefined' ? self : this, function() {
    'use strict';

    function getChess() {
        if (typeof Chess !== 'undefined') return Chess;
        if (typeof window !== 'undefined' && window.Chess) return window.Chess;
        try {
            const c = require('./chess.min.js');
            return c.Chess || c;
        } catch (e) {
            return null;
        }
    }

    function getEvaluator() {
        if (typeof ChessEvaluator !== 'undefined') return ChessEvaluator;
        if (typeof window !== 'undefined' && window.ChessEvaluator) return window.ChessEvaluator;
        try {
            return require('./chess-evaluator.js');
        } catch (e) {
            return null;
        }
    }

    function getRecognizer() {
        if (typeof SituationRecognizer !== 'undefined') return SituationRecognizer;
        if (typeof window !== 'undefined' && window.SituationRecognizer) return window.SituationRecognizer;
        try {
            return require('./situation-recognizer.js');
        } catch (e) {
            return null;
        }
    }

    function getOpeningDetector() {
        if (typeof OpeningDetector !== 'undefined') return OpeningDetector;
        if (typeof window !== 'undefined' && window.OpeningDetector) return window.OpeningDetector;
        try {
            return require('./opening-detector.js');
        } catch (e) {
            return null;
        }
    }

    function getI18n() {
        if (typeof WhyBlunderI18N !== 'undefined') return WhyBlunderI18N;
        if (typeof window !== 'undefined' && window.WhyBlunderI18N) return window.WhyBlunderI18N;
        if (typeof global !== 'undefined' && global.WhyBlunderI18N) return global.WhyBlunderI18N;
        try {
            return require('./i18n.js');
        } catch (e) {
            return null;
        }
    }

    /**
     * Localize a template with English fallback (byte-identical EN).
     * Deterministic — pure function of (lang, key, enDefault, params).
     */
    function tx(lang, key, enDefault, params) {
        const I18N = getI18n();
        if (I18N && typeof I18N.t === 'function') {
            return I18N.t(key, enDefault, params, lang);
        }
        if (typeof enDefault === 'string' && params) {
            return enDefault.replace(/\{(\w+)\}/g, function(m, n) {
                return (params[n] !== undefined && params[n] !== null) ? String(params[n]) : m;
            });
        }
        return enDefault;
    }

    function getDiagnostics() {
        if (typeof MoveDiagnostics !== 'undefined') return MoveDiagnostics;
        if (typeof window !== 'undefined' && window.MoveDiagnostics) return window.MoveDiagnostics;
        try {
            return require('./move-diagnostics.js');
        } catch (e) {
            return null;
        }
    }

    /**
     * Parody Coach Personas with distinct Elo ratings and conversational voices.
     */
    const COACH_PERSONAS = {
        pikaru: {
            id: 'pikaru',
            name: 'Coach Pikaru',
            elo: 1600,
            title: 'Speed & Passed Pawn Prodigy',
            flag: '🇺🇸',
            blunderInterval: 7, // Blunder candidate check every ~7 coach plies
            skillLevel: 14,
            depthDial: 'dynamic',
            voice: {
                intro: "Hey! Ready to play? I love passed pawns and fast play—let's do this!",
                thinking: "Calculating my fastest counter-attack...",
                brilliantNudge: ["There's a fireworks move here. Find it!"],
                playerBrilliant: ["Wow, brilliant move! Fireworks on the board!"],
                passedPawn: [
                    "Passed pawn! I'm hoping my new passed pawn will become a queen one day.",
                    "Passed pawn! That pawn is on a one-way trip to the 8th rank.",
                    "Look at that passed pawn! Push 'em till they promote."
                ],
                castle: [
                    "Castling! Tucking my king away and connecting the rooks. Very standard.",
                    "King safety first! Now my rooks are ready to roll."
                ],
                fork: [
                    "Fork! Double attack! How are you going to save both?",
                    "A nice little fork right there. Classic tactics!"
                ],
                pin: [
                    "Pinned! That piece is glued to the square.",
                    "Nice pin right along the line. Moving it would be disastrous!"
                ],
                attackQueen: [
                    "Watch out! My piece is eyeing your Queen!",
                    "Heavy piece on the run! Where's your Queen heading?"
                ],
                attackRook: [
                    "Threatening your rook! You'll need to deal with that pressure.",
                    "Direct fire on your rook. How do you defend?"
                ],
                openFile: [
                    "Rook on the open file! Taking the highway straight into your position.",
                    "Open files belong to rooks. Let's see you contest this!"
                ],
                outpost: [
                    "Outpost secured! That knight cannot be kicked by pawns.",
                    "Boom! Central outpost. Try removing this monster!"
                ],
                centerStrike: [
                    "Striking right at the center! That's where the real fight is.",
                    "Center blast! Let's see who controls the middle."
                ],
                check: [
                    "Check! Keeping the initiative going.",
                    "Check! Can you find the cleanest escape?"
                ],
                capture: [
                    "Taking that piece to clear up the board!",
                    "Chomp! Simplifying the position."
                ],
                develop: [
                    "Developing my pieces rapidly. Active squares only!",
                    "Bringing another piece into the fight."
                ],
                genericMove: [
                    "Solidifying my position and keeping control.",
                    "Improving my coordination step by step."
                ],
                challengeOnlyMove: [
                    "Only one option there, what can you do?",
                    "That's pretty much forced! Let's see your response.",
                    "Forced reply! Show me what you've got."
                ],
                challengeBlunderBait: [
                    "Uh oh, did I get careless? Look closely at my pieces...",
                    "Wait a second... did I just slip up? Can you punish this?",
                    "Tactical alert! I might have overextended. Do you see what I missed?"
                ],
                baitByMotif: {
                    fork: [
                        "Hmm, my pieces look a bit crowded. Anything jump out at you?",
                        "Double trouble alert! Check what's lined up against my pieces."
                    ],
                    pin: [
                        "Did I just freeze my piece on that line? Look closely!",
                        "That piece can't move without disaster behind it... see it?"
                    ],
                    skewer: [
                        "A line opens right through my heavy pieces. Spot the tactic!",
                        "Look along the files and diagonals—did I just align my pieces poorly?"
                    ],
                    discovered: [
                        "Watch out for surprise attacks if one of your pieces moves!",
                        "Did I forget about the piece hiding behind yours? Uncover the threat!"
                    ],
                    hanging: [
                        "Uh oh, did I leave a piece unguarded? Take a look!",
                        "Check the defense count—did my last move drop material?"
                    ],
                    kingSafety: [
                        "My king feels a bit drafty after that. Can you find the attack?",
                        "Kingside vulnerability! Can you crack open my king?"
                    ],
                    mateThreat: [
                        "Is that a mating net forming? Spot the decisive attack!",
                        "Danger zone! Can you push for checkmate here?"
                    ]
                },
                praiseSpotBlunder: [
                    "Boom! You saw right through my slip-up. Nice catch!",
                    "Great eye! You punished my mistake immediately.",
                    "You got me! That was a sharp tactical spot."
                ],
                praiseWithHint: [
                    "Nice! You found it with a little nudge!",
                    "Great follow-through! You converted the hint into a win.",
                    "Good job spotting that after the hint!"
                ],
                praiseAfterReveal: [
                    "There's the move! Good tactical execution.",
                    "That was the solution. Keep that pattern in your memory bank!",
                    "Clean follow-through on the revealed tactic."
                ],
                missedBlunder: [
                    "Phew! You let me off the hook. You had a chance to punish me there!",
                    "I dodged a bullet! You missed the tactical shot.",
                    "Whew, I was sweating for a second! You let me escape."
                ],
                playerBlunder: [
                    "Wait, hold up! Look at the board—I think that might be a blunder!",
                    "Whoa, be careful! That leaves your position wide open!",
                    "Hold on! Check what's aiming at that square before committing."
                ],
                playerGoodMove: [
                    "Nice move! Very clean and active.",
                    "Strong reply! You're keeping the pressure on.",
                    "Good piece placement! I like that idea."
                ],
                playerBestMove: [
                    "Boom! Best move on the board! Maximum activity!",
                    "Sharp tactical vision! You found the top engine move.",
                    "Crushing it! That's the most accurate continuation."
                ],
                challengeDevelopment: [
                    "You still have pieces asleep on the back rank. Can you mobilize them?",
                    "Bringing your minor pieces into play is top priority. Which piece will you develop next?"
                ],
                challengeCenter: [
                    "Who will command the center? Look for moves that stake a claim.",
                    "The center is up for grabs! Can you seize space?"
                ],
                challengePinDefense: [
                    "One of your pieces is pinned. Can you break the pin or defend it?",
                    "Don't let my pin paralyze your position!"
                ],
                challengeEndgame: [
                    "In the endgame, the active king is worth a minor piece. Time to march!",
                    "Precision matters in the endgame. Look ahead a few moves before deciding!"
                ],
                challengeGeneric: [
                    "Your turn! What's your plan here?",
                    "The ball is in your court. Where are you going?",
                    "Let's see how you respond to that!"
                ]
            }
        },
        mcmarty: {
            id: 'mcmarty',
            name: 'Coach McMarty',
            elo: 800,
            title: 'Enthusiastic Rookie Coach',
            flag: '🇨🇦',
            blunderInterval: 4, // Blunders frequently
            skillLevel: 5,
            depthDial: 'concise',
            voice: {
                intro: "Hi friend! I'm learning chess too! Let's have a great game together!",
                thinking: "Thinking... let me make sure I don't hang my rook!",
                brilliantNudge: ["Ooh, I sense something *bold* for you here…"],
                playerBrilliant: ["Brilliant! You're a genius! I didn't see that!"],
                passedPawn: [
                    "Yay, my pawn is moving forward! Go little buddy!",
                    "Is this a passed pawn? I think it wants to be a queen!"
                ],
                castle: [
                    "Castling! My king likes hiding in the corner where it's cozy.",
                    "Safety dance! King is tucked in."
                ],
                fork: [
                    "Look at me, attacking two things at once!",
                    "Fork! Did I just do a tactic?"
                ],
                pin: [
                    "I think I pinned something! Don't move it or something bad happens!",
                    "Freezed! You can't move that piece!"
                ],
                attackQueen: [
                    "Oh boy! I'm pointing at your Queen! Is that allowed?!",
                    "Watch out Queenie, here I come!"
                ],
                attackRook: [
                    "Aiming at your rook! Hope you don't take my piece!",
                    "Look out in the corner! My piece is visiting your rook."
                ],
                openFile: [
                    "Beep beep! Rook driving down the open road!",
                    "I love putting rooks where there are no pawns!"
                ],
                outpost: [
                    "My horsey has a nice little nest here. Looks comfortable!",
                    "Look at my knight sitting pretty!"
                ],
                centerStrike: [
                    "Charging into the middle! Hope I don't regret this!",
                    "Pawn forward! Center battle!"
                ],
                check: [
                    "Check! Did I startle you? Be honest!",
                    "Check! I hope I didn't forget to defend my own pieces though."
                ],
                capture: [
                    "Piece taken! I love capturing things!",
                    "Got one! Hope that wasn't a trap..."
                ],
                develop: [
                    "Moving my pieces out like the books say!",
                    "Here comes my knight! Gallop gallop."
                ],
                genericMove: [
                    "I think this is a good square... maybe?",
                    "Making a move! Hopefully not a blunder."
                ],
                challengeOnlyMove: [
                    "Only one option there, what can you do?",
                    "Uh oh, you don't have many choices here!",
                    "Forced move! Let's see you do it."
                ],
                challengeBlunderBait: [
                    "Wait, did I just do something really silly? Take a peek...",
                    "Uh oh! I might have left something hanging! Can you find it?",
                    "Did I make an oopsie? Spot my mistake if you can!"
                ],
                baitByMotif: {
                    fork: [
                        "Oopsie! Did I just let you attack two of my pieces at once?! 🙈",
                        "Uh oh! Fork alert! Can you find where your piece hits two of mine?"
                    ],
                    pin: [
                        "Oh no! I think one of my pieces is frozen and can't move! Pin time!",
                        "Uh oh, is my piece stuck in front of my king? Can you spot the pin?"
                    ],
                    skewer: [
                        "Oops! My pieces are standing in a straight line like bowling pins!",
                        "Skewer alert! Did I line up my king and rook for you?"
                    ],
                    discovered: [
                        "Wait, if your piece steps aside, does something laser beam into mine?",
                        "Surprise! Look what happens if you move your piece out of the way!"
                    ],
                    hanging: [
                        "Oops… did I leave something without a guard? 🙈",
                        "Uh oh, is my piece totally free for the taking?! Check it out!"
                    ],
                    kingSafety: [
                        "Yikes! My king doesn't have many friends around him! Can you check me?",
                        "My king is looking scared! Can you find the way in?"
                    ],
                    mateThreat: [
                        "Wait, am I getting checkmated?! Spot the winning move!",
                        "Checkmate danger! Can you wrap up the game right now?"
                    ]
                },
                praiseSpotBlunder: [
                    "Aww shucks, you got me! Good eye!",
                    "You found it! I knew I shouldn't have moved there!",
                    "Nice catch! You're really good at this!"
                ],
                praiseWithHint: [
                    "Yay, you got it with a little hint! Super proud of you!",
                    "Awesome! You listened to the hint and smashed it!",
                    "Look at you go! Nice find after that clue!"
                ],
                praiseAfterReveal: [
                    "Yep, that was the big move! Now you know the trick!",
                    "There it is! Playing the top move like a champ!",
                    "That was the solution! Great job putting it on the board!"
                ],
                missedBlunder: [
                    "Phew! You didn't take my piece! That was close!",
                    "Yay, I survived! You missed my blunder, don't tell anyone!",
                    "Whew, I got lucky there! Keep your eyes peeled!"
                ],
                playerBlunder: [
                    "Oh no! Did you mean to put that there? You can take it back if you want!",
                    "Wait, I think I can capture that! Want to undo and try again?",
                    "Careful friend! That piece looks a little lonely and undefended."
                ],
                playerGoodMove: [
                    "Whoa, good move! You're really good at this!",
                    "Nice! That looks super tricky for me.",
                    "Great move! I need to think carefully now."
                ],
                playerBestMove: [
                    "Whoa!! You found the absolute best move! Are you a grandmaster in disguise?!",
                    "Spectacular move! That's the number one best choice!",
                    "Awesome find! I didn't even see that coming!"
                ],
                challengeDevelopment: [
                    "Don't leave your knights and bishops sleeping in bed! Bring 'em out!",
                    "Let's see you get all your pieces off the back rank!"
                ],
                challengeCenter: [
                    "The middle of the board is where the party is! Jump in!",
                    "Can your pawns challenge my pawns in the middle?"
                ],
                challengePinDefense: [
                    "Uh oh, I pinned you! Can you unpin yourself?",
                    "Be careful with pinned pieces!"
                ],
                challengeEndgame: [
                    "We're in the endgame! Bring out your King!",
                    "Pawns are like gold now. Which one are you pushing?"
                ],
                challengeGeneric: [
                    "Your turn, my friend! Show me your best!",
                    "What are you gonna do next? I'm excited to see!",
                    "Tick tock! Well, take your time really!"
                ]
            }
        },
        sophy: {
            id: 'sophy',
            name: 'Coach Sophy',
            elo: 1200,
            title: 'Club Coach & Instructor',
            flag: '🇬🇧',
            blunderInterval: 6,
            skillLevel: 10,
            depthDial: 'instructional',
            voice: {
                intro: "Welcome to class! Let's focus on piece harmony, solid defense, and tactical awareness.",
                thinking: "Assessing positional dynamics and king safety...",
                brilliantNudge: ["There's a brilliant idea in this position; think about what you could give up."],
                playerBrilliant: ["A brilliant sacrifice! Masterfully played."],
                passedPawn: [
                    "Passed pawn! A passed pawn increases in value as the board clears.",
                    "Advancing the passed pawn to tie down your defensive pieces."
                ],
                castle: [
                    "Castling into safety. Remember, King safety is rule number one in the opening.",
                    "Connecting the rooks and securing the king."
                ],
                fork: [
                    "A tactical fork! Notice how the attacker cannot be easily challenged.",
                    "Forking two targets. Always check candidate forcing moves."
                ],
                pin: [
                    "Notice the pin? Absolute or relative, it restricts your piece's mobility.",
                    "A classic pin. How do you break the tension?"
                ],
                attackQueen: [
                    "Tension on your most valuable piece. Finding the right retreat square is key.",
                    "Threatening your Queen. Keep her active, don't just hide!"
                ],
                attackRook: [
                    "Applying pressure to your rook. Defense or counter-attack?",
                    "Rooks on open lines are prime targets. Be alert!"
                ],
                openFile: [
                    "Controlling the open file is a fundamental tenet of rook play.",
                    "Rooks demand open files. Will you contest or close it?"
                ],
                outpost: [
                    "A strong knight on an advanced outpost exerts influence on key squares.",
                    "An anchored outpost is worth more than a static rook."
                ],
                centerStrike: [
                    "A classical strike for central space. Control the center, control the game.",
                    "Challenging your central pawns. Do you trade or advance?"
                ],
                check: [
                    "Check! Forcing your king to respond.",
                    "Check! Inspect your three defenses: capture, block, or run."
                ],
                capture: [
                    "Capturing to resolve the tension in the center.",
                    "Recapturing to maintain material balance."
                ],
                develop: [
                    "Developing with tempo towards the center.",
                    "Active piece placement. Every piece should have a job."
                ],
                genericMove: [
                    "Improving coordination and reinforcing key squares.",
                    "Maintaining a harmonious pawn structure."
                ],
                challengeOnlyMove: [
                    "Only one option there, what can you do?",
                    "A strictly forced continuation. Demonstrate the proper technique.",
                    "When options are limited, precision is key. What's the only move?"
                ],
                challengeBlunderBait: [
                    "Tactical question for you: did I just create a weakness you can exploit?",
                    "Look carefully at the board. There is an instructive tactic available right now.",
                    "I made an inaccuracy. Can you find the tactical refutation?"
                ],
                baitByMotif: {
                    fork: [
                        "Tactical check: my pieces are clustered. Can you spot the fork?",
                        "Examine the board for a double attack motif—two targets are vulnerable."
                    ],
                    pin: [
                        "I think one of my pieces can't move freely now. Can you spot the pin?",
                        "Notice the alignment with my king: an absolute pin is available."
                    ],
                    skewer: [
                        "Geometry lesson: two valuable targets are aligned. Find the skewer.",
                        "Look for an x-ray attack through the front piece onto the piece behind."
                    ],
                    discovered: [
                        "A masked battery has formed. Find the discovered attack!",
                        "Uncovering an attack: which piece should vacate to unleash the line?"
                    ],
                    hanging: [
                        "Count the attackers versus defenders. Is one of my pieces hanging?",
                        "Material calculation: my last move left a piece en prise."
                    ],
                    kingSafety: [
                        "My king's shelter has been compromised. Exploit the weakened diagonal or file.",
                        "King safety flaw: calculate the most forcing check or entry square."
                    ],
                    mateThreat: [
                        "Calculate the mating net—my king has run out of escape squares.",
                        "Forcing mate sequence available. Don't rush, calculate precisely."
                    ]
                },
                praiseSpotBlunder: [
                    "Well done! You correctly recognized the tactical motif.",
                    "Spot on! That is exactly how to punish that mistake.",
                    "Excellent tactical calculation! Clean and precise."
                ],
                praiseWithHint: [
                    "Well done! You pieced the tactic together with that clue.",
                    "Good work! You recognized the theme after the hint.",
                    "Excellent execution once the motif was highlighted."
                ],
                praiseAfterReveal: [
                    "That is the textbook refutation. Commit that motif to memory.",
                    "Correct execution of the revealed move. Good technique.",
                    "That was the solution line. Solid tactical pattern to remember."
                ],
                missedBlunder: [
                    "You let me off the hook! Take a look at the alternative: you had a tactical win.",
                    "Opportunity missed! Remember to scan for undefended targets on every ply.",
                    "A slight oversight—you had a tactical shot to gain an advantage."
                ],
                playerBlunder: [
                    "Caution: that square leaves your piece without adequate protection. Let's examine what happened.",
                    "Be mindful of loose pieces. 'Loose pieces drop off' as the saying goes.",
                    "That move concedes tactical leverage. Consider trying a safer alternative."
                ],
                playerGoodMove: [
                    "Very sound move! Solid piece harmony.",
                    "Well played. That controls critical central outposts.",
                    "Strong move! You're applying good principles."
                ],
                playerBestMove: [
                    "Superb calculation! That is the computer's top recommended move.",
                    "Exemplary technique. You identified the strongest move in the position.",
                    "Masterclass move! Clean, principled, and tactically flawless."
                ],
                challengeDevelopment: [
                    "Complete your development! Knights and bishops belong on active squares.",
                    "King safety and piece development—which piece should move next?"
                ],
                challengeCenter: [
                    "The center is the heart of the board. How will you contest it?",
                    "Evaluate the central pawn tension. Trade, push, or hold?"
                ],
                challengePinDefense: [
                    "You have a pinned piece. Find a way to unpin or add a defender.",
                    "Pins can be dangerous. Alleviate the pin with proper technique."
                ],
                challengeEndgame: [
                    "In the endgame, the active king is worth a full minor piece. How will you coordinate?",
                    "Calculate pawn races carefully. Precision is everything in endgames."
                ],
                challengeGeneric: [
                    "Your turn. What is your strategic plan here?",
                    "Evaluate your candidate moves carefully.",
                    "Look for checks, captures, and threats."
                ]
            }
        },
        mangoose: {
            id: 'mangoose',
            name: 'GM Mangoose',
            elo: 2200,
            title: 'Endgame Wizard',
            flag: '🇳🇴',
            blunderInterval: 12, // Rarely blunders
            skillLevel: 20,
            depthDial: 'deep',
            voice: {
                intro: "Let's play. Keep it clean, don't rush, and let's see how deep your endgame understanding goes.",
                thinking: "Calculating... seeing deep into the endgame.",
                brilliantNudge: ["A strong player would find the sacrifice here."],
                playerBrilliant: ["A truly brilliant sacrifice. Excellent vision."],
                passedPawn: [
                    "Passed pawn! In the endgame, passed pawns must be pushed.",
                    "Creating a passed pawn. Now the endgame conversion begins.",
                    "Passed pawn! The outside passer will decide the game."
                ],
                castle: [
                    "Castling. King is secure, now the real game starts.",
                    "Simple, prophylactic castling."
                ],
                fork: [
                    "Fork. Inescapable pressure on your key pieces.",
                    "Classic double attack. The math is simple."
                ],
                pin: [
                    "Pinned to the king. Structural paralysis.",
                    "That piece is going nowhere."
                ],
                attackQueen: [
                    "Your queen is under fire. Handle with precision.",
                    "Tempo on the queen. Where does she go?"
                ],
                attackRook: [
                    "Targeting the rook. Defense requires absolute accuracy.",
                    "Putting heat on the heavy artillery."
                ],
                openFile: [
                    "The open file is mine. Infiltration next.",
                    "Rook dominates the file."
                ],
                outpost: [
                    "Permanent outpost. You'll suffer trying to dislodge it.",
                    "A thorn in your side."
                ],
                centerStrike: [
                    "Central tension favors the better-prepared side.",
                    "Disrupting your central grip."
                ],
                check: [
                    "Check. Precision is required.",
                    "Check. Narrowing down your legal options."
                ],
                capture: [
                    "Liquidating into a favorable structure.",
                    "Taking that piece. The conversion becomes simpler."
                ],
                develop: [
                    "Maximum piece activity. No passive squares allowed.",
                    "Harmonious piece placement across all ranks."
                ],
                genericMove: [
                    "Squeezing the position and taking away your active squares.",
                    "Prophylaxis. Preventing your counterplay before it starts."
                ],
                challengeOnlyMove: [
                    "Only one option there, what can you do?",
                    "Completely forced. Show me you know the only move.",
                    "No room for error here. What's the only continuation?"
                ],
                challengeBlunderBait: [
                    "Interesting... I might have given you a rare chance here. Can you see it?",
                    "Did I slip up? Let's see if your tactical vision is sharp enough.",
                    "A rare opening. Spot the punish if you can."
                ],
                baitByMotif: {
                    fork: [
                        "A subtle geometric vulnerability. Can you exploit the double attack?",
                        "Two loose pieces share a focal square. Find it."
                    ],
                    pin: [
                        "A pin paralyzes the defense. Exploit the frozen square.",
                        "Structural tension along the line. See the pin?"
                    ],
                    skewer: [
                        "A line opens. Few players see the skewer.",
                        "Linear geometry on the open diagonal. Find the penetration."
                    ],
                    discovered: [
                        "The front piece acts as a detonator. Unmask the discovered attack.",
                        "Discovered attack potential. Vacate with maximum effect."
                    ],
                    hanging: [
                        "A tactical lapse in protection. The exchange math is in your favor.",
                        "Loose piece. Punish the lack of defense."
                    ],
                    kingSafety: [
                        "King shelter is fractured. Find the surgical mating attack.",
                        "The king is critically exposed. Precision required."
                    ],
                    mateThreat: [
                        "Mating net closing in. Calculate to the finish.",
                        "Inescapable checkmate sequence. Show me the technique."
                    ]
                },
                praiseSpotBlunder: [
                    "Impressive! You actually found the punishment. Very sharp.",
                    "Top class. You spotted the tactical shot immediately.",
                    "Respect. That was a grandmaster-level response."
                ],
                praiseWithHint: [
                    "You converted the clue into the correct line. Acceptable.",
                    "Good adjustment after the hint. That's the right calculation.",
                    "You found the tactic once pointed in the right direction."
                ],
                praiseAfterReveal: [
                    "That is the engine line. Technique completed.",
                    "The refutation is played. Learn the underlying geometry.",
                    "Standard conversion on the revealed solution."
                ],
                missedBlunder: [
                    "You missed the critical refutation. At this level, you have to seize every chance.",
                    "Escape achieved! You let me back into the game.",
                    "You hesitated and missed the punishing blow. Keep your tactical radar on."
                ],
                playerBlunder: [
                    "That move is fatally compromised. I'll give you a chance to take it back.",
                    "A tactical oversight like that won't survive against high-level play.",
                    "That creates an immediate losing weakness. See why?"
                ],
                playerGoodMove: [
                    "Good move. Accurate and ambitious.",
                    "Sharp play! You found the best engine response.",
                    "High level technique right there. I like it."
                ],
                playerBestMove: [
                    "Grandmaster-level accuracy. You found the engine's best line.",
                    "Top-tier play. No concessions given with that move.",
                    "Absolute precision. The engine confirms that is best."
                ],
                challengeDevelopment: [
                    "Undeveloped pieces in the opening are liabilities. Coordinate your army.",
                    "Efficiency is everything. Develop with purpose."
                ],
                challengeCenter: [
                    "The center dictates the wings. Can you maintain stability?",
                    "Every central pawn move has consequences. Calculate carefully."
                ],
                challengePinDefense: [
                    "That pin is suffocating your mobility. Break the bind.",
                    "Passive defense fails against pins. Find an active solution."
                ],
                challengeEndgame: [
                    "The endgame is where games are won or lost. Activate your king!",
                    "King activity and passed pawns—that is the essence of chess."
                ],
                challengeGeneric: [
                    "Your turn. Calculate carefully.",
                    "What's your plan against the squeeze?",
                    "Every tempo counts now. Your move."
                ]
            }
        }
    };

    /**
     * Pick random phrase from array
     */
    function pickRandom(arr) {
        if (!arr || arr.length === 0) return '';
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /**
     * Progressive Coach Hint Templates organized by motif and ladder level (1-4).
     * Provides differentiated phrasing for beginner (<=900 Elo), default (1000-1900 Elo),
     * and master (>=2000 Elo) personas.
     */
    const HINT_TEMPLATES = {
        fork: {
            1: {
                beginner: "Coach Hint: Can you spot a fork? Look closely at your {piece} on {from}.",
                default: "Coach Hint: There's a tactical fork hiding here. Can you spot which square your {piece} can attack from?",
                master: "Coach Hint: Geometric motif: there is a double attack available with your {piece}."
            },
            2: {
                beginner: "Coach Hint: Your {piece} can attack {targetNames} at the same time!",
                default: "Coach Hint: Your {piece} can strike multiple targets at once ({targetNames}).",
                master: "Coach Hint: Multiple enemy targets ({targetNames}) are vulnerable to a simultaneous attack."
            },
            3: {
                beginner: "Coach Hint: Try moving your {piece} to {to}!",
                default: "Coach Hint: Look at {to}, where your {piece} attacks multiple pieces simultaneously.",
                master: "Coach Hint: Focus on {to} to establish an inescapable double attack."
            },
            4: {
                beginner: "Coach Hint: Play {san}! It forks {targetNames}!",
                default: "Coach Hint: {san}! After this fork, you win material.{followUpText}",
                master: "Coach Hint: {san} is decisive, creating an unresolvable double attack.{followUpText}"
            }
        },
        pin: {
            1: {
                beginner: "Coach Hint: Can you spot a pin? Look at your {piece} on {from}.",
                default: "Coach Hint: There is a pin you can exploit. Take a close look at your {piece} on {from}.",
                master: "Coach Hint: Relative or absolute pin: find the line of fire for your {piece}."
            },
            2: {
                beginner: "Coach Hint: My piece is pinned in front of something valuable! Put pressure on it.",
                default: "Coach Hint: An enemy piece cannot move freely without exposing a high-value piece behind it.",
                master: "Coach Hint: Exploit the pinned piece along the line to paralyze the enemy defense."
            },
            3: {
                beginner: "Coach Hint: Put pressure on the pinned piece by moving to {to}!",
                default: "Coach Hint: Move your {piece} to {to} to target and paralyze the pinned piece.",
                master: "Coach Hint: Press the pinned unit by targeting {to}."
            },
            4: {
                beginner: "Coach Hint: Play {san}! It pins and wins!",
                default: "Coach Hint: {san}! Exploiting the pin to win material or dominate the line.{followUpText}",
                master: "Coach Hint: {san} exploits the pin with maximum technical force.{followUpText}"
            }
        },
        skewer: {
            1: {
                beginner: "Coach Hint: Look for a skewer! Your {piece} on {from} can line up two pieces.",
                default: "Coach Hint: An alignment allows a skewer with your {piece} on {from}.",
                master: "Coach Hint: Linear geometry: a skewer can be executed with your {piece}."
            },
            2: {
                beginner: "Coach Hint: Attack the more valuable piece in front so the piece behind it is left open!",
                default: "Coach Hint: Lining up the enemy pieces: once the front piece steps aside, the one behind is lost.",
                master: "Coach Hint: Skewer the enemy pieces along the open file, rank, or diagonal."
            },
            3: {
                beginner: "Coach Hint: Aim your {piece} at {to}!",
                default: "Coach Hint: Move your {piece} to {to} to skewer the aligned pieces.",
                master: "Coach Hint: {to} establishes the penetrating skewer ray."
            },
            4: {
                beginner: "Coach Hint: Play {san}! The skewer wins material!",
                default: "Coach Hint: {san}! The front piece must evade, leaving the piece behind it to fall.{followUpText}",
                master: "Coach Hint: {san} skewers the pieces decisively.{followUpText}"
            }
        },
        discovered: {
            1: {
                beginner: "Coach Hint: What happens if your {piece} on {from} gets out of the way?",
                default: "Coach Hint: A discovered attack is waiting! Look at your {piece} on {from}.",
                master: "Coach Hint: Battery unmasking: vacating {from} unleashes a discovered attack."
            },
            2: {
                beginner: "Coach Hint: Moving your {piece} will unleash a surprise attack on my {targetNames}!",
                default: "Coach Hint: Moving your {piece} uncovers a direct line of attack from your backline piece against {targetNames}.",
                master: "Coach Hint: Moving the front piece exposes a masked attack on {targetNames}."
            },
            3: {
                beginner: "Coach Hint: Look at moving your {piece} to {to} to reveal the attack!",
                default: "Coach Hint: Reposition your {piece} to {to}, uncovering the line of attack with tempo.",
                master: "Coach Hint: {to} unmasks the discovered attack with maximum tactical impact."
            },
            4: {
                beginner: "Coach Hint: Play {san}! It unmasks the discovered attack!",
                default: "Coach Hint: {san}! Uncovering the attack wins decisive material or initiative.{followUpText}",
                master: "Coach Hint: {san} unmasks the discovered attack cleanly.{followUpText}"
            }
        },
        hanging: {
            1: {
                beginner: "Coach Hint: Is anything of mine unprotected? Look at your {piece} on {from}.",
                default: "Coach Hint: You have a tactical capture available! Look at your {piece} on {from}.",
                master: "Coach Hint: Tactical oversight: undefended piece en prise for your {piece}."
            },
            2: {
                beginner: "Coach Hint: Count my defenders—look closely at my loose piece on {to}!",
                default: "Coach Hint: The enemy piece on {to} is undefended or insufficiently guarded.",
                master: "Coach Hint: Static exchange evaluation favors capturing on {to}."
            },
            3: {
                beginner: "Coach Hint: Your {piece} can capture on {to} right now!",
                default: "Coach Hint: Target {to}—capturing there wins clean material without adequate defense.",
                master: "Coach Hint: Capture on {to} to collect the unprotected material."
            },
            4: {
                beginner: "Coach Hint: Play {san}! Grab the free piece!",
                default: "Coach Hint: {san}! Capturing on {to} safely wins material.{followUpText}",
                master: "Coach Hint: {san} takes the loose piece, converting the advantage.{followUpText}"
            }
        },
        mateThreat: {
            1: {
                beginner: "Coach Hint: My king looks drafty! Look at your {piece} on {from}.",
                default: "Coach Hint: Checkmating net or mating attack available! Focus on your {piece} on {from}.",
                master: "Coach Hint: Mating net: calculate the forcing mating sequence starting with your {piece}."
            },
            2: {
                beginner: "Coach Hint: You can trap my king with checks or unstoppable mate threats!",
                default: "Coach Hint: The enemy king lacks escape squares. Look for the most forcing line.",
                master: "Coach Hint: King safety is fatally compromised; calculate the mating corridor."
            },
            3: {
                beginner: "Coach Hint: Aim your {piece} at {to} to tighten the net!",
                default: "Coach Hint: Move your {piece} to {to} to bring unstoppable mating pressure.",
                master: "Coach Hint: {to} executes the decisive mating threat."
            },
            4: {
                beginner: "Coach Hint: Play {san}! It leads to checkmate!",
                default: "Coach Hint: {san}! A lethal blow sealing the checkmate or decisive win.{followUpText}",
                master: "Coach Hint: {san} finishes the attack with unavoidable mate.{followUpText}"
            }
        },
        check: {
            1: {
                beginner: "Coach Hint: You have an active check! Look at your {piece} on {from}.",
                default: "Coach Hint: Look for a forcing check to pressure the enemy King with your {piece} on {from}.",
                master: "Coach Hint: Forcing tempo: evaluate the check available with your {piece}."
            },
            2: {
                beginner: "Coach Hint: Checking the king forces me to respond while you keep the initiative!",
                default: "Coach Hint: A check here restricts opponent options and keeps tempo firmly on your side.",
                master: "Coach Hint: Initiating checks constrains the defense and drives the king into vulnerability."
            },
            3: {
                beginner: "Coach Hint: Look at checking from {to}!",
                default: "Coach Hint: Mobilize your {piece} to {to} to deliver check and restrict the king.",
                master: "Coach Hint: Step to {to} with check to control the initiative."
            },
            4: {
                beginner: "Coach Hint: Play {san}! Check!",
                default: "Coach Hint: {san}! An aggressive check that maintains strong initiative.{followUpText}",
                master: "Coach Hint: {san} delivers check with optimal tactical pressure.{followUpText}"
            }
        },
        trapped: {
            1: {
                beginner: "Coach Hint: One of my pieces has no safe squares! Look at your {piece} on {from}.",
                default: "Coach Hint: You can trap an enemy piece using your {piece} on {from}.",
                master: "Coach Hint: Domination motif: an enemy piece's escape squares can be completely cut off."
            },
            2: {
                beginner: "Coach Hint: An enemy piece is boxed in with nowhere to run!",
                default: "Coach Hint: The opponent's piece mobility is restricted—trap it and win material.",
                master: "Coach Hint: Systematic square denial traps the target piece."
            },
            3: {
                beginner: "Coach Hint: Move your {piece} to {to} to shut the door!",
                default: "Coach Hint: Advance to {to} to cut off the final retreat square.",
                master: "Coach Hint: {to} clamps the trap shut on the target piece."
            },
            4: {
                beginner: "Coach Hint: Play {san}! The piece is trapped!",
                default: "Coach Hint: {san}! The trapped piece cannot escape capture.{followUpText}",
                master: "Coach Hint: {san} traps the piece decisively.{followUpText}"
            }
        },
        positional: {
            1: {
                beginner: "Coach Hint: No direct tactic here. Look at improving your {piece} on {from}.",
                default: "Coach Hint: Solid positional play: look to activate your {piece} on {from}.",
                master: "Coach Hint: Positional prophylaxis and coordination: find the ideal square for your {piece}."
            },
            2: {
                beginner: "Coach Hint: Your {piece} on {from} isn't doing much yet. Find a more active square!",
                default: "Coach Hint: Look to control the center, open files, or key outposts with your {piece}.",
                master: "Coach Hint: Enhance piece harmony and contest structural weaknesses."
            },
            3: {
                beginner: "Coach Hint: Consider moving your {piece} toward {to}!",
                default: "Coach Hint: Re-routing your {piece} to {to} secures better space and activity.",
                master: "Coach Hint: Station your {piece} on {to} to dominate vital outposts."
            },
            4: {
                beginner: "Coach Hint: Try playing {san}! It improves your piece placement.",
                default: "Coach Hint: {san}! A harmonious positional move improving piece activity.{followUpText}",
                master: "Coach Hint: {san} optimizes your coordination and maintains strategic control.{followUpText}"
            }
        },
        sacrifice: {
            1: {
                beginner: "Coach Hint: Something bold works here! Sometimes giving up a piece wins even more.",
                default: "Coach Hint: There's a brilliant sacrifice in this position. What could you give up to break through?",
                master: "Coach Hint: Material is secondary here: look for a sacrifice that opens the position."
            },
            2: {
                beginner: "Coach Hint: Look at your {piece} on {from}. It can be the hero of this move!",
                default: "Coach Hint: Your {piece} on {from} is the piece to offer.",
                master: "Coach Hint: The sacrificial candidate is your {piece} on {from}."
            },
            3: {
                beginner: "Coach Hint: Move your {piece} to {to}, even if it looks like it can be taken!",
                default: "Coach Hint: Put your {piece} on {to}. The opponent can take it, but it costs them.",
                master: "Coach Hint: {to} is the key square for the sacrifice."
            },
            4: {
                beginner: "Coach Hint: Play {san}! It's a brilliant sacrifice.",
                default: "Coach Hint: {san}!! A brilliant sacrifice.{followUpText}",
                master: "Coach Hint: {san}!! The sacrifice is sound.{followUpText}"
            }
        }
    };

    class CoachManager {
        /**
         * @param {object} options
         * @param {string} [options.personaId='pikaru']
         * @param {object} [options.worker=null] - StockfishWorker or compatible evaluator
         * @param {string} [options.playerColor='w']
         */
        constructor(options = {}) {
            const ChessClass = getChess();
            if (!ChessClass) throw new Error("chess.js not found");
            this.Chess = ChessClass;

            this.chess = new this.Chess();
            this.personaId = options.personaId || 'pikaru';
            this.persona = COACH_PERSONAS[this.personaId] || COACH_PERSONAS.pikaru;
            this.worker = options.worker || null;
            this.playerColor = options.playerColor || 'w'; // 'w' or 'b'
            this.coachColor = (this.playerColor === 'w') ? 'b' : 'w';
            this.adaptive = Boolean(options.adaptive);

            this.moveHistory = []; // Array of { ply, san, from, to, moveObj, isPlayer, bubble1, bubble2, eval }
            this.pendingChallenge = null; // Active blunder challenge object
            this.pliesSinceBlunder = 0;
            this.isGameOver = false;
            this.gameResult = null;
            this.resigned = false;
            this.resignedColor = null;
            this.lastMoveQuality = null;
            this.announcedOpening = false;
            this.lastSuggestedMove = null; // Track coach suggestion for takeback follow-up { fen, san, uci }
            this._positionEvalCache = new Map(); // Cache deep evaluations by FEN to prevent search swing
            this.errorProfile = {
                hangingPiece: 0,
                tacticalBlunder: 0,
                missedFork: 0,
                kingSafety: 0,
                endgameTechnique: 0,
                openingPrinciple: 0
            };

            // Progressive Hint Ladder State & Tracking
            this.hintState = {
                posKey: null,
                level: 0,
                plan: null
            };
            this.hintStats = {
                totalPresses: 0,
                movesWithHints: 0,
                fullReveals: 0,
                challengesSolved: {
                    unaided: 0,
                    withHints: 0,
                    missed: 0
                }
            };
            this.pendingOpportunity = null;
            this.lastBaitType = null;
            this.lang = (options.lang === 'vi' || options.lang === 'en')
                ? options.lang
                : 'en';

            // Current speech commentary
            this.currentBubble1 = this.voiceText('intro', this.persona.voice.intro);
            this.currentBubble2 = tx(this.lang, 'coach.makeMoveFull', 'Make your opening move to get started!');
            this.currentDialogue = `${this.currentBubble1}${tx(this.lang, 'coach.makeMove', ' Make your opening move to get started!')}`;
        }

        /**
         * Language: 'en' (default) or 'vi'. Manual toggle only; in-memory,
         * no persistence. Re-renders only newly generated speech — history
         * bubbles keep the language they were created in.
         */
        setLang(lang) {
            if (lang === 'vi' || lang === 'en') this.lang = lang;
            const I18N = getI18n();
            if (I18N && typeof I18N.setLang === 'function') {
                try { I18N.setLang(this.lang); } catch (e) { /* ignore */ }
            }
            return this.lang;
        }

        getLang() {
            return this.lang;
        }

        /** Template lookup bound to this coach's language (EN fallback). */
        L(key, enDefault, params) {
            return tx(this.lang, key, enDefault, params);
        }

        /**
         * Persona voice array with VI override + EN fallback.
         * Same deterministic contract as before (caller picks index).
         */
        voiceLines(key, fallback) {
            const enValue = (this.persona.voice && this.persona.voice[key] !== undefined)
                ? this.persona.voice[key]
                : fallback;
            const I18N = getI18n();
            if (this.lang === 'vi' && I18N && typeof I18N.voice === 'function') {
                return I18N.voice(this.personaId, key, enValue, undefined, this.lang);
            }
            return enValue;
        }

        /** Single-string persona voice (intro/thinking) with VI override. */
        voiceText(key, fallback) {
            const enValue = (this.persona.voice && this.persona.voice[key] !== undefined)
                ? this.persona.voice[key]
                : fallback;
            const I18N = getI18n();
            if (this.lang === 'vi' && I18N && typeof I18N.voice === 'function') {
                return I18N.voice(this.personaId, key, enValue, undefined, this.lang);
            }
            return enValue;
        }

        /** Bait-by-motif voice list with VI override + EN fallback. */
        baitLines(motifType, fallback) {
            const enValue = (this.persona.voice && this.persona.voice.baitByMotif &&
                this.persona.voice.baitByMotif[motifType]) || fallback;
            const I18N = getI18n();
            if (this.lang === 'vi' && I18N && typeof I18N.voice === 'function') {
                return I18N.voice(this.personaId, 'baitByMotif', enValue, motifType, this.lang);
            }
            return enValue;
        }

        _resetHintState() {
            this.hintState = {
                posKey: null,
                level: 0,
                plan: null
            };
        }

        getDialogue() {
            return this.currentDialogue || this.currentBubble2 || this.currentBubble1 || "";
        }

        getPersona() {
            return this.persona;
        }

        setPersona(personaId) {
            if (COACH_PERSONAS[personaId]) {
                this.personaId = personaId;
                this.persona = COACH_PERSONAS[personaId];
                if (this.moveHistory.length === 0) {
                    this.currentBubble1 = this.voiceText('intro', this.persona.voice.intro);
                    this.currentBubble2 = tx(this.lang, 'coach.makeMoveFull', 'Make your opening move to get started!');
                    this.currentDialogue = `${this.currentBubble1}${tx(this.lang, 'coach.makeMove', ' Make your opening move to get started!')}`;
                    this._resetHintState();
                }
                this._configureWorkerElo();
            }
        }

        async init() {
            if (this.worker && typeof this.worker.init === 'function') {
                await this.worker.init();
                this._configureWorkerElo();
            }
        }

        isEngineAvailable() {
            return !!(this.worker && (typeof this.worker.isReady === 'function' ? this.worker.isReady() : true));
        }

        _normalizeFen(fen) {
            if (!fen) return '';
            return fen.split(' ').slice(0, 4).join(' ');
        }

        _resolveSuggestion(fen, suggestedSan) {
            if (!suggestedSan) return null;
            const posKey = this._normalizeFen(fen);
            let resolvedUci = null;
            let resolvedFrom = null;
            let resolvedTo = null;
            let resolvedPromotion = null;
            let resolvedSan = suggestedSan;
            try {
                const tempB = new this.Chess(fen);
                const sm = tempB.move(suggestedSan);
                if (sm) {
                    resolvedSan = sm.san;
                    resolvedFrom = sm.from;
                    resolvedTo = sm.to;
                    resolvedPromotion = sm.promotion || null;
                    resolvedUci = sm.from + sm.to + (sm.promotion || '');
                }
            } catch (e) {
                console.debug?.('[coach] _resolveSuggestion error:', e);
            }

            return {
                fen,
                posKey,
                san: resolvedSan,
                uci: resolvedUci,
                from: resolvedFrom,
                to: resolvedTo,
                promotion: resolvedPromotion
            };
        }

        _configureWorkerElo() {
            if (!this.worker) return;
            if (typeof this.worker.setOption === 'function') {
                this.worker.setOption('UCI_LimitStrength', 'true');
                this.worker.setOption('UCI_Elo', `${this.persona.elo}`);
                this.worker.setOption('Skill Level', `${this.persona.skillLevel || 10}`);
            } else if (this.worker.worker) {
                try {
                    this.worker.worker.postMessage('setoption name UCI_LimitStrength value true');
                    this.worker.worker.postMessage(`setoption name UCI_Elo value ${this.persona.elo}`);
                    this.worker.worker.postMessage(`setoption name Skill Level value ${this.persona.skillLevel || 10}`);
                } catch (e) {
                    console.debug?.('[coach] worker postMessage setoption error:', e);
                }
            }
        }

        /**
         * Switch worker to full GM tactical strength for objective move analysis and blunder advice.
         */
        _setWorkerAnalysisMode() {
            if (!this.worker) return;
            if (typeof this.worker.setOption === 'function') {
                this.worker.setOption('UCI_LimitStrength', 'false');
                this.worker.setOption('Skill Level', '20');
            } else if (this.worker.worker) {
                try {
                    this.worker.worker.postMessage('setoption name UCI_LimitStrength value false');
                    this.worker.worker.postMessage('setoption name Skill Level value 20');
                } catch (e) {
                    console.debug?.('[coach] worker postMessage analysis mode error:', e);
                }
            }
        }

        /**
         * Switch worker to persona-tuned Elo rating for in-game AI moves.
         */
        _setWorkerPlayMode() {
            this._configureWorkerElo();
        }

        /**
         * Reset game state for a new game.
         */
        resetGame(playerColor = 'w') {
            this.chess = new this.Chess();
            this.playerColor = playerColor;
            this.coachColor = (this.playerColor === 'w') ? 'b' : 'w';
            this.moveHistory = [];
            this.pendingChallenge = null;
            this.pliesSinceBlunder = 0;
            this.isGameOver = false;
            this.gameResult = null;
            this.resigned = false;
            this.resignedColor = null;
            this.lastMoveQuality = null;
            this.announcedOpening = false;
            this.lastSuggestedMove = null;
            this._positionEvalCache.clear();

            this._resetHintState();
            this.hintStats = {
                totalPresses: 0,
                movesWithHints: 0,
                fullReveals: 0,
                challengesSolved: {
                    unaided: 0,
                    withHints: 0,
                    missed: 0
                }
            };
            this.pendingOpportunity = null;
            this.lastBaitType = null;

            this.currentBubble1 = this.voiceText('intro', this.persona.voice.intro);
            this.currentBubble2 = (this.playerColor === 'w')
                ? tx(this.lang, 'coach.makeMoveFull', 'Make your opening move to get started!')
                : tx(this.lang, 'coach.coachFirst', "I'll make the first move. Let's see what you've got!");
            this.currentDialogue = `${this.currentBubble1} ${this.currentBubble2}`;
        }

        /**
         * Player or coach resigns the sparring game.
         * @param {string|null} [resignedColor=null] - 'w' or 'b' (defaults to playerColor)
         * @returns {object} Result summary
         */
        resign(resignedColor = null) {
            this.isGameOver = true;
            this.resigned = true;
            this.resignedColor = resignedColor || this.playerColor;
            this.gameResult = (this.resignedColor === this.playerColor) ? 'loss' : 'win';
            this.currentBubble1 = "You resigned. No worries, every game is a learning opportunity!";
            this.currentBubble2 = "Click 'New Game' or the Flag button whenever you're ready to play again.";
            this.currentDialogue = `${this.currentBubble1} ${this.currentBubble2}`;
            return {
                isGameOver: true,
                gameResult: this.gameResult,
                resigned: true,
                resignedColor: this.resignedColor,
                bubble1: this.currentBubble1,
                bubble2: this.currentBubble2,
                dialogue: this.currentDialogue
            };
        }

        /**
         * Checks whether it is currently the human player's turn.
         */
        isPlayerTurn() {
            if (this.isGameOver) return false;
            return this.chess.turn() === this.playerColor;
        }

        /**
         * Handle move played by user on the board.
         * @param {object|string} moveInput - e.g. { from: 'e2', to: 'e4' } or 'e4'
         * @returns {Promise<object>} Result with { success, move, bubble1, bubble2, quality, isBlunder, blunderAnalysis, bestSan }
         */
        async handleUserMove(moveInput) {
            if (this.isGameOver) {
                return { success: false, error: "Game is already over" };
            }
            if (!this.isPlayerTurn()) {
                return { success: false, error: "Not player's turn" };
            }

            const fenBefore = this.chess.fen();
            const legalMove = this.chess.move(moveInput);
            if (!legalMove) {
                return { success: false, error: "Illegal move" };
            }

            const fenAfter = this.chess.fen();
            const ply = this.moveHistory.length + 1;

            // Immediate check for game termination (Checkmate, Stalemate, Draw)
            this._checkGameTermination();
            if (this.isGameOver) {
                const gameOverText = this._getGameOverMessage();
                const isCheckmateWin = this.chess.in_checkmate() && this.gameResult === 'win';
                const classification = {
                    uiQuality: isCheckmateWin ? 'good move' : 'good move',
                    detailedQuality: isCheckmateWin ? 'best' : 'good',
                    wpLoss: 0.0
                };
                this.lastMoveQuality = classification;
                this.currentBubble1 = gameOverText;
                this.currentBubble2 = gameOverText;
                this.currentDialogue = gameOverText;

                const record = {
                    ply,
                    san: legalMove.san,
                    from: legalMove.from,
                    to: legalMove.to,
                    moveObj: legalMove,
                    isPlayer: true,
                    bubble1: gameOverText,
                    bubble2: gameOverText,
                    dialogue: gameOverText,
                    quality: classification.detailedQuality,
                    detailedQuality: classification.detailedQuality,
                    uiQuality: classification.uiQuality,
                    isBlunder: false,
                    blunderAnalysis: null,
                    bestSan: null,
                    bestMoveObj: null,
                    refMoveObj: null,
                    fen: this.chess.fen()
                };
                this.moveHistory.push(record);

                return {
                    success: true,
                    move: legalMove,
                    bubble1: gameOverText,
                    bubble2: gameOverText,
                    dialogue: gameOverText,
                    quality: classification,
                    detailedQuality: classification.detailedQuality,
                    uiQuality: classification.uiQuality,
                    isBlunder: false,
                    blunderAnalysis: null,
                    bestSan: null,
                    bestMoveObj: null,
                    refMoveObj: null,
                    isGameOver: true
                };
            }

            // 1. Check if user is resolving an active intentional blunder challenge
            const posKey = this._normalizeFen(fenBefore);
            const hintsOnThisMove = (this.hintState && this.hintState.posKey === posKey) ? (this.hintState.level || 0) : 0;

            let challengeFeedback = null;
            if (this.pendingChallenge) {
                const playedUci = legalMove.from + legalMove.to;
                const isPunished = this.pendingChallenge.refutations.some(ref => {
                    return ref === legalMove.san || ref === playedUci || ref.startsWith(playedUci);
                });

                if (isPunished) {
                    let praiseText;
                    if (hintsOnThisMove === 0) {
                        this.hintStats.challengesSolved.unaided = (this.hintStats.challengesSolved.unaided || 0) + 1;
                        praiseText = pickRandom(this.voiceLines('praiseSpotBlunder', this.persona.voice.praiseSpotBlunder));
                    } else if (hintsOnThisMove <= 2) {
                        this.hintStats.challengesSolved.withHints = (this.hintStats.challengesSolved.withHints || 0) + 1;
                        praiseText = pickRandom(this.voiceLines('praiseWithHint', this.persona.voice.praiseWithHint || [this.L('coach.praiseHintFallback', 'Nice, you got it with a nudge!')]));
                    } else {
                        this.hintStats.challengesSolved.withHints = (this.hintStats.challengesSolved.withHints || 0) + 1;
                        praiseText = pickRandom(this.voiceLines('praiseAfterReveal', this.persona.voice.praiseAfterReveal || [this.L('coach.praiseRevealFallback', 'Good execution on the tactic.')]));
                    }
                    challengeFeedback = {
                        success: true,
                        text: praiseText
                    };
                } else {
                    this.hintStats.challengesSolved.missed = (this.hintStats.challengesSolved.missed || 0) + 1;
                    const bestText = this.pendingChallenge.bestSan || 'the tactical refutation';
                    challengeFeedback = {
                        success: false,
                        text: `${pickRandom(this.voiceLines('missedBlunder', this.persona.voice.missedBlunder))}${this.L('coach.missedSuffix', ` (${bestText} was the punishing tactic!)`, { best: bestText })}`
                    };
                }

                // Learner model: a motif that needed >= 3 hints bumps the related errorProfile counter by 0.5
                if (hintsOnThisMove >= 3 && this.pendingChallenge.type) {
                    const cType = this.pendingChallenge.type;
                    if (cType === 'hanging') {
                        this.errorProfile.hangingPiece = (this.errorProfile.hangingPiece || 0) + 0.5;
                    } else if (cType === 'fork') {
                        this.errorProfile.missedFork = (this.errorProfile.missedFork || 0) + 0.5;
                        this.errorProfile.tacticalBlunder = (this.errorProfile.tacticalBlunder || 0) + 0.5;
                    } else if (cType === 'pin' || cType === 'skewer' || cType === 'discovered') {
                        this.errorProfile.tacticalBlunder = (this.errorProfile.tacticalBlunder || 0) + 0.5;
                    } else if (cType === 'kingSafety' || cType === 'mateThreat') {
                        this.errorProfile.kingSafety = (this.errorProfile.kingSafety || 0) + 0.5;
                    }
                }

                this.pendingChallenge = null;
            } else if (hintsOnThisMove >= 3 && this.hintState && this.hintState.plan && this.hintState.plan.motif) {
                const mType = this.hintState.plan.motif;
                if (mType === 'hanging') {
                    this.errorProfile.hangingPiece = (this.errorProfile.hangingPiece || 0) + 0.5;
                } else if (mType === 'fork') {
                    this.errorProfile.missedFork = (this.errorProfile.missedFork || 0) + 0.5;
                    this.errorProfile.tacticalBlunder = (this.errorProfile.tacticalBlunder || 0) + 0.5;
                } else if (mType === 'pin' || mType === 'skewer' || mType === 'discovered') {
                    this.errorProfile.tacticalBlunder = (this.errorProfile.tacticalBlunder || 0) + 0.5;
                } else if (mType === 'kingSafety' || mType === 'check' || mType === 'mateThreat') {
                    this.errorProfile.kingSafety = (this.errorProfile.kingSafety || 0) + 0.5;
                }
            }

            // 2. Evaluation of user move quality (with deterministic caching & coach suggestion memory)
            const playedUci = legalMove.from + legalMove.to + (legalMove.promotion || '');
            const playedFrom = legalMove.from;
            const playedTo = legalMove.to;
            const playedSan = legalMove.san;

            let cachedEntry = this._positionEvalCache.get(posKey);

            // Check if played move matches lastSuggestedMove
            let wasSuggested = false;
            if (this.lastSuggestedMove) {
                const matchFen = this.lastSuggestedMove.posKey
                    ? (this.lastSuggestedMove.posKey === posKey)
                    : (this._normalizeFen(this.lastSuggestedMove.fen) === posKey);
                if (matchFen) {
                    const matchUci = Boolean(this.lastSuggestedMove.uci && (this.lastSuggestedMove.uci === playedUci));
                    const matchSan = Boolean(this.lastSuggestedMove.san && (
                        this.lastSuggestedMove.san === playedSan ||
                        this.lastSuggestedMove.san.replace(/[+#]/g, '') === playedSan.replace(/[+#]/g, '')
                    ));
                    const matchSquares = Boolean(this.lastSuggestedMove.from && this.lastSuggestedMove.to &&
                        (this.lastSuggestedMove.from === playedFrom && this.lastSuggestedMove.to === playedTo));
                    if (matchUci || matchSan || matchSquares) {
                        wasSuggested = true;
                    }
                }
            }

            // Check if move matches cached verified best move
            if (!wasSuggested && cachedEntry && cachedEntry.verifiedBestMove) {
                const vm = cachedEntry.verifiedBestMove;
                const matchUci = Boolean(vm.uci && (vm.uci === playedUci));
                const matchSan = Boolean(vm.san && (
                    vm.san === playedSan ||
                    vm.san.replace(/[+#]/g, '') === playedSan.replace(/[+#]/g, '')
                ));
                const matchSquares = Boolean(vm.from && vm.to && (vm.from === playedFrom && vm.to === playedTo));
                if (matchUci || matchSan || matchSquares) {
                    wasSuggested = true;
                }
            }

            let classification = { uiQuality: 'good move', detailedQuality: wasSuggested ? 'best' : 'good', wpLoss: 0 };
            let isBlunder = false;
            let blunderAnalysis = null;
            let bestSan = null;
            let bestMoveObj = null;
            let refMoveObj = null;
            let diag = null;
            let tags = [];
            let isBook = false;

            const Evaluator = getEvaluator();
            const Recognizer = getRecognizer();
            const Detector = getOpeningDetector();
            const Diagnostics = getDiagnostics();

            if (wasSuggested) {
                this.lastSuggestedMove = null;
            }

            if (this.worker && Evaluator) {
                try {
                    this._setWorkerAnalysisMode();

                    // Check or compute position evaluation cache to prevent search variance / evaluation swing
                    if (!cachedEntry || !cachedEntry.evalBefore) {
                        const evalBefore = await this._evaluatePosition(fenBefore, 12, 3);
                        if (evalBefore && evalBefore.lines) {
                            const verifiedBest = await this._findVerifiedBestMove(fenBefore, evalBefore);
                            cachedEntry = {
                                evalBefore,
                                bestMove: (verifiedBest && verifiedBest.uci) || evalBefore.bestMove || (evalBefore.lines[1]?.pv && evalBefore.lines[1].pv[0]) || '',
                                bestSan: verifiedBest ? verifiedBest.san : null,
                                bestMoveObj: verifiedBest ? verifiedBest.moveObj : null,
                                verifiedBestMove: verifiedBest,
                                cp: verifiedBest ? verifiedBest.cp : (evalBefore.lines[1]?.cp || 0)
                            };
                            this._positionEvalCache.set(posKey, cachedEntry);
                            if (this._positionEvalCache.size > 50) {
                                const firstKey = this._positionEvalCache.keys().next().value;
                                this._positionEvalCache.delete(firstKey);
                            }
                        }
                    }

                    const evalBefore = cachedEntry ? cachedEntry.evalBefore : null;
                    const verifiedBest = cachedEntry ? cachedEntry.verifiedBestMove : null;
                    const bestUci = (verifiedBest && verifiedBest.uci) || (cachedEntry && cachedEntry.bestMove) || (evalBefore?.lines?.[1]?.pv && evalBefore.lines[1].pv[0]) || '';
                    const playedIsBest = (playedUci === bestUci) || Boolean(verifiedBest && verifiedBest.san === playedSan);
                    const bestCp = (verifiedBest && verifiedBest.cp !== undefined) ? verifiedBest.cp : (evalBefore?.lines?.[1]?.cp || 0);
                    const wpBefore = Evaluator.cpToWinProb(bestCp);

                    if (verifiedBest && verifiedBest.moveObj) {
                        bestMoveObj = verifiedBest.moveObj;
                        bestSan = verifiedBest.san;
                    } else if (bestUci && bestUci.length >= 4) {
                        bestMoveObj = {
                            from: bestUci.slice(0, 2),
                            to: bestUci.slice(2, 4),
                            promotion: bestUci[4]
                        };
                        const tempChess = new this.Chess(fenBefore);
                        const bMove = tempChess.move(bestMoveObj);
                        if (bMove) bestSan = bMove.san;
                    }

                    // Check opening book to avoid false positive opening blunders
                    const historySans = this.moveHistory.map(m => m.san).concat([legalMove.san]);
                    isBook = (ply <= 12 && Detector && Detector.isBookMove) ? Detector.isBookMove(historySans, ply) : false;

                    let playedCp = 0;
                    let wpAfter = wpBefore;
                    let evalAfter = null;

                    if (playedIsBest || isBook) {
                        playedCp = bestCp;
                        wpAfter = wpBefore;
                    } else {
                        // Check if played move is in MultiPV lines from root search
                        let foundInMultipv = false;
                        if (evalBefore && evalBefore.lines) {
                            for (let m = 1; m <= 5; m++) {
                                if (evalBefore.lines[m]?.pv && evalBefore.lines[m].pv[0] === playedUci) {
                                    playedCp = evalBefore.lines[m].cp || 0;
                                    wpAfter = Evaluator.cpToWinProb(playedCp);
                                    foundInMultipv = true;
                                    break;
                                }
                            }
                        }
                        if (!foundInMultipv) {
                            evalAfter = await this._evaluatePosition(fenAfter, 12, 1);
                            playedCp = -(evalAfter.lines[1]?.cp || 0);
                            wpAfter = Evaluator.cpToWinProb(playedCp);
                        }
                    }

                    if (Diagnostics && typeof Diagnostics.diagnose === 'function') {
                        diag = Diagnostics.diagnose({
                            fenBefore,
                            fenAfter,
                            playedMove: legalMove,
                            engine: {
                                bestUci,
                                lines: evalBefore ? evalBefore.lines : {},
                                post: evalAfter,
                                depthPre: 12,
                                depthPost: 12
                            },
                            context: {
                                ply,
                                sanHistory: historySans,
                                playerElo: this.persona.elo,
                                personaId: this.personaId,
                                depthDial: this.persona.depthDial || (this.persona.elo <= 900 ? 'concise' : this.persona.elo >= 2000 ? 'deep' : 'dynamic'),
                                mode: 'coach',
                                verifiedBest,
                                wasSuggested,
                                adaptive: this.adaptive
                            }
                        });

                        classification = diag.classification;
                        tags = diag.tags || [];
                        bestSan = diag.bestSan || bestSan;

                        const isBlunderOrMistake = (classification.uiQuality === 'blunder' || classification.uiQuality === 'mistake');
                        if (!isBook && isBlunderOrMistake) {
                            isBlunder = true;
                            if (!verifiedBest) {
                                const verified = await this._findVerifiedBestMove(fenBefore, evalBefore);
                                if (verified) {
                                    bestSan = verified.san;
                                    bestMoveObj = verified.moveObj;
                                    if (cachedEntry) {
                                        cachedEntry.verifiedBestMove = verified;
                                        cachedEntry.bestSan = verified.san;
                                        cachedEntry.bestMoveObj = verified.moveObj;
                                    }
                                }
                            }
                            if (!evalAfter) {
                                evalAfter = await this._evaluatePosition(fenAfter, 12, 1);
                                diag = Diagnostics.diagnose({
                                    fenBefore,
                                    fenAfter,
                                    playedMove: legalMove,
                                    engine: {
                                        bestUci,
                                        lines: evalBefore ? evalBefore.lines : {},
                                        post: evalAfter,
                                        depthPre: 12,
                                        depthPost: 12
                                    },
                                    context: {
                                        ply,
                                        sanHistory: historySans,
                                        playerElo: this.persona.elo,
                                        personaId: this.personaId,
                                        depthDial: this.persona.depthDial || (this.persona.elo <= 900 ? 'concise' : this.persona.elo >= 2000 ? 'deep' : 'dynamic'),
                                        mode: 'coach',
                                        verifiedBest,
                                        wasSuggested,
                                        adaptive: this.adaptive
                                    }
                                });
                                classification = diag.classification;
                                tags = diag.tags || [];
                            }
                            blunderAnalysis = diag.explanation;
                        }

                        if (diag.refUci && diag.refUci.length >= 4) {
                            try {
                                const refBoard = new this.Chess(fenAfter);
                                refMoveObj = refBoard.move({
                                    from: diag.refUci.slice(0, 2),
                                    to: diag.refUci.slice(2, 4),
                                    promotion: diag.refUci[4]
                                });
                            } catch (e) {}
                        }
                    } else {
                        classification = Evaluator.classifyMove(wpBefore, wpAfter, { playedIsBest, isBook });
                        const isBlunderOrMistake = (classification.uiQuality === 'blunder' || classification.uiQuality === 'mistake');
                        if (!isBook && isBlunderOrMistake) {
                            isBlunder = true;
                            if (!verifiedBest) {
                                const verified = await this._findVerifiedBestMove(fenBefore, evalBefore);
                                if (verified) {
                                    bestSan = verified.san;
                                    bestMoveObj = verified.moveObj;
                                    if (cachedEntry) {
                                        cachedEntry.verifiedBestMove = verified;
                                        cachedEntry.bestSan = verified.san;
                                        cachedEntry.bestMoveObj = verified.moveObj;
                                    }
                                }
                            }
                            if (!evalAfter) {
                                evalAfter = await this._evaluatePosition(fenAfter, 12, 1);
                            }
                            if (Recognizer && Recognizer.explainBlunderOrMistake) {
                                const boardBefore = new this.Chess(fenBefore);
                                const boardAfter = new this.Chess(fenAfter);
                                const refUci = (evalAfter.lines[1]?.pv && evalAfter.lines[1].pv[0]) || '';
                                let sanRef = null;
                                if (refUci && refUci.length >= 4) {
                                    const refBoard = new this.Chess(fenAfter);
                                    const rm = refBoard.move({
                                        from: refUci.slice(0, 2),
                                        to: refUci.slice(2, 4),
                                        promotion: refUci[4]
                                    });
                                    if (rm) {
                                        refMoveObj = rm;
                                        sanRef = rm.san;
                                    }
                                }
                                let opViolation = null;
                                if (Detector && typeof Detector.detectOpeningPrincipleViolation === 'function') {
                                    try {
                                        opViolation = Detector.detectOpeningPrincipleViolation(boardBefore, legalMove, ply);
                                    } catch (e) {}
                                }
                                const fallbackDiag = Recognizer.explainBlunderOrMistake({
                                    boardBefore,
                                    boardAfter,
                                    playedMove: legalMove,
                                    bestMove: bestMoveObj,
                                    refutationMove: refMoveObj,
                                    sanPlayed: legalMove.san,
                                    sanBest: bestSan || 'a better move',
                                    sanRef: sanRef,
                                    bestScore: { cp: bestCp },
                                    playedScore: { cp: playedCp },
                                    bestPv: evalBefore?.lines?.[1]?.pv || [],
                                    refPv: evalAfter?.lines?.[1]?.pv || [],
                                    quality: classification.uiQuality,
                                    detailedQuality: classification.detailedQuality,
                                    wpLoss: classification.wpLoss,
                                    ply,
                                    openingPrincipleViolation: opViolation,
                                    lang: this.lang
                                });
                                blunderAnalysis = fallbackDiag ? fallbackDiag.explanation : null;
                                tags = fallbackDiag ? fallbackDiag.tags || [] : [];
                            }
                        }
                    }
                } catch (e) {
                    console.debug?.('[coach] handleUserMove eval error:', e);
                }
            }

            let isMissedOpportunity = false;
            let opportunityKind = null;
            let opportunityPlan = null;

            if (wasSuggested) {
                isBlunder = false;
                if (classification.uiQuality === 'blunder' || classification.uiQuality === 'mistake') {
                    classification.uiQuality = 'good move';
                }
                if (classification.wpLoss === undefined) classification.wpLoss = 0.0;
            } else if (!isBook && !isBlunder && !this.isGameOver) {
                const wpLoss = classification.wpLoss || 0;
                let opportunity = null;

                if (this.pendingOpportunity && this.pendingOpportunity.posKey === this._normalizeFen(fenBefore)) {
                    opportunity = this.pendingOpportunity;
                } else if (cachedEntry && cachedEntry.evalBefore && cachedEntry.evalBefore.lines) {
                    const l1 = cachedEntry.evalBefore.lines[1];
                    const l2 = cachedEntry.evalBefore.lines[2];
                    if (l1 && l2) {
                        const Diag = getDiagnostics();
                        const cand = (Diag && typeof Diag.isBrilliantCandidate === 'function') ? Diag.isBrilliantCandidate(fenBefore, cachedEntry.evalBefore.lines) : null;
                        if (cand) {
                            opportunity = { kind: 'brilliant' };
                        } else {
                            const cp1 = l1.cp !== undefined ? l1.cp : 0;
                            const cp2 = l2.cp !== undefined ? l2.cp : 0;
                            if ((cp1 - cp2 >= 150) || (l1.mate && !l2.mate)) {
                                opportunity = { kind: 'tactic' };
                            }
                        }
                    }
                }

                if (opportunity && classification.detailedQuality !== 'best' && classification.detailedQuality !== 'brilliant' && wpLoss >= 0.08) {
                    classification.detailedQuality = 'miss';
                    isMissedOpportunity = true;
                    opportunityKind = opportunity.kind || 'tactic';
                    opportunityPlan = opportunity.plan || this._buildOpportunityPlan(fenBefore, bestMoveObj, opportunityKind);
                    this.errorProfile.missedOpportunity = (this.errorProfile.missedOpportunity || 0) + 1;
                }
            }

            this.lastMoveQuality = classification;

            // Update learner errorProfile on mistakes and blunders
            if (isBlunder || classification.uiQuality === 'mistake') {
                if (tags.includes('Hanging Piece')) {
                    this.errorProfile.hangingPiece = (this.errorProfile.hangingPiece || 0) + 1;
                }
                if (tags.includes('Tactical Blunder') || tags.includes('Missed Tactic') || tags.includes('Pin') || tags.includes('Skewer') || tags.includes('Discovered Attack')) {
                    this.errorProfile.tacticalBlunder = (this.errorProfile.tacticalBlunder || 0) + 1;
                }
                if (tags.includes('Tactical Fork') || tags.includes('Missed Fork')) {
                    this.errorProfile.missedFork = (this.errorProfile.missedFork || 0) + 1;
                }
                if (tags.includes('King Safety') || tags.includes('Checkmate') || tags.includes('Missed Mate')) {
                    this.errorProfile.kingSafety = (this.errorProfile.kingSafety || 0) + 1;
                }
                if (tags.includes('Endgame Technique') || tags.includes('Opposition') || tags.includes('King Activity') || tags.includes('Stalemate') || tags.includes('Pawn Promotion')) {
                    this.errorProfile.endgameTechnique = (this.errorProfile.endgameTechnique || 0) + 1;
                }
                if (tags.includes('Opening Principle') || tags.includes('Development')) {
                    this.errorProfile.openingPrinciple = (this.errorProfile.openingPrinciple || 0) + 1;
                }
            }

            // 3. Check for game termination
            this._checkGameTermination();

            // 4. Update bubble thoughts for user's move
            let bubble1 = "";
            let bubble2 = "";

            if (challengeFeedback) {
                bubble1 = challengeFeedback.text;
                bubble2 = this.L('coach.calcResp', 'Calculating response...');
            } else if (wasSuggested) {
                bubble1 = this.L('coach.greatAdjust', `Great adjustment! Playing ${legalMove.san} keeps your position solid and maintains control.`, { san: legalMove.san });
                bubble2 = this.voiceText('thinking', 'Calculating candidate responses...');
            } else if (isBlunder) {
                let blunderVoice = pickRandom(this.voiceLines('playerBlunder', this.persona.voice.playerBlunder));
                if (this.errorProfile.hangingPiece >= 3 && tags.includes('Hanging Piece')) {
                    blunderVoice = this.L('coach.hangRepeat', "Careful! That's another piece left hanging. Scan every undefended piece before committing!");
                } else if (this.errorProfile.tacticalBlunder >= 3 && (tags.includes('Tactical Blunder') || tags.includes('Tactical Fork'))) {
                    blunderVoice = this.L('coach.tactRepeat', 'Tactical danger again! Always look for opponent forcing replies before making your move.');
                } else if (this.errorProfile.openingPrinciple >= 2 && tags.includes('Opening Principle')) {
                    blunderVoice = this.L('coach.openRepeat', 'Watch the opening fundamentals: complete development and avoid unnecessary early piece maneuvers.');
                }
                bubble1 = blunderVoice;
                bubble2 = blunderAnalysis || this.L('coach.blunderFallback', 'That move might be a mistake. Review the tactical oversight card below!');
            } else if (classification.detailedQuality === 'book') {
                bubble1 = this.L('coach.bookMove', `Book move! ${legalMove.san} follows standard opening theory.`, { san: legalMove.san });
                bubble2 = this.voiceText('thinking', 'Calculating candidate responses...');
            } else if (classification.detailedQuality === 'miss') {
                bubble1 = this.L('coach.missChance', `You had something special here: ${opportunityKind === 'brilliant' ? 'a brilliant sacrifice' : 'a winning tactic'}. Want to take it back and find it?`, { what: opportunityKind === 'brilliant' ? this.L('coach.missBrilliant', 'a brilliant sacrifice') : this.L('coach.missTactic', 'a winning tactic') });
                bubble2 = this.L('coach.dontRush', "Don't rush! Let's look at that position again.");
                if (opportunityKind === 'brilliant') {
                    this.hintStats.brilliantMissed = (this.hintStats.brilliantMissed || 0) + 1;
                }
            } else if (classification.detailedQuality === 'brilliant') {
                bubble1 = pickRandom(this.voiceLines('playerBrilliant', this.persona.voice.playerBrilliant || [this.L('coach.brilliantFallback', 'Brilliant move!')]));
                if (diag && diag.sacrificedPiece) {
                    const pieces = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
                    const pieceName = pieces[diag.sacrificedPiece] || 'piece';
                    bubble2 = this.L('coach.sacRip', `You gave up your ${pieceName} on ${diag.sacrificeSquare} to rip open the position.`, { piece: pieceName, sq: diag.sacrificeSquare });
                } else if (diag && diag.explanation) {
                    bubble2 = diag.explanation;
                } else {
                    bubble2 = this.L('coach.spectacular', 'A spectacular sacrifice.');
                }
                this.hintStats.brilliantFound = (this.hintStats.brilliantFound || 0) + 1;
            } else if (classification.uiQuality === 'inaccuracy') {
                bubble1 = this.L('coach.playable', `${legalMove.san} is playable, but slightly inaccurate. Let's see how you handle my counterplay.`, { san: legalMove.san });
                bubble2 = this.voiceText('thinking', 'Calculating candidate responses...');
            } else {
                let goodReason = (diag && diag.explanation) ? diag.explanation : "";
                const isBest = (classification.detailedQuality === 'best' || classification.detailedQuality === 'brilliant');
                if (!goodReason && Recognizer && Recognizer.explainGoodMove) {
                    try {
                        const boardBefore = new this.Chess(fenBefore);
                        const boardAfter = new this.Chess(fenAfter);
                        const goodDiag = Recognizer.explainGoodMove({
                            boardBefore,
                            boardAfter,
                            move: legalMove,
                            san: legalMove.san,
                            isBest,
                            lang: this.lang
                        });
                        if (goodDiag && goodDiag.explanation) {
                            goodReason = goodDiag.explanation;
                        }
                    } catch (e) {
                        console.debug?.('[coach] explainGoodMove error:', e);
                    }
                }

                const personaPraise = isBest
                    ? (pickRandom(this.voiceLines('playerBestMove', this.persona.voice.playerBestMove)) || pickRandom(this.voiceLines('playerGoodMove', this.persona.voice.playerGoodMove)))
                    : pickRandom(this.voiceLines('playerGoodMove', this.persona.voice.playerGoodMove));

                if (goodReason && personaPraise) {
                    bubble1 = `${personaPraise} ${goodReason}`;
                } else if (goodReason) {
                    bubble1 = goodReason;
                } else if (personaPraise) {
                    bubble1 = `${personaPraise}`;
                } else {
                    bubble1 = this.L('coach.goodMoveFallback', `Good move with ${legalMove.san}!`, { san: legalMove.san });
                }
                bubble2 = this.voiceText('thinking', 'Calculating candidate responses...');
            }

            // Persona-scaled explanation tuning for bubble2 / dialogue
            if (isBlunder && blunderAnalysis) {
                if (this.persona.elo <= 1000) {
                    // Plain, concrete single-sentence summary for novice coaches
                    const firstSentence = blunderAnalysis.split('. ')[0];
                    blunderAnalysis = firstSentence.endsWith('.') ? firstSentence : firstSentence + '.';
                    bubble2 = blunderAnalysis;
                } else if (this.persona.elo >= 2000 && diag && diag.bestPvFormatted) {
                    // Deep GM-level variation added for advanced personas
                    blunderAnalysis = `${blunderAnalysis} Better continuation: ${diag.bestPvFormatted}`;
                    bubble2 = blunderAnalysis;
                }
            }

            this.currentBubble1 = bubble1;
            this.currentBubble2 = bubble2;
            if (challengeFeedback) {
                this.currentDialogue = challengeFeedback.text;
            } else if (wasSuggested) {
                this.currentDialogue = `Great adjustment! Playing ${legalMove.san} keeps your position solid and maintains control.`;
            } else if (isBlunder) {
                this.currentDialogue = blunderAnalysis || (bestSan ? `That concedes material or leverage. A stronger alternative was ${bestSan}.` : "That move gives away an advantage. Look for a safer alternative!");
            } else {
                this.currentDialogue = bubble1;
            }
            if (this.isGameOver) {
                this.currentDialogue = this._getGameOverMessage();
            }

            if (hintsOnThisMove > 0) {
                this.hintStats.movesWithHints = (this.hintStats.movesWithHints || 0) + 1;
                if (hintsOnThisMove >= 4) {
                    this.hintStats.fullReveals = (this.hintStats.fullReveals || 0) + 1;
                }
            }

            const record = {
                ply,
                san: legalMove.san,
                from: legalMove.from,
                to: legalMove.to,
                moveObj: legalMove,
                isPlayer: true,
                hintsUsed: hintsOnThisMove,
                bubble1,
                bubble2,
                dialogue: this.currentDialogue,
                quality: classification.detailedQuality,
                detailedQuality: classification.detailedQuality,
                uiQuality: classification.uiQuality,
                isBlunder,
                isMissedOpportunity,
                opportunityKind,
                opportunityPlan,
                blunderAnalysis,
                bestSan,
                bestMoveObj,
                refMoveObj,
                tags,
                explanation: diag ? diag.explanation : (blunderAnalysis || bubble1),
                fen: this.chess.fen()
            };
            this.moveHistory.push(record);
            this._resetHintState();

            return {
                success: true,
                move: legalMove,
                bubble1,
                bubble2,
                dialogue: this.currentDialogue,
                quality: classification,
                isBlunder,
                isMissedOpportunity,
                opportunityKind,
                blunderAnalysis,
                bestSan,
                bestMoveObj,
                refMoveObj,
                tags,
                isGameOver: this.isGameOver
            };
        }

        /**
         * Computes and plays the Coach's response move.
         * @returns {Promise<object>} Result with { success, move, bubble1, bubble2, isChallenge }
         */
        async computeCoachMove() {
            if (this.isGameOver) {
                return { success: false, error: "Game is over" };
            }
            if (this.isPlayerTurn()) {
                return { success: false, error: "Not coach's turn" };
            }

            const currentFen = this.chess.fen();
            this.pliesSinceBlunder++;
            this._resetHintState();

            let selectedMove = null;
            let isChallenge = false;
            let challengeData = null;

            // A. Check if we should inject an intentional pedagogical blunder
            const shouldAttemptBlunder = (this.pliesSinceBlunder >= this.persona.blunderInterval);
            if (shouldAttemptBlunder) {
                const blunderCandidate = await this._findInstructiveBlunder(currentFen);
                if (blunderCandidate) {
                    selectedMove = blunderCandidate.move;
                    isChallenge = true;
                    challengeData = blunderCandidate;
                    this.pendingChallenge = blunderCandidate;
                    this.lastBaitType = blunderCandidate.type;
                    this.pliesSinceBlunder = 0;
                }
            }

            // B. If no blunder, select best engine move within Elo limit
            if (!selectedMove) {
                selectedMove = await this._getEngineMove(currentFen);
            }

            if (!selectedMove) {
                // Fallback to random legal move if engine fails
                const legalMoves = this.chess.moves({ verbose: true });
                if (legalMoves.length === 0) {
                    this._checkGameTermination();
                    return { success: false, isGameOver: true };
                }
                selectedMove = legalMoves[0];
            }

            // Execute move on chess board
            const boardBefore = new this.Chess(currentFen);
            const executed = this.chess.move(selectedMove);
            if (!executed) {
                return { success: false, error: "Failed to execute move" };
            }

            const boardAfter = new this.Chess(this.chess.fen());
            const ply = this.moveHistory.length + 1;
            this._checkGameTermination();

            // C. Generate Dual Speech Bubbles
            const bubbles = this._generateCoachBubbles(boardBefore, boardAfter, executed, isChallenge, challengeData);

            // D. Opportunity Nudge (Section 3.6): Check for unprompted tactical opportunity
            if (!isChallenge && !this.isGameOver && this.worker && typeof this.worker.evaluate === 'function') {
                try {
                    const oppFen = this.chess.fen();
                    const oppKey = this._normalizeFen(oppFen);
                    // One search at the same depth/MultiPV handleUserMove uses, cached so
                    // the player's reply is judged on exactly this evaluation.
                    const oppEval = await this._evaluatePosition(oppFen, 12, 3);
                    const oppLines = (oppEval && oppEval.lines) || {};
                    const bestLine = oppLines[1];
                    if (bestLine && bestLine.pv && bestLine.pv[0]) {
                        this._positionEvalCache.set(oppKey, {
                            evalBefore: oppEval,
                            bestMove: oppEval.bestMove || bestLine.pv[0],
                            bestSan: null,
                            bestMoveObj: null,
                            verifiedBestMove: null,
                            cp: bestLine.cp || 0
                        });
                        if (this._positionEvalCache.size > 50) {
                            const firstKey = this._positionEvalCache.keys().next().value;
                            this._positionEvalCache.delete(firstKey);
                        }
                    }

                    const Diagnostics = getDiagnostics();
                    const cand = (Diagnostics && typeof Diagnostics.isBrilliantCandidate === 'function')
                        ? Diagnostics.isBrilliantCandidate(oppFen, oppLines)
                        : null;

                    if (cand) {
                        const oppBoard = new this.Chess(oppFen);
                        const moveEx = oppBoard.move(cand.bestUci.length >= 4 ? {
                            from: cand.bestUci.slice(0, 2),
                            to: cand.bestUci.slice(2, 4),
                            promotion: cand.bestUci.length > 4 ? cand.bestUci[4] : undefined
                        } : cand.bestUci);
                        if (moveEx) {
                            this.pendingOpportunity = {
                                posKey: oppKey,
                                plan: {
                                    source: 'brilliant',
                                    motif: 'sacrifice',
                                    move: { from: moveEx.from, to: moveEx.to, san: moveEx.san, uci: cand.bestUci, piece: moveEx.piece },
                                    keySquares: { targets: [] },
                                    followUp: null
                                },
                                kind: 'brilliant',
                                bestUci: cand.bestUci,
                                bestWp: cand.wpAfter
                            };
                            const voiceLines = this.voiceLines('brilliantNudge', (this.persona.voice && this.persona.voice.brilliantNudge) ? this.persona.voice.brilliantNudge : []);
                            let nudgeText = "";
                            if (voiceLines.length > 0) {
                                nudgeText = " " + voiceLines[ply % voiceLines.length];
                            } else {
                                nudgeText = this.L('coach.sacrificeNudge', ' A strong player would find the sacrifice here.');
                            }
                            bubbles.bubble2 = (bubbles.bubble2 || "") + nudgeText;
                        }
                    } else {
                        const shouldCheckOpp = (this.persona.id === 'mcmarty' || this.persona.id === 'sophy')
                            ? true
                            : (this.persona.id === 'pikaru')
                                ? (ply % 2 === 0)
                                : false;
                        if (shouldCheckOpp && oppEval && oppEval.lines && oppEval.lines[1] && oppEval.lines[2]) {
                            const l1 = oppEval.lines[1];
                            const l2 = oppEval.lines[2];
                            const cp1 = l1.cp !== undefined ? l1.cp : 0;
                            const cp2 = l2.cp !== undefined ? l2.cp : 0;
                            const isSignificant = (cp1 - cp2 >= 150) || (l1.mate && !l2.mate);
                            if (isSignificant && l1.pv && l1.pv[0]) {
                                const Recognizer = getRecognizer();
                                const motifRes = (Recognizer && typeof Recognizer.classifyTacticalMotif === 'function')
                                    ? Recognizer.classifyTacticalMotif(oppFen, l1.pv[0])
                                    : null;
                                if (motifRes && motifRes.motif !== 'positional') {
                                    const oppBoard = new this.Chess(oppFen);
                                    const moveEx = oppBoard.move(l1.pv[0].length >= 4 ? { from: l1.pv[0].slice(0, 2), to: l1.pv[0].slice(2, 4), promotion: l1.pv[0][4] } : l1.pv[0]);
                                    if (moveEx) {
                                        this.pendingOpportunity = {
                                            posKey: oppKey,
                                            plan: {
                                                source: 'opportunity',
                                                motif: motifRes.motif,
                                                move: { from: moveEx.from, to: moveEx.to, san: moveEx.san, uci: l1.pv[0], piece: moveEx.piece },
                                                keySquares: motifRes.keySquares || { targets: [] },
                                                followUp: null
                                            }
                                        };

                                        let nudgeText = "";
                                        if (this.persona.id === 'mcmarty') {
                                            nudgeText = this.L('coach.oppNudgeMcmarty', " Hmm, I have a feeling you might have something tricky here!");
                                        } else if (this.persona.id === 'sophy') {
                                            nudgeText = this.L('coach.oppNudgeSophy', " Look closely at this position—there could be a tactical opportunity.");
                                        } else if (this.persona.id === 'pikaru') {
                                            nudgeText = this.L('coach.oppNudgePikaru', " Wait a second, do you have a tactical shot here?");
                                        }
                                        if (nudgeText) {
                                            bubbles.bubble2 = (bubbles.bubble2 || "") + nudgeText;
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.debug?.('[coach] opportunity nudge error:', e);
                }
            }
            
            // PRESERVE Bubble 1 from the player's last move so the user's feedback is not wiped!
            let playerFeedback = "";
            if (this.moveHistory.length > 0) {
                const lastPlayerRecord = [...this.moveHistory].reverse().find(m => m.isPlayer);
                if (lastPlayerRecord && lastPlayerRecord.bubble1) {
                    this.currentBubble1 = lastPlayerRecord.bubble1;
                    playerFeedback = lastPlayerRecord.bubble1;
                } else {
                    this.currentBubble1 = bubbles.bubble1;
                }
            } else {
                this.currentBubble1 = bubbles.bubble1;
            }

            this.currentBubble2 = bubbles.bubble2;
            if (this.isGameOver) {
                this.currentDialogue = this._getGameOverMessage();
            } else if (playerFeedback) {
                this.currentDialogue = `${playerFeedback} ${bubbles.bubble2}`;
            } else {
                this.currentDialogue = bubbles.bubble2;
            }

            const record = {
                ply,
                san: executed.san,
                from: executed.from,
                to: executed.to,
                moveObj: executed,
                isPlayer: false,
                bubble1: this.currentBubble1,
                bubble2: this.currentBubble2,
                dialogue: this.currentDialogue,
                playerFeedback: playerFeedback || null,
                isChallenge,
                fen: this.chess.fen()
            };
            this.moveHistory.push(record);

            return {
                success: true,
                move: executed,
                bubble1: this.currentBubble1,
                bubble2: this.currentBubble2,
                playerFeedback: playerFeedback || null,
                dialogue: this.currentDialogue,
                isChallenge,
                challengeData,
                isGameOver: this.isGameOver
            };
        }

        /**
         * Inspects candidate moves to find an instructive tactical mistake (Hanging piece, Fork, Pin, Skewer, Discovered Attack, Mate Threat, etc.).
         */
        async _findInstructiveBlunder(fen) {
            const Recognizer = getRecognizer();
            if (!Recognizer || !this.worker) return null;

            try {
                // Explicitly switch worker to full analysis strength so candidate moves and tactical refutations
                // are accurately evaluated at GM depth before blunder injection.
                this._setWorkerAnalysisMode();

                // Search MultiPV=5
                const multiEval = await this._evaluatePosition(fen, 8, 5);
                const boardBefore = new this.Chess(fen);
                const candidates = [];

                for (let pvIndex = 2; pvIndex <= 5; pvIndex++) {
                    const line = multiEval.lines[pvIndex];
                    if (!line || !line.pv || !line.pv[0]) continue;

                    const candUci = line.pv[0];
                    const candMove = {
                        from: candUci.slice(0, 2),
                        to: candUci.slice(2, 4),
                        promotion: candUci[4]
                    };

                    const testBoard = new this.Chess(fen);
                    const moveExecuted = testBoard.move(candMove);
                    if (!moveExecuted) continue;

                    const refUci = line.pv[1] || '';
                    let refSan = refUci;
                    let repEx = null;
                    if (refUci.length >= 4) {
                        const replyMove = { from: refUci.slice(0, 2), to: refUci.slice(2, 4), promotion: refUci[4] };
                        const replyBoard = new this.Chess(testBoard.fen());
                        repEx = replyBoard.move(replyMove);
                        if (repEx) {
                            refSan = repEx.san;
                        }
                    }

                    let followUp = null;
                    const followUci = line.pv[2] || '';
                    if (followUci.length >= 4 && repEx) {
                        try {
                            const folBoard = new this.Chess(testBoard.fen());
                            folBoard.move(repEx);
                            const folEx = folBoard.move({ from: followUci.slice(0, 2), to: followUci.slice(2, 4), promotion: followUci[4] });
                            if (folEx) {
                                followUp = folEx.san;
                            }
                        } catch (e) {}
                    }

                    // Check for Mate Threat / Checkmate
                    let replyBoard = null;
                    if (repEx) {
                        replyBoard = new this.Chess(testBoard.fen());
                        replyBoard.move({ from: refUci.slice(0, 2), to: refUci.slice(2, 4), promotion: refUci[4] });
                    }
                    const isMated = replyBoard && replyBoard.in_checkmate && replyBoard.in_checkmate();
                    const isMateScore = (line.mate !== undefined && line.mate !== null && line.mate < 0);
                    if (isMated || isMateScore) {
                        candidates.push({
                            move: candMove,
                            san: moveExecuted.san,
                            motif: 'Mate Threat',
                            refutations: [refUci, repEx ? repEx.san : refSan],
                            bestSan: repEx ? repEx.san : refSan,
                            type: 'mateThreat',
                            refutationMove: repEx ? { from: repEx.from, to: repEx.to, san: repEx.san, uci: refUci } : null,
                            keySquares: { targets: [candMove.to] },
                            followUp
                        });
                        continue;
                    }

                    // 1. Hanging Piece Blunder
                    const hanging = Recognizer.detectHangingPieceBlunder(boardBefore, testBoard, moveExecuted);
                    if (hanging) {
                        candidates.push({
                            move: candMove,
                            san: moveExecuted.san,
                            motif: `Hanging ${hanging.piece}`,
                            refutations: [refUci, refSan],
                            bestSan: refSan,
                            type: 'hanging',
                            refutationMove: repEx ? { from: repEx.from, to: repEx.to, san: repEx.san, uci: refUci } : null,
                            keySquares: { targets: [moveExecuted.to] },
                            followUp
                        });
                        continue;
                    }

                    // 2. Walking into a tactical fork
                    if (repEx && replyBoard) {
                        const fork = Recognizer.detectFork(replyBoard, repEx);
                        if (fork) {
                            candidates.push({
                                move: candMove,
                                san: moveExecuted.san,
                                motif: 'Tactical Fork',
                                refutations: [refUci, repEx.san],
                                bestSan: repEx.san,
                                type: 'fork',
                                refutationMove: { from: repEx.from, to: repEx.to, san: repEx.san, uci: refUci },
                                keySquares: { targets: fork.targetSquares || [], attackerSquare: fork.attackerSquare || repEx.to },
                                followUp
                            });
                            continue;
                        }
                    }

                    // 3. Walking into a pin
                    if (repEx && replyBoard) {
                        const pin = Recognizer.detectPin(replyBoard, repEx);
                        if (pin) {
                            candidates.push({
                                move: candMove,
                                san: moveExecuted.san,
                                motif: 'Pin',
                                refutations: [refUci, repEx.san],
                                bestSan: repEx.san,
                                type: 'pin',
                                refutationMove: { from: repEx.from, to: repEx.to, san: repEx.san, uci: refUci },
                                keySquares: { targets: [pin.pinnedSquare].filter(Boolean), pinnedSquare: pin.pinnedSquare, behindSquare: pin.behindSquare, line: pin.line || [] },
                                followUp
                            });
                            continue;
                        }
                    }

                    // 4. Walking into a skewer
                    if (repEx && replyBoard && typeof Recognizer.detectSkewer === 'function') {
                        const skewer = Recognizer.detectSkewer(replyBoard, repEx);
                        if (skewer) {
                            candidates.push({
                                move: candMove,
                                san: moveExecuted.san,
                                motif: 'Skewer',
                                refutations: [refUci, repEx.san],
                                bestSan: repEx.san,
                                type: 'skewer',
                                refutationMove: { from: repEx.from, to: repEx.to, san: repEx.san, uci: refUci },
                                keySquares: { targets: [skewer.frontSquare, skewer.backSquare].filter(Boolean), frontSquare: skewer.frontSquare, backSquare: skewer.backSquare },
                                followUp
                            });
                            continue;
                        }
                    }

                    // 5. Walking into a discovered attack
                    if (repEx && replyBoard && typeof Recognizer.detectDiscoveredAttack === 'function') {
                        const disc = Recognizer.detectDiscoveredAttack(testBoard, replyBoard, repEx);
                        if (disc) {
                            candidates.push({
                                move: candMove,
                                san: moveExecuted.san,
                                motif: 'Discovered Attack',
                                refutations: [refUci, repEx.san],
                                bestSan: repEx.san,
                                type: 'discovered',
                                refutationMove: { from: repEx.from, to: repEx.to, san: repEx.san, uci: refUci },
                                keySquares: { targets: disc.targetSquare ? [disc.targetSquare] : [], blockerSquare: disc.blockerSquare, sliderSquare: disc.sliderSquare, targetSquare: disc.targetSquare },
                                followUp
                            });
                            continue;
                        }
                    }

                    // 6. King Safety / Check
                    if (repEx && replyBoard && replyBoard.in_check && replyBoard.in_check()) {
                        candidates.push({
                            move: candMove,
                            san: moveExecuted.san,
                            motif: 'Exposed King',
                            refutations: [refUci, repEx.san],
                            bestSan: repEx.san,
                            type: 'kingSafety',
                            refutationMove: { from: repEx.from, to: repEx.to, san: repEx.san, uci: refUci },
                            keySquares: { targets: [repEx.to] },
                            followUp
                        });
                        continue;
                    }
                }

                if (candidates.length === 0) return null;

                // Prioritize weaknesses from learner error profile
                const preferTactics = Boolean(this.errorProfile && (this.errorProfile.missedFork >= 2 || this.errorProfile.tacticalBlunder >= 2));
                const preferHanging = Boolean(this.errorProfile && this.errorProfile.hangingPiece >= 2);
                const preferKingSafety = Boolean(this.errorProfile && this.errorProfile.kingSafety >= 2);

                if (preferTactics) {
                    const tactical = candidates.find(c => ['fork', 'skewer', 'discovered'].includes(c.type));
                    if (tactical && (!this.lastBaitType || tactical.type !== this.lastBaitType)) return tactical;
                }
                if (preferHanging) {
                    const hanging = candidates.find(c => c.type === 'hanging');
                    if (hanging && (!this.lastBaitType || hanging.type !== this.lastBaitType)) return hanging;
                }
                if (preferKingSafety) {
                    const ks = candidates.find(c => ['kingSafety', 'mateThreat'].includes(c.type));
                    if (ks && (!this.lastBaitType || ks.type !== this.lastBaitType)) return ks;
                }

                // Motif rotation: avoid picking the same motif type twice in a row
                if (this.lastBaitType) {
                    const rotated = candidates.find(c => c.type !== this.lastBaitType);
                    if (rotated) return rotated;
                }

                return candidates[0];
            } catch (e) {
                console.debug?.('[coach] _findInstructiveBlunder error:', e);
            }
            return null;
        }

        /**
         * Verifies candidate moves from root evaluation to ensure suggested move is tactically sound.
         * Rejects candidates that hang pieces, walk into mate, or suffer substantial score collapse.
         * @param {string} fenBefore - Board state before player's move
         * @param {object} evalBefore - MultiPV evaluation of fenBefore
         * @returns {Promise<object|null>} { uci, san, moveObj, cp, verified }
         */
        async _findVerifiedBestMove(fenBefore, evalBefore) {
            const Recognizer = getRecognizer();
            const boardBefore = new this.Chess(fenBefore);
            const candidates = [];

            // 1. Gather candidates from MultiPV lines (up to 5)
            if (evalBefore?.lines) {
                for (let m = 1; m <= 5; m++) {
                    const line = evalBefore.lines[m];
                    const uci = (line && line.pv && line.pv[0]) || (m === 1 ? evalBefore.bestMove : null);
                    if (uci && uci.length >= 4 && !candidates.some(c => c.uci === uci)) {
                        candidates.push({ uci, cp: line?.cp ?? 0 });
                    }
                }
            }

            if (candidates.length === 0 && evalBefore?.bestMove) {
                candidates.push({ uci: evalBefore.bestMove, cp: evalBefore?.lines?.[1]?.cp ?? 0 });
            }

            const bestCp = evalBefore?.lines?.[1]?.cp ?? 0;
            let bestFallback = null;
            let maxFallbackCp = -Infinity;

            for (const cand of candidates) {
                const uci = cand.uci;
                const testBoard = new this.Chess(fenBefore);
                const moveObj = testBoard.move({
                    from: uci.slice(0, 2),
                    to: uci.slice(2, 4),
                    promotion: uci[4]
                });
                if (!moveObj) continue;

                const candEntry = {
                    uci,
                    from: moveObj.from,
                    to: moveObj.to,
                    promotion: moveObj.promotion,
                    san: moveObj.san,
                    moveObj,
                    cp: cand.cp,
                    verified: false
                };

                if (!bestFallback || cand.cp > maxFallbackCp) {
                    bestFallback = candEntry;
                    maxFallbackCp = cand.cp;
                }

                // Check A: Does candidate move hang an undefended piece?
                if (Recognizer && typeof Recognizer.detectHangingPieceBlunder === 'function') {
                    const hanging = Recognizer.detectHangingPieceBlunder(boardBefore, testBoard, moveObj);
                    if (hanging) {
                        // Candidate hangs a piece! Skip this move.
                        continue;
                    }
                }

                // Check B: Evaluate board state after candidate move to check opponent's refutation
                const fenAfterCand = testBoard.fen();
                try {
                    const postCandEval = await this._evaluatePosition(fenAfterCand, 10, 1);
                    const oppBestCp = postCandEval?.lines?.[1]?.cp ?? 0;
                    const candPlayerCp = -oppBestCp;
                    const oppMate = postCandEval?.lines?.[1]?.mate;

                    // If opponent has forced checkmate, candidate is suicidal
                    if (oppMate !== undefined && oppMate !== null && oppMate > 0) {
                        continue;
                    }

                    // Check score drop: if candidate score drops by > 80cp compared to root bestCp
                    if (candPlayerCp < bestCp - 80) {
                        continue;
                    }

                    // Candidate passed verification!
                    return {
                        uci,
                        from: moveObj.from,
                        to: moveObj.to,
                        promotion: moveObj.promotion,
                        san: moveObj.san,
                        moveObj,
                        cp: candPlayerCp,
                        verified: true
                    };
                } catch (e) {
                    console.debug?.('[coach] _findVerifiedBestMove iteration error:', e);
                }
            }

            return bestFallback;
        }

        /**
         * Get normal engine move from position.
         */
        async _getEngineMove(fen) {
            if (!this.worker) {
                const legalMoves = this.chess.moves({ verbose: true });
                return legalMoves.length > 0 ? legalMoves[0] : null;
            }

            try {
                this._setWorkerPlayMode();
                const evalRes = await this._evaluatePosition(fen, 10, 1);
                if (evalRes && evalRes.bestMove && evalRes.bestMove.length >= 4) {
                    const uci = evalRes.bestMove;
                    return {
                        from: uci.slice(0, 2),
                        to: uci.slice(2, 4),
                        promotion: uci[4]
                    };
                }
            } catch (e) {
                console.debug?.('[coach] _getEngineMove error:', e);
            }

            const legalMoves = this.chess.moves({ verbose: true });
            return legalMoves.length > 0 ? legalMoves[0] : null;
        }

        _evaluatePosition(fen, depth = 8, multipv = 1) {
            if (!fen) return Promise.resolve({ bestMove: '', lines: {} });
            try {
                const tempB = new this.Chess(fen);
                if (tempB.game_over && tempB.game_over()) {
                    const isMate = tempB.in_checkmate && tempB.in_checkmate();
                    return Promise.resolve({
                        bestMove: '',
                        lines: {
                            1: {
                                cp: isMate ? -10000 : 0,
                                mate: isMate ? -1 : undefined,
                                pv: []
                            }
                        }
                    });
                }
            } catch (e) {
                console.debug?.('[coach] _evaluatePosition chess error:', e);
            }

            if (this.worker && typeof this.worker.evaluate === 'function') {
                return this.worker.evaluate(fen, depth, multipv);
            }
            return Promise.resolve({ bestMove: '', lines: {} });
        }

        /**
         * Generates the dual speech bubbles with rich response types and contextual challenges.
         */
        _generateCoachBubbles(boardBefore, boardAfter, move, isChallenge, challengeData) {
            const Recognizer = getRecognizer();
            const Detector = getOpeningDetector();
            const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
            const pName = PIECE_NAMES[move.piece] || 'piece';

            let coachMoveDesc = "";
            let challengeText = "";

            if (this.isGameOver) {
                return {
                    bubble1: this._getGameOverMessage(),
                    bubble2: this.L('coach.newGameAgain', "Click 'New Game' or the Flag button whenever you're ready to play again.")
                };
            }

            if (isChallenge) {
                coachMoveDesc = this.L('coach.playedChallenge', `I played ${move.san}...`, { san: move.san });
                let baitVoiceList = null;
                if (challengeData && challengeData.type) {
                    baitVoiceList = this.baitLines(challengeData.type, null);
                    if (!baitVoiceList && this.persona.voice && this.persona.voice.baitByMotif) {
                        baitVoiceList = this.persona.voice.baitByMotif[challengeData.type] || null;
                    }
                }
                challengeText = (baitVoiceList && baitVoiceList.length > 0)
                    ? pickRandom(baitVoiceList)
                    : (() => {
                        const baitBlunder = pickRandom(this.voiceLines('challengeBlunderBait', this.persona.voice.challengeBlunderBait));
                        return this.L('coach.baitFallback', `Wait, take a close look at the board! ${baitBlunder}`, { x: baitBlunder });
                    })();
                return {
                    bubble1: this.L('coach.playedPunish', `I played ${move.san}. Spot the tactical punish!`, { san: move.san }),
                    bubble2: `${coachMoveDesc} ${challengeText}`
                };
            }

            // Check if player has only 1 legal reply
            const legalMovesCount = this.chess.moves().length;
            if (legalMovesCount === 1) {
                coachMoveDesc = this.L('coach.playSan', `I play ${move.san}.`, { san: move.san });
                challengeText = pickRandom(this.voiceLines('challengeOnlyMove', this.persona.voice.challengeOnlyMove || [this.L('coach.onlyMoveFallback', "Only one legal move for you here—let's see it!")]));
                return {
                    bubble1: coachMoveDesc,
                    bubble2: `${coachMoveDesc} ${challengeText}`
                };
            }

            // 1. Detect tactical & positional motif of coach move
            if (move.san === 'O-O' || move.san === 'O-O-O') {
                coachMoveDesc = this.L('coach.castle', `I castle ${move.san} to tuck my king away safely and activate the rook.`, { san: move.san });
                challengeText = this.L('coach.castleChallenge', 'Coordinate your pieces and make sure your own king is safe!');
            } else if (move.san.includes('+')) {
                coachMoveDesc = this.L('coach.check', `Check! My ${pName} on ${move.to} (${move.san}) attacks your king.`, { piece: pName, to: move.to, san: move.san });
                challengeText = this.L('coach.checkChallenge', 'Find the cleanest escape square or interposition.');
            } else if (move.captured) {
                const capName = PIECE_NAMES[move.captured] || 'piece';
                coachMoveDesc = this.L('coach.capture', `I play ${move.san}, capturing your ${capName} on ${move.to}.`, { san: move.san, cap: capName, to: move.to });
                challengeText = this.L('coach.captureChallenge', 'How do you plan to recapture or counter-attack?');
            } else if (Recognizer) {
                try {
                    const attackedSquares = Recognizer.getPieceAttacks(boardAfter, move.to);
                    const attackedPieces = attackedSquares
                        .map(sq => ({ sq, p: boardAfter.get(sq) }))
                        .filter(x => x.p && x.p.color === this.playerColor);
                    const attackedQueen = attackedPieces.find(x => x.p.type === 'q');
                    const attackedRook = attackedPieces.find(x => x.p.type === 'r');

                    if (attackedQueen) {
                        coachMoveDesc = this.L('coach.pressureQueen', `I play ${move.san}, putting pressure on your Queen on ${attackedQueen.sq}!`, { san: move.san, sq: attackedQueen.sq });
                        challengeText = this.L('coach.pressureQueenChallenge', 'Where will your Queen move to maintain active pressure?');
                    } else if (attackedRook) {
                        coachMoveDesc = this.L('coach.aimRook', `I play ${move.san}, taking aim at your rook on ${attackedRook.sq}.`, { san: move.san, sq: attackedRook.sq });
                        challengeText = this.L('coach.aimRookChallenge', 'How will you defend or counter the threat?');
                    } else if (Recognizer.detectPin && Recognizer.detectPin(boardAfter, move)) {
                        coachMoveDesc = this.L('coach.pinAnnoy', `I play ${move.san}, creating an annoying pin against your piece.`, { san: move.san });
                        challengeText = pickRandom(this.voiceLines('challengePinDefense', this.persona.voice.challengePinDefense || [
                            "Can you unpin or reinforce the defended square?"
                        ]));
                    } else if (move.piece === 'p' && Recognizer.detectCenterStrike && Recognizer.detectCenterStrike(boardBefore, move)) {
                        coachMoveDesc = this.L('coach.strikeCenter', `I strike at the center with ${move.san}!`, { san: move.san });
                        challengeText = pickRandom(this.voiceLines('challengeCenter', this.persona.voice.challengeCenter || [
                            "Central tension! Will you capture, push, or support the center?"
                        ]));
                    } else if (move.piece === 'p' && Recognizer.detectPassedPawn && Recognizer.detectPassedPawn(boardAfter, move)) {
                        coachMoveDesc = this.L('coach.pushPassed', `Pushing my passed pawn to ${move.to} (${move.san}).`, { to: move.to, san: move.san });
                        challengeText = this.L('coach.pushPassedChallenge', 'Can you blockade or target the advancing pawn?');
                    } else if ((move.piece === 'n' || move.piece === 'b') && Recognizer.isTrueOutpost && Recognizer.isTrueOutpost(boardAfter, move.to, move.color)) {
                        coachMoveDesc = this.L('coach.outpost', `Anchoring my ${pName} on ${move.to} (${move.san}) as an active outpost.`, { piece: pName, to: move.to, san: move.san });
                        challengeText = this.L('coach.outpostChallenge', `How will you challenge this well-placed ${pName}?`, { piece: pName });
                    } else if (move.piece === 'r' && Recognizer.detectFileControl && Recognizer.detectFileControl(boardBefore, move)) {
                        const fileCtrl = Recognizer.detectFileControl(boardBefore, move);
                        if (fileCtrl && fileCtrl.includes('7th rank')) {
                            coachMoveDesc = this.L('coach.invade7', `Invading the 7th rank with my rook on ${move.to} (${move.san}).`, { to: move.to, san: move.san });
                            challengeText = this.L('coach.invade7Challenge', 'Rooks on the 7th rank are dangerous! Can you challenge it or defend your pawns?');
                        } else {
                            const isSemi = fileCtrl && fileCtrl.includes('semi-open');
                            coachMoveDesc = this.L('coach.rookFile', `Sliding my rook to ${move.to} (${move.san}) to control the ${isSemi ? 'semi-open' : 'open'} file.`, { to: move.to, san: move.san, file: isSemi ? 'semi-open' : 'open' });
                            challengeText = this.L('coach.rookFileChallenge', 'How will you contest control of this file?');
                        }
                    }
                } catch (e) {
                    console.debug?.('[coach] motif detection error:', e);
                }
            }

            // 2. Opening recognition (within first 10 plies)
            if (!coachMoveDesc && this.moveHistory.length <= 10 && Detector && Detector.identifyOpening && !this.announcedOpening) {
                const historySans = this.moveHistory.map(m => m.san).concat([move.san]);
                const op = Detector.identifyOpening(historySans);
                if (op && op.name && op.name !== 'Standard Game' && op.name !== 'Irregular Opening') {
                    this.announcedOpening = true;
                    const opDialogue = this._getOpeningDialogue(op);
                    if (opDialogue) {
                        coachMoveDesc = this.L('coach.playOpening', `I play ${move.san} in the ${op.name}.`, { san: move.san, name: op.name });
                        challengeText = opDialogue.bubble2;
                    }
                }
            }

            // 3. Piece development or central advance
            if (!coachMoveDesc) {
                if (move.piece === 'n') {
                    coachMoveDesc = this.L('coach.developN', `Developing my knight to ${move.to} (${move.san}) to contest key squares.`, { to: move.to, san: move.san });
                    challengeText = pickRandom(this.voiceLines('challengeDevelopment', this.persona.voice.challengeDevelopment || [
                        "Which piece will you mobilize next to complete your development?"
                    ]));
                } else if (move.piece === 'b') {
                    coachMoveDesc = this.L('coach.developB', `Developing my bishop to ${move.to} (${move.san}) to control key diagonals.`, { to: move.to, san: move.san });
                    challengeText = pickRandom(this.voiceLines('challengeDevelopment', this.persona.voice.challengeDevelopment || [
                        "Which piece will you mobilize next to complete your development?"
                    ]));
                } else if (move.piece === 'p') {
                    if (['e4', 'd4', 'e5', 'd5', 'c4', 'c5'].includes(move.to)) {
                        coachMoveDesc = this.L('coach.pushCenter', `Pushing pawn to ${move.to} (${move.san}) to fight for central control.`, { to: move.to, san: move.san });
                        challengeText = pickRandom(this.voiceLines('challengeCenter', this.persona.voice.challengeCenter || [
                            "How will you stake your claim in the center?"
                        ]));
                    } else {
                        coachMoveDesc = this.L('coach.advancePawn', `Advancing pawn to ${move.to} (${move.san}) to adjust my pawn structure.`, { to: move.to, san: move.san });
                        challengeText = this.L('coach.pawnStruct', 'Every pawn move creates lasting structural changes. What is your plan?');
                    }
                } else if (move.piece === 'r') {
                    coachMoveDesc = this.L('coach.mobilizeRook', `Mobilizing my rook to ${move.to} (${move.san}) to improve its activity.`, { to: move.to, san: move.san });
                    challengeText = this.L('coach.mobilizeRookChallenge', 'Active rooks need open lines. How will you contest or limit its reach?');
                } else if (move.piece === 'q') {
                    if (['d4', 'd5', 'e4', 'e5'].includes(move.to)) {
                        coachMoveDesc = this.L('coach.centralizeQ', `Centralizing my Queen on ${move.to} (${move.san}) to dominate key squares and diagonals.`, { to: move.to, san: move.san });
                        challengeText = this.L('coach.centralizeQChallenge', "A centralized Queen commands huge diagonal and vertical influence. How will you challenge her?");
                    } else {
                        coachMoveDesc = this.L('coach.repositionQ', `Repositioning my Queen to ${move.to} (${move.san}) to increase pressure.`, { to: move.to, san: move.san });
                        challengeText = this.L('coach.repositionQChallenge', "Keep an eye on my Queen's diagonals. Where is your safest counterplay?");
                    }
                } else if (move.piece === 'k') {
                    coachMoveDesc = this.L('coach.stepKing', `Stepping my king to ${move.to} (${move.san}) for better safety.`, { to: move.to, san: move.san });
                    challengeText = this.L('coach.stepKingChallenge', 'King placement is critical. How will you organize your pieces now?');
                } else {
                    coachMoveDesc = this.L('coach.improveActivity', `I play ${move.san} with my ${pName} to improve piece activity.`, { san: move.san, piece: pName });
                    challengeText = this._getContextualChallenge(boardAfter);
                }
            }

            const combinedBubble2 = `${coachMoveDesc} ${challengeText}`;
            return {
                bubble1: coachMoveDesc, // Used as fallback if no player history exists
                bubble2: combinedBubble2
            };
        }

        _getOpeningDialogue(op) {
            const name = op.name.toLowerCase();
            const eco = op.eco || '';

            if (name.includes('sicilian') || eco.startsWith('B2') || eco.startsWith('B3') || eco.startsWith('B4') || eco.startsWith('B5') || eco.startsWith('B6') || eco.startsWith('B7') || eco.startsWith('B8') || eco.startsWith('B9')) {
                return {
                    bubble1: this.L('coach.open.sicilian1', "The Sicilian Defense! A sharp, combative opening with rich counter-attacking potential."),
                    bubble2: this.L('coach.open.sicilian2', "How will you develop your kingside and challenge my pawn on e4?")
                };
            }
            if (name.includes('french') || eco.startsWith('C0') || eco.startsWith('C1')) {
                return {
                    bubble1: this.L('coach.open.french1', "The French Defense! Building a rock-solid central pawn chain."),
                    bubble2: this.L('coach.open.french2', "Watch that light-squared bishop! How do you plan to activate it?")
                };
            }
            if (name.includes('italian') || eco === 'C50' || eco === 'C53' || eco === 'C54' || eco === 'C55') {
                return {
                    bubble1: this.L('coach.open.italian1', "The Italian Game! Classical open piece play targeting the vulnerable f7 square."),
                    bubble2: this.L('coach.open.italian2', "Can you neutralize my bishop and fight for central control?")
                };
            }
            if (name.includes('caro-kann') || eco.startsWith('B1')) {
                return {
                    bubble1: this.L('coach.open.caro1', "The Caro-Kann! Renowned for pawn structure solidity and endgame resilience."),
                    bubble2: this.L('coach.open.caro2', "Are you preparing to strike at the center with ...d5?")
                };
            }
            if (name.includes('ruy lopez') || name.includes('spanish') || eco.startsWith('C6') || eco.startsWith('C7') || eco.startsWith('C8') || eco.startsWith('C9')) {
                return {
                    bubble1: this.L('coach.open.spanish1', "The Spanish Game! Deep, classical positional maneuvering from move 3."),
                    bubble2: this.L('coach.open.spanish2', "Can you maintain piece harmony under central pressure?")
                };
            }
            if (name.includes("queen's gambit") || eco.startsWith('D0') || eco.startsWith('D1') || eco.startsWith('D2') || eco.startsWith('D3') || eco.startsWith('D4') || eco.startsWith('D5') || eco.startsWith('D6')) {
                return {
                    bubble1: this.L('coach.open.queensGambit1', "The Queen's Gambit! A battle of will and central space from move 2."),
                    bubble2: this.L('coach.open.queensGambit2', "Do you take the gambit pawn or stand firm in the center?")
                };
            }
            if (name.includes("king's indian") || eco.startsWith('E6') || eco.startsWith('E7') || eco.startsWith('E8') || eco.startsWith('E9')) {
                return {
                    bubble1: this.L('coach.open.kingsIndian1', "The King's Indian! You're letting me claim space to prepare a kingside storm."),
                    bubble2: this.L('coach.open.kingsIndian2', "How do you plan to challenge my central pawn chain?")
                };
            }
            if (name.includes('scandinavian') || eco === 'B01') {
                return {
                    bubble1: this.L('coach.open.scandinavian1', "The Scandinavian! An immediate strike against e4 right on move 1."),
                    bubble2: this.L('coach.open.scandinavian2', "Developing your queen early can be risky. Keep her safe!")
                };
            }
            return {
                bubble1: this.L('coach.entering', `Entering the ${op.name}! Let's see who controls the key squares.`, { name: op.name }),
                bubble2: this.L('coach.strategicPlan', "What is your primary strategic plan in this opening?")
            };
        }

        _getContextualChallenge(boardAfter) {
            const playerColor = this.playerColor;
            const homeRank = (playerColor === 'w') ? 0 : 7;

            // Prioritize recurring weaknesses from learner errorProfile
            if (this.errorProfile && this.errorProfile.hangingPiece >= 2) {
                return pickRandom([
                    "Remember to scan all your pieces: are any undefended or vulnerable?",
                    "Check your loose pieces before you move! An undefended piece is a tactical target."
                ]);
            }
            if (this.errorProfile && (this.errorProfile.tacticalBlunder >= 2 || this.errorProfile.missedFork >= 2)) {
                return pickRandom([
                    "Look out for tactical motifs! Watch for checks, forks, and pins.",
                    "Calculate forcing moves carefully here. Can you spot any tactics for either side?"
                ]);
            }
            if (this.errorProfile && this.errorProfile.kingSafety >= 2) {
                return pickRandom([
                    "Keep an eye on your king safety! Look for shelter and watch open lines.",
                    "Is your king safe from checks and mating threats right now?"
                ]);
            }
            if (this.errorProfile && this.errorProfile.openingPrinciple >= 2 && this.moveHistory.length < 16) {
                return pickRandom([
                    "Focus on opening fundamentals: develop every piece before attacking.",
                    "Are all your pieces actively developed and coordinated?"
                ]);
            }

            // Check if player has back-rank sleeping knights or bishops
            let sleepingMinors = 0;
            const files = ['b', 'c', 'f', 'g'];
            files.forEach(f => {
                const sq = f + (homeRank + 1);
                const piece = boardAfter.get(sq);
                if (piece && piece.color === playerColor && (piece.type === 'n' || piece.type === 'b')) {
                    sleepingMinors++;
                }
            });

            if (sleepingMinors >= 2 && this.moveHistory.length < 16) {
                return pickRandom(this.voiceLines('challengeDevelopment', this.persona.voice.challengeDevelopment || [
                    "You still have pieces asleep on the back rank. Can you mobilize them?",
                    "Bringing your minor pieces into play is top priority. Which piece will you develop next?"
                ]));
            }

            // Check if queens are traded (endgame)
            let queensCount = 0;
            for (let f = 0; f < 8; f++) {
                for (let r = 1; r <= 8; r++) {
                    const sq = String.fromCharCode(97 + f) + r;
                    const p = boardAfter.get(sq);
                    if (p && p.type === 'q') queensCount++;
                }
            }

            if (queensCount === 0 && this.moveHistory.length >= 16) {
                return pickRandom(this.voiceLines('challengeEndgame', this.persona.voice.challengeEndgame || [
                    "In the endgame, the active king is worth a minor piece. Time to march!",
                    "Precision matters in the endgame. Look ahead a few moves before deciding!"
                ]));
            }

            return pickRandom(this.voiceLines('challengeGeneric', this.persona.voice.challengeGeneric));
        }

        /**
         * Builds a structured HintPlan for the given FEN.
         * Priority:
         * 1. pendingChallenge
         * 2. pendingOpportunity
         * 3. lastSuggestedMove
         * 4. cached verified engine move
         * 5. on-demand evaluatePosition (MultiPV 2, depth 10)
         * 6. heuristic fallbacks (SEE-positive capture, fork, pin, center, first legal)
         * @param {string} fen
         * @returns {Promise<object|null>}
         */
        async _buildHintPlan(fen) {
            const Recognizer = getRecognizer();
            const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
            const posKey = this._normalizeFen(fen);
            const testB = new this.Chess(fen);
            const legalMoves = testB.moves({ verbose: true });
            if (legalMoves.length === 0) return null;

            // 1. Pending Challenge (Player refutes an intentional pedagogical blunder)
            if (this.pendingChallenge) {
                let moveObj = null;
                if (this.pendingChallenge.bestSan) {
                    testB.load(fen);
                    moveObj = testB.move(this.pendingChallenge.bestSan);
                }
                if (!moveObj && this.pendingChallenge.refutations) {
                    for (const ref of this.pendingChallenge.refutations) {
                        testB.load(fen);
                        moveObj = testB.move(ref);
                        if (moveObj) break;
                        if (typeof ref === 'string' && ref.length >= 4) {
                            moveObj = testB.move({ from: ref.slice(0, 2), to: ref.slice(2, 4), promotion: ref[4] });
                            if (moveObj) break;
                        }
                    }
                }
                if (!moveObj && this.pendingChallenge.refutationMove) {
                    testB.load(fen);
                    moveObj = testB.move(this.pendingChallenge.refutationMove);
                }
                if (moveObj) {
                    testB.undo();
                    const classified = (Recognizer && typeof Recognizer.classifyTacticalMotif === 'function')
                        ? Recognizer.classifyTacticalMotif(testB, moveObj)
                        : { motif: 'hanging', keySquares: { targets: [] } };
                    const motif = (this.pendingChallenge.type && this.pendingChallenge.type !== 'tacticalBlunder')
                        ? this.pendingChallenge.type
                        : classified.motif;
                    const keySquares = Object.assign({}, classified.keySquares, this.pendingChallenge.keySquares || {});
                    return {
                        source: 'challenge',
                        motif: motif || 'hanging',
                        move: { from: moveObj.from, to: moveObj.to, san: moveObj.san, uci: moveObj.from + moveObj.to + (moveObj.promotion || ''), piece: moveObj.piece },
                        keySquares,
                        followUp: this.pendingChallenge.followUp || null
                    };
                }
            }

            // 2. Pending Opportunity
            if (this.pendingOpportunity && this.pendingOpportunity.posKey === posKey && this.pendingOpportunity.plan) {
                return this.pendingOpportunity.plan;
            }

            // 3. Last Suggested Move (e.g. after takeback)
            if (this.lastSuggestedMove && (this.lastSuggestedMove.posKey === posKey || this._normalizeFen(this.lastSuggestedMove.fen) === posKey) && this.lastSuggestedMove.san) {
                testB.load(fen);
                const sm = testB.move(this.lastSuggestedMove.san);
                if (sm) {
                    testB.undo();
                    const classified = (Recognizer && typeof Recognizer.classifyTacticalMotif === 'function')
                        ? Recognizer.classifyTacticalMotif(testB, sm)
                        : { motif: 'positional', keySquares: { targets: [] } };
                    return {
                        source: 'suggestion',
                        motif: classified.motif,
                        move: { from: sm.from, to: sm.to, san: sm.san, uci: sm.from + sm.to + (sm.promotion || ''), piece: sm.piece },
                        keySquares: classified.keySquares,
                        followUp: null
                    };
                }
            }

            // 4. Cached engine best move
            const cached = this._positionEvalCache.get(posKey) || this._positionEvalCache.get(fen);
            const verifiedSan = (cached && (cached.bestSan || (cached.verifiedBestMove && cached.verifiedBestMove.san)));
            if (verifiedSan) {
                testB.load(fen);
                const cm = testB.move(verifiedSan);
                if (cm) {
                    testB.undo();
                    const classified = (Recognizer && typeof Recognizer.classifyTacticalMotif === 'function')
                        ? Recognizer.classifyTacticalMotif(testB, cm)
                        : { motif: 'positional', keySquares: { targets: [] } };
                    return {
                        source: 'engine',
                        motif: classified.motif,
                        move: { from: cm.from, to: cm.to, san: cm.san, uci: cm.from + cm.to + (cm.promotion || ''), piece: cm.piece },
                        keySquares: classified.keySquares,
                        followUp: (cached.lines && cached.lines[1] && cached.lines[1].pv && cached.lines[1].pv[1]) || null
                    };
                }
            }

            // 5. On-demand engine evaluation (MultiPV 2, depth 10)
            if (this.worker && typeof this.worker.evaluate === 'function') {
                try {
                    const evalRes = await this._evaluatePosition(fen, 10, 2);
                    if (evalRes && evalRes.lines && evalRes.lines[1] && evalRes.lines[1].pv && evalRes.lines[1].pv[0]) {
                        const verified = await this._findVerifiedBestMove(fen, evalRes);
                        if (verified) {
                            testB.load(fen);
                            const cm = testB.move(verified.san || verified.uci);
                            if (cm) {
                                testB.undo();
                                const classified = (Recognizer && typeof Recognizer.classifyTacticalMotif === 'function')
                                    ? Recognizer.classifyTacticalMotif(testB, cm)
                                    : { motif: 'positional', keySquares: { targets: [] } };
                                let followUp = null;
                                if (evalRes.lines[1].pv[1]) {
                                    const folUci = evalRes.lines[1].pv[1];
                                    testB.load(fen);
                                    testB.move(cm);
                                    const folMove = testB.move({ from: folUci.slice(0, 2), to: folUci.slice(2, 4), promotion: folUci[4] });
                                    if (folMove) followUp = folMove.san;
                                }
                                return {
                                    source: 'engine',
                                    motif: classified.motif,
                                    move: { from: cm.from, to: cm.to, san: cm.san, uci: cm.from + cm.to + (cm.promotion || ''), piece: cm.piece },
                                    keySquares: classified.keySquares,
                                    followUp
                                };
                            }
                        }
                    }
                } catch (e) {
                    console.debug?.('[coach] _buildHintPlan on-demand eval error:', e);
                }
            }

            // 6. Heuristic fallbacks
            // a) Profitable tactical capture (strictly verified by SEE > 0)
            if (Recognizer) {
                const playerColor = testB.turn();
                for (const m of legalMoves) {
                    if (m.captured && ['q', 'r', 'b', 'n', 'p'].includes(m.captured)) {
                        const isSound = (typeof Recognizer.staticExchangeEval === 'function')
                            ? (Recognizer.staticExchangeEval(testB, m.to, playerColor) > 0)
                            : true;
                        if (isSound) {
                            return {
                                source: 'heuristic',
                                motif: 'hanging',
                                move: { from: m.from, to: m.to, san: m.san, uci: m.from + m.to, piece: m.piece },
                                keySquares: { targets: [m.to] },
                                followUp: null
                            };
                        }
                    }
                }
            }

            // b) Tactical fork
            if (Recognizer) {
                for (const m of legalMoves) {
                    if (['n', 'b', 'r', 'q'].includes(m.piece)) {
                        testB.load(fen);
                        const executed = testB.move(m);
                        if (executed && Recognizer.detectFork) {
                            const fork = Recognizer.detectFork(testB, executed);
                            if (fork) {
                                return {
                                    source: 'heuristic',
                                    motif: 'fork',
                                    move: { from: m.from, to: m.to, san: m.san, uci: m.from + m.to, piece: m.piece },
                                    keySquares: { targets: fork.targetSquares || [], attackerSquare: m.to },
                                    followUp: null
                                };
                            }
                        }
                    }
                }
            }

            // c) Tactical pin
            if (Recognizer) {
                for (const m of legalMoves) {
                    if (['b', 'r', 'q'].includes(m.piece)) {
                        testB.load(fen);
                        const executed = testB.move(m);
                        if (executed && Recognizer.detectPin) {
                            const pin = Recognizer.detectPin(testB, executed);
                            if (pin) {
                                return {
                                    source: 'heuristic',
                                    motif: 'pin',
                                    move: { from: m.from, to: m.to, san: m.san, uci: m.from + m.to, piece: m.piece },
                                    keySquares: { targets: [pin.pinnedSquare].filter(Boolean), pinnedSquare: pin.pinnedSquare, behindSquare: pin.behindSquare, line: pin.line || [] },
                                    followUp: null
                                };
                            }
                        }
                    }
                }
            }

            // d) Center move
            const centerMoves = legalMoves.filter(m => ['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5'].includes(m.to));
            if (centerMoves.length > 0) {
                const cm = centerMoves[0];
                return {
                    source: 'heuristic',
                    motif: 'positional',
                    move: { from: cm.from, to: cm.to, san: cm.san, uci: cm.from + cm.to, piece: cm.piece },
                    keySquares: { targets: [cm.to] },
                    followUp: null
                };
            }

            // e) First legal move
            const first = legalMoves[0];
            return {
                source: 'heuristic',
                motif: 'positional',
                move: { from: first.from, to: first.to, san: first.san, uci: first.from + first.to, piece: first.piece },
                keySquares: { targets: [first.to] },
                followUp: null
            };
        }

        /**
         * Renders a specific level of the hint plan into text, highlighted squares, and arrows.
         * @param {object} plan - HintPlan from _buildHintPlan
         * @param {number} level - 1 to 4
         * @returns {object}
         */
        _renderHintLevel(plan, level) {
            const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
            const pName = PIECE_NAMES[plan.move.piece] || 'piece';
            const motifKey = HINT_TEMPLATES[plan.motif] ? plan.motif : 'positional';
            const levelKey = Math.min(Math.max(level, 1), 4);

            let tier = 'default';
            if (this.persona.elo <= 900) tier = 'beginner';
            else if (this.persona.elo >= 2000) tier = 'master';

            // Format target names
            const joinAnd = this.L('coach.joinAnd', ' and ');
            let targetNames = this.L('coach.enemyPieces', 'enemy pieces');
            const targets = (plan.keySquares && plan.keySquares.targets) ? plan.keySquares.targets : [];
            if (targets.length > 0) {
                const names = targets.map(sq => {
                    const pieceObj = this.chess.get(sq);
                    if (pieceObj) {
                        return (PIECE_NAMES[pieceObj.type] || pieceObj.type) + ' on ' + sq;
                    }
                    return sq;
                });
                if (names.length === 1) targetNames = names[0];
                else if (names.length === 2) targetNames = names[0] + joinAnd + names[1];
                else targetNames = names.slice(0, -1).join(', ') + joinAnd + names[names.length - 1];
            }

            let followUpText = "";
            if (plan.followUp) {
                followUpText = this.L('coach.followUp', ` Next you have ${plan.followUp}.`, { x: plan.followUp });
            }

            const enTemplate = HINT_TEMPLATES[motifKey][levelKey][tier] || HINT_TEMPLATES[motifKey][levelKey].default;
            let template = enTemplate;
            // Vietnamese override with EN fallback (deterministic: same selection)
            try {
                const I18N = getI18n();
                if (this.lang === 'vi' && I18N && typeof I18N.hintTemplate === 'function') {
                    template = I18N.hintTemplate(motifKey, levelKey, tier, enTemplate, this.lang);
                }
            } catch (e) { template = enTemplate; }

            // Suggested move override for backwards compatibility with tests
            if (plan.source === 'suggestion' && levelKey === 1) {
                template = this.L('coach.suggestion', `Coach Hint: Consider mobilizing your {piece} toward {to} ({san}) as we discussed!`);
            }

            const hintText = template
                .replace(/{piece}/g, pName)
                .replace(/{from}/g, plan.move.from)
                .replace(/{to}/g, plan.move.to)
                .replace(/{san}/g, plan.move.san)
                .replace(/{targetNames}/g, targetNames)
                .replace(/{followUpText}/g, followUpText);

            let highlightSquares = [plan.move.from];
            let targetSquares = [];
            let arrow = null;

            if (levelKey === 1) {
                highlightSquares = [plan.move.from];
                targetSquares = [];
                if (plan.motif === 'hanging' && plan.move.to) {
                    targetSquares = [plan.move.to];
                }
            } else if (levelKey === 2) {
                highlightSquares = [plan.move.from];
                targetSquares = [...targets];
                if (plan.motif === 'hanging' && targetSquares.length === 0 && plan.move.to) {
                    targetSquares = [plan.move.to];
                }
            } else if (levelKey === 3) {
                highlightSquares = [plan.move.from, plan.move.to];
                targetSquares = [...targets];
                if (plan.motif === 'hanging' && targetSquares.length === 0 && plan.move.to) {
                    targetSquares = [plan.move.to];
                }
            } else if (levelKey === 4) {
                highlightSquares = [plan.move.from, plan.move.to];
                targetSquares = [...targets];
                if (plan.motif === 'hanging' && targetSquares.length === 0 && plan.move.to) {
                    targetSquares = [plan.move.to];
                }
                arrow = { from: plan.move.from, to: plan.move.to };
            }

            return {
                hintText,
                highlightSquares,
                targetSquares,
                arrow,
                level: levelKey,
                maxLevel: 4,
                motif: plan.motif,
                source: plan.source,
                moveSAN: plan.move.san,
                isChallenge: plan.source === 'challenge'
            };
        }

        /**
         * Generate a progressive pedagogical hint that escalates with each press.
         * Level 1: Motif + piece ({from})
         * Level 2: Targets ({targets})
         * Level 3: Destination ({to})
         * Level 4: Full reveal + arrow + follow-up ({san}, arrow)
         * @returns {Promise<object>}
         */
        async generateHint() {
            if (this.isGameOver || !this.isPlayerTurn()) {
                return {
                    hintText: this.L('error.hintNone', 'No hints needed right now.'),
                    highlightSquares: [],
                    targetSquares: [],
                    arrow: null,
                    level: 0,
                    maxLevel: 4,
                    motif: null,
                    source: null
                };
            }

            const currentFen = this.chess.fen();
            const posKey = this._normalizeFen(currentFen);

            // Rebuild plan if position changed or not initialized
            if (!this.hintState || this.hintState.posKey !== posKey || !this.hintState.plan) {
                const plan = await this._buildHintPlan(currentFen);
                this.hintState = {
                    posKey,
                    level: 0,
                    plan
                };
            }

            if (!this.hintState.plan) {
                return {
                    hintText: this.L('error.hintNonePos', 'No hints available for this position.'),
                    highlightSquares: [],
                    targetSquares: [],
                    arrow: null,
                    level: 0,
                    maxLevel: 4,
                    motif: null,
                    source: null
                };
            }

            if (this.hintState.level < 4) {
                this.hintState.level++;
            }

            this.hintStats.totalPresses++;
            if (this.hintState.level === 1) {
                this.hintStats.movesWithHints++;
            } else if (this.hintState.level === 4) {
                this.hintStats.fullReveals++;
            }

            return this._renderHintLevel(this.hintState.plan, this.hintState.level);
        }

        /**
         * Returns current hint status for UI indicators/badges.
         * @returns {object} { level, maxLevel, motif, source }
         */
        getHintState() {
            const currentFen = this.chess.fen();
            const posKey = this._normalizeFen(currentFen);
            if (!this.hintState || this.hintState.posKey !== posKey) {
                return {
                    level: 0,
                    maxLevel: 4,
                    motif: null,
                    source: null
                };
            }
            return {
                level: this.hintState.level,
                maxLevel: 4,
                motif: this.hintState.plan ? this.hintState.plan.motif : null,
                source: this.hintState.plan ? this.hintState.plan.source : null
            };
        }

        /**
         * Build a hint plan for a missed opportunity when none was prepared in advance.
         * @param {string} fen - position the opportunity was available in
         * @param {object|null} bestMoveObj - { from, to, promotion }
         * @param {string} kind - 'brilliant' | 'tactic'
         * @returns {object|null}
         */
        _buildOpportunityPlan(fen, bestMoveObj, kind) {
            if (!bestMoveObj || !bestMoveObj.from || !bestMoveObj.to) return null;
            try {
                const b = new this.Chess(fen);
                const mv = b.move({ from: bestMoveObj.from, to: bestMoveObj.to, promotion: bestMoveObj.promotion });
                if (!mv) return null;
                b.undo();
                let motif = 'sacrifice';
                let keySquares = { targets: [] };
                if (kind !== 'brilliant') {
                    const Recognizer = getRecognizer();
                    const classified = (Recognizer && typeof Recognizer.classifyTacticalMotif === 'function')
                        ? Recognizer.classifyTacticalMotif(b, mv)
                        : null;
                    motif = (classified && classified.motif) || 'positional';
                    keySquares = (classified && classified.keySquares) || keySquares;
                }
                return {
                    source: kind === 'brilliant' ? 'brilliant' : 'opportunity',
                    motif,
                    move: { from: mv.from, to: mv.to, san: mv.san, uci: mv.from + mv.to + (mv.promotion || ''), piece: mv.piece },
                    keySquares,
                    followUp: null
                };
            } catch (e) {
                return null;
            }
        }

        /**
         * Take back only the player's last move (e.g. after a blunder).
         * @param {string|null} suggestedSan - Suggested alternative move
         * @returns {boolean} Success
         */
        takebackPlayerMove(suggestedSan = null) {
            if (this.moveHistory.length === 0) return false;
            let undonePlayerMove = null;
            const lastMove = this.moveHistory[this.moveHistory.length - 1];
            if (lastMove && lastMove.isPlayer) {
                undonePlayerMove = lastMove;
                this.chess.undo();
                this.moveHistory.pop();
            } else if (lastMove && !lastMove.isPlayer) {
                this.chess.undo();
                this.moveHistory.pop();
                if (this.moveHistory.length > 0 && this.moveHistory[this.moveHistory.length - 1].isPlayer) {
                    undonePlayerMove = this.moveHistory[this.moveHistory.length - 1];
                    this.chess.undo();
                    this.moveHistory.pop();
                }
            } else {
                return false;
            }
            this.isGameOver = false;
            this.gameResult = null;
            this.resigned = false;
            this.resignedColor = null;

            const currentFen = this.chess.fen();
            const posKey = this._normalizeFen(currentFen);

            if (undonePlayerMove && undonePlayerMove.isMissedOpportunity) {
                this.lastSuggestedMove = null;
                this._resetHintState();
                
                // Restore the opportunity so the hint ladder guides the player to it
                // instead of revealing the move outright.
                const restoredPlan = undonePlayerMove.opportunityPlan || null;
                const restoredOpp = restoredPlan
                    ? { posKey, plan: restoredPlan, kind: undonePlayerMove.opportunityKind || 'tactic' }
                    : null;

                this.pendingOpportunity = restoredOpp;
                this.currentBubble1 = "Alright, look again. There's something strong here.";
                this.currentBubble2 = "Use a hint if you need a nudge.";
                this.currentDialogue = "Alright, look again. There's something strong here. Use a hint if you need a nudge.";
            } else {
                const effectiveSan = suggestedSan || (undonePlayerMove && undonePlayerMove.bestSan) || null;
                this.lastSuggestedMove = this._resolveSuggestion(currentFen, effectiveSan);
                this._resetHintState();
                this.pendingOpportunity = null;

                this.currentBubble1 = "Good instinct to take that back!";
                this.currentBubble2 = effectiveSan
                    ? `Take another look at the position. Consider moves like ${effectiveSan} instead!`
                    : "Take your time and search for a safer, more active continuation!";
                this.currentDialogue = effectiveSan
                    ? `Good instinct to take that back! Consider moves like ${effectiveSan} instead.`
                    : "Good instinct to take that back! Take your time and search for a safer, more active continuation!";
            }
            return true;
        }

        /**
         * Take back the last move pair (Coach move + Player move) or last move if game over.
         * @returns {boolean} Success
         */
        takeback() {
            if (this.moveHistory.length === 0) return false;
            let undonePlayerMove = null;

            // If it's player's turn, undo Coach move then Player move
            if (this.isPlayerTurn()) {
                if (this.moveHistory.length >= 2) {
                    this.chess.undo(); // Undo Coach move
                    undonePlayerMove = this.moveHistory[this.moveHistory.length - 2];
                    this.chess.undo(); // Undo User move
                    this.moveHistory.pop();
                    this.moveHistory.pop();
                } else if (this.moveHistory.length === 1) {
                    undonePlayerMove = this.moveHistory[this.moveHistory.length - 1];
                    this.chess.undo();
                    this.moveHistory.pop();
                }
            } else {
                // Undo User move
                undonePlayerMove = this.moveHistory[this.moveHistory.length - 1];
                this.chess.undo();
                this.moveHistory.pop();
            }

            this.pendingChallenge = null;
            this.isGameOver = false;
            this.gameResult = null;
            this.resigned = false;
            this.resignedColor = null;

            const currentFen = this.chess.fen();
            const posKey = this._normalizeFen(currentFen);

            // If undone move had a suggested best move or if cache has verified best move, restore suggestion!
            const cached = this._positionEvalCache.get(posKey) || this._positionEvalCache.get(currentFen);
            const suggestedSan = (undonePlayerMove && undonePlayerMove.bestSan) || (cached && cached.bestSan) || (cached && cached.verifiedBestMove && cached.verifiedBestMove.san) || null;
            this.lastSuggestedMove = this._resolveSuggestion(currentFen, suggestedSan);
            this._resetHintState();
            this.pendingOpportunity = null;

            this.currentBubble1 = "Takeback granted! Let's try that position again.";
            this.currentBubble2 = suggestedSan
                ? `Take your time! Consider moves like ${suggestedSan} instead.`
                : "Take your time and look for the strongest continuation!";
            this.currentDialogue = suggestedSan
                ? `Takeback granted! Consider moves like ${suggestedSan} instead.`
                : "Takeback granted! Let's try that position again. Take your time and look for the strongest continuation!";
            return true;
        }

        _checkGameTermination() {
            if (this.chess.in_checkmate()) {
                this.isGameOver = true;
                this.gameResult = this.chess.turn() === this.playerColor ? 'loss' : 'win';
            } else if (this.chess.in_draw() || this.chess.in_stalemate() || this.chess.in_threefold_repetition() || this.chess.insufficient_material()) {
                this.isGameOver = true;
                this.gameResult = 'draw';
            }
        }

        getErrorSummary() {
            if (!this.errorProfile) return [];
            const themes = [
                { key: 'hangingPiece', count: this.errorProfile.hangingPiece || 0, label: this.L('coach.err.hanging', 'hanging pieces'), labelEn: 'hanging pieces' },
                { key: 'tacticalBlunder', count: this.errorProfile.tacticalBlunder || 0, label: this.L('coach.err.tactical', 'tactical oversights'), labelEn: 'tactical oversights' },
                { key: 'missedFork', count: this.errorProfile.missedFork || 0, label: this.L('coach.err.fork', 'missed tactical forks'), labelEn: 'missed tactical forks' },
                { key: 'kingSafety', count: this.errorProfile.kingSafety || 0, label: this.L('coach.err.king', 'king safety vulnerabilities'), labelEn: 'king safety vulnerabilities' },
                { key: 'endgameTechnique', count: this.errorProfile.endgameTechnique || 0, label: this.L('coach.err.endgame', 'endgame technique'), labelEn: 'endgame technique' },
                { key: 'openingPrinciple', count: this.errorProfile.openingPrinciple || 0, label: this.L('coach.err.opening', 'opening principles'), labelEn: 'opening principles' }
            ].filter(t => t.count > 0).sort((a, b) => b.count - a.count);

            return themes.slice(0, 2);
        }

        _getGameOverMessage() {
            let baseMsg = this.L('coach.over.base', 'Game over!');
            if (this.resigned) {
                baseMsg = (this.resignedColor === this.playerColor)
                    ? this.L('coach.over.resignedPlayer', 'You resigned. No worries, every game is a learning opportunity!')
                    : this.L('coach.over.resignedCoach', 'Coach resigned! Outstanding play!');
            } else if (this.chess.in_checkmate()) {
                baseMsg = (this.chess.turn() === this.playerColor)
                    ? this.L('coach.over.mateLoss', "Checkmate! Good game! Don't worry, every loss is a lesson.")
                    : this.L('coach.over.mateWin', 'Checkmate! Spectacular play! You won the game!');
            } else if (this.chess.in_stalemate()) {
                baseMsg = this.L('coach.over.stalemate', 'Stalemate! The game ends in a peaceful draw.');
            } else if (this.chess.in_draw()) {
                baseMsg = this.L('coach.over.draw', 'Draw! A well-fought battle on both sides.');
            }

            if (this.hintStats && this.hintStats.totalPresses > 0) {
                const pCount = this.hintStats.totalPresses;
                const mCount = this.hintStats.movesWithHints;
                baseMsg += this.L('coach.over.hintsUsed', ` You used ${pCount} hint${pCount === 1 ? '' : 's'} across ${mCount} move${mCount === 1 ? '' : 's'}.`, { p: pCount, m: mCount });
            }

            const topErrors = this.getErrorSummary();
            if (topErrors.length > 0) {
                const joiner = this.L('coach.joinAnd', ' and ');
                const summaryStr = topErrors.map(e => `${e.count} ${this.lang === 'vi' ? e.label : (e.labelEn || e.label)}`).join(joiner);
                baseMsg += this.L('coach.over.takeaways', ` Key takeaways from this game: watch out for ${summaryStr}.`, { s: summaryStr });
            }
            return baseMsg;
        }

        /**
         * Get full PGN string of the active sparring game.
         */
        getPgn() {
            const header = [
                `[Event "WhyBlunder Sparring"]`,
                `[Site "WhyBlunder Client"]`,
                `[Date "${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}"]`,
                `[White "${this.playerColor === 'w' ? 'Player' : this.persona.name}"]`,
                `[Black "${this.playerColor === 'b' ? 'Player' : this.persona.name}"]`,
                `[WhiteElo "${this.playerColor === 'w' ? '?' : this.persona.elo}"]`,
                `[BlackElo "${this.playerColor === 'b' ? '?' : this.persona.elo}"]`,
                `[Result "${this.isGameOver ? (this.gameResult === 'win' ? (this.playerColor === 'w' ? '1-0' : '0-1') : (this.gameResult === 'loss' ? (this.playerColor === 'w' ? '0-1' : '1-0') : '1/2-1/2')) : '*' }"]`
            ];
            return header.join('\n') + '\n\n' + this.chess.pgn();
        }
    }

    CoachManager.COACH_PERSONAS = COACH_PERSONAS;
    CoachManager.CoachManager = CoachManager;

    return {
        COACH_PERSONAS,
        CoachManager
    };
}));
