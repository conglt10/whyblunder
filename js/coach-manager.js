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
            this.gameResult = null;
            this.resigned = false;
            this.resignedColor = null;
            this.lastMoveQuality = null;
            this.announcedOpening = false;
            this.lastSuggestedMove = null; // Track coach suggestion for takeback follow-up { fen, san, uci }
            this._positionEvalCache = new Map(); // Cache deep evaluations by FEN to prevent search swing

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

            this.currentBubble1 = this.persona.voice.intro;
            this.currentBubble2 = (this.playerColor === 'w')
                ? "Make your opening move to get started!"
                : "I'll make the first move. Let's see what you've got!";
            this.currentDialogue = `${this.persona.voice.intro} ${this.currentBubble2}`;
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

            // 2. Evaluation of user move quality (with deterministic caching & coach suggestion memory)
            const posKey = this._normalizeFen(fenBefore);
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

            let classification = { uiQuality: 'good move', detailedQuality: 'good', wpLoss: 0 };
            let isBlunder = false;
            let blunderAnalysis = null;
            let bestSan = null;
            let bestMoveObj = null;
            let refMoveObj = null;

            const Evaluator = getEvaluator();
            const Recognizer = getRecognizer();
            const Detector = getOpeningDetector();

            if (wasSuggested) {
                // User played the exact move the coach recommended or the position's verified best move!
                classification = { uiQuality: 'good move', detailedQuality: 'best', wpLoss: 0.0 };
                isBlunder = false;
                this.lastSuggestedMove = null;
            } else if (this.worker && Evaluator) {
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
                    const isBook = (ply <= 12 && Detector && Detector.isBookMove) ? Detector.isBookMove(historySans, ply) : false;

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

                    classification = Evaluator.classifyMove(wpBefore, wpAfter, { playedIsBest, isBook });

                    // Trigger blunder advice and takeback prompt for blunders and mistakes
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
                                } catch (e) {
                                    console.debug?.('[coach] detectOpeningPrincipleViolation error:', e);
                                }
                            }

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
                                bestPv: evalBefore?.lines?.[1]?.pv || [],
                                refPv: evalAfter?.lines?.[1]?.pv || [],
                                quality: classification.uiQuality,
                                detailedQuality: classification.detailedQuality,
                                wpLoss: classification.wpLoss,
                                ply,
                                openingPrincipleViolation: opViolation
                            });
                            blunderAnalysis = diag ? diag.explanation : null;
                        }
                    }
                } catch (e) {
                    console.debug?.('[coach] handleUserMove eval error:', e);
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
            } else if (wasSuggested) {
                bubble1 = `Great adjustment! Playing ${legalMove.san} keeps your position solid and maintains control.`;
                bubble2 = this.persona.voice.thinking || "Calculating candidate responses...";
            } else if (isBlunder) {
                bubble1 = pickRandom(this.persona.voice.playerBlunder);
                bubble2 = blunderAnalysis || "That move might be a mistake. Review the tactical oversight card below!";
            } else if (classification.detailedQuality === 'book') {
                bubble1 = `Book move! ${legalMove.san} follows standard opening theory.`;
                bubble2 = this.persona.voice.thinking || "Calculating candidate responses...";
            } else if (classification.uiQuality === 'inaccuracy') {
                bubble1 = `${legalMove.san} is playable, but slightly inaccurate. Let's see how you handle my counterplay.`;
                bubble2 = this.persona.voice.thinking || "Calculating candidate responses...";
            } else {
                let goodReason = "";
                const isBest = (classification.detailedQuality === 'best' || classification.detailedQuality === 'brilliant');
                if (Recognizer && Recognizer.explainGoodMove) {
                    try {
                        const boardBefore = new this.Chess(fenBefore);
                        const boardAfter = new this.Chess(fenAfter);
                        const goodDiag = Recognizer.explainGoodMove({
                            boardBefore,
                            boardAfter,
                            move: legalMove,
                            san: legalMove.san,
                            isBest
                        });
                        if (goodDiag && goodDiag.explanation) {
                            goodReason = goodDiag.explanation;
                        }
                    } catch (e) {
                        console.debug?.('[coach] explainGoodMove error:', e);
                    }
                }

                const personaPraise = isBest
                    ? (pickRandom(this.persona.voice.playerBestMove) || pickRandom(this.persona.voice.playerGoodMove))
                    : pickRandom(this.persona.voice.playerGoodMove);

                if (goodReason && personaPraise) {
                    bubble1 = `${personaPraise} ${goodReason}`;
                } else if (goodReason) {
                    bubble1 = goodReason;
                } else if (personaPraise) {
                    bubble1 = `${personaPraise}`;
                } else {
                    bubble1 = `Good move with ${legalMove.san}!`;
                }
                bubble2 = this.persona.voice.thinking || "Calculating candidate responses...";
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
                detailedQuality: classification.detailedQuality,
                uiQuality: classification.uiQuality,
                isBlunder,
                blunderAnalysis,
                bestSan,
                bestMoveObj,
                refMoveObj,
                fen: this.chess.fen()
            };
            this.moveHistory.push(record);

            return {
                success: true,
                move: legalMove,
                bubble1,
                bubble2,
                dialogue: this.currentDialogue,
                quality: classification,
                detailedQuality: classification.detailedQuality,
                uiQuality: classification.uiQuality,
                isBlunder,
                blunderAnalysis,
                bestSan,
                bestMoveObj,
                refMoveObj,
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
         * Inspects candidate moves to find an instructive tactical mistake (Hanging piece, Fork, Pin, etc.).
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
                    if (repEx) {
                        const replyBoard = new this.Chess(testBoard.fen());
                        replyBoard.move({ from: refUci.slice(0, 2), to: refUci.slice(2, 4), promotion: refUci[4] });
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

                    // 3. Walking into a pin
                    if (repEx) {
                        const replyBoard = new this.Chess(testBoard.fen());
                        replyBoard.move({ from: refUci.slice(0, 2), to: refUci.slice(2, 4), promotion: refUci[4] });
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
                    } else if (move.piece === 'p' && Recognizer.detectCenterStrike && Recognizer.detectCenterStrike(boardBefore, move)) {
                        coachMoveDesc = `I strike at the center with ${move.san}!`;
                        challengeText = pickRandom(this.persona.voice.challengeCenter || [
                            "Central tension! Will you capture, push, or support the center?"
                        ]);
                    } else if (move.piece === 'p' && Recognizer.detectPassedPawn && Recognizer.detectPassedPawn(boardAfter, move)) {
                        coachMoveDesc = `Pushing my passed pawn to ${move.to} (${move.san}).`;
                        challengeText = "Can you blockade or target the advancing pawn?";
                    } else if ((move.piece === 'n' || move.piece === 'b') && Recognizer.isTrueOutpost && Recognizer.isTrueOutpost(boardAfter, move.to, move.color)) {
                        coachMoveDesc = `Anchoring my ${pName} on ${move.to} (${move.san}) as an active outpost.`;
                        challengeText = `How will you challenge this well-placed ${pName}?`;
                    } else if (move.piece === 'r' && Recognizer.detectFileControl && Recognizer.detectFileControl(boardBefore, move)) {
                        const fileCtrl = Recognizer.detectFileControl(boardBefore, move);
                        if (fileCtrl && fileCtrl.includes('7th rank')) {
                            coachMoveDesc = `Invading the 7th rank with my rook on ${move.to} (${move.san}).`;
                            challengeText = "Rooks on the 7th rank are dangerous! Can you challenge it or defend your pawns?";
                        } else {
                            const isSemi = fileCtrl && fileCtrl.includes('semi-open');
                            coachMoveDesc = `Sliding my rook to ${move.to} (${move.san}) to control the ${isSemi ? 'semi-open' : 'open'} file.`;
                            challengeText = "How will you contest control of this file?";
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
                        coachMoveDesc = `I play ${move.san} in the ${op.name}.`;
                        challengeText = opDialogue.bubble2;
                    }
                }
            }

            // 3. Piece development or central advance
            if (!coachMoveDesc) {
                if (move.piece === 'n') {
                    coachMoveDesc = `Developing my knight to ${move.to} (${move.san}) to contest key squares.`;
                    challengeText = pickRandom(this.persona.voice.challengeDevelopment || [
                        "Which piece will you mobilize next to complete your development?"
                    ]);
                } else if (move.piece === 'b') {
                    coachMoveDesc = `Developing my bishop to ${move.to} (${move.san}) to control key diagonals.`;
                    challengeText = pickRandom(this.persona.voice.challengeDevelopment || [
                        "Which piece will you mobilize next to complete your development?"
                    ]);
                } else if (move.piece === 'p') {
                    if (['e4', 'd4', 'e5', 'd5', 'c4', 'c5'].includes(move.to)) {
                        coachMoveDesc = `Pushing pawn to ${move.to} (${move.san}) to fight for central control.`;
                        challengeText = pickRandom(this.persona.voice.challengeCenter || [
                            "How will you stake your claim in the center?"
                        ]);
                    } else {
                        coachMoveDesc = `Advancing pawn to ${move.to} (${move.san}) to adjust my pawn structure.`;
                        challengeText = "Every pawn move creates lasting structural changes. What is your plan?";
                    }
                } else if (move.piece === 'r') {
                    coachMoveDesc = `Mobilizing my rook to ${move.to} (${move.san}) to improve its activity.`;
                    challengeText = "Active rooks need open lines. How will you contest or limit its reach?";
                } else if (move.piece === 'q') {
                    if (['d4', 'd5', 'e4', 'e5'].includes(move.to)) {
                        coachMoveDesc = `Centralizing my Queen on ${move.to} (${move.san}) to dominate key squares and diagonals.`;
                        challengeText = "A centralized Queen commands huge diagonal and vertical influence. How will you challenge her?";
                    } else {
                        coachMoveDesc = `Repositioning my Queen to ${move.to} (${move.san}) to increase pressure.`;
                        challengeText = "Keep an eye on my Queen's diagonals. Where is your safest counterplay?";
                    }
                } else if (move.piece === 'k') {
                    coachMoveDesc = `Stepping my king to ${move.to} (${move.san}) for better safety.`;
                    challengeText = "King placement is critical. How will you organize your pieces now?";
                } else {
                    coachMoveDesc = `I play ${move.san} with my ${pName} to improve piece activity.`;
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
            const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
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

            // If coach just suggested a move after takeback, align hint directly with that move
            const currentFen = this.chess.fen();
            const posKey = this._normalizeFen(currentFen);
            if (this.lastSuggestedMove && (this.lastSuggestedMove.posKey === posKey || this._normalizeFen(this.lastSuggestedMove.fen) === posKey) && this.lastSuggestedMove.san) {
                const tempB = new this.Chess(currentFen);
                const sm = tempB.move(this.lastSuggestedMove.san);
                if (sm) {
                    const pName = PIECE_NAMES[sm.piece] || 'piece';
                    return {
                        hintText: `Coach Hint: Consider mobilizing your ${pName} toward ${sm.to} (${this.lastSuggestedMove.san}) as we discussed!`,
                        highlightSquares: [sm.from]
                    };
                }
            }

            // If a verified best move is cached for current FEN, use its piece
            const cached = this._positionEvalCache.get(posKey) || this._positionEvalCache.get(currentFen);
            const verifiedSan = (cached && (cached.bestSan || (cached.verifiedBestMove && cached.verifiedBestMove.san)));
            if (verifiedSan) {
                const tempB = new this.Chess(currentFen);
                const cm = tempB.move(verifiedSan);
                if (cm) {
                    const pName = PIECE_NAMES[cm.piece] || 'piece';
                    return {
                        hintText: `Coach Hint: Look for strong piece activity. Consider mobilizing your ${pName} toward ${cm.to}.`,
                        highlightSquares: [cm.from]
                    };
                }
            }

            // General hint: suggest moving a piece toward the center
            const centerMoves = legalMoves.filter(m => ['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5'].includes(m.to));
            if (centerMoves.length > 0) {
                const cm = centerMoves[0];
                const pieceName = PIECE_NAMES[cm.piece] || 'piece';
                return {
                    hintText: `Coach Hint: Look for control in the center. Consider mobilizing your ${pieceName}.`,
                    highlightSquares: [cm.from]
                };
            }

            const first = legalMoves[0];
            const firstPieceName = PIECE_NAMES[first.piece] || 'piece';
            return {
                hintText: `Coach Hint: Take your time. Inspect candidate squares for your ${firstPieceName}.`,
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

            const effectiveSan = suggestedSan || (undonePlayerMove && undonePlayerMove.bestSan) || null;
            this.lastSuggestedMove = this._resolveSuggestion(currentFen, effectiveSan);

            this.currentBubble1 = "Good instinct to take that back!";
            this.currentBubble2 = effectiveSan
                ? `Take another look at the position. Consider moves like ${effectiveSan} instead!`
                : "Take your time and search for a safer, more active continuation!";
            this.currentDialogue = effectiveSan
                ? `Good instinct to take that back! Consider moves like ${effectiveSan} instead.`
                : "Good instinct to take that back! Take your time and search for a safer, more active continuation!";
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

        _getGameOverMessage() {
            if (this.resigned) {
                return (this.resignedColor === this.playerColor)
                    ? "You resigned. No worries, every game is a learning opportunity!"
                    : "Coach resigned! Outstanding play!";
            }
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
