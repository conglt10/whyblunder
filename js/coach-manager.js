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
            voice: {
                intro: "Hey! Ready to play? I love passed pawns and fast play—let's do this!",
                thinking: "Calculating my fastest counter-attack...",
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
                praiseSpotBlunder: [
                    "Boom! You saw right through my slip-up. Nice catch!",
                    "Great eye! You punished my mistake immediately.",
                    "You got me! That was a sharp tactical spot."
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
            voice: {
                intro: "Hi friend! I'm learning chess too! Let's have a great game together!",
                thinking: "Thinking... let me make sure I don't hang my rook!",
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
                praiseSpotBlunder: [
                    "Aww shucks, you got me! Good eye!",
                    "You found it! I knew I shouldn't have moved there!",
                    "Nice catch! You're really good at this!"
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
            voice: {
                intro: "Welcome to class! Let's focus on piece harmony, solid defense, and tactical awareness.",
                thinking: "Assessing positional dynamics and king safety...",
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
                praiseSpotBlunder: [
                    "Well done! You correctly recognized the tactical motif.",
                    "Spot on! That is exactly how to punish that mistake.",
                    "Excellent tactical calculation! Clean and precise."
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
            voice: {
                intro: "Let's play. Keep it clean, don't rush, and let's see how deep your endgame understanding goes.",
                thinking: "Calculating... seeing deep into the endgame.",
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
                praiseSpotBlunder: [
                    "Impressive! You actually found the punishment. Very sharp.",
                    "Top class. You spotted the tactical shot immediately.",
                    "Respect. That was a grandmaster-level response."
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

            this.moveHistory = []; // Array of { ply, san, from, to, moveObj, isPlayer, bubble1, bubble2, eval }
            this.pendingChallenge = null; // Active blunder challenge object
            this.pliesSinceBlunder = 0;
            this.isGameOver = false;
            this.lastMoveQuality = null;
            this.announcedOpening = false;

            // Current speech commentary
            this.currentBubble1 = this.persona.voice.intro;
            this.currentBubble2 = "Make your opening move to get started!";
            this.currentDialogue = `${this.persona.voice.intro} Make your opening move to get started!`;
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
                    this.currentBubble1 = this.persona.voice.intro;
                    this.currentBubble2 = "Make your opening move to get started!";
                    this.currentDialogue = `${this.persona.voice.intro} Make your opening move to get started!`;
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
                    // Ignore postMessage failure in test environments
                }
            }
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
            this.lastMoveQuality = null;
            this.announcedOpening = false;

            this.currentBubble1 = this.persona.voice.intro;
            this.currentBubble2 = (this.playerColor === 'w')
                ? "Make your opening move to get started!"
                : "I'll make the first move. Let's see what you've got!";
            this.currentDialogue = `${this.persona.voice.intro} ${this.currentBubble2}`;
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

            // 1. Check if user is resolving an active intentional blunder challenge
            let challengeFeedback = null;
            if (this.pendingChallenge) {
                const playedUci = legalMove.from + legalMove.to;
                const isPunished = this.pendingChallenge.refutations.some(ref => {
                    return ref === legalMove.san || ref === playedUci || ref.startsWith(playedUci);
                });

                if (isPunished) {
                    challengeFeedback = {
                        success: true,
                        text: pickRandom(this.persona.voice.praiseSpotBlunder)
                    };
                } else {
                    const bestText = this.pendingChallenge.bestSan || 'the tactical refutation';
                    challengeFeedback = {
                        success: false,
                        text: `${pickRandom(this.persona.voice.missedBlunder)} (${bestText} was the punishing tactic!)`
                    };
                }
                this.pendingChallenge = null;
            }

            // 2. Quick evaluation of user move quality (if worker available)
            let classification = { uiQuality: 'good move', detailedQuality: 'good', wpLoss: 0 };
            let isBlunder = false;
            let blunderAnalysis = null;
            let bestSan = null;

            const Evaluator = getEvaluator();
            const Recognizer = getRecognizer();
            const Detector = getOpeningDetector();

            if (this.worker && Evaluator) {
                try {
                    const evalBefore = await this._evaluatePosition(fenBefore, 8, 2);
                    const bestUci = evalBefore.bestMove;
                    const playedUci = legalMove.from + legalMove.to + (legalMove.promotion || '');
                    const playedIsBest = (playedUci === bestUci);
                    const bestCp = evalBefore.lines[1]?.cp || 0;
                    const wpBefore = Evaluator.cpToWinProb(bestCp);

                    // Check opening book to avoid false positive opening blunders
                    const historySans = this.moveHistory.map(m => m.san).concat([legalMove.san]);
                    const isBook = (ply <= 12 && Detector && Detector.isBookMove) ? Detector.isBookMove(historySans, ply) : false;

                    let playedCp = 0;
                    let wpAfter = wpBefore;
                    let evalAfter = null;

                    if (playedIsBest || isBook) {
                        playedCp = bestCp;
                        wpAfter = wpBefore;
                    } else if (evalBefore.lines[2]?.pv && evalBefore.lines[2].pv[0] === playedUci) {
                        playedCp = evalBefore.lines[2].cp || 0;
                        wpAfter = Evaluator.cpToWinProb(playedCp);
                    } else {
                        evalAfter = await this._evaluatePosition(fenAfter, 8, 1);
                        playedCp = -(evalAfter.lines[1]?.cp || 0);
                        wpAfter = Evaluator.cpToWinProb(playedCp);
                    }

                    classification = Evaluator.classifyMove(wpBefore, wpAfter, { playedIsBest, isBook });

                    // Compute best SAN for advice
                    if (bestUci && bestUci.length >= 4) {
                        const tempChess = new this.Chess(fenBefore);
                        const bMove = tempChess.move({
                            from: bestUci.slice(0, 2),
                            to: bestUci.slice(2, 4),
                            promotion: bestUci[4]
                        });
                        if (bMove) bestSan = bMove.san;
                    }

                    if (!isBook && (classification.uiQuality === 'blunder' || classification.uiQuality === 'mistake' || classification.wpLoss > 0.15)) {
                        isBlunder = true;
                        if (!evalAfter) {
                            evalAfter = await this._evaluatePosition(fenAfter, 8, 1);
                        }
                        if (Recognizer && Recognizer.explainBlunderOrMistake) {
                            const boardBefore = new this.Chess(fenBefore);
                            const boardAfter = new this.Chess(fenAfter);
                            const refUci = (evalAfter.lines[1]?.pv && evalAfter.lines[1].pv[0]) || '';
                            let refMoveObj = null;
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

                            const bestMoveObj = (bestUci && bestUci.length >= 4) ? {
                                from: bestUci.slice(0, 2),
                                to: bestUci.slice(2, 4),
                                promotion: bestUci[4]
                            } : null;

                            const diag = Recognizer.explainBlunderOrMistake({
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
                                bestPv: evalBefore.lines[1]?.pv || [],
                                refPv: evalAfter.lines[1]?.pv || [],
                                quality: classification.uiQuality,
                                detailedQuality: classification.detailedQuality,
                                wpLoss: classification.wpLoss,
                                ply
                            });
                            blunderAnalysis = diag ? diag.explanation : null;
                        }
                    }
                } catch (e) {
                    // Fallback to default quality
                }
            }
            this.lastMoveQuality = classification;

            // 3. Check for game termination
            this._checkGameTermination();

            // 4. Update bubble thoughts for user's move
            let bubble1 = "";
            let bubble2 = "";

            if (challengeFeedback) {
                bubble1 = challengeFeedback.text;
                bubble2 = "Calculating response...";
            } else if (isBlunder) {
                bubble1 = pickRandom(this.persona.voice.playerBlunder);
                bubble2 = blunderAnalysis || "That move might be a mistake. Review the tactical oversight card below!";
            } else {
                let goodReason = "";
                if (Recognizer && Recognizer.explainGoodMove) {
                    try {
                        const boardBefore = new this.Chess(fenBefore);
                        const boardAfter = new this.Chess(fenAfter);
                        const isBest = (classification.detailedQuality === 'best' || classification.detailedQuality === 'brilliant');
                        const goodDiag = Recognizer.explainGoodMove(boardBefore, boardAfter, legalMove, isBest);
                        if (goodDiag && goodDiag.explanation) {
                            goodReason = goodDiag.explanation;
                        }
                    } catch (e) {}
                }

                if (goodReason) {
                    bubble1 = goodReason;
                } else {
                    bubble1 = pickRandom(this.persona.voice.playerGoodMove);
                }
                bubble2 = this.persona.voice.thinking || "Calculating candidate responses...";
            }

            this.currentBubble1 = bubble1;
            this.currentBubble2 = bubble2;
            if (challengeFeedback) {
                this.currentDialogue = challengeFeedback.text;
            } else if (isBlunder) {
                this.currentDialogue = blunderAnalysis || (bestSan ? `That concedes material or leverage. A stronger alternative was ${bestSan}.` : "That move gives away an advantage. Look for a safer alternative!");
            } else {
                this.currentDialogue = bubble1;
            }
            if (this.isGameOver) {
                this.currentDialogue = this._getGameOverMessage();
            }

            const record = {
                ply,
                san: legalMove.san,
                from: legalMove.from,
                to: legalMove.to,
                moveObj: legalMove,
                isPlayer: true,
                bubble1,
                bubble2,
                dialogue: this.currentDialogue,
                quality: classification.detailedQuality,
                isBlunder,
                blunderAnalysis,
                bestSan
            };
            this.moveHistory.push(record);

            return {
                success: true,
                move: legalMove,
                bubble1,
                bubble2,
                dialogue: this.currentDialogue,
                quality: classification,
                isBlunder,
                blunderAnalysis,
                bestSan,
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
            
            // PRESERVE Bubble 1 from the player's last move so the user's feedback is not wiped!
            if (this.moveHistory.length > 0) {
                const lastPlayerRecord = [...this.moveHistory].reverse().find(m => m.isPlayer);
                if (lastPlayerRecord && lastPlayerRecord.bubble1) {
                    this.currentBubble1 = lastPlayerRecord.bubble1;
                } else {
                    this.currentBubble1 = bubbles.bubble1;
                }
            } else {
                this.currentBubble1 = bubbles.bubble1;
            }

            this.currentBubble2 = bubbles.bubble2;
            this.currentDialogue = this.isGameOver ? this._getGameOverMessage() : bubbles.bubble2;

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
                isChallenge
            };
            this.moveHistory.push(record);

            return {
                success: true,
                move: executed,
                bubble1: this.currentBubble1,
                bubble2: this.currentBubble2,
                dialogue: this.currentDialogue,
                isChallenge,
                challengeData,
                isGameOver: this.isGameOver
            };
        }

        /**
         * Inspects candidate moves to find an instructive tactical mistake (Hanging piece, Fork, Pin, etc.).
         */
        async _findInstructiveBlunder(fen) {
            const Recognizer = getRecognizer();
            if (!Recognizer || !this.worker) return null;

            try {
                // Search MultiPV=5
                const multiEval = await this._evaluatePosition(fen, 8, 5);
                const boardBefore = new this.Chess(fen);

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
                    const refSan = line.pv[1] || '';

                    // 1. Hanging Piece Blunder
                    const hanging = Recognizer.detectHangingPieceBlunder(boardBefore, testBoard, moveExecuted);
                    if (hanging) {
                        return {
                            move: candMove,
                            san: moveExecuted.san,
                            motif: `Hanging ${hanging.piece}`,
                            refutations: [refUci, refSan],
                            bestSan: refSan,
                            type: 'hanging'
                        };
                    }

                    // 2. Walking into a tactical fork
                    if (refUci.length >= 4) {
                        const replyMove = { from: refUci.slice(0, 2), to: refUci.slice(2, 4), promotion: refUci[4] };
                        const replyBoard = new this.Chess(testBoard.fen());
                        const repEx = replyBoard.move(replyMove);
                        if (repEx) {
                            const fork = Recognizer.detectFork(replyBoard, repEx);
                            if (fork) {
                                return {
                                    move: candMove,
                                    san: moveExecuted.san,
                                    motif: 'Tactical Fork',
                                    refutations: [refUci, repEx.san],
                                    bestSan: repEx.san,
                                    type: 'fork'
                                };
                            }
                        }
                    }

                    // 3. Walking into a pin
                    if (refUci.length >= 4) {
                        const replyMove = { from: refUci.slice(0, 2), to: refUci.slice(2, 4), promotion: refUci[4] };
                        const replyBoard = new this.Chess(testBoard.fen());
                        const repEx = replyBoard.move(replyMove);
                        if (repEx) {
                            const pin = Recognizer.detectPin(replyBoard, repEx);
                            if (pin) {
                                return {
                                    move: candMove,
                                    san: moveExecuted.san,
                                    motif: 'Pin',
                                    refutations: [refUci, repEx.san],
                                    bestSan: repEx.san,
                                    type: 'pin'
                                };
                            }
                        }
                    }
                }
            } catch (e) {
                // If anything fails in blunder search, return null
            }
            return null;
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
                // Fall back to legal move
            }

            const legalMoves = this.chess.moves({ verbose: true });
            return legalMoves.length > 0 ? legalMoves[0] : null;
        }

        /**
         * Evaluate position using worker.
         */
        _evaluatePosition(fen, depth = 8, multipv = 1) {
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
                    bubble2: "Click 'New Game' or the Flag button whenever you're ready to play again."
                };
            }

            if (isChallenge) {
                coachMoveDesc = `I played ${move.san}...`;
                challengeText = `Wait, take a close look at the board! ${pickRandom(this.persona.voice.challengeBlunderBait)}`;
                return {
                    bubble1: `I played ${move.san}. Spot the tactical punish!`,
                    bubble2: `${coachMoveDesc} ${challengeText}`
                };
            }

            // Check if player has only 1 legal reply
            const legalMovesCount = this.chess.moves().length;
            if (legalMovesCount === 1) {
                coachMoveDesc = `I play ${move.san}.`;
                challengeText = pickRandom(this.persona.voice.challengeOnlyMove || ["Only one legal move for you here—let's see it!"]);
                return {
                    bubble1: coachMoveDesc,
                    bubble2: `${coachMoveDesc} ${challengeText}`
                };
            }

            // 1. Detect tactical & positional motif of coach move
            if (move.san === 'O-O' || move.san === 'O-O-O') {
                coachMoveDesc = `I castle ${move.san} to tuck my king away safely and activate the rook.`;
                challengeText = "Coordinate your pieces and make sure your own king is safe!";
            } else if (move.san.includes('+')) {
                coachMoveDesc = `Check! My ${pName} on ${move.to} (${move.san}) attacks your king.`;
                challengeText = "Find the cleanest escape square or interposition.";
            } else if (move.captured) {
                const capName = PIECE_NAMES[move.captured] || 'piece';
                coachMoveDesc = `I play ${move.san}, capturing your ${capName} on ${move.to}.`;
                challengeText = "How do you plan to recapture or counter-attack?";
            } else if (Recognizer) {
                try {
                    const attackedSquares = Recognizer.getPieceAttacks(boardAfter, move.to);
                    const attackedPieces = attackedSquares
                        .map(sq => ({ sq, p: boardAfter.get(sq) }))
                        .filter(x => x.p && x.p.color === this.playerColor);
                    const attackedQueen = attackedPieces.find(x => x.p.type === 'q');
                    const attackedRook = attackedPieces.find(x => x.p.type === 'r');

                    if (attackedQueen) {
                        coachMoveDesc = `I play ${move.san}, putting pressure on your Queen on ${attackedQueen.sq}!`;
                        challengeText = "Where will your Queen move to maintain active pressure?";
                    } else if (attackedRook) {
                        coachMoveDesc = `I play ${move.san}, taking aim at your rook on ${attackedRook.sq}.`;
                        challengeText = "How will you defend or counter the threat?";
                    } else if (Recognizer.detectPin && Recognizer.detectPin(boardAfter, move)) {
                        coachMoveDesc = `I play ${move.san}, creating an annoying pin against your piece.`;
                        challengeText = pickRandom(this.persona.voice.challengePinDefense || [
                            "Can you unpin or reinforce the defended square?"
                        ]);
                    } else if (Recognizer.detectCenterStrike && Recognizer.detectCenterStrike(boardBefore, move)) {
                        coachMoveDesc = `I strike at the center with ${move.san}!`;
                        challengeText = pickRandom(this.persona.voice.challengeCenter || [
                            "Central tension! Will you capture, push, or support the center?"
                        ]);
                    } else if (Recognizer.detectPassedPawn && Recognizer.detectPassedPawn(boardAfter, move)) {
                        coachMoveDesc = `Pushing my passed pawn to ${move.to} (${move.san}).`;
                        challengeText = "Can you blockade or target the advancing pawn?";
                    } else if (Recognizer.isTrueOutpost && Recognizer.isTrueOutpost(boardAfter, move.to, move.color)) {
                        coachMoveDesc = `Anchoring my ${pName} on ${move.to} (${move.san}) as an active outpost.`;
                        challengeText = "How will you challenge this well-placed piece?";
                    } else if (Recognizer.detectFileControl && Recognizer.detectFileControl(boardBefore, move)) {
                        coachMoveDesc = `Sliding my rook to ${move.to} (${move.san}) to control the open file.`;
                        challengeText = "How will you contest control of this file?";
                    }
                } catch (e) {}
            }

            // 2. Opening recognition (within first 10 plies)
            if (!coachMoveDesc && this.moveHistory.length <= 10 && Detector && Detector.identifyOpening && !this.announcedOpening) {
                const historySans = this.moveHistory.map(m => m.san).concat([move.san]);
                const op = Detector.identifyOpening(historySans);
                if (op && op.name && op.name !== 'Standard Game') {
                    this.announcedOpening = true;
                    const opDialogue = this._getOpeningDialogue(op);
                    if (opDialogue) {
                        coachMoveDesc = `I play ${move.san} in the ${op.name}.`;
                        challengeText = opDialogue.bubble2;
                    }
                }
            }

            // 3. Piece development or central advance
            if (!coachMoveDesc) {
                if (move.piece === 'n' || move.piece === 'b') {
                    coachMoveDesc = `Developing my ${pName} to ${move.to} (${move.san}) to contest key squares.`;
                    challengeText = pickRandom(this.persona.voice.challengeDevelopment || [
                        "Which piece will you mobilize next to complete your development?"
                    ]);
                } else if (move.piece === 'p' && (move.to === 'e4' || move.to === 'd4' || move.to === 'e5' || move.to === 'd5' || move.to === 'c4' || move.to === 'c5')) {
                    coachMoveDesc = `Pushing pawn to ${move.to} (${move.san}) to fight for central control.`;
                    challengeText = pickRandom(this.persona.voice.challengeCenter || [
                        "How will you stake your claim in the center?"
                    ]);
                } else {
                    coachMoveDesc = `I play ${move.san} to improve piece activity.`;
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
                    bubble1: "The Sicilian Defense! A sharp, combative opening with rich counter-attacking potential.",
                    bubble2: "How will you develop your kingside and challenge my pawn on e4?"
                };
            }
            if (name.includes('french') || eco.startsWith('C0') || eco.startsWith('C1')) {
                return {
                    bubble1: "The French Defense! Building a rock-solid central pawn chain.",
                    bubble2: "Watch that light-squared bishop! How do you plan to activate it?"
                };
            }
            if (name.includes('italian') || eco === 'C50' || eco === 'C53' || eco === 'C54' || eco === 'C55') {
                return {
                    bubble1: "The Italian Game! Classical open piece play targeting the vulnerable f7 square.",
                    bubble2: "Can you neutralize my bishop and fight for central control?"
                };
            }
            if (name.includes('caro-kann') || eco.startsWith('B1')) {
                return {
                    bubble1: "The Caro-Kann! Renowned for pawn structure solidity and endgame resilience.",
                    bubble2: "Are you preparing to strike at the center with ...d5?"
                };
            }
            if (name.includes('ruy lopez') || name.includes('spanish') || eco.startsWith('C6') || eco.startsWith('C7') || eco.startsWith('C8') || eco.startsWith('C9')) {
                return {
                    bubble1: "The Spanish Game! Deep, classical positional maneuvering from move 3.",
                    bubble2: "Can you maintain piece harmony under central pressure?"
                };
            }
            if (name.includes("queen's gambit") || eco.startsWith('D0') || eco.startsWith('D1') || eco.startsWith('D2') || eco.startsWith('D3') || eco.startsWith('D4') || eco.startsWith('D5') || eco.startsWith('D6')) {
                return {
                    bubble1: "The Queen's Gambit! A battle of will and central space from move 2.",
                    bubble2: "Do you take the gambit pawn or stand firm in the center?"
                };
            }
            if (name.includes("king's indian") || eco.startsWith('E6') || eco.startsWith('E7') || eco.startsWith('E8') || eco.startsWith('E9')) {
                return {
                    bubble1: "The King's Indian! You're letting me claim space to prepare a kingside storm.",
                    bubble2: "How do you plan to challenge my central pawn chain?"
                };
            }
            if (name.includes('scandinavian') || eco === 'B01') {
                return {
                    bubble1: "The Scandinavian! An immediate strike against e4 right on move 1.",
                    bubble2: "Developing your queen early can be risky. Keep her safe!"
                };
            }
            return {
                bubble1: `Entering the ${op.name}! Let's see who controls the key squares.`,
                bubble2: "What is your primary strategic plan in this opening?"
            };
        }

        _getContextualChallenge(boardAfter) {
            const playerColor = this.playerColor;
            const homeRank = (playerColor === 'w') ? 0 : 7;

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
                return pickRandom(this.persona.voice.challengeDevelopment || [
                    "You still have pieces asleep on the back rank. Can you mobilize them?",
                    "Bringing your minor pieces into play is top priority. Which piece will you develop next?"
                ]);
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
                return pickRandom(this.persona.voice.challengeEndgame || [
                    "In the endgame, the active king is worth a minor piece. Time to march!",
                    "Precision matters in the endgame. Look ahead a few moves before deciding!"
                ]);
            }

            return pickRandom(this.persona.voice.challengeGeneric);
        }

        /**
         * Generate a pedagogical hint without giving away the exact move.
         * @returns {object} { hintText, highlightSquares, candidateSan }
         */
        generateHint() {
            if (this.isGameOver || !this.isPlayerTurn()) {
                return { hintText: "No hints needed right now.", highlightSquares: [] };
            }

            const Recognizer = getRecognizer();
            const legalMoves = this.chess.moves({ verbose: true });
            if (legalMoves.length === 0) return { hintText: "No legal moves available.", highlightSquares: [] };

            // If an active challenge is pending, guide user toward the punished square
            if (this.pendingChallenge) {
                const targetSquare = this.pendingChallenge.move ? this.pendingChallenge.move.to : null;
                return {
                    hintText: `Coach Hint: Look closely at the ${this.pendingChallenge.motif}. Can you exploit my ${targetSquare ? 'piece on ' + targetSquare : 'last move'}?`,
                    highlightSquares: targetSquare ? [targetSquare] : []
                };
            }

            // Check if player has any piece under immediate attack
            if (Recognizer) {
                for (const m of legalMoves) {
                    if (m.captured && ['q', 'r', 'b', 'n'].includes(m.captured)) {
                        return {
                            hintText: `Coach Hint: You have a tactical capture available! Inspect your attacks around ${m.to}.`,
                            highlightSquares: [m.from, m.to]
                        };
                    }
                }
            }

            // General hint: suggest moving a piece toward the center
            const centerMoves = legalMoves.filter(m => ['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5'].includes(m.to));
            if (centerMoves.length > 0) {
                const cm = centerMoves[0];
                return {
                    hintText: `Coach Hint: Look for control in the center. Consider mobilizing your ${cm.piece ? cm.piece.toUpperCase() : 'piece'}.`,
                    highlightSquares: [cm.from]
                };
            }

            const first = legalMoves[0];
            return {
                hintText: `Coach Hint: Take your time. Inspect candidate squares for your ${first.piece ? first.piece.toUpperCase() : 'pieces'}.`,
                highlightSquares: [first.from]
            };
        }

        /**
         * Take back only the player's last move (e.g. after a blunder).
         * @param {string|null} suggestedSan - Suggested alternative move
         * @returns {boolean} Success
         */
        takebackPlayerMove(suggestedSan = null) {
            if (this.moveHistory.length === 0) return false;
            const lastMove = this.moveHistory[this.moveHistory.length - 1];
            if (lastMove && lastMove.isPlayer) {
                this.chess.undo();
                this.moveHistory.pop();
            } else if (lastMove && !lastMove.isPlayer) {
                this.chess.undo();
                this.moveHistory.pop();
                if (this.moveHistory.length > 0 && this.moveHistory[this.moveHistory.length - 1].isPlayer) {
                    this.chess.undo();
                    this.moveHistory.pop();
                }
            } else {
                return false;
            }
            this.isGameOver = false;

            this.currentBubble1 = "Good instinct to take that back!";
            this.currentBubble2 = suggestedSan
                ? `Take another look at the position. Consider moves like ${suggestedSan} instead!`
                : "Take your time and search for a safer, more active continuation!";
            this.currentDialogue = suggestedSan
                ? `Good instinct to take that back! Consider moves like ${suggestedSan} instead.`
                : "Good instinct to take that back! Take your time and search for a safer, more active continuation!";
            return true;
        }

        /**
         * Take back the last move pair (Coach move + Player move) or last move if game over.
         * @returns {boolean} Success
         */
        takeback() {
            if (this.moveHistory.length === 0) return false;

            // If it's player's turn, undo Coach move then Player move
            if (this.isPlayerTurn()) {
                if (this.moveHistory.length >= 2) {
                    this.chess.undo(); // Undo Coach move
                    this.chess.undo(); // Undo User move
                    this.moveHistory.pop();
                    this.moveHistory.pop();
                } else if (this.moveHistory.length === 1) {
                    this.chess.undo();
                    this.moveHistory.pop();
                }
            } else {
                // Undo User move
                this.chess.undo();
                this.moveHistory.pop();
            }

            this.pendingChallenge = null;
            this.isGameOver = false;

            this.currentBubble1 = "Takeback granted! Let's try that position again.";
            this.currentBubble2 = "Take your time and look for the strongest continuation!";
            this.currentDialogue = "Takeback granted! Let's try that position again. Take your time and look for the strongest continuation!";
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

        _getGameOverMessage() {
            if (this.chess.in_checkmate()) {
                return (this.chess.turn() === this.playerColor)
                    ? "Checkmate! Good game! Don't worry, every loss is a lesson."
                    : "Checkmate! Spectacular play! You won the game!";
            }
            if (this.chess.in_stalemate()) {
                return "Stalemate! The game ends in a peaceful draw.";
            }
            if (this.chess.in_draw()) {
                return "Draw! A well-fought battle on both sides.";
            }
            return "Game over!";
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
