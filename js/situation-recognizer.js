/**
 * situation-recognizer.js - Tactical and positional pattern recognition for WhyBlunder.
 * Compatible with Browser and Node.js.
 */
(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SituationRecognizer = factory();
    }
}(typeof self !== 'undefined' ? self : this, function() {
    'use strict';

    const PIECE_VALUES = {
        p: 1,
        n: 3,
        b: 3,
        r: 5,
        q: 9,
        k: 100
    };

    const PIECE_NAMES = {
        p: 'pawn',
        n: 'knight',
        b: 'bishop',
        r: 'rook',
        q: 'queen',
        k: 'king'
    };

    function getChessConstructor() {
        if (typeof Chess !== 'undefined') return Chess;
        if (typeof window !== 'undefined' && window.Chess) return window.Chess;
        if (typeof global !== 'undefined' && global.Chess) return global.Chess;
        try {
            const c = require('./chess.min.js');
            return c.Chess || c;
        } catch (e) {
            return null;
        }
    }

    function squareToFile(sq) {
        return sq.charCodeAt(0) - 97; // 0..7
    }

    function squareToRank(sq) {
        return parseInt(sq.charAt(1)) - 1; // 0..7 (0-indexed)
    }

    function fileRankToSquare(file, rank) {
        return String.fromCharCode(97 + file) + (rank + 1);
    }

    /**
     * Compute squares attacked by a piece on `square`.
     * @param {object} chess - chess.js instance
     * @param {string} square - e.g. 'e4'
     * @returns {string[]} attacked squares
     */
    function getPieceAttacks(chess, square) {
        const p = chess.get(square);
        if (!p) return [];
        const file = squareToFile(square);
        const rank = squareToRank(square);
        const attacked = [];
        const color = p.color;

        if (p.type === 'p') {
            const dir = (color === 'w') ? 1 : -1;
            for (const df of [-1, 1]) {
                const nf = file + df;
                const nr = rank + dir;
                if (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
                    attacked.push(fileRankToSquare(nf, nr));
                }
            }
        } else if (p.type === 'n') {
            const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
            for (const [df, dr] of offsets) {
                const nf = file + df;
                const nr = rank + dr;
                if (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
                    attacked.push(fileRankToSquare(nf, nr));
                }
            }
        } else if (p.type === 'k') {
            for (let df = -1; df <= 1; df++) {
                for (let dr = -1; dr <= 1; dr++) {
                    if (df === 0 && dr === 0) continue;
                    const nf = file + df;
                    const nr = rank + dr;
                    if (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
                        attacked.push(fileRankToSquare(nf, nr));
                    }
                }
            }
        } else {
            // Sliding pieces: b, r, q
            const dirs = [];
            if (p.type === 'b' || p.type === 'q') {
                dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
            }
            if (p.type === 'r' || p.type === 'q') {
                dirs.push([-1,0],[1,0],[0,-1],[0,1]);
            }
            for (const [df, dr] of dirs) {
                let nf = file + df;
                let nr = rank + dr;
                while (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
                    const targetSq = fileRankToSquare(nf, nr);
                    attacked.push(targetSq);
                    if (chess.get(targetSq)) break; // blocked by piece
                    nf += df;
                    nr += dr;
                }
            }
        }
        return attacked;
    }

    /**
     * Check if a square is attacked by pieces of `color`.
     */
    function isSquareAttackedBy(chess, color, targetSq) {
        for (let f = 0; f < 8; f++) {
            for (let r = 0; r < 8; r++) {
                const sq = fileRankToSquare(f, r);
                const piece = chess.get(sq);
                if (piece && piece.color === color) {
                    const attacks = getPieceAttacks(chess, sq);
                    if (attacks.includes(targetSq)) return true;
                }
            }
        }
        return false;
    }

    /**
     * Get all attacking piece squares of `color` targeting `targetSq`.
     */
    function getAttackers(chess, color, targetSq) {
        const attackers = [];
        for (let f = 0; f < 8; f++) {
            for (let r = 0; r < 8; r++) {
                const sq = fileRankToSquare(f, r);
                const piece = chess.get(sq);
                if (piece && piece.color === color) {
                    const attacks = getPieceAttacks(chess, sq);
                    if (attacks.includes(targetSq)) attackers.push(sq);
                }
            }
        }
        return attackers;
    }

    function findKingSquare(chess, color) {
        for (let f = 0; f < 8; f++) {
            for (let r = 0; r < 8; r++) {
                const sq = fileRankToSquare(f, r);
                const p = chess.get(sq);
                if (p && p.type === 'k' && p.color === color) {
                    return sq;
                }
            }
        }
        return null;
    }

    /**
     * Detect direct attacks and threats created by the moved piece.
     */
    function detectThreatsCreated(boardAfter, move) {
        const piece = boardAfter.get(move.to);
        if (!piece) return [];

        const color = piece.color;
        const oppColor = (color === 'w' ? 'b' : 'w');
        const threats = [];

        const attackedSquares = getPieceAttacks(boardAfter, move.to);
        const attackerVal = PIECE_VALUES[piece.type] || 1;

        for (const sq of attackedSquares) {
            const target = boardAfter.get(sq);
            if (!target || target.color !== oppColor) continue;

            const targetVal = PIECE_VALUES[target.type] || 1;
            const isDefended = isSquareAttackedBy(boardAfter, oppColor, sq);
            const targetName = PIECE_NAMES[target.type] || 'piece';

            if (target.type === 'k') {
                threats.push({
                    from: move.to,
                    to: sq,
                    target: targetName,
                    is_check: true,
                    is_undefended: true,
                    description: 'checks the enemy King'
                });
            } else if (!isDefended) {
                threats.push({
                    from: move.to,
                    to: sq,
                    target: targetName,
                    is_check: false,
                    is_undefended: true,
                    description: `attacks undefended ${targetName} on ${sq}`
                });
            } else if (targetVal >= attackerVal) {
                threats.push({
                    from: move.to,
                    to: sq,
                    target: targetName,
                    is_check: false,
                    is_defended: true,
                    description: `attacks the ${targetName} on ${sq}`
                });
            }
        }
        return threats;
    }

    // ------------------------------------------------------------------
    // Static Exchange Evaluation (SEE)
    // ------------------------------------------------------------------
    // A real iterative swap-off on a lightweight occupancy map. Because the
    // attacker set is recomputed from the *current* occupancy after every
    // capture, x-ray / battery attackers hiding behind a captured piece are
    // revealed automatically (rook or queen behind a rook on a file/rank,
    // bishop or queen behind a bishop on a diagonal). Absolutely pinned
    // defenders are excluded (a pinned piece may only capture along its own
    // pin ray), the king may only capture when the square is left undefended,
    // and either side may stand pat when continuing the exchange loses
    // material - that last rule is what makes SEE correct rather than a
    // count of attackers versus defenders.

    const SEE_MAX_PLY = 32;

    function oppositeColor(color) {
        return color === 'w' ? 'b' : 'w';
    }

    /**
     * Snapshot a chess.js board into a plain { square: {type, color} } map.
     * The caller's board is only read, never mutated.
     */
    function buildOccupancy(board) {
        const occ = Object.create(null);
        for (let f = 0; f < 8; f++) {
            for (let r = 0; r < 8; r++) {
                const sq = fileRankToSquare(f, r);
                const p = board.get(sq);
                if (p) occ[sq] = { type: p.type, color: p.color };
            }
        }
        return occ;
    }

    function cloneOccupancy(occ) {
        return Object.assign(Object.create(null), occ);
    }

    function findKingInOccupancy(occ, color) {
        for (const sq in occ) {
            const p = occ[sq];
            if (p.type === 'k' && p.color === color) return sq;
        }
        return null;
    }

    const SLIDE_DIAGONAL = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    const SLIDE_ORTHOGONAL = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const KNIGHT_OFFSETS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

    /**
     * All squares holding a `color` piece that pseudo-legally attacks `sq`
     * in the given occupancy map (pins ignored - this is raw control, which
     * is also what decides whether a king may step onto the square).
     */
    function rawAttackersTo(occ, sq, color) {
        const file = squareToFile(sq);
        const rank = squareToRank(sq);
        const out = [];

        // Pawns: a white pawn attacking `sq` stands one rank below it.
        const pawnRankOffset = (color === 'w') ? -1 : 1;
        for (const df of [-1, 1]) {
            const nf = file + df;
            const nr = rank + pawnRankOffset;
            if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
            const from = fileRankToSquare(nf, nr);
            const p = occ[from];
            if (p && p.color === color && p.type === 'p') out.push(from);
        }

        for (const [df, dr] of KNIGHT_OFFSETS) {
            const nf = file + df;
            const nr = rank + dr;
            if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
            const from = fileRankToSquare(nf, nr);
            const p = occ[from];
            if (p && p.color === color && p.type === 'n') out.push(from);
        }

        for (let df = -1; df <= 1; df++) {
            for (let dr = -1; dr <= 1; dr++) {
                if (df === 0 && dr === 0) continue;
                const nf = file + df;
                const nr = rank + dr;
                if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
                const from = fileRankToSquare(nf, nr);
                const p = occ[from];
                if (p && p.color === color && p.type === 'k') out.push(from);
            }
        }

        // Sliders: walk outwards until the first occupied square. Re-running
        // this after a capture is what exposes batteries / x-rays.
        const rays = [
            [SLIDE_DIAGONAL, 'b'],
            [SLIDE_ORTHOGONAL, 'r']
        ];
        for (const [dirs, sliderType] of rays) {
            for (const [df, dr] of dirs) {
                let nf = file + df;
                let nr = rank + dr;
                while (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
                    const cur = fileRankToSquare(nf, nr);
                    const p = occ[cur];
                    if (p) {
                        if (p.color === color && (p.type === sliderType || p.type === 'q')) {
                            out.push(cur);
                        }
                        break;
                    }
                    nf += df;
                    nr += dr;
                }
            }
        }
        return out;
    }

    /**
     * If the piece on `sq` is absolutely pinned against `kingSq`, return the
     * pin direction [df, dr] pointing from the king outwards; otherwise null.
     */
    function pinDirection(occ, sq, kingSq) {
        const piece = occ[sq];
        if (!piece || !kingSq || sq === kingSq) return null;

        const kf = squareToFile(kingSq);
        const kr = squareToRank(kingSq);
        const df = squareToFile(sq) - kf;
        const dr = squareToRank(sq) - kr;

        let dirF;
        let dirR;
        if (df === 0 && dr === 0) return null;
        if (df === 0) {
            dirF = 0;
            dirR = dr > 0 ? 1 : -1;
        } else if (dr === 0) {
            dirR = 0;
            dirF = df > 0 ? 1 : -1;
        } else if (Math.abs(df) === Math.abs(dr)) {
            dirF = df > 0 ? 1 : -1;
            dirR = dr > 0 ? 1 : -1;
        } else {
            return null;
        }

        // Nothing may stand between the king and the candidate pinned piece.
        let f = kf + dirF;
        let r = kr + dirR;
        while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
            const cur = fileRankToSquare(f, r);
            if (cur === sq) break;
            if (occ[cur]) return null;
            f += dirF;
            r += dirR;
        }
        if (f < 0 || f > 7 || r < 0 || r > 7) return null;

        // Look for an enemy slider behind the piece along the same ray.
        const diagonal = (dirF !== 0 && dirR !== 0);
        f += dirF;
        r += dirR;
        while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
            const cur = fileRankToSquare(f, r);
            const p = occ[cur];
            if (p) {
                if (p.color !== piece.color) {
                    if (diagonal && (p.type === 'b' || p.type === 'q')) return [dirF, dirR];
                    if (!diagonal && (p.type === 'r' || p.type === 'q')) return [dirF, dirR];
                }
                return null;
            }
            f += dirF;
            r += dirR;
        }
        return null;
    }

    /** Is `targetSq` on the ray that starts at `kingSq` and runs along `dir`? */
    function onPinRay(kingSq, dir, targetSq) {
        const df = squareToFile(targetSq) - squareToFile(kingSq);
        const dr = squareToRank(targetSq) - squareToRank(kingSq);
        const [dirF, dirR] = dir;
        if (dirF === 0) return df === 0 && dr !== 0 && (dr > 0 ? 1 : -1) === dirR;
        if (dirR === 0) return dr === 0 && df !== 0 && (df > 0 ? 1 : -1) === dirF;
        if (Math.abs(df) !== Math.abs(dr) || df === 0) return false;
        return (df > 0 ? 1 : -1) === dirF && (dr > 0 ? 1 : -1) === dirR;
    }

    /**
     * Attackers of `sq` belonging to `color` that could *legally* capture
     * there: absolutely pinned pieces are dropped unless the capture happens
     * on their own pin ray, and the king is only offered when the square is
     * not defended once the capture is made.
     */
    function legalAttackersTo(occ, sq, color) {
        const kingSq = findKingInOccupancy(occ, color);
        const raw = rawAttackersTo(occ, sq, color);
        const out = [];
        let kingAttacker = null;

        for (const from of raw) {
            const p = occ[from];
            if (!p) continue;
            if (p.type === 'k') {
                kingAttacker = from;
                continue;
            }
            if (kingSq) {
                const dir = pinDirection(occ, from, kingSq);
                if (dir && !onPinRay(kingSq, dir, sq)) continue;
            }
            out.push(from);
        }

        // The king is the most valuable capturer, so it is only ever used
        // when nothing else is left - and only if the square is then safe.
        if (out.length === 0 && kingAttacker) {
            const probe = cloneOccupancy(occ);
            delete probe[sq];
            delete probe[kingAttacker];
            probe[sq] = { type: 'k', color: color };
            if (rawAttackersTo(probe, sq, oppositeColor(color)).length === 0) {
                out.push(kingAttacker);
            }
        }
        return out;
    }

    function seeSwapOff(occ, sq, side, ply) {
        if (ply > SEE_MAX_PLY) return 0;
        const target = occ[sq];
        if (!target || target.color === side) return 0;
        if (target.type === 'k') return 0; // kings are never actually captured

        const attackers = legalAttackersTo(occ, sq, side);
        if (attackers.length === 0) return 0;

        let bestFrom = null;
        let bestVal = Infinity;
        for (const from of attackers) {
            const val = PIECE_VALUES[occ[from].type] || 0;
            if (val < bestVal) {
                bestVal = val;
                bestFrom = from;
            }
        }
        if (!bestFrom) return 0;

        const mover = occ[bestFrom];
        let gain = PIECE_VALUES[target.type] || 0;
        let landing = { type: mover.type, color: mover.color };

        const promotionRank = (side === 'w') ? 7 : 0;
        if (mover.type === 'p' && squareToRank(sq) === promotionRank) {
            landing = { type: 'q', color: side };
            gain += (PIECE_VALUES.q - PIECE_VALUES.p);
        }

        const next = cloneOccupancy(occ);
        delete next[bestFrom];
        next[sq] = landing;

        // Stand pat: never continue an exchange that loses material.
        return Math.max(0, gain - seeSwapOff(next, sq, oppositeColor(side), ply + 1));
    }

    /**
     * Static Exchange Evaluation for the square `square`.
     *
     * @param {object} board - chess.js instance (read only, never mutated)
     * @param {string} square - the contested square, e.g. 'e5'
     * @param {string} sideToCapture - 'w' | 'b', the side that initiates
     * @returns {number} net material, in pawn units, that `sideToCapture`
     *          wins by starting the capture sequence. Either side may stop
     *          capturing at any point, so the result is never negative: 0
     *          means "the exchange is not worth starting / is balanced".
     */
    function staticExchangeEval(board, square, sideToCapture) {
        if (!board || !square || !sideToCapture) return 0;
        const target = board.get(square);
        if (!target || target.color === sideToCapture) return 0;
        if (target.type === 'k') return 0;
        return seeSwapOff(buildOccupancy(board), square, sideToCapture, 0);
    }

    /** Same as staticExchangeEval, on an already-built occupancy map. */
    function seeOnOccupancy(occ, square, sideToCapture) {
        const target = occ[square];
        if (!target || target.color === sideToCapture || target.type === 'k') return 0;
        return seeSwapOff(occ, square, sideToCapture, 0);
    }

    /**
     * Check if a piece of `color` on `square` is safe from being captured
     * profitably. Backed by a real static exchange evaluation, so sound
     * exchanges and pieces defended through a battery are no longer flagged,
     * and defenders that are absolutely pinned no longer count.
     *
     * @param {object} board - chess.js instance
     * @param {string} color - colour of the piece we are asking about
     * @param {string} square - its square
     * @param {number|null} oppAttackerVal - optional cap: if the piece is
     *        attacked and worth more than this, treat it as unsafe
     *        (preserved from the previous heuristic implementation).
     * @returns {boolean}
     */
    function isPieceSafe(board, color, square, oppAttackerVal = null) {
        const piece = board.get(square);
        if (!piece) return true;

        const ownColor = piece.color || color;
        const oppColor = oppositeColor(ownColor);

        if (!isSquareAttackedBy(board, oppColor, square)) {
            return true;
        }

        // A king is "safe" only when the square is not attacked at all.
        if (piece.type === 'k') return false;

        if (staticExchangeEval(board, square, oppColor) > 0) {
            return false;
        }

        const val = PIECE_VALUES[piece.type] || 0;
        if (oppAttackerVal !== null && val > oppAttackerVal) {
            return false;
        }

        return true;
    }

    /**
     * Detect genuine, unavoidable fork / double attack.
     */
    function detectFork(boardAfter, move) {
        const piece = boardAfter.get(move.to);
        if (!piece) return null;

        const attackerVal = PIECE_VALUES[piece.type] || 0;
        const color = piece.color;
        const oppColor = (color === 'w' ? 'b' : 'w');

        // Check 1: Is the attacker itself en prise / easily capturable?
        const isAttackerDefended = isSquareAttackedBy(boardAfter, color, move.to);
        const oppAttackers = getAttackers(boardAfter, oppColor, move.to);
        if (oppAttackers.length > 0) {
            if (!isAttackerDefended) return null;
            let minOppVal = 999;
            for (const a of oppAttackers) {
                const p = boardAfter.get(a);
                if (p) {
                    const aVal = PIECE_VALUES[p.type] || 0;
                    if (aVal < minOppVal) minOppVal = aVal;
                }
            }
            if (minOppVal <= attackerVal) return null;
        }

        // Check 2: Identify valuable targets
        const attackedSquares = getPieceAttacks(boardAfter, move.to);
        const valuableTargets = [];

        for (const sq of attackedSquares) {
            const target = boardAfter.get(sq);
            if (!target || target.color !== oppColor) continue;

            const targetVal = PIECE_VALUES[target.type] || 0;
            const isDefended = isSquareAttackedBy(boardAfter, oppColor, sq);

            if (target.type === 'k') {
                valuableTargets.push({
                    square: sq,
                    type: target.type,
                    val: targetVal,
                    name: PIECE_NAMES[target.type] || 'piece',
                    is_defended: isDefended
                });
            } else if (targetVal > attackerVal) {
                valuableTargets.push({
                    square: sq,
                    type: target.type,
                    val: targetVal,
                    name: PIECE_NAMES[target.type] || 'piece',
                    is_defended: isDefended
                });
            } else if (!isDefended) {
                valuableTargets.push({
                    square: sq,
                    type: target.type,
                    val: targetVal,
                    name: PIECE_NAMES[target.type] || 'piece',
                    is_defended: false
                });
            }
        }

        if (valuableTargets.length < 2) return null;

        // At least one target must be a piece (not both pawns)
        if (!valuableTargets.some(t => t.type !== 'p')) return null;

        valuableTargets.sort((a, b) => b.val - a.val);
        const t1 = valuableTargets[0];
        const t2 = valuableTargets[1];

        // Check 3: Can opponent resolve both threats in a single legal move?
        const legalMoves = boardAfter.moves({ verbose: true });
        for (const oppMove of legalMoves) {
            boardAfter.move(oppMove);

            // Case 3a: Counter-check
            if (boardAfter.in_check && boardAfter.in_check()) {
                const chkSafe = isPieceSafe(boardAfter, oppColor, oppMove.to);
                boardAfter.undo();
                if (chkSafe) return null;
                continue;
            }

            // Case 3b: Opponent captures attacker
            if (oppMove.to === move.to) {
                const capturer = oppMove.piece;
                const capturerVal = PIECE_VALUES[capturer] || 1;
                boardAfter.undo();
                if (!isAttackerDefended || capturerVal <= attackerVal) {
                    return null;
                }
                continue;
            }

            // Case 3c: Check safety of both targets after oppMove
            const sq1 = (oppMove.from === t1.square) ? oppMove.to : t1.square;
            const sq2 = (oppMove.from === t2.square) ? oppMove.to : t2.square;

            const attacksFromForker = getPieceAttacks(boardAfter, move.to);
            const t1AttackedByForker = attacksFromForker.includes(sq1);
            const t1Defended = isSquareAttackedBy(boardAfter, oppColor, sq1);
            let t1Safe = !t1AttackedByForker || (t1Defended && t1.val <= attackerVal);
            if (oppMove.from === t1.square) {
                t1Safe = t1Safe && isPieceSafe(boardAfter, oppColor, sq1);
            }

            const t2AttackedByForker = attacksFromForker.includes(sq2);
            const t2Defended = isSquareAttackedBy(boardAfter, oppColor, sq2);
            let t2Safe = !t2AttackedByForker || (t2Defended && t2.val <= attackerVal);
            if (oppMove.from === t2.square) {
                t2Safe = t2Safe && isPieceSafe(boardAfter, oppColor, sq2);
            }

            boardAfter.undo();

            if (t1Safe && t2Safe) {
                return null;
            }
        }

        const names = [t1.name, t2.name];
        return {
            type: 'fork',
            attacker: PIECE_NAMES[piece.type] || 'piece',
            targets: names,
            description: `forking the ${names[0]} and ${names[1]}`
        };
    }

    /**
     * Detect pin created by the moved piece.
     */
    function detectPin(boardAfter, move) {
        const piece = boardAfter.get(move.to);
        if (!piece || (piece.type !== 'b' && piece.type !== 'r' && piece.type !== 'q')) {
            return null;
        }

        const color = piece.color;
        const oppColor = (color === 'w' ? 'b' : 'w');

        // Check if pinning piece is safe (not hanging / en prise)
        const isAttackerDefended = isSquareAttackedBy(boardAfter, color, move.to);
        const oppAttackers = getAttackers(boardAfter, oppColor, move.to);
        if (oppAttackers.length > 0) {
            if (!isAttackerDefended) return null;
            let minOppVal = 999;
            for (const a of oppAttackers) {
                const p = boardAfter.get(a);
                if (p) {
                    const aVal = PIECE_VALUES[p.type] || 0;
                    if (aVal < minOppVal) minOppVal = aVal;
                }
            }
            const attackerVal = PIECE_VALUES[piece.type] || 0;
            if (minOppVal < attackerVal) return null;
        }
        const kingSq = findKingSquare(boardAfter, oppColor);
        if (!kingSq) return null;

        const f1 = squareToFile(move.to);
        const r1 = squareToRank(move.to);
        const f2 = squareToFile(kingSq);
        const r2 = squareToRank(kingSq);

        const df = f2 - f1;
        const dr = r2 - r1;

        // Must be on the same rank, file, or diagonal
        const stepF = df === 0 ? 0 : (df > 0 ? 1 : -1);
        const stepR = dr === 0 ? 0 : (dr > 0 ? 1 : -1);

        const isDiagonal = Math.abs(df) === Math.abs(dr) && df !== 0;
        const isStraight = (df === 0 && dr !== 0) || (df !== 0 && dr === 0);

        if (piece.type === 'b' && !isDiagonal) return null;
        if (piece.type === 'r' && !isStraight) return null;
        if (piece.type === 'q' && !isDiagonal && !isStraight) return null;

        // Trace squares between move.to and kingSq
        let currF = f1 + stepF;
        let currR = r1 + stepR;
        let pinnedPiece = null;
        let pieceCount = 0;

        while (currF !== f2 || currR !== r2) {
            const sq = fileRankToSquare(currF, currR);
            const p = boardAfter.get(sq);
            if (p) {
                pieceCount++;
                if (p.color === oppColor) {
                    pinnedPiece = p;
                }
            }
            currF += stepF;
            currR += stepR;
        }

        // Exactly one piece between slider and king, and that piece is an opponent piece
        if (pieceCount === 1 && pinnedPiece) {
            const name = PIECE_NAMES[pinnedPiece.type] || 'piece';
            return {
                type: 'pin',
                pinned: name,
                description: `pinning the enemy ${name} to the King`
            };
        }
        return null;
    }

    /**
     * Detect skewer created by the moved piece.
     */
    function detectSkewer(boardAfter, move) {
        const piece = boardAfter.get(move.to);
        if (!piece || (piece.type !== 'b' && piece.type !== 'r' && piece.type !== 'q')) {
            return null;
        }

        const color = piece.color;
        const oppColor = (color === 'w' ? 'b' : 'w');

        // Check if attacker is safe
        const isAttackerDefended = isSquareAttackedBy(boardAfter, color, move.to);
        const oppAttackers = getAttackers(boardAfter, oppColor, move.to);
        if (oppAttackers.length > 0) {
            if (!isAttackerDefended) return null;
            let minOppVal = 999;
            for (const a of oppAttackers) {
                const p = boardAfter.get(a);
                if (p) {
                    const aVal = PIECE_VALUES[p.type] || 0;
                    if (aVal < minOppVal) minOppVal = aVal;
                }
            }
            if (minOppVal < (PIECE_VALUES[piece.type] || 0)) return null;
        }

        const dirs = [];
        if (piece.type === 'b' || piece.type === 'q') {
            dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
        }
        if (piece.type === 'r' || piece.type === 'q') {
            dirs.push([-1,0],[1,0],[0,-1],[0,1]);
        }

        const f0 = squareToFile(move.to);
        const r0 = squareToRank(move.to);

        for (const [df, dr] of dirs) {
            let f = f0 + df;
            let r = r0 + dr;
            let firstTarget = null;
            let secondTarget = null;

            while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
                const sq = fileRankToSquare(f, r);
                const p = boardAfter.get(sq);
                if (p) {
                    if (p.color === color) break;
                    if (!firstTarget) {
                        firstTarget = { piece: p, square: sq };
                    } else {
                        secondTarget = { piece: p, square: sq };
                        break;
                    }
                }
                f += df;
                r += dr;
            }

            if (firstTarget && secondTarget) {
                const v1 = PIECE_VALUES[firstTarget.piece.type] || 0;
                const v2 = PIECE_VALUES[secondTarget.piece.type] || 0;
                if (v1 >= v2 && v2 >= 3 && (firstTarget.piece.type === 'k' || firstTarget.piece.type === 'q' || (firstTarget.piece.type === 'r' && v2 >= 3))) {
                    const n1 = PIECE_NAMES[firstTarget.piece.type];
                    const n2 = PIECE_NAMES[secondTarget.piece.type];
                    return {
                        type: 'skewer',
                        front: n1,
                        back: n2,
                        description: `skewering the ${n1} and ${n2}`
                    };
                }
            }
        }
        return null;
    }

    /**
     * Detect discovered attack or discovered check.
     */
    function detectDiscoveredAttack(boardBefore, boardAfter, move) {
        const color = boardBefore.turn();
        const oppColor = (color === 'w' ? 'b' : 'w');
        const fromSq = move.from;
        const fromF = squareToFile(fromSq);
        const fromR = squareToRank(fromSq);

        const dirs = [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
        for (const [df, dr] of dirs) {
            let backF = fromF - df;
            let backR = fromR - dr;
            let friendlySlider = null;

            while (backF >= 0 && backF <= 7 && backR >= 0 && backR <= 7) {
                const sq = fileRankToSquare(backF, backR);
                const p = boardBefore.get(sq);
                if (p) {
                    if (p.color === color) {
                        const isDiag = Math.abs(df) === 1 && Math.abs(dr) === 1;
                        const isStraight = (df === 0 && dr !== 0) || (df !== 0 && dr === 0);
                        if ((isDiag && (p.type === 'b' || p.type === 'q')) ||
                            (isStraight && (p.type === 'r' || p.type === 'q'))) {
                            friendlySlider = p;
                        }
                    }
                    break;
                }
                backF -= df;
                backR -= dr;
            }

            if (!friendlySlider) continue;

            let fwdF = fromF + df;
            let fwdR = fromR + dr;
            let targetPiece = null;
            let targetSq = null;

            while (fwdF >= 0 && fwdF <= 7 && fwdR >= 0 && fwdR <= 7) {
                const sq = fileRankToSquare(fwdF, fwdR);
                const p = boardAfter.get(sq);
                if (p) {
                    if (p.color === oppColor) {
                        targetPiece = p;
                        targetSq = sq;
                    }
                    break;
                }
                fwdF += df;
                fwdR += dr;
            }

            if (targetPiece) {
                const targetName = PIECE_NAMES[targetPiece.type] || 'piece';
                if (targetPiece.type === 'k') {
                    return {
                        type: 'discovered_check',
                        target: 'king',
                        description: `unleashing a discovered check against the King`
                    };
                } else if (targetPiece.type === 'q' || targetPiece.type === 'r' || !isSquareAttackedBy(boardAfter, oppColor, targetSq) || PIECE_VALUES[targetPiece.type] > PIECE_VALUES[friendlySlider.type]) {
                    return {
                        type: 'discovered_attack',
                        target: targetName,
                        description: `unleashing a discovered attack on the ${targetName}`
                    };
                }
            }
        }
        return null;
    }

    /**
     * Detect center pawn strike or center push.
     */
    function detectCenterStrike(boardBefore, move) {
        const piece = boardBefore.get(move.from);
        if (!piece || piece.type !== 'p') return null;
        const color = piece.color;
        const oppColor = (color === 'w' ? 'b' : 'w');
        const toSq = move.to;

        const isCoreCenter = (toSq === 'd4' || toSq === 'e4' || toSq === 'd5' || toSq === 'e5');
        const isFlankCenter = (toSq === 'c4' || toSq === 'f4' || toSq === 'c5' || toSq === 'f5');

        if (!isCoreCenter && !isFlankCenter) return null;

        const file = squareToFile(toSq);
        const rank = squareToRank(toSq);
        const dir = (color === 'w') ? 1 : -1;
        const attacks = [];
        for (const df of [-1, 1]) {
            const nf = file + df;
            const nr = rank + dir;
            if (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
                attacks.push(fileRankToSquare(nf, nr));
            }
        }
        const attackedPieces = attacks.map(sq => boardBefore.get(sq)).filter(p => p && p.color === oppColor);

        if (attackedPieces.length > 0) {
            const names = attackedPieces.map(p => PIECE_NAMES[p.type] || 'pawn');
            return {
                type: 'center_strike',
                action: `strike at the center with ${toSq} and challenge the ${names[0]}`,
                description: `strikes at the center with ${toSq} and challenges the ${names[0]}`
            };
        }

        if (isCoreCenter) {
            return {
                type: 'center_seize',
                action: `seize the center with ${toSq}`,
                description: `seizes the center with ${toSq}`
            };
        }
        return {
            type: 'center_advance',
            action: `advance in the center with ${toSq}`,
            description: `advances in the center with ${toSq}`
        };
    }

    /**
     * Detect defensive evacuation or defending an attacked piece.
     */
    function detectDefensiveMove(boardBefore, boardAfter, move) {
        const color = boardBefore.turn();
        const oppColor = (color === 'w' ? 'b' : 'w');
        const movedPiece = boardBefore.get(move.from);
        if (!movedPiece) return null;

        // 1. Was the moved piece itself under direct, profitable attack?
        const isAttackedBefore = isSquareAttackedBy(boardBefore, oppColor, move.from);
        if (isAttackedBefore && !isPieceSafe(boardBefore, color, move.from)) {
            const isSafeNow = isPieceSafe(boardAfter, color, move.to);
            if (isSafeNow && !isSquareAttackedBy(boardAfter, oppColor, move.to)) {
                const name = PIECE_NAMES[movedPiece.type] || 'piece';
                return {
                    type: 'escape',
                    description: `retreats the attacked ${name} to safety`
                };
            }
        }

        // 2. Does this move defend a friendly piece that was under attack in boardBefore?
        for (let f = 0; f < 8; f++) {
            for (let r = 0; r < 8; r++) {
                const sq = fileRankToSquare(f, r);
                if (sq === move.from || sq === move.to) continue;
                const p = boardBefore.get(sq);
                if (p && p.color === color && p.type !== 'k') {
                    const attackedBefore = isSquareAttackedBy(boardBefore, oppColor, sq);
                    const safeBefore = isPieceSafe(boardBefore, color, sq);

                    if (attackedBefore && !safeBefore) {
                        const attacksAfter = getPieceAttacks(boardAfter, move.to);
                        const safeNow = isPieceSafe(boardAfter, color, sq);
                        if (attacksAfter.includes(sq) && safeNow) {
                            const name = PIECE_NAMES[p.type] || 'piece';
                            const isHome = squareToRank(move.from) === (color === 'w' ? 0 : 7);
                            if (isHome && (movedPiece.type === 'n' || movedPiece.type === 'b')) {
                                return {
                                    type: 'defend_piece',
                                    isDevelopment: true,
                                    description: `develops the ${PIECE_NAMES[movedPiece.type]} to defend the attacked ${name} on ${sq}`
                                };
                            }
                            return {
                                type: 'defend_piece',
                                isDevelopment: false,
                                description: `defends the attacked ${name} on ${sq}`
                            };
                        }
                    }
                }
            }
        }
        return null;
    }

    /**
     * Detect minor piece development from starting rank.
     */
    function detectMinorDevelopment(boardBefore, move) {
        const piece = boardBefore.get(move.from);
        if (!piece || (piece.type !== 'n' && piece.type !== 'b')) return null;
        const color = piece.color;
        const homeRank = (color === 'w' ? 0 : 7);

        if (squareToRank(move.from) !== homeRank) return null;

        const toSq = move.to;
        if (piece.type === 'n') {
            if (['c3', 'f3', 'c6', 'f6'].includes(toSq)) {
                return `develops the knight to an active square contesting the center`;
            }
            return `develops the knight into active play`;
        } else {
            if (['c4', 'b5', 'g5', 'f4', 'c5', 'b4', 'g4', 'f5'].includes(toSq)) {
                return `develops the bishop along an active diagonal`;
            }
            return `develops the bishop and prepares castling`;
        }
    }

    /**
     * Simulate principal variation moves to detect net material gain or checkmate.
     */
    function detectMaterialGainInPv(board, pvMoves, moverColor) {
        if (!pvMoves || !Array.isArray(pvMoves) || pvMoves.length === 0) return null;
        const ChessCtor = getChessConstructor();
        if (!ChessCtor) return null;

        try {
            const sim = new ChessCtor(board.fen());
            function evalMaterial(b) {
                let moverMat = 0;
                let oppMat = 0;
                for (let f = 0; f < 8; f++) {
                    for (let r = 0; r < 8; r++) {
                        const p = b.get(fileRankToSquare(f, r));
                        if (!p || p.type === 'k') continue;
                        const v = PIECE_VALUES[p.type] || 0;
                        if (p.color === moverColor) moverMat += v;
                        else oppMat += v;
                    }
                }
                return moverMat - oppMat;
            }

            const initialDiff = evalMaterial(sim);
            const maxPlies = Math.min(pvMoves.length, 6);
            let capturedMajorOrMinor = null;

            for (let i = 0; i < maxPlies; i++) {
                const uci = pvMoves[i];
                if (!uci || uci.length < 4) break;
                const from = uci.substring(0, 2);
                const to = uci.substring(2, 4);
                const promotion = uci.length > 4 ? uci[4] : undefined;

                const target = sim.get(to);
                if (sim.turn() === moverColor && target && target.type !== 'p') {
                    if (!capturedMajorOrMinor || (PIECE_VALUES[target.type] > (PIECE_VALUES[capturedMajorOrMinor] || 0))) {
                        capturedMajorOrMinor = target.type;
                    }
                }

                const res = sim.move({ from, to, promotion });
                if (!res) break;
                if (sim.in_checkmate && sim.in_checkmate()) {
                    if (sim.turn() !== moverColor) {
                        return { type: 'checkmate', description: 'forces checkmate' };
                    }
                }
            }

            const finalDiff = evalMaterial(sim);
            const gain = finalDiff - initialDiff;

            if (gain >= 9 || capturedMajorOrMinor === 'q') {
                return { type: 'win_queen', gain, description: 'wins the enemy Queen' };
            } else if (gain >= 5 || capturedMajorOrMinor === 'r') {
                return { type: 'win_rook', gain, description: 'wins a Rook' };
            } else if (gain >= 3 || (capturedMajorOrMinor === 'b' || capturedMajorOrMinor === 'n')) {
                return { type: 'win_piece', gain, description: `wins a ${PIECE_NAMES[capturedMajorOrMinor] || 'minor piece'}` };
            } else if (gain >= 1) {
                return { type: 'win_pawn', gain, description: 'wins a pawn and opens winning lines' };
            }
        } catch (e) {
            // Ignore simulation errors
        }
        return null;
    }

    /**
     * Detect prophylactic prevention of opponent's refutation move.
     */
    function detectProphylaxis(boardBefore, boardAfterBest, bestMove, refutationMove, sanRef) {
        if (!refutationMove) return null;
        const color = boardBefore.turn();
        const oppName = (color === 'w' ? 'Black' : 'White');

        if (bestMove.to === refutationMove.to) {
            return `prevents ${oppName} from playing ${sanRef || 'a counter-strike'} by occupying ${refutationMove.to}`;
        }
        const attacks = getPieceAttacks(boardAfterBest, bestMove.to);
        if (attacks.includes(refutationMove.to)) {
            return `controls ${refutationMove.to} to discourage ${oppName}'s ${sanRef || 'advance'}`;
        }
        return null;
    }

    /**
     * Normalise a single refutation ply into { from, to } or { san }.
     */
    function normalizeRefutationPly(m) {
        if (!m) return null;
        if (typeof m === 'string') {
            const s = m.trim();
            if (/^[a-h][1-8][a-h][1-8][qrbnQRBN]?$/.test(s)) {
                return {
                    from: s.slice(0, 2),
                    to: s.slice(2, 4),
                    promotion: s.length > 4 ? s.charAt(4).toLowerCase() : undefined
                };
            }
            return s ? { san: s } : null;
        }
        if (m.from && m.to) return { from: m.from, to: m.to, promotion: m.promotion };
        if (m.san) return { san: m.san };
        return null;
    }

    /**
     * Accepts a refutation move object, a UCI/SAN string, an array of plies,
     * or an object carrying a `pv` array; returns up to the first 3 plies.
     */
    function normalizeRefutationPlies(refutation) {
        if (!refutation) return [];
        let raw;
        if (Array.isArray(refutation)) {
            raw = refutation.slice();
        } else if (Array.isArray(refutation.pv) && refutation.pv.length > 0) {
            raw = refutation.pv.slice();
            if (refutation.from && refutation.to) {
                const head = normalizeRefutationPly(raw[0]);
                if (!head || head.from !== refutation.from || head.to !== refutation.to) {
                    raw.unshift(refutation);
                }
            }
        } else {
            raw = [refutation];
        }
        return raw.slice(0, 3).map(normalizeRefutationPly).filter(function(p) { return !!p; });
    }

    /**
     * Does the engine's refutation actually win the piece standing on
     * `square`? Returns true / false, or null when the refutation could not
     * be replayed (caller should then fall back to pure SEE).
     */
    function refutationWinsPiece(boardAfter, square, color, refutation) {
        const plies = normalizeRefutationPlies(refutation);
        if (plies.length === 0) return null;

        const ChessCtor = getChessConstructor();
        if (!ChessCtor) return null;

        let sim;
        try {
            sim = new ChessCtor(boardAfter.fen());
        } catch (e) {
            return null;
        }

        const oppColor = oppositeColor(color);
        let playedPlies = 0;
        let lastOppTo = null;

        for (const ply of plies) {
            let res = null;
            try {
                res = ply.san
                    ? sim.move(ply.san, { sloppy: true })
                    : sim.move({ from: ply.from, to: ply.to, promotion: ply.promotion || 'q' });
            } catch (e) {
                res = null;
            }
            if (!res) break;
            playedPlies++;
            if (res.color === oppColor) {
                lastOppTo = res.to;
                // The refutation captures the piece outright.
                if (res.to === square && res.captured) return true;
            } else if (res.from === square) {
                // We saved the piece inside the given line.
                return false;
            }
        }

        if (playedPlies === 0) return null; // unreplayable -> unknown

        // Not captured yet: it still counts if the refutation attacks the
        // piece and winning it is only a capture away.
        const still = sim.get(square);
        if (still && still.color === color && lastOppTo) {
            const attacks = getPieceAttacks(sim, lastOppTo);
            if (attacks.indexOf(square) !== -1 && staticExchangeEval(sim, square, oppColor) > 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Detect hanging piece blunder, using static exchange evaluation rather
     * than an attacker/defender count, and - when the engine's refutation is
     * supplied - only claiming the piece when that refutation really wins it.
     *
     * @param {object} boardBefore - position before the played move
     * @param {object} boardAfter - position after the played move
     * @param {object} playedMove - { from, to, ... }
     * @param {object|string|Array} [refutationMove] - OPTIONAL engine
     *        refutation (move object, UCI/SAN string, PV array, or an object
     *        with a `pv` array). When omitted, pure SEE decides.
     * @returns {{type, piece, square, description}|null}
     */
    function detectHangingPieceBlunder(boardBefore, boardAfter, playedMove, refutationMove) {
        const color = boardBefore.turn();
        const oppColor = oppositeColor(color);
        const movedPiece = boardBefore.get(playedMove.from);
        if (!movedPiece) return null;

        const toSq = playedMove.to;
        const pieceNow = boardAfter.get(toSq);

        if (pieceNow && pieceNow.color === color && pieceNow.type !== 'k') {
            const loss = staticExchangeEval(boardAfter, toSq, oppColor);

            // Net out whatever the played move itself captured: a knight that
            // takes a Queen and is recaptured is not a hanging knight, and a
            // sound exchange is not a blunder.
            let gained = 0;
            if (playedMove.captured) {
                gained = PIECE_VALUES[playedMove.captured] || 0;
            } else {
                const capturedBefore = boardBefore.get(toSq);
                if (capturedBefore && capturedBefore.color === oppColor) {
                    gained = PIECE_VALUES[capturedBefore.type] || 0;
                }
            }

            if (loss - gained > 0) {
                const corroborated = refutationMove
                    ? refutationWinsPiece(boardAfter, toSq, color, refutationMove)
                    : null;
                if (corroborated !== false) {
                    const name = PIECE_NAMES[pieceNow.type] || 'piece';
                    return {
                        type: 'hanging_piece',
                        piece: name,
                        square: toSq,
                        description: `leaves the ${name} hanging on ${toSq}`
                    };
                }
            }
        }

        // Check if the move removed the defense of another friendly piece.
        const occAfter = buildOccupancy(boardAfter);
        let occBefore = null;
        for (let f = 0; f < 8; f++) {
            for (let r = 0; r < 8; r++) {
                const sq = fileRankToSquare(f, r);
                if (sq === toSq) continue;
                const p = occAfter[sq];
                if (!p || p.color !== color || p.type === 'k') continue;
                if (rawAttackersTo(occAfter, sq, oppColor).length === 0) continue;

                const before = boardBefore.get(sq);
                if (!before || before.color !== color || before.type !== p.type) continue;

                if (!occBefore) occBefore = buildOccupancy(boardBefore);
                const safeBefore = seeOnOccupancy(occBefore, sq, oppColor) <= 0;
                const lossNow = seeOnOccupancy(occAfter, sq, oppColor);
                if (safeBefore && lossNow > 0) {
                    if (refutationMove
                        && refutationWinsPiece(boardAfter, sq, color, refutationMove) === false) {
                        continue;
                    }
                    const name = PIECE_NAMES[p.type] || 'piece';
                    return {
                        type: 'removed_defender',
                        piece: name,
                        square: sq,
                        description: `removes the defense of the ${name} on ${sq}`
                    };
                }
            }
        }
        return null;
    }

    /**
     * Check if square is an outpost.
     */
    function isTrueOutpost(board, square, color) {
        const rank = squareToRank(square);
        const file = squareToFile(square);

        if (color === 'w') {
            if (rank !== 3 && rank !== 4 && rank !== 5) return false;
        } else {
            if (rank !== 2 && rank !== 3 && rank !== 4) return false;
        }

        // Defended by friendly pawn?
        const defenders = getAttackers(board, color, square);
        const pawnDefended = defenders.some(sq => {
            const p = board.get(sq);
            return p && p.type === 'p';
        });
        if (!pawnDefended) return false;

        // Can enemy pawns on adjacent files ever challenge it?
        const oppColor = (color === 'w' ? 'b' : 'w');
        const adjFiles = [file - 1, file + 1].filter(f => f >= 0 && f <= 7);

        for (const af of adjFiles) {
            for (let r = 0; r < 8; r++) {
                const p = board.get(fileRankToSquare(af, r));
                if (p && p.type === 'p' && p.color === oppColor) {
                    if (color === 'w' && r > rank) return false;
                    if (color === 'b' && r < rank) return false;
                }
            }
        }
        return true;
    }

    /**
     * Detect open file or 7th rank control.
     */
    function detectFileControl(boardBefore, move) {
        const piece = boardBefore.get(move.from);
        if (!piece || (piece.type !== 'r' && piece.type !== 'q')) return null;

        const color = piece.color;
        const file = squareToFile(move.to);
        const rank = squareToRank(move.to);

        // 7th rank for rook (rank index 6 for white, rank index 1 for black)
        if (piece.type === 'r') {
            if ((color === 'w' && rank === 6) || (color === 'b' && rank === 1)) {
                return 'placing the rook on the 7th rank';
            }
        }

        let friendlyPawns = 0;
        let oppPawns = 0;
        for (let r = 0; r < 8; r++) {
            const p = boardBefore.get(fileRankToSquare(file, r));
            if (p && p.type === 'p') {
                if (p.color === color) friendlyPawns++;
                else oppPawns++;
            }
        }

        if (friendlyPawns === 0 && oppPawns === 0) {
            return 'taking control of the open file';
        } else if (friendlyPawns === 0 && oppPawns > 0) {
            return 'controlling the semi-open file';
        }
        return null;
    }

    /**
     * Detect passed pawn creation or advance.
     */
    function detectPassedPawn(boardAfter, move) {
        const piece = boardAfter.get(move.to);
        if (!piece || piece.type !== 'p') return false;

        const color = piece.color;
        const oppColor = (color === 'w' ? 'b' : 'w');
        const file = squareToFile(move.to);
        const rank = squareToRank(move.to);

        const files = [file - 1, file, file + 1].filter(f => f >= 0 && f <= 7);

        for (const f of files) {
            for (let r = 0; r < 8; r++) {
                if (color === 'w' && r > rank) {
                    const p = boardAfter.get(fileRankToSquare(f, r));
                    if (p && p.type === 'p' && p.color === oppColor) return false;
                } else if (color === 'b' && r < rank) {
                    const p = boardAfter.get(fileRankToSquare(f, r));
                    if (p && p.type === 'p' && p.color === oppColor) return false;
                }
            }
        }
        return true;
    }

    /**
     * Check if a color has castling rights available in the board position.
     * @param {object} board - chess.js instance
     * @param {string} color - 'w' or 'b'
     * @returns {boolean}
     */
    function hasCastlingRights(board, color) {
        if (!board || typeof board.fen !== 'function') return false;
        const fen = board.fen();
        const castling = (fen.split(' ')[2]) || '';
        if (color === 'w') {
            return castling.includes('K') || castling.includes('Q');
        } else if (color === 'b') {
            return castling.includes('k') || castling.includes('q');
        }
        return false;
    }

    /**
     * Detect king safety flaw.
     */
    function detectKingSafetyFlaw(boardBefore, boardAfter, move) {
        const color = boardBefore.turn();
        const piece = boardBefore.get(move.from);
        if (!piece) return null;

        // King moves without castling when castling rights were available
        if (piece.type === 'k') {
            const homeSquare = (color === 'w' ? 'e1' : 'e8');
            const fromFile = squareToFile(move.from);
            const toFile = squareToFile(move.to);
            const isCastling = Math.abs(toFile - fromFile) === 2;

            if (!isCastling && move.from === homeSquare && hasCastlingRights(boardBefore, color)) {
                // If king stepped away forfeiting castling rights
                if (boardBefore.in_check && boardBefore.in_check()) {
                    return 'losing castling rights by moving the King under check';
                }
                return 'forfeiting castling rights and leaving the king in the center';
            }
        }

        // Weakening pawn shield in front of castled king
        if (piece.type === 'p') {
            const kingSq = findKingSquare(boardAfter, color);
            if (kingSq) {
                const kingFile = squareToFile(kingSq);
                const moveFile = squareToFile(move.from);
                if (Math.abs(kingFile - moveFile) <= 1) {
                    if ((color === 'w' && (kingSq === 'g1' || kingSq === 'h1' || kingSq === 'c1' || kingSq === 'b1')) ||
                        (color === 'b' && (kingSq === 'g8' || kingSq === 'h8' || kingSq === 'c8' || kingSq === 'b8'))) {
                        return 'weakening the defensive pawn shield around your King';
                    }
                }
            }
        }
        return null;
    }

    /**
     * Detect attacks on valuable pieces or multiple threats.
     */
    function detectAttacksOnPieces(boardAfter, move) {
        const piece = boardAfter.get(move.to);
        if (!piece) return [];

        const color = piece.color;
        const oppColor = (color === 'w' ? 'b' : 'w');
        const attacks = getPieceAttacks(boardAfter, move.to);
        const attackerVal = PIECE_VALUES[piece.type] || 1;
        const results = [];

        for (const sq of attacks) {
            const target = boardAfter.get(sq);
            if (!target || target.color !== oppColor) continue;

            const targetVal = PIECE_VALUES[target.type] || 1;
            const isDefended = isSquareAttackedBy(boardAfter, oppColor, sq);
            const targetName = PIECE_NAMES[target.type] || 'piece';

            if (target.type === 'q') {
                results.push({
                    type: 'attack_queen',
                    target: 'Queen',
                    targetType: 'q',
                    square: sq,
                    isDefended,
                    description: `attacks the enemy Queen on ${sq}`
                });
            } else if (target.type === 'r') {
                if (!isDefended || attackerVal <= 3) {
                    results.push({
                        type: 'attack_rook',
                        target: 'Rook',
                        targetType: 'r',
                        square: sq,
                        isDefended,
                        description: `attacks the Rook on ${sq}`
                    });
                }
            } else if (!isDefended && target.type !== 'p') {
                results.push({
                    type: 'attack_undefended',
                    target: targetName,
                    targetType: target.type,
                    square: sq,
                    isDefended: false,
                    description: `attacks the undefended ${targetName} on ${sq}`
                });
            } else if (targetVal > attackerVal) {
                results.push({
                    type: 'attack_tempo',
                    target: targetName,
                    targetType: target.type,
                    square: sq,
                    isDefended,
                    description: `attacks the ${targetName} on ${sq} with tempo`
                });
            }
        }
        return results;
    }

    /**
     * Detect if an enemy major or minor piece is trapped with no safe escape squares.
     */
    function detectTrappedPiece(boardAfter, move) {
        const piece = boardAfter.get(move.to);
        if (!piece) return null;

        const color = piece.color;
        const oppColor = (color === 'w' ? 'b' : 'w');
        const attacks = getPieceAttacks(boardAfter, move.to);
        const attackerVal = PIECE_VALUES[piece.type] || 1;

        for (const sq of attacks) {
            const target = boardAfter.get(sq);
            if (!target || target.color !== oppColor) continue;
            if (target.type !== 'q' && target.type !== 'r' && target.type !== 'b' && target.type !== 'n') continue;

            const targetVal = PIECE_VALUES[target.type] || 0;
            const isDefended = isSquareAttackedBy(boardAfter, oppColor, sq);
            if (isDefended && targetVal <= attackerVal) continue;

            const targetAttacks = getPieceAttacks(boardAfter, sq);
            let hasSafeEscape = false;
            for (const escSq of targetAttacks) {
                const occ = boardAfter.get(escSq);
                if (occ && occ.color === oppColor) continue;
                if (escSq === move.to) {
                    if (isSquareAttackedBy(boardAfter, color, escSq) && targetVal > attackerVal) {
                        continue;
                    }
                    hasSafeEscape = true;
                    break;
                }
                if (!isSquareAttackedBy(boardAfter, color, escSq)) {
                    hasSafeEscape = true;
                    break;
                }
            }

            if (!hasSafeEscape) {
                const name = PIECE_NAMES[target.type] || 'piece';
                return {
                    target: name,
                    square: sq,
                    description: `traps the enemy ${name} on ${sq}`
                };
            }
        }
        return null;
    }

    /**
     * Detect board control dominance (center duo, open file, 7th rank, outposts, diagonal).
     */
    function detectBoardControlDominance(boardBefore, boardAfter, move) {
        const piece = boardAfter.get(move.to);
        if (!piece) return null;

        const color = piece.color;
        const oppName = (color === 'w' ? 'Black' : 'White');
        const toSq = move.to;
        const rank = squareToRank(toSq);

        // 1. Classical pawn center duo (e.g. e4 + d4 or e5 + d5)
        if (piece.type === 'p') {
            if ((color === 'w' && ((toSq === 'd4' && boardAfter.get('e4')?.type === 'p' && boardAfter.get('e4')?.color === 'w') ||
                                   (toSq === 'e4' && boardAfter.get('d4')?.type === 'p' && boardAfter.get('d4')?.color === 'w'))) ||
                (color === 'b' && ((toSq === 'd5' && boardAfter.get('e5')?.type === 'p' && boardAfter.get('e5')?.color === 'b') ||
                                   (toSq === 'e5' && boardAfter.get('d5')?.type === 'p' && boardAfter.get('d5')?.color === 'b')))) {
                return {
                    type: 'pawn_center_duo',
                    tags: ['Center Control', 'Pawn Center'],
                    description: `establishes a commanding pawn center with ${toSq}, dominating the central squares`
                };
            }
        }

        // 2. Queen centralization
        if (piece.type === 'q' && (toSq === 'd4' || toSq === 'd5' || toSq === 'e4' || toSq === 'e5')) {
            return {
                type: 'queen_centralization',
                tags: ['Center Control', 'Queen Centralization'],
                description: `centralizes the Queen on ${toSq} to dominate key diagonals and central squares`
            };
        }

        // 3. 7th rank infiltration for Rook / Queen
        if (piece.type === 'r' || piece.type === 'q') {
            if ((color === 'w' && rank === 6) || (color === 'b' && rank === 1)) {
                return {
                    type: 'seventh_rank',
                    tags: ['File Control', '7th Rank Infiltration'],
                    description: `infiltrates the 7th rank to terrorize ${oppName}'s pawns and restrict the King`
                };
            }
        }

        // 3. Open file control
        if (piece.type === 'r' || piece.type === 'q') {
            const fc = detectFileControl(boardBefore, move);
            if (fc && fc.includes('open file')) {
                return {
                    type: 'open_file',
                    tags: ['File Control', 'Open File'],
                    description: fc
                };
            }
        }

        // 4. Knight / Bishop outpost
        if ((piece.type === 'n' || piece.type === 'b') && isTrueOutpost(boardAfter, toSq, color)) {
            return {
                type: 'outpost',
                tags: ['Outpost', 'Board Control'],
                description: `anchors the ${PIECE_NAMES[piece.type]} on a dominant outpost on ${toSq}`
            };
        }

        // 5. Bishop diagonal control
        if (piece.type === 'b') {
            const attacks = getPieceAttacks(boardAfter, toSq);
            if (attacks.length >= 7) {
                return {
                    type: 'diagonal_control',
                    tags: ['Diagonal Control', 'Board Control'],
                    description: `places the bishop on an expansive diagonal controlling key squares`
                };
            }
        }

        return null;
    }

    /**
     * Full dual-sided explanation for blunder, mistake, or miss.
     */
    function explainBlunderOrMistake(options) {
        const {
            boardBefore,
            boardAfter,
            playedMove,
            bestMove,
            refutationMove = null,
            sanPlayed,
            sanBest,
            sanRef = null,
            bestScore = null,
            playedScore = null,
            bestPv = [],
            refPv = [],
            bestPvFormatted = null,
            refPvFormatted = null,
            quality = null,
            detailedQuality = null,
            wpLoss = null,
            ply = null,
            openingPrincipleViolation = null
        } = options;

        const color = boardBefore.turn();
        const oppColor = (color === 'w' ? 'b' : 'w');
        const oppName = (color === 'w' ? 'Black' : 'White');

        const tags = [];
        const ChessCtor = getChessConstructor();

        // 1. Board after recommended best move
        let boardAfterBest = null;
        if (bestMove && ChessCtor) {
            try {
                boardAfterBest = new ChessCtor(boardBefore.fen());
                boardAfterBest.move({
                    from: bestMove.from,
                    to: bestMove.to,
                    promotion: bestMove.promotion
                });
            } catch (e) {
                boardAfterBest = null;
            }
        }

        // 2. Board after opponent refutation move
        let boardAfterRef = null;
        if (refutationMove && ChessCtor) {
            try {
                boardAfterRef = new ChessCtor(boardAfter.fen());
                boardAfterRef.move({
                    from: refutationMove.from,
                    to: refutationMove.to,
                    promotion: refutationMove.promotion
                });
            } catch (e) {
                boardAfterRef = null;
            }
        }

        // --- PART A: Analyze what Best Move achieves (or what player MISSED) ---
        let bestReason = null;
        let isMissedTactic = false;
        let missedChance = null;

        if (bestMove && boardAfterBest) {
            // A1: Immediate Checkmate or Mate in N
            if (boardAfterBest.in_checkmate && boardAfterBest.in_checkmate()) {
                tags.push('Missed Mate', 'Checkmate');
                bestReason = 'delivers checkmate immediately';
                missedChance = 'misses immediate checkmate';
                isMissedTactic = true;
            } else if (bestScore && bestScore.mate && bestScore.mate > 0) {
                tags.push('Missed Mate');
                bestReason = `forces checkmate in ${bestScore.mate} moves`;
                missedChance = `misses a forced checkmate in ${bestScore.mate} moves`;
                isMissedTactic = true;
            }

            // A2: Material Gain or Checkmate in Engine PV (multi-ply combination)
            if (!bestReason && bestPv && bestPv.length > 0) {
                const matGain = detectMaterialGainInPv(boardBefore, bestPv, color);
                if (matGain) {
                    if (matGain.type === 'checkmate') {
                        tags.push('Missed Mate', 'Checkmate');
                        bestReason = 'forces checkmate through a tactical sequence';
                        missedChance = 'misses a forced checkmate sequence';
                        isMissedTactic = true;
                    } else if (matGain.type === 'win_queen') {
                        tags.push('Missed Tactic', 'Winning Material');
                        if (boardBefore.get(bestMove.to)) {
                            bestReason = `captures on ${bestMove.to} and wins the enemy Queen`;
                        } else {
                            bestReason = 'wins the enemy Queen through a tactical sequence';
                        }
                        missedChance = 'misses winning the enemy Queen';
                        isMissedTactic = true;
                    } else if (matGain.type === 'win_rook') {
                        tags.push('Missed Tactic', 'Winning Material');
                        if (boardBefore.get(bestMove.to)) {
                            bestReason = `captures on ${bestMove.to} and wins a Rook`;
                        } else {
                            bestReason = 'wins a Rook through a tactical sequence';
                        }
                        missedChance = 'misses winning a Rook';
                        isMissedTactic = true;
                    } else if (matGain.type === 'win_piece') {
                        tags.push('Missed Tactic', 'Winning Material');
                        if (boardBefore.get(bestMove.to)) {
                            bestReason = `captures on ${bestMove.to} and ${matGain.description}`;
                        } else {
                            bestReason = matGain.description;
                        }
                        missedChance = 'misses winning a minor piece';
                        isMissedTactic = true;
                    }
                }
            }

            // A3: Tactical Fork
            if (!bestReason) {
                const fork = detectFork(boardAfterBest, bestMove);
                if (fork) {
                    tags.push('Missed Tactic', 'Tactical Fork', 'Missed Fork');
                    bestReason = `forks the enemy ${fork.targets[0]} and ${fork.targets[1]}`;
                    missedChance = `misses a tactical fork against the ${fork.targets[0]} and ${fork.targets[1]}`;
                    isMissedTactic = true;
                }
            }

            // A4: Pin
            if (!bestReason) {
                const pin = detectPin(boardAfterBest, bestMove);
                if (pin) {
                    tags.push('Missed Tactic', 'Pin', 'Missed Pin');
                    bestReason = pin.description;
                    missedChance = `misses pinning the enemy ${pin.pinned}`;
                    isMissedTactic = true;
                }
            }

            // A5: Skewer
            if (!bestReason) {
                const skewer = detectSkewer(boardAfterBest, bestMove);
                if (skewer) {
                    tags.push('Missed Tactic', 'Skewer', 'Missed Skewer');
                    bestReason = skewer.description;
                    missedChance = `misses skewering the ${skewer.front} and ${skewer.back}`;
                    isMissedTactic = true;
                }
            }

            // A6: Discovered Attack / Check
            if (!bestReason) {
                const disc = detectDiscoveredAttack(boardBefore, boardAfterBest, bestMove);
                if (disc) {
                    tags.push('Missed Tactic', 'Discovered Attack', 'Missed Discovery');
                    bestReason = disc.description;
                    missedChance = `misses a discovered attack on the ${disc.target}`;
                    isMissedTactic = true;
                }
            }

            // A7: Trapped Piece
            if (!bestReason) {
                const trapped = detectTrappedPiece(boardAfterBest, bestMove);
                if (trapped) {
                    tags.push('Missed Tactic', 'Trapped Piece');
                    bestReason = trapped.description;
                    missedChance = `misses the chance to trap ${oppName}'s ${trapped.target}`;
                    isMissedTactic = true;
                }
            }

            // A8: Direct Attack on Valuable Pieces (Queen / Rook / Undefended piece)
            if (!bestReason) {
                const attacks = detectAttacksOnPieces(boardAfterBest, bestMove);
                if (attacks.length > 0) {
                    const attQ = attacks.find(a => a.type === 'attack_queen');
                    const attR = attacks.find(a => a.type === 'attack_rook');
                    const attU = attacks.find(a => a.type === 'attack_undefended');

                    if (attQ) {
                        tags.push('Missed Attack', 'Attack on Queen');
                        bestReason = `attacks the enemy Queen on ${attQ.square} with tempo`;
                        missedChance = `misses a chance to attack the enemy Queen on ${attQ.square}`;
                        isMissedTactic = true;
                    } else if (attR) {
                        tags.push('Missed Attack', 'Attack on Rook');
                        bestReason = `attacks the Rook on ${attR.square}`;
                        missedChance = `misses a chance to attack ${oppName}'s Rook on ${attR.square}`;
                        isMissedTactic = true;
                    } else if (attU) {
                        tags.push('Missed Attack', 'Attacking Piece');
                        bestReason = attU.description;
                        missedChance = `misses an opportunity to attack the undefended ${attU.target} on ${attU.square}`;
                        isMissedTactic = true;
                    } else if (attacks[0]) {
                        tags.push('Attack');
                        bestReason = attacks[0].description;
                        missedChance = `misses attacking the ${attacks[0].target} with tempo`;
                        isMissedTactic = true;
                    }
                }
            }

            // A9: Direct Capture of Free / Higher-Value Piece
            if (!bestReason && boardBefore.get(bestMove.to)) {
                const captured = boardBefore.get(bestMove.to);
                const capturedName = PIECE_NAMES[captured.type] || 'piece';
                const movingPiece = boardBefore.get(bestMove.from);
                const isDefended = isSquareAttackedBy(boardBefore, oppColor, bestMove.to);

                if (!isDefended) {
                    tags.push('Missed Capture', 'Winning Material', 'Hanging Piece');
                    bestReason = `wins the undefended ${capturedName} on ${bestMove.to}`;
                    missedChance = `misses capturing the free ${capturedName} on ${bestMove.to}`;
                    isMissedTactic = true;
                } else if (PIECE_VALUES[captured.type] > (PIECE_VALUES[movingPiece?.type] || 0)) {
                    tags.push('Missed Capture', 'Winning Material');
                    if (captured.type === 'r' && (movingPiece?.type === 'b' || movingPiece?.type === 'n')) {
                        tags.push('Winning Exchange');
                        bestReason = `wins the exchange on ${bestMove.to}`;
                        missedChance = `misses winning the exchange on ${bestMove.to}`;
                    } else {
                        bestReason = `wins the ${capturedName} on ${bestMove.to}`;
                        missedChance = `misses winning the ${capturedName} on ${bestMove.to}`;
                    }
                    isMissedTactic = true;
                } else {
                    tags.push('Missed Capture');
                    bestReason = `captures the ${capturedName} on ${bestMove.to}`;
                    missedChance = `misses capturing the ${capturedName} on ${bestMove.to}`;
                }
            }

            // A10: Defensive Need (saving an attacked piece)
            if (!bestReason) {
                const defMove = detectDefensiveMove(boardBefore, boardAfterBest, bestMove);
                if (defMove) {
                    tags.push('Defense');
                    bestReason = defMove.description;
                }
            }

            // A11: Castling & King Safety
            if (!bestReason) {
                if (sanBest === 'O-O' || sanBest === 'O-O-O') {
                    tags.push('King Safety');
                    bestReason = 'castles to bring the King to safety and connect the rooks';
                }
            }

            // A12: Board Control Dominance (Outpost, 7th rank, Open file, Center duo, Diagonal)
            if (!bestReason) {
                const bcd = detectBoardControlDominance(boardBefore, boardAfterBest, bestMove);
                if (bcd) {
                    tags.push(...bcd.tags);
                    bestReason = bcd.description;
                }
            }

            // A13: Center Strike / Center Control
            if (!bestReason) {
                const cs = detectCenterStrike(boardBefore, bestMove);
                if (cs) {
                    tags.push('Center Control');
                    bestReason = cs.description;
                }
            }

            // A14: Passed Pawn
            if (!bestReason && detectPassedPawn(boardAfterBest, bestMove)) {
                tags.push('Passed Pawn');
                bestReason = 'creates a dangerous passed pawn';
            }

            // A15: Minor Piece Development
            const dev = detectMinorDevelopment(boardBefore, bestMove);
            if (dev) {
                tags.push('Development');
                if (!bestReason) {
                    bestReason = dev;
                }
            }

            // A16: Prophylaxis vs opponent's refutation
            if (!bestReason && refutationMove) {
                const proph = detectProphylaxis(boardBefore, boardAfterBest, bestMove, refutationMove, sanRef);
                if (proph) {
                    bestReason = proph;
                }
            }

            // A17: Specific Positional Fallback
            if (!bestReason) {
                const p = boardBefore.get(bestMove.from);
                if (p && p.type === 'p') {
                    bestReason = 'solidifies pawn structure and central control';
                } else if (p && p.type === 'k') {
                    bestReason = 'moves the King to a safer square';
                } else if (p && (p.type === 'r' || p.type === 'q')) {
                    bestReason = 'activates the piece to control open lines';
                } else {
                    bestReason = 'improves piece activity and central coordination';
                }
            }
        }

        // --- PART B: Analyze Flaw of Played Move & Opponent Refutation ---
        let blunderReason = null;
        let refutationEffect = null;
        let flaw = null;

        // B1: Hanging Piece Blunder
        const hanging = detectHangingPieceBlunder(boardBefore, boardAfter, playedMove);
        if (hanging) {
            tags.push('Hanging Piece');
            blunderReason = hanging.description;
            flaw = hanging.description;
        }

        // B2: King Safety Flaw
        if (!blunderReason) {
            const ks = detectKingSafetyFlaw(boardBefore, boardAfter, playedMove);
            if (ks) {
                tags.push('King Safety');
                blunderReason = ks;
                flaw = ks;
            }
        }

        // B3: Refutation Move Analysis (No Early Stopping!)
        if (refutationMove) {
            const isCheckmate = !!(options.refutationIsCheckmate) || (boardAfterRef && boardAfterRef.in_checkmate && boardAfterRef.in_checkmate());
            if (isCheckmate) {
                tags.push('Checkmate', 'Tactical Blunder');
                refutationEffect = `allows ${sanRef || 'refutation'}# delivering checkmate`;
            } else if (boardAfterRef) {
                // Check deep refutation material loss in PV first (avoids stopping at simple 1-ply capture)
                if (refPv && refPv.length > 0) {
                    const refGain = detectMaterialGainInPv(boardAfter, refPv, oppColor);
                    if (refGain && (refGain.type === 'win_queen' || refGain.type === 'win_rook' || refGain.type === 'win_piece' || refGain.type === 'checkmate')) {
                        tags.push('Tactical Blunder', 'Losing Material');
                        if (refGain.type === 'checkmate') {
                            refutationEffect = `allows ${sanRef || 'the refutation'}, leading to a forced checkmate`;
                        } else if (boardAfter.get(refutationMove.to)) {
                            const lossName = (refGain.type === 'win_queen' ? 'your Queen' : (refGain.type === 'win_rook' ? 'a Rook' : 'a piece'));
                            refutationEffect = `allows ${sanRef || 'refutation'} capturing on ${refutationMove.to} and winning ${lossName}`;
                        } else {
                            const cleanDesc = refGain.description.replace(/^wins\s+/i, '');
                            refutationEffect = `allows ${sanRef || 'the punishment line'}, winning ${cleanDesc}`;
                        }
                    }
                }

                // Tactical Fork by refutation
                const fork = detectFork(boardAfterRef, refutationMove);
                if (fork) {
                    tags.push('Tactical Fork');
                    if (!refutationEffect) {
                        refutationEffect = `allows ${sanRef || 'refutation'} ${fork.description}`;
                    }
                }

                // Pin by refutation
                if (!refutationEffect && detectPin(boardAfterRef, refutationMove)) {
                    tags.push('Pin');
                    refutationEffect = `allows ${sanRef || 'refutation'} pinning your piece to the King`;
                }

                // Skewer by refutation
                if (!refutationEffect) {
                    const sk = detectSkewer(boardAfterRef, refutationMove);
                    if (sk) {
                        tags.push('Skewer');
                        refutationEffect = `allows ${sanRef || 'refutation'} ${sk.description}`;
                    }
                }

                // Discovered Attack by refutation
                const disc = detectDiscoveredAttack(boardAfter, boardAfterRef, refutationMove);
                if (disc) {
                    tags.push('Discovered Attack');
                    if (!refutationEffect) {
                        refutationEffect = `allows ${sanRef || 'refutation'} ${disc.description}`;
                    }
                }

                // Direct capture on any square
                if (!refutationEffect && boardAfter.get(refutationMove.to)) {
                    const capturedPiece = boardAfter.get(refutationMove.to);
                    const capName = PIECE_NAMES[capturedPiece.type] || 'piece';
                    tags.push('Hanging Piece');
                    if (refutationMove.to === playedMove.to) {
                        refutationEffect = `allows ${sanRef || 'refutation'} capturing the exposed ${capName}`;
                    } else {
                        refutationEffect = `allows ${sanRef || 'refutation'} capturing your undefended ${capName} on ${refutationMove.to}`;
                    }
                }

                // Center Strike by refutation
                if (!refutationEffect) {
                    const csRef = detectCenterStrike(boardAfter, refutationMove);
                    if (csRef) {
                        tags.push('Center Control');
                        refutationEffect = `allows ${oppName} to ${csRef.action || csRef.description}`;
                    }
                }

                // Threats created by refutation move (attacks Queen/Rook/pieces)
                if (!refutationEffect) {
                    const refAttacks = detectAttacksOnPieces(boardAfterRef, refutationMove);
                    if (refAttacks.length > 0) {
                        const refMajor = refAttacks.find(a => a.type === 'attack_queen' || a.type === 'attack_rook') || refAttacks[0];
                        refutationEffect = `allows ${sanRef} attacking your ${refMajor.target} with tempo`;
                    }
                }

                // Infiltration to 7th rank
                if (!refutationEffect) {
                    const refPiece = boardAfter.get(refutationMove.from);
                    const refRank = squareToRank(refutationMove.to);
                    if (refPiece && refPiece.type === 'r' && ((oppColor === 'w' && refRank === 6) || (oppColor === 'b' && refRank === 1))) {
                        refutationEffect = `allows ${sanRef} penetrating to the 7th rank`;
                    }
                }

                // Forcing check
                if (!refutationEffect && sanRef && sanRef.includes('+')) {
                    refutationEffect = `allows a disruptive check with ${sanRef}`;
                }

                // Concrete piece activation fallback instead of generic text
                if (!refutationEffect) {
                    const refPiece = boardAfter.get(refutationMove.from);
                    const pName = refPiece ? (PIECE_NAMES[refPiece.type] || 'piece') : 'piece';
                    refutationEffect = `allows ${oppName} to play ${sanRef || 'an active reply'}, activating the ${pName}`;
                }
            } else {
                refutationEffect = `gives ${oppName} the initiative with ${sanRef || 'threats'}`;
            }
        }

        // --- PART C: Natural, Varied Phrasing Construction ---
        let explanation = '';

        if (!flaw) {
            if (blunderReason) {
                flaw = blunderReason;
            } else if (refutationEffect) {
                flaw = refutationEffect;
            } else if (missedChance) {
                flaw = missedChance;
            } else {
                flaw = `concedes the advantage to ${oppName}`;
            }
        }

        if (isMissedTactic) {
            if (tags.includes('Missed Mate')) {
                explanation = `${sanPlayed} misses checkmate! ${sanBest} would have finished the game immediately. Instead, ${sanPlayed} lets ${oppName} stay in the game.`;
            } else {
                const missExtra = missedChance ? ` and ${missedChance}` : '';
                explanation = `${sanPlayed} overlooks a tactical opportunity${missExtra}. ${sanBest} was winning because it ${bestReason}. Instead, ${sanPlayed} ${refutationEffect || 'hands over the initiative'}.`;
            }
        } else if (blunderReason) {
            if (refutationEffect) {
                explanation = `${sanPlayed} ${blunderReason}, which ${refutationEffect}. ${sanBest} was much better because it ${bestReason}.`;
            } else {
                explanation = `${sanPlayed} blunders by ${blunderReason}. ${sanBest} was necessary because it ${bestReason}.`;
            }
        } else if (tags.includes('Tactical Fork') || tags.includes('Pin') || tags.includes('Skewer') || tags.includes('Hanging Piece') || tags.includes('Checkmate') || tags.includes('Tactical Blunder') || tags.includes('Losing Material')) {
            explanation = `${sanPlayed} runs into tactical trouble: it ${refutationEffect}. ${sanBest} was much safer because it ${bestReason}.`;
        } else if (openingPrincipleViolation) {
            explanation = `${sanPlayed} violates opening principles by ${openingPrincipleViolation}. ${sanBest} was stronger because it ${bestReason}.`;
        } else if (tags.includes('Center Control')) {
            explanation = `${sanPlayed} is passive and ${refutationEffect}. A stronger alternative was ${sanBest}, which ${bestReason}.`;
        } else {
            explanation = `${sanPlayed} ${refutationEffect || ('concedes the advantage to ' + oppName)}. ${sanBest} was better because it ${bestReason}.`;
        }

        return {
            explanation,
            tags: Array.from(new Set(tags)),
            flaw,
            missedChance,
            betterLine: bestReason
        };
    }

    /**
     * Explanation for good, great, or brilliant move.
     */
    function explainGoodMove(options) {
        const {
            boardBefore,
            boardAfter,
            move,
            san,
            isBest = false
        } = options;

        const color = boardBefore.turn();
        const tags = [];
        const reasons = [];

        if (boardAfter.in_checkmate && boardAfter.in_checkmate()) {
            tags.push('Checkmate');
            return {
                explanation: `Checkmate! ${san} delivers mate and finishes the game.`,
                tags,
                flaw: null,
                missedChance: null,
                betterLine: 'delivers checkmate immediately'
            };
        }

        if (san === 'O-O' || san === 'O-O-O') {
            tags.push('King Safety');
            reasons.push('castles to bring the King to safety and connect the rooks');
        }

        if (san.includes('+')) {
            tags.push('Check');
            reasons.push('gives a forcing check');
        }

        const captured = boardBefore.get(move.to);
        if (captured) {
            reasons.push(`captures the ${PIECE_NAMES[captured.type] || 'piece'}`);
        }

        const fork = detectFork(boardAfter, move);
        if (fork) {
            tags.push('Fork');
            reasons.push(fork.description);
        }

        const pin = detectPin(boardAfter, move);
        if (pin) {
            tags.push('Pin');
            reasons.push(pin.description);
        }

        const skewer = detectSkewer(boardAfter, move);
        if (skewer) {
            tags.push('Skewer');
            reasons.push(skewer.description);
        }

        const disc = detectDiscoveredAttack(boardBefore, boardAfter, move);
        if (disc) {
            tags.push('Discovered Attack');
            reasons.push(disc.description);
        }

        const attacks = detectAttacksOnPieces(boardAfter, move);
        if (attacks.length > 0) {
            const attQ = attacks.find(a => a.type === 'attack_queen');
            if (attQ) {
                tags.push('Attack on Queen');
                reasons.push(attQ.description);
            } else if (attacks[0].type === 'attack_rook') {
                tags.push('Attack on Rook');
                reasons.push(attacks[0].description);
            } else if (attacks[0].type === 'attack_undefended') {
                reasons.push(attacks[0].description);
            }
        }

        const bcd = detectBoardControlDominance(boardBefore, boardAfter, move);
        if (bcd) {
            tags.push(...bcd.tags);
            reasons.push(bcd.description);
        }

        const fileCtrl = detectFileControl(boardBefore, move);
        if (fileCtrl) {
            tags.push('File Control');
            reasons.push(fileCtrl);
        }

        if (isTrueOutpost(boardAfter, move.to, color)) {
            tags.push('Outpost');
            reasons.push('anchors a strong outpost');
        }

        if (detectPassedPawn(boardAfter, move)) {
            tags.push('Passed Pawn');
            reasons.push('advances a passed pawn toward promotion');
        }

        const p = boardBefore.get(move.from);
        if (p && (p.type === 'n' || p.type === 'b')) {
            const homeRank = (color === 'w' ? 0 : 7);
            if (squareToRank(move.from) === homeRank) {
                tags.push('Development');
                reasons.push(`develops the ${PIECE_NAMES[p.type]} to an active square`);
            }
        }

        const prefix = isBest ? 'Best move! ' : 'Strong move. ';
        const reasonsDedup = Array.from(new Set(reasons));
        if (reasonsDedup.length > 0) {
            return {
                explanation: `${prefix}${san} ${reasonsDedup.join(', and ')}.`,
                tags: Array.from(new Set(tags)),
                flaw: null,
                missedChance: null,
                betterLine: reasonsDedup.join(', and ')
            };
        }
        return {
            explanation: `${prefix}${san} maintains a solid position and harmonious coordination.`,
            tags: Array.from(new Set(tags)),
            flaw: null,
            missedChance: null,
            betterLine: 'maintains solid piece coordination'
        };
    }

    return {
        PIECE_VALUES,
        PIECE_NAMES,
        getPieceAttacks,
        isSquareAttackedBy,
        getAttackers,
        staticExchangeEval,
        isPieceSafe,
        detectThreatsCreated,
        detectAttacksOnPieces,
        detectTrappedPiece,
        detectBoardControlDominance,
        detectFork,
        detectPin,
        detectSkewer,
        detectDiscoveredAttack,
        detectCenterStrike,
        detectDefensiveMove,
        detectMinorDevelopment,
        detectMaterialGainInPv,
        detectProphylaxis,
        detectHangingPieceBlunder,
        isTrueOutpost,
        detectFileControl,
        detectPassedPawn,
        hasCastlingRights,
        detectKingSafetyFlaw,
        explainBlunderOrMistake,
        explainGoodMove
    };
}));
