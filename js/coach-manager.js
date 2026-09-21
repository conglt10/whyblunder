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

    function getDetector() {
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
                    "Wait, are you sure? That leaves your piece vulnerable! Want to take it back?",
                    "Whoa, be careful! That might run into some tactical trouble.",
                    "Careful! Check what's aiming at that square before committing."
                ],
                playerGoodMove: [
                    "Nice move! Very clean and active.",
                    "Strong reply! You're keeping the pressure on.",
                    "Good piece placement! I like that idea."
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
                    "Oops! Did I leave something hanging? Don't look too closely!",
                    "Wait, is my piece unprotected? Can you spot what I did wrong?",
                    "Uh oh... I might have made a big oopsie. Do you see it?"
                ],
                praiseSpotBlunder: [
                    "Aw man, you got me! You found my hanging piece!",
                    "You're too good! You caught my blunder right away!",
                    "Ouch! Nice eye, you totally punished that!"
                ],
                missedBlunder: [
                    "Yay, you didn't take my free piece! Thank you!",
                    "Phew! I thought I was doomed there!",
                    "Haha, you missed my mistake! Lucky me!"
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
                challengeGeneric: [
                    "Your turn! Show me what you've learned!",
                    "What's your master plan?",
                    "Take your time, you've got this!"
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
                    "Caution: that square leaves your piece without adequate protection. Would you like to take it back?",
                    "Be mindful of loose pieces. 'Loose pieces drop off' as the saying goes.",
                    "That move concedes tactical leverage. Consider trying a safer alternative."
                ],
                playerGoodMove: [
                    "Very sound move! Solid piece harmony.",
                    "Well played. That controls critical central outposts.",
                    "Strong move! You're applying good principles."
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
                    "That creates an immediate losing weakness. Want to rethink that?"
                ],
                playerGoodMove: [
                    "Good move. Accurate and ambitious.",
                    "Sharp play! You found the best engine response.",
                    "High level technique right there. I like it."
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

            // Current speech bubbles
            this.currentBubble1 = this.persona.voice.intro;
            this.currentBubble2 = "Make your opening move to get started!";
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

            this.currentBubble1 = this.persona.voice.intro;
            this.currentBubble2 = (this.playerColor === 'w')
                ? "Make your opening move to get started!"
                : "I'll make the first move. Let's see what you've got!";
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
         * @returns {Promise<object>} Result with { success, move, bubble1, bubble2, quality, challengeResolved }
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
            const Evaluator = getEvaluator();
            if (this.worker && Evaluator) {
                try {
                    const evalBefore = await this._evaluatePosition(fenBefore, 8, 2);
                    const bestUci = evalBefore.bestMove;
                    const playedUci = legalMove.from + legalMove.to + (legalMove.promotion || '');
                    const playedIsBest = (playedUci === bestUci);
                    const bestCp = evalBefore.lines[1]?.cp || 0;
                    const wpBefore = Evaluator.cpToWinProb(bestCp);

                    const evalAfter = await this._evaluatePosition(fenAfter, 8, 1);
                    const playedCp = -(evalAfter.lines[1]?.cp || 0);
                    const wpAfter = Evaluator.cpToWinProb(playedCp);

                    classification = Evaluator.classifyMove(wpBefore, wpAfter, { playedIsBest });
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
            } else if (classification.uiQuality === 'blunder' || classification.uiQuality === 'mistake') {
                bubble1 = pickRandom(this.persona.voice.playerBlunder);
            } else {
                bubble1 = pickRandom(this.persona.voice.playerGoodMove);
            }

            if (this.isGameOver) {
                bubble2 = this._getGameOverMessage();
            } else {
                bubble2 = "My turn. Let me calculate my response...";
            }

            this.currentBubble1 = bubble1;
            this.currentBubble2 = bubble2;

            const record = {
                ply,
                san: legalMove.san,
                from: legalMove.from,
                to: legalMove.to,
                moveObj: legalMove,
                isPlayer: true,
                bubble1,
                bubble2,
                quality: classification.detailedQuality
            };
            this.moveHistory.push(record);

            return {
                success: true,
                move: legalMove,
                bubble1,
                bubble2,
                quality: classification,
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
            this.currentBubble1 = bubbles.bubble1;
            this.currentBubble2 = bubbles.bubble2;

            const record = {
                ply,
                san: executed.san,
                from: executed.from,
                to: executed.to,
                moveObj: executed,
                isPlayer: false,
                bubble1: bubbles.bubble1,
                bubble2: bubbles.bubble2,
                isChallenge
            };
            this.moveHistory.push(record);

            return {
                success: true,
                move: executed,
                bubble1: bubbles.bubble1,
                bubble2: bubbles.bubble2,
                isChallenge,
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
         * Generates the dual speech bubbles matching the screenshot.
         */
        _generateCoachBubbles(boardBefore, boardAfter, move, isChallenge, challengeData) {
            const Recognizer = getRecognizer();
            let bubble1 = "";
            let bubble2 = "";

            // --- BUBBLE 1: Coach's Own Move Thought / Observation ---
            let detectedConcept = null;

            if (Recognizer) {
                // Check if coach advanced a passed pawn
                if (Recognizer.detectPassedPawn(boardAfter, move)) {
                    detectedConcept = 'passedPawn';
                }
            }

            if (!detectedConcept) {
                if (move.san === 'O-O' || move.san === 'O-O-O') {
                    detectedConcept = 'castle';
                } else if (move.san.includes('+')) {
                    detectedConcept = 'check';
                } else if (move.captured) {
                    detectedConcept = 'capture';
                } else if (move.piece === 'n' || move.piece === 'b') {
                    const startRank = (this.coachColor === 'w') ? 0 : 7;
                    const fromRank = parseInt(move.from[1], 10) - 1;
                    if (fromRank === startRank) {
                        detectedConcept = 'develop';
                    }
                }
            }

            if (detectedConcept && this.persona.voice[detectedConcept]) {
                bubble1 = pickRandom(this.persona.voice[detectedConcept]);
            } else {
                bubble1 = pickRandom(this.persona.voice.genericMove);
            }

            // --- BUBBLE 2: Challenge / Prompt for the User's Turn ---
            if (this.isGameOver) {
                bubble2 = this._getGameOverMessage();
            } else if (isChallenge) {
                bubble2 = pickRandom(this.persona.voice.challengeBlunderBait);
            } else {
                // Check if user has only 1 legal move
                const legalMovesCount = this.chess.moves().length;
                if (legalMovesCount === 1) {
                    bubble2 = pickRandom(this.persona.voice.challengeOnlyMove);
                } else if (boardAfter.in_check()) {
                    bubble2 = "Check! Where is your king running to?";
                } else {
                    bubble2 = pickRandom(this.persona.voice.challengeGeneric);
                }
            }

            return { bubble1, bubble2 };
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
