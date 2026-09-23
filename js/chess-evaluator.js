/**
 * chess-evaluator.js - Score evaluation, win probability, and move classification for WhyBlunder.
 * Compatible with Browser and Node.js.
 */
(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.ChessEvaluator = factory();
    }
}(typeof self !== 'undefined' ? self : this, function() {
    'use strict';

    const MATE_SCORE_CP = 10000;

    /**
     * Safely convert a score object or value to centipawns.
     * Handles mate scores: positive mate -> +10000 - dist*10, negative mate -> -10000 - dist*10.
     * @param {number|object} score - centipawn number or { cp, mate } object
     * @returns {number} centipawns
     */
    function scoreToCp(score) {
        if (score === null || score === undefined) return 0;
        if (typeof score === 'number') return score;
        if (typeof score === 'object') {
            if (score.mate !== undefined && score.mate !== null) {
                const m = score.mate;
                if (m === 0) return 0;
                return m > 0 ? (MATE_SCORE_CP - m * 10) : (-MATE_SCORE_CP - m * 10);
            }
            if (score.cp !== undefined && score.cp !== null) {
                return score.cp;
            }
        }
        return 0;
    }

    /**
     * Convert centipawns to win probability (0.0 to 1.0) using logistic model.
     * WP = 1 / (1 + 10^(-cp / 400))
     * @param {number} cp
     * @returns {number}
     */
    function cpToWinProb(cp) {
        const clamped = Math.max(-MATE_SCORE_CP, Math.min(MATE_SCORE_CP, cp));
        return 1.0 / (1.0 + Math.pow(10.0, -clamped / 400.0));
    }

    /**
     * Format a score object or CP number into readable notation (+1.25, -0.40, M2, -M4).
     * @param {number|object} score
     * @param {string} pov - 'w' or 'b'
     * @returns {string}
     */
    function formatScore(score, pov = 'w') {
        let isWhitePov = (pov === 'w' || pov === 'white');
        if (typeof score === 'object' && score !== null) {
            if (score.mate !== undefined && score.mate !== null) {
                const m = isWhitePov ? score.mate : -score.mate;
                return m > 0 ? `M${m}` : `-M${Math.abs(m)}`;
            }
            const cpVal = score.cp !== undefined ? score.cp : 0;
            const signedCp = isWhitePov ? cpVal : -cpVal;
            const sign = signedCp >= 0 ? '+' : '';
            return `${sign}${(signedCp / 100.0).toFixed(2)}`;
        }
        if (typeof score === 'number') {
            const signedCp = isWhitePov ? score : -score;
            const sign = signedCp >= 0 ? '+' : '';
            return `${sign}${(signedCp / 100.0).toFixed(2)}`;
        }
        return '+0.00';
    }

    // ---------------------------------------------------------------------
    // Phase 3 - adaptive classification (see docs/move-diagnostics-improvement-plan.md F3)
    // Everything below is pure and side-effect free. The legacy constants stay
    // the default so existing call sites are untouched.
    // ---------------------------------------------------------------------

    /** Legacy (context-free) classification bands. */
    const DEFAULT_THRESHOLDS = Object.freeze({ inaccuracy: 0.04, mistake: 0.10, blunder: 0.22 });
    const BRILLIANT_THRESHOLDS = Object.freeze({ maxSecondBestWp: 0.90, minWpGap: 0.05 });

    const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

    /** Home squares of the minor pieces, used by gamePhase() as a development proxy. */
    const MINOR_HOME_SQUARES = {
        w: ['b1', 'c1', 'f1', 'g1'],
        b: ['b8', 'c8', 'f8', 'g8']
    };

    function clamp(value, lo, hi) {
        if (!(typeof value === 'number') || !isFinite(value)) return lo;
        return value < lo ? lo : (value > hi ? hi : value);
    }

    function round4(value) {
        return Math.round(value * 10000) / 10000;
    }

    /**
     * Parse the board field of a FEN into a { square: pieceChar } map.
     * Tolerates a bare board field ("rnbq.../...") as well as a full FEN.
     * @param {string} fen
     * @returns {object} map from algebraic square to piece char ('' when unparseable)
     */
    function parseFenBoard(fen) {
        const board = {};
        if (!fen || typeof fen !== 'string') return board;
        const boardPart = fen.trim().split(/\s+/)[0];
        const ranks = boardPart.split('/');
        if (ranks.length !== 8) return board;
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        for (let r = 0; r < 8; r++) {
            const rankNumber = 8 - r;
            let fileIndex = 0;
            for (const ch of ranks[r]) {
                if (ch >= '1' && ch <= '8') {
                    fileIndex += parseInt(ch, 10);
                    continue;
                }
                if (fileIndex > 7) break;
                if (PIECE_VALUES[ch.toLowerCase()] === undefined) return {};
                board[files[fileIndex] + rankNumber] = ch;
                fileIndex++;
            }
        }
        return board;
    }

    function colorOfPiece(pieceChar) {
        return pieceChar === pieceChar.toUpperCase() ? 'w' : 'b';
    }

    /**
     * Determine the game phase from a FEN. Side agnostic.
     * Uses total non-king material, queen presence, piece count and how many
     * minor pieces have left their home squares.
     * @param {string} fen
     * @returns {'opening'|'middlegame'|'endgame'}
     */
    function gamePhase(fen) {
        if (!fen || fen === 'start') return 'opening';
        const board = parseFenBoard(fen);
        const squares = Object.keys(board);
        if (squares.length === 0) return 'middlegame';

        let material = 0;
        let queens = 0;
        let pieces = 0;            // non-pawn, non-king units on the board
        let developedMinors = 0;

        for (const sq of squares) {
            const ch = board[sq];
            const type = ch.toLowerCase();
            const value = PIECE_VALUES[type];
            if (value === undefined) continue;
            material += value;
            if (type === 'q') queens++;
            if (type !== 'p' && type !== 'k') pieces++;
            if (type === 'n' || type === 'b') {
                const home = MINOR_HOME_SQUARES[colorOfPiece(ch)];
                if (home.indexOf(sq) === -1) developedMinors++;
            }
        }

        // Endgame: little material left, or a queenless simplified position,
        // or at most one piece per side beyond the pawns.
        if (material <= 20) return 'endgame';
        if (queens === 0 && material <= 26) return 'endgame';
        if (pieces <= 2) return 'endgame';

        // Opening: still close to the full army and most minors at home.
        if (material >= 62 && developedMinors <= 4) return 'opening';

        return 'middlegame';
    }

    /**
     * Normalise a MultiPV lines object ({1:{cp,mate,pv}, 2:{...}}) into an
     * ordered array. Missing / malformed entries are dropped.
     * @param {object} lines
     * @returns {Array<{index:number, cp:number, line:object}>}
     */
    function normalizeLines(lines) {
        if (!lines || typeof lines !== 'object') return [];
        const out = [];
        Object.keys(lines).forEach(key => {
            const index = parseInt(key, 10);
            if (!isFinite(index)) return;
            const line = lines[key];
            if (!line || typeof line !== 'object') return;
            if ((line.cp === undefined || line.cp === null) &&
                (line.mate === undefined || line.mate === null)) return;
            out.push({ index, cp: scoreToCp({ cp: line.cp, mate: line.mate }), line });
        });
        out.sort((a, b) => a.index - b.index);
        return out;
    }

    /** Win-probability gap between two centipawn scores, mapped onto 0..1. */
    function gapToSharpness(topCp, otherCp, scale) {
        const gap = cpToWinProb(topCp) - cpToWinProb(otherCp);
        return clamp(gap / scale, 0, 1);
    }

    /**
     * How sharp / forcing a position is, from its MultiPV spread.
     * 1.0 -> line 1 dominates line 2 by a wide margin (only-move territory).
     * 0.0 -> the top lines sit within a few centipawns of each other.
     * 0.5 -> indeterminate (no or a single line supplied); the neutral value
     *        that leaves classificationThresholds at the legacy constants.
     * @param {object} lines - MultiPV lines keyed 1..N
     * @returns {number} 0..1
     */
    function positionSharpness(lines) {
        const ordered = normalizeLines(lines);
        if (ordered.length < 2) return 0.5;
        const top = ordered[0].cp;
        const s12 = gapToSharpness(top, ordered[1].cp, 0.25);
        if (ordered.length < 3) return round4(s12);
        const s13 = gapToSharpness(top, ordered[2].cp, 0.35);
        return round4(clamp(0.8 * s12 + 0.2 * s13, 0, 1));
    }

    /**
     * Adaptive classification bands. Every input is optional; with no inputs
     * (or an empty object) this returns exactly the legacy 0.04/0.10/0.22.
     *
     * @param {object} [ctx]
     * @param {'opening'|'middlegame'|'endgame'} [ctx.phase]
     * @param {number} [ctx.sharpness] - 0..1 from positionSharpness(); 0.5 is neutral
     * @param {number} [ctx.wpBefore]  - win probability before the move (mover POV)
     * @param {number} [ctx.depth]     - search depth behind the evaluation
     * @param {number} [ctx.playerElo] - rating of the player being judged
     * @returns {{ inaccuracy: number, mistake: number, blunder: number }}
     */
    function classificationThresholds(ctx) {
        const opts = (ctx && typeof ctx === 'object') ? ctx : {};

        // --- sharpness: sharp -> tighter bands, quiet -> looser -------------
        const sharpness = (typeof opts.sharpness === 'number' && isFinite(opts.sharpness))
            ? clamp(opts.sharpness, 0, 1) : 0.5;
        const sharpFactor = 1 + 0.7 * (0.5 - sharpness);   // 0.65 .. 1.35

        // --- phase: endgames punish small losses, openings forgive ---------
        let phaseFactor = 1.0;
        if (opts.phase === 'opening') phaseFactor = 1.15;
        else if (opts.phase === 'endgame') phaseFactor = 0.85;

        // --- search reliability: shallow search is noisy --------------------
        let depthFactor = 1.0;
        if (typeof opts.depth === 'number' && isFinite(opts.depth)) {
            depthFactor = 1 + 0.4 * clamp((18 - opts.depth) / 10, 0, 1);
        }

        // --- decided positions: smooth replacement for the 0.95/0.90 cliff --
        // decisiveness is 0 at wp 0.5 and 1 at wp 0 or 1. The widening is
        // applied in full to the inaccuracy band and progressively less to the
        // mistake / blunder bands, so throwing a won game away is still a
        // blunder while shuffling in a won position is not an "inaccuracy".
        let decisiveness = 0;
        if (typeof opts.wpBefore === 'number' && isFinite(opts.wpBefore)) {
            decisiveness = clamp(Math.abs(clamp(opts.wpBefore, 0, 1) - 0.5) * 2, 0, 1);
        }
        const decidedWiden = 1.5 * decisiveness * decisiveness;   // 0 .. 1.5
        const decidedFactor = {
            inaccuracy: 1 + decidedWiden,
            mistake: 1 + 0.6 * decidedWiden,
            blunder: 1 + 0.3 * decidedWiden
        };

        const base = sharpFactor * phaseFactor * depthFactor;
        let inaccuracy = DEFAULT_THRESHOLDS.inaccuracy * base * decidedFactor.inaccuracy;
        let mistake = DEFAULT_THRESHOLDS.mistake * base * decidedFactor.mistake;
        let blunder = DEFAULT_THRESHOLDS.blunder * base * decidedFactor.blunder;

        // --- player rating: raise the inaccuracy floor for beginners --------
        if (typeof opts.playerElo === 'number' && isFinite(opts.playerElo) && opts.playerElo < 1800) {
            const floor = clamp(0.08 - (opts.playerElo - 800) * 0.00004, 0.04, 0.08);
            inaccuracy = Math.max(inaccuracy, floor);
        }

        inaccuracy = round4(clamp(inaccuracy, 0.005, 0.90));
        mistake = round4(clamp(mistake, 0.005, 0.92));
        blunder = round4(clamp(blunder, 0.005, 0.95));

        // keep the bands strictly ordered whatever the inputs did
        if (mistake <= inaccuracy) mistake = round4(inaccuracy * 1.5);
        if (blunder <= mistake) blunder = round4(mistake * 1.5);

        return { inaccuracy, mistake, blunder };
    }

    /**
     * Confidence in a classification: 'low' when the loss sits on a band
     * boundary or the search was shallow, 'medium' for mid-depth searches,
     * 'high' otherwise.
     * @param {number} wpLoss
     * @param {object} thresholds
     * @param {object|null} ctx
     * @returns {'low'|'medium'|'high'}
     */
    function classificationConfidence(wpLoss, thresholds, ctx) {
        const opts = (ctx && typeof ctx === 'object') ? ctx : {};
        const margin = (typeof opts.boundaryMargin === 'number' && isFinite(opts.boundaryMargin))
            ? opts.boundaryMargin : 0.02;
        if (thresholds) {
            const bands = [thresholds.inaccuracy, thresholds.mistake, thresholds.blunder];
            for (const band of bands) {
                if (Math.abs(wpLoss - band) <= margin) return 'low';
            }
        }
        if (typeof opts.depth === 'number' && isFinite(opts.depth)) {
            if (opts.depth < 12) return 'low';
            if (opts.depth < 16) return 'medium';
        }
        return 'high';
    }

    // ---------------------------------------------------------------------
    // Derivations from engine evidence for the currently-dead classifyMove
    // options (F2). These are exported for a later phase to wire in; no call
    // site uses them yet.
    // ---------------------------------------------------------------------

    /** Forced mate distance for the side to move, or null. */
    function mateDistance(score) {
        if (score === null || score === undefined) return null;
        if (typeof score === 'object') {
            if (score.mate !== undefined && score.mate !== null) return score.mate;
            if (score.cp !== undefined && score.cp !== null) return mateDistance(score.cp);
            return null;
        }
        if (typeof score === 'number') {
            if (score >= MATE_SCORE_CP - 1000) return 1;
            if (score <= -MATE_SCORE_CP + 1000) return -1;
            return null;
        }
        return null;
    }

    /**
     * Was the top line effectively the only move?
     * True when the engine reported a single line (only legal move under a
     * MultiPV > 1 search) or when line 1 dominates the rest.
     * @param {object} lines - MultiPV lines keyed 1..N
     * @param {object} [options] - { threshold: 0..1 sharpness cutoff, default 0.8 }
     * @returns {boolean}
     */
    function deriveIsOnlyMove(lines, options = {}) {
        const ordered = normalizeLines(lines);
        if (ordered.length === 0) return false;
        if (ordered.length === 1) return true;
        if (ordered.length >= 2 && cpToWinProb(ordered[1].cp) > 0.60) {
            return false;
        }
        const threshold = (typeof options.threshold === 'number' && isFinite(options.threshold))
            ? options.threshold : 0.8;
        return positionSharpness(lines) >= threshold;
    }

    /**
     * Did the played move throw away a forced mate the engine had found?
     * @param {number|object} bestScore   - engine score of the best move (mover POV)
     * @param {number|object} playedScore - engine score of the played move (mover POV)
     * @returns {boolean}
     */
    function deriveMateMissed(bestScore, playedScore) {
        const bestMate = mateDistance(bestScore);
        if (bestMate === null || bestMate <= 0) return false;
        const playedMate = mateDistance(playedScore);
        return playedMate === null || playedMate <= 0;
    }

    /** Material balance (in pawns) from one side's point of view. */
    function materialBalance(board, side) {
        let balance = 0;
        for (const sq in board) {
            const ch = board[sq];
            const value = PIECE_VALUES[ch.toLowerCase()];
            if (!value) continue;
            balance += (colorOfPiece(ch) === side) ? value : -value;
        }
        return balance;
    }

    /**
     * Apply a UCI move to a parsed board in place (handles captures, promotion,
     * en passant and castling). Returns false when the move cannot be applied.
     */
    function applyUciMove(board, uci) {
        if (!uci || typeof uci !== 'string' || uci.length < 4) return false;
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promo = uci.length > 4 ? uci[4].toLowerCase() : '';
        const piece = board[from];
        if (!piece) return false;
        const type = piece.toLowerCase();
        const side = colorOfPiece(piece);

        // en passant: a pawn changing file onto an empty square
        if (type === 'p' && from[0] !== to[0] && !board[to]) {
            const capturedSquare = to[0] + from[1];
            delete board[capturedSquare];
        }

        // castling: king moving two files
        if (type === 'k' && Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2) {
            const rank = from[1];
            if (to[0] === 'g') {
                const rook = board['h' + rank];
                if (rook) { delete board['h' + rank]; board['f' + rank] = rook; }
            } else if (to[0] === 'c') {
                const rook = board['a' + rank];
                if (rook) { delete board['a' + rank]; board['d' + rank] = rook; }
            }
        }

        delete board[from];
        if (promo && PIECE_VALUES[promo] !== undefined) {
            board[to] = (side === 'w') ? promo.toUpperCase() : promo;
        } else {
            board[to] = piece;
        }
        return true;
    }

    /**
     * Did the played move give material up along the engine's line and not get
     * it back? (The "is it sound?" half of brilliancy lives in classifyMove,
     * which also requires playedIsBest and a healthy wpAfter.)
     * @param {string} fenBefore - position before the played move
     * @param {string} playedMove - UCI of the played move (e.g. 'f3e5', 'e7e8q')
     * @param {Array<string>} pv - engine principal variation in UCI. It may
     *        start with the played move or continue after it.
     * @param {object} [options] - { minMaterial: pawns given up, default 1; maxPlies: default 8 }
     * @returns {boolean}
     */
    function deriveIsSacrifice(fenBefore, playedMove, pv, options = {}) {
        const board = parseFenBoard(fenBefore);
        if (Object.keys(board).length === 0) return false;
        if (!playedMove || typeof playedMove !== 'string' || playedMove.length < 4) return false;
        const mover = board[playedMove.slice(0, 2)] ? colorOfPiece(board[playedMove.slice(0, 2)]) : null;
        if (!mover) return false;

        const minMaterial = (typeof options.minMaterial === 'number') ? options.minMaterial : 1;
        const maxPlies = (typeof options.maxPlies === 'number') ? options.maxPlies : 8;

        const pvMoves = Array.isArray(pv) ? pv.filter(m => typeof m === 'string') : [];
        if (pvMoves.length === 0 || pvMoves[0] !== playedMove) {
            return false;
        }

        const line = pvMoves.slice(0, maxPlies);
        if (line.length < 2) return false;

        const before = materialBalance(board, mover);
        let current = before;
        let applied = 0;
        let opponentCapturedNonPawn = false;
        let settledSamples = [];

        for (let i = 0; i < line.length; i++) {
            const move = line[i];
            const isOpponentPly = (i % 2 === 1);

            if (isOpponentPly) {
                const toSq = move.slice(2, 4);
                const targetPiece = board[toSq];
                if (targetPiece) {
                    const type = targetPiece.toLowerCase();
                    const val = PIECE_VALUES[type];
                    if (val >= 3 && colorOfPiece(targetPiece) === mover) {
                        opponentCapturedNonPawn = true;
                    }
                }
            }

            if (!applyUciMove(board, move)) break;
            applied++;
            
            current = materialBalance(board, mover);
            
            if (i >= 2 && i % 2 === 0) {
                settledSamples.push(current);
            }
        }
        
        if (applied < 2) return false;

        let settled;
        if (settledSamples.length > 0) {
            settled = Math.min(...settledSamples);
        } else {
            settled = current;
        }

        return opponentCapturedNonPawn && (settled <= before - minMaterial) && (current <= before - 1);
    }


    /**
     * Legacy classification - the exact bands and ordering shipped before
     * Phase 3. Used whenever no `context` is supplied, so existing call sites
     * are bit-for-bit unchanged.
     */
    function classifyMoveLegacy(wpBefore, wpAfter, flags) {
        const { playedIsBest, isBook, isSacrifice, isOnlyMove, mateMissed, secondBestWp } = flags;

        if (isBook) {
            return { uiQuality: 'good move', detailedQuality: 'book', wpLoss: 0.0 };
        }

        const wpLoss = Math.max(0.0, wpBefore - wpAfter);

        if (playedIsBest) {
            if (isSacrifice && wpAfter >= 0.60 &&
                secondBestWp !== undefined && secondBestWp !== null &&
                secondBestWp < BRILLIANT_THRESHOLDS.maxSecondBestWp &&
                (wpAfter - secondBestWp) >= BRILLIANT_THRESHOLDS.minWpGap) {
                return { uiQuality: 'good move', detailedQuality: 'brilliant', wpLoss };
            }
            if (isOnlyMove && (wpAfter >= 0.20 || wpLoss <= 0.01)) {
                return { uiQuality: 'good move', detailedQuality: 'great', wpLoss };
            }
            if (wpLoss <= 0.01) {
                return { uiQuality: 'good move', detailedQuality: 'best', wpLoss };
            }
            return { uiQuality: 'good move', detailedQuality: 'excellent', wpLoss };
        }

        // Heavy winning simplification safeguard
        if (wpBefore >= 0.95 && wpAfter >= 0.90) {
            if (wpLoss < 0.15) {
                return { uiQuality: 'good move', detailedQuality: 'good', wpLoss };
            } else {
                return { uiQuality: 'inaccuracy', detailedQuality: 'inaccuracy', wpLoss };
            }
        }

        // Missed win
        if ((wpBefore >= 0.85 && wpAfter < 0.55) || mateMissed) {
            return { uiQuality: 'blunder', detailedQuality: 'missed win', wpLoss };
        }

        if (wpLoss >= 0.22) {
            return { uiQuality: 'blunder', detailedQuality: 'blunder', wpLoss };
        } else if (wpLoss >= 0.10) {
            return { uiQuality: 'mistake', detailedQuality: 'mistake', wpLoss };
        } else if (wpLoss >= 0.04) {
            return { uiQuality: 'inaccuracy', detailedQuality: 'inaccuracy', wpLoss };
        } else if (wpLoss <= 0.015) {
            return { uiQuality: 'good move', detailedQuality: 'excellent', wpLoss };
        } else {
            return { uiQuality: 'good move', detailedQuality: 'good', wpLoss };
        }
    }

    /**
     * Context-aware classification: same ladder, but the bands come from
     * classificationThresholds() and the hard 0.95/0.90 "winning simplification"
     * cliff is replaced by the smooth widening those thresholds already apply
     * as wpBefore approaches 0 or 1.
     */
    function classifyMoveAdaptive(wpBefore, wpAfter, flags, thresholds) {
        const { playedIsBest, isBook, isSacrifice, isOnlyMove, mateMissed, secondBestWp } = flags;

        if (isBook) {
            return { uiQuality: 'good move', detailedQuality: 'book', wpLoss: 0.0 };
        }

        const wpLoss = Math.max(0.0, wpBefore - wpAfter);

        if (playedIsBest) {
            if (isSacrifice && wpAfter >= 0.60 &&
                secondBestWp !== undefined && secondBestWp !== null &&
                secondBestWp < BRILLIANT_THRESHOLDS.maxSecondBestWp &&
                (wpAfter - secondBestWp) >= BRILLIANT_THRESHOLDS.minWpGap) {
                return { uiQuality: 'good move', detailedQuality: 'brilliant', wpLoss };
            }
            if (isOnlyMove && (wpAfter >= 0.20 || wpLoss <= 0.01)) {
                return { uiQuality: 'good move', detailedQuality: 'great', wpLoss };
            }
            if (wpLoss <= 0.01) {
                return { uiQuality: 'good move', detailedQuality: 'best', wpLoss };
            }
            return { uiQuality: 'good move', detailedQuality: 'excellent', wpLoss };
        }

        // Missed win (a found-then-thrown-away forced mate always counts)
        if ((wpBefore >= 0.85 && wpAfter < 0.55) || mateMissed) {
            return { uiQuality: 'blunder', detailedQuality: 'missed win', wpLoss };
        }

        const excellentCutoff = thresholds.inaccuracy * 0.375;   // 0.015 at the legacy 0.04

        if (wpLoss >= thresholds.blunder) {
            return { uiQuality: 'blunder', detailedQuality: 'blunder', wpLoss };
        } else if (wpLoss >= thresholds.mistake) {
            return { uiQuality: 'mistake', detailedQuality: 'mistake', wpLoss };
        } else if (wpLoss >= thresholds.inaccuracy) {
            return { uiQuality: 'inaccuracy', detailedQuality: 'inaccuracy', wpLoss };
        } else if (wpLoss <= excellentCutoff) {
            return { uiQuality: 'good move', detailedQuality: 'excellent', wpLoss };
        } else {
            return { uiQuality: 'good move', detailedQuality: 'good', wpLoss };
        }
    }

    /**
     * Classify move based on win probability difference and tactical context.
     * @param {number} wpBefore - Win probability before the move (from mover's perspective)
     * @param {number} wpAfter - Win probability after the move (from mover's perspective)
     * @param {object} options
     * @param {boolean} [options.playedIsBest]
     * @param {boolean} [options.isBook]
     * @param {boolean} [options.isSacrifice] - see deriveIsSacrifice()
     * @param {boolean} [options.isOnlyMove]  - see deriveIsOnlyMove()
     * @param {boolean} [options.mateMissed]  - see deriveMateMissed()
     * @param {object} [options.context] - OPT-IN adaptive classification:
     *        { phase, sharpness, depth, playerElo }. When omitted the legacy
     *        0.04 / 0.10 / 0.22 bands and the legacy ladder are used verbatim.
     * @returns {{ uiQuality: string, detailedQuality: string, wpLoss: number, confidence: string }}
     */
    function classifyMove(wpBefore, wpAfter, options = {}) {
        const {
            playedIsBest = false,
            isBook = false,
            isSacrifice = false,
            isOnlyMove = false,
            mateMissed = false,
            secondBestWp = null,
            context = null
        } = options;

        const flags = { playedIsBest, isBook, isSacrifice, isOnlyMove, mateMissed, secondBestWp };
        const ctx = (context && typeof context === 'object') ? context : null;

        let result;
        let thresholds;
        if (ctx) {
            thresholds = classificationThresholds({
                phase: ctx.phase,
                sharpness: ctx.sharpness,
                wpBefore: wpBefore,
                depth: ctx.depth,
                playerElo: ctx.playerElo
            });
            result = classifyMoveAdaptive(wpBefore, wpAfter, flags, thresholds);
        } else {
            thresholds = DEFAULT_THRESHOLDS;
            result = classifyMoveLegacy(wpBefore, wpAfter, flags);
        }

        // Additive only: never removes or renames an existing field.
        // A book move is certain; a best move can only be doubted by search depth.
        result.confidence = isBook
            ? 'high'
            : classificationConfidence(result.wpLoss, playedIsBest ? null : thresholds, ctx);
        return result;
    }

    /**
     * Determine if a move is a key moment in the game (blunder, missed win, miss, brilliant, great).
     * Skips mistakes and inaccuracies to focus on major turning points.
     * @param {object} move
     * @returns {boolean}
     */
    function isKeyMoment(move) {
        if (!move) return false;
        const q = (move.detailed_quality || move.quality || '').toLowerCase();
        // Skip mistakes and inaccuracies to focus on game-defining moments
        if (q === 'mistake' || q === 'inaccuracy') {
            return false;
        }
        if (['blunder', 'missed win', 'miss', 'brilliant', 'great'].includes(q)) {
            return true;
        }
        if (typeof move.win_prob_loss === 'number' && move.win_prob_loss >= 0.20) {
            return true;
        }
        if (Array.isArray(move.tags) && move.tags.length > 0) {
            const keyTag = move.tags.some(tag => {
                const t = tag.toLowerCase();
                return t.includes('missed win') || t.includes('missed mate') || t.includes('checkmate');
            });
            if (keyTag) return true;
        }
        return false;
    }

    /**
     * Calculate material counts and advantage difference from a FEN string.
     * @param {string} fen
     * @returns {{
     *   whiteScore: number,
     *   blackScore: number,
     *   scoreDiff: number,
     *   whitePieces: Array<{ type: string, count: number }>,
     *   blackPieces: Array<{ type: string, count: number }>
     * }}
     */
    function calculateMaterialDifference(fen) {
        const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        const counts = {
            w: { p: 0, n: 0, b: 0, r: 0, q: 0, total: 0 },
            b: { p: 0, n: 0, b: 0, r: 0, q: 0, total: 0 }
        };

        if (!fen || fen === 'start') {
            return {
                whiteScore: 39,
                blackScore: 39,
                scoreDiff: 0,
                whitePieces: [],
                blackPieces: []
            };
        }

        const boardPart = fen.split(' ')[0];
        for (const char of boardPart) {
            if ((char >= '1' && char <= '8') || char === '/') continue;
            const isWhite = (char === char.toUpperCase());
            const type = char.toLowerCase();
            if (pieceValues[type] !== undefined) {
                const side = isWhite ? 'w' : 'b';
                counts[side][type]++;
                counts[side].total += pieceValues[type];
            }
        }

        const pieceTypes = ['p', 'n', 'b', 'r', 'q'];
        const whitePieces = [];
        const blackPieces = [];

        pieceTypes.forEach(type => {
            const diff = counts.w[type] - counts.b[type];
            if (diff > 0) {
                whitePieces.push({ type, count: diff });
            } else if (diff < 0) {
                blackPieces.push({ type, count: Math.abs(diff) });
            }
        });

        const scoreDiff = counts.w.total - counts.b.total;

        return {
            whiteScore: counts.w.total,
            blackScore: counts.b.total,
            scoreDiff,
            whitePieces,
            blackPieces
        };
    }

    /**
     * Per-move accuracy (0-100) from win-probability loss (0.0-1.0), using the
     * exponential curve popularised by Lichess/chess.com accuracy scores.
     * @param {number} wpLoss - win probability lost by the mover (0.0 to 1.0)
     * @returns {number} accuracy percentage
     */
    function moveAccuracy(wpLoss) {
        const lossPct = Math.max(0, Math.min(1, Number(wpLoss) || 0)) * 100;
        const acc = 103.1668 * Math.exp(-0.04354 * lossPct) - 3.1669;
        return Math.max(0, Math.min(100, acc));
    }

    function aggregateAccuracy(values) {
        if (!values.length) return null;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        // Harmonic mean punishes isolated blunders the way players expect.
        const harmonic = values.length / values.reduce((a, v) => a + 1 / Math.max(v, 1), 0);
        return Math.round(((mean + harmonic) / 2) * 10) / 10;
    }

    function isBookMove(move) {
        return (move.detailed_quality || '').toLowerCase() === 'book';
    }

    /**
     * Game accuracy per side from analyzed moves (output-contract objects).
     * Book moves count as perfect. Deterministic for a given move list.
     * @param {Array} moves - analyzed moves with is_white and win_prob_loss
     * @returns {{white: number|null, black: number|null}}
     */
    function gameAccuracy(moves) {
        const white = [];
        const black = [];
        (moves || []).forEach(move => {
            if (!move) return;
            const acc = isBookMove(move) ? 100 : moveAccuracy(move.win_prob_loss);
            (move.is_white ? white : black).push(acc);
        });
        return { white: aggregateAccuracy(white), black: aggregateAccuracy(black) };
    }

    /**
     * Accuracy per side for each game phase.
     * @param {Array} moves - analyzed moves
     * @param {Array<string>} fens - pre-move FEN for each move (same indexing)
     * @returns {{opening: object, middlegame: object, endgame: object}}
     */
    function phaseAccuracy(moves, fens) {
        const buckets = { opening: [], middlegame: [], endgame: [] };
        (moves || []).forEach((move, i) => {
            if (!move) return;
            const phase = gamePhase(fens && fens[i]);
            buckets[phase].push(move);
        });
        return {
            opening: gameAccuracy(buckets.opening),
            middlegame: gameAccuracy(buckets.middlegame),
            endgame: gameAccuracy(buckets.endgame)
        };
    }

    return {
        MATE_SCORE_CP,
        DEFAULT_THRESHOLDS,
        BRILLIANT_THRESHOLDS,
        scoreToCp,
        cpToWinProb,
        formatScore,
        classifyMove,
        isKeyMoment,
        calculateMaterialDifference,
        // Phase 3 / F8 additions
        gamePhase,
        positionSharpness,
        classificationThresholds,
        classificationConfidence,
        deriveIsOnlyMove,
        deriveMateMissed,
        deriveIsSacrifice,
        // Game Review accuracy
        moveAccuracy,
        gameAccuracy,
        phaseAccuracy
    };
}));
