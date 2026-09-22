/**
 * opening-detector.js - Opening classification, ECO recognition, and opening principles for WhyBlunder.
 * Compatible with Browser and Node.js.
 */
(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.OpeningDetector = factory();
    }
}(typeof self !== 'undefined' ? self : this, function() {
    'use strict';

    const COMMON_OPENINGS = {
        "e4 e5 Nf3 Nc6 Bc4": ["C50", "Italian Game"],
        "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O": ["C53", "Italian Game: Giuoco Piano"],
        "e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 O-O O-O": ["C55", "Two Knights Defense"],
        "e4 e5 Nf3 Nc6 Bb5": ["C60", "Ruy Lopez"],
        "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O": ["C88", "Ruy Lopez: Closed"],
        "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1": ["C84", "Ruy Lopez: Closed"],
        "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6": ["C80", "Ruy Lopez: Open"],
        "e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8": ["C67", "Ruy Lopez: Berlin Defense"],
        "e4 e5 Nf3 Nc6 d4": ["C44", "Scotch Game"],
        "e4 e5 Nf3 Nf6": ["C42", "Petrov's Defense"],
        "e4 e5 f4": ["C30", "King's Gambit"],
        "e4 c5": ["B20", "Sicilian Defense"],
        "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6": ["B90", "Sicilian Defense: Najdorf Variation"],
        "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6": ["B70", "Sicilian Defense: Dragon Variation"],
        "e4 c5 Nf3 e6": ["B40", "Sicilian Defense: French Variation"],
        "e4 c5 Nf3 Nc6": ["B30", "Sicilian Defense: Old Sicilian"],
        "e4 e6": ["C00", "French Defense"],
        "e4 e6 d4 d5": ["C01", "French Defense: Normal"],
        "e4 c6": ["B10", "Caro-Kann Defense"],
        "e4 c6 d4 d5": ["B12", "Caro-Kann Defense: Main Line"],
        "e4 d5": ["B01", "Scandinavian Defense"],
        "e4 d6": ["B07", "Pirc Defense"],
        "e4 g6": ["B06", "Modern Defense"],
        "e4 Nf6": ["B02", "Alekhine's Defense"],
        "d4 d5 c4": ["D06", "Queen's Gambit"],
        "d4 d5 c4 e6": ["D30", "Queen's Gambit Declined"],
        "d4 d5 c4 e6 Nc3": ["D31", "Queen's Gambit Declined: 3.Nc3"],
        "d4 d5 c4 e6 Nf3": ["D30", "Queen's Gambit Declined: 3.Nf3"],
        "d4 d5 c4 dxc4": ["D20", "Queen's Gambit Accepted"],
        "d4 d5 c4 c6": ["D10", "Slav Defense"],
        "d4 d5 Bf4": ["D00", "London System"],
        "d4 Nf6 c4 g6": ["E60", "King's Indian Defense"],
        "d4 Nf6 c4 e6 Nc3 Bb4": ["E20", "Nimzo-Indian Defense"],
        "d4 Nf6 c4 e6 Nf3 b6": ["E12", "Queen's Indian Defense"],
        "d4 Nf6 c4 c5": ["A56", "Benoni Defense"],
        "d4 f5": ["A80", "Dutch Defense"],
        "d4 g6": ["A40", "Queen's Pawn Game: Modern Defense"],
        "c4": ["A10", "English Opening"],
        "c4 e5": ["A20", "English Opening: King's English"],
        "c4 e6 d4 d5": ["D30", "Queen's Gambit Declined (via English)"],
        "c4 e6 d4 d5 Nc3": ["D31", "Queen's Gambit Declined (via English)"],
        "Nf3": ["A04", "Réti Opening"],
        "b3": ["A01", "Nimzo-Larsen Attack"],
        "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6": ["E70", "King's Indian: Normal"],
        "d4 Nf6 c4 g6 Nc3 d5": ["D80", "Grünfeld Defense"],
        "d4 Nf6 c4 e6 g3 d5 Bg2": ["E00", "Catalan Opening"],
        "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6": ["D43", "Semi-Slav Defense"],
        "e4 e5 Nf3 Nc6 Bc4 Bc5 b4": ["C51", "Evans Gambit"],
        "e4 e5 Nf3 Nc6 Nc3 Nf6": ["C47", "Four Knights Game"],
        "e4 e5 Nc3": ["C25", "Vienna Game"],
        "e4 c5 c3": ["B22", "Sicilian Defense: Alapin Variation"],
        "e4 c5 Nc3": ["B23", "Sicilian Defense: Closed"],
        "e4 e6 d4 d5 e5": ["C02", "French Defense: Advance Variation"],
        "e4 e6 d4 d5 Nc3 Bb4": ["C15", "French Defense: Winawer Variation"],
        "e4 c6 d4 d5 e5": ["B12", "Caro-Kann: Advance Variation"]
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

    /**
     * Precomputed position-keyed table: { [fenBoardKey]: { eco, name, depth } }
     * Enables O(1) book lookup that automatically recognizes transpositions.
     */
    const BOOK_POSITION_MAP = {};

    function initBookPositions() {
        const ChessCtor = getChessConstructor();
        if (!ChessCtor) return;
        for (const [seq, [eco, name]] of Object.entries(COMMON_OPENINGS)) {
            // Clean move string of any stray move numbers (e.g. "2. d4")
            const rawTokens = seq.split(/\s+/);
            const moves = rawTokens.filter(t => !/^\d+\.?$/.test(t));
            try {
                const game = new ChessCtor();
                for (let i = 0; i < moves.length; i++) {
                    const m = game.move(moves[i]);
                    if (!m) break;
                    const boardKey = game.fen().split(' ')[0];
                    if (!BOOK_POSITION_MAP[boardKey]) {
                        BOOK_POSITION_MAP[boardKey] = { eco, name, depth: i + 1 };
                    }
                }
            } catch (e) {}
        }
    }
    initBookPositions();

    /**
     * Identify opening and ECO code from SAN moves or board FEN.
     * @param {string[]} sanMoves
     * @param {string} [fen]
     * @returns {{ eco: string, name: string }}
     */
    function identifyOpening(sanMoves, fen) {
        // 1. Direct sequence match
        if (sanMoves && sanMoves.length > 0) {
            for (let length = Math.min(16, sanMoves.length); length > 0; length--) {
                const subSeq = sanMoves.slice(0, length).join(' ');
                if (COMMON_OPENINGS[subSeq]) {
                    const [eco, name] = COMMON_OPENINGS[subSeq];
                    return { eco, name };
                }
            }
        }

        // 2. Position key lookup
        if (fen && typeof fen === 'string') {
            const boardKey = fen.split(' ')[0];
            if (BOOK_POSITION_MAP[boardKey]) {
                return { eco: BOOK_POSITION_MAP[boardKey].eco, name: BOOK_POSITION_MAP[boardKey].name };
            }
        }

        return { eco: 'A00', name: 'Irregular Opening' };
    }

    /**
     * Determine if a board position is in the book transposition table.
     * @param {string} fen
     * @returns {boolean}
     */
    function isBookPosition(fen) {
        if (!fen || typeof fen !== 'string') return false;
        const boardKey = fen.split(' ')[0];
        return Boolean(BOOK_POSITION_MAP[boardKey]);
    }

    /**
     * Determine if a move at `ply` is part of recognized book opening theory.
     * Supports both prefix matching and transpositional position lookup.
     * @param {string[]} sanMoves
     * @param {number} ply - 1-indexed ply
     * @param {string} [fen] - optional FEN of resulting position
     * @returns {boolean}
     */
    function isBookMove(sanMoves, ply, fen) {
        if (ply > 16) {
            return false;
        }

        // 1. Explicit board FEN check
        if (fen && typeof fen === 'string') {
            const boardKey = fen.split(' ')[0];
            if (BOOK_POSITION_MAP[boardKey]) return true;
        }

        // 2. Sequence prefix match
        if (sanMoves && Array.isArray(sanMoves) && sanMoves.length > 0) {
            const currentSeq = sanMoves.slice(0, ply).join(' ');
            for (const openingSeq of Object.keys(COMMON_OPENINGS)) {
                if (openingSeq.startsWith(currentSeq)) {
                    return true;
                }
            }

            // 3. Transposition support via board position simulation
            const ChessCtor = getChessConstructor();
            if (ChessCtor && sanMoves.length >= ply) {
                try {
                    const sim = new ChessCtor();
                    for (let i = 0; i < ply; i++) {
                        if (!sim.move(sanMoves[i])) break;
                    }
                    const simKey = sim.fen().split(' ')[0];
                    if (BOOK_POSITION_MAP[simKey]) return true;
                } catch (e) {}
            }
        }

        return false;
    }

    /**
     * Detect opening principle violations on moves 1-10:
     * 1. Early queen sorties.
     * 2. Moving the same minor piece twice without development.
     * 3. Flank pawn pushes before minor piece development.
     * 4. Blocking central pawns with bishops.
     * @param {object} boardBefore - chess.js instance before the move
     * @param {object} move - move object { from, to, piece, ... }
     * @param {number} ply - 1-indexed ply
     * @param {object} [options] - { bestUci }
     * @returns {string|null}
     */
    function detectOpeningPrincipleViolation(boardBefore, move, ply, options = {}) {
        if (ply > 16 || !move) return null;

        // If played move matches the engine's best move, it is an acceptable exception
        if (options.bestUci && options.bestUci === (move.from + move.to)) {
            return null;
        }

        const piece = boardBefore.get(move.from);
        if (!piece) return null;

        const color = boardBefore.turn();
        const homeRank = (color === 'w' ? 1 : 8);
        const fromRank = parseInt(move.from.charAt(1), 10);
        const isCapture = Boolean(boardBefore.get(move.to));
        const inCheck = boardBefore.in_check();

        // 1. Early Queen development (ply <= 8)
        if (piece.type === 'q' && ply <= 8) {
            if (!isCapture && !inCheck) {
                return "developing the Queen too early, leaving it vulnerable to minor piece harassment";
            }
        }

        // 2. Moving the same minor piece twice in first 12 plies
        if ((piece.type === 'n' || piece.type === 'b') && ply <= 12) {
            if (fromRank !== homeRank && !isCapture) {
                // Check if piece was attacked on from square; retreating or moving is NOT a violation
                const oppColor = (color === 'w' ? 'b' : 'w');
                let wasAttacked = false;
                if (typeof SituationRecognizer !== 'undefined' && typeof SituationRecognizer.isSquareAttackedBy === 'function') {
                    wasAttacked = SituationRecognizer.isSquareAttackedBy(boardBefore, oppColor, move.from);
                }
                if (!wasAttacked) {
                    const pieceName = (piece.type === 'n' ? 'knight' : 'bishop');
                    return `moving the same ${pieceName} twice in the opening instead of developing other pieces`;
                }
            }
        }

        // 3. Early flank pawn push before minor development (ply <= 8)
        if (piece.type === 'p' && (move.from[0] === 'a' || move.from[0] === 'h') && ply <= 8) {
            if (!isCapture && !inCheck) {
                const bKnight = boardBefore.get(color === 'w' ? 'b1' : 'b8');
                const gKnight = boardBefore.get(color === 'w' ? 'g1' : 'g8');
                if (bKnight && bKnight.type === 'n' && gKnight && gKnight.type === 'n') {
                    return "pushing flank pawns early instead of developing central pieces and controlling the center";
                }
            }
        }

        // 4. Blocking central pawn with bishop in the opening (ply <= 10)
        if (piece.type === 'b' && ply <= 10) {
            const centralPawnsBlocked = (color === 'w')
                ? ((move.to === 'd3' && boardBefore.get('d2')?.type === 'p') || (move.to === 'e3' && boardBefore.get('e2')?.type === 'p'))
                : ((move.to === 'd6' && boardBefore.get('d7')?.type === 'p') || (move.to === 'e6' && boardBefore.get('e7')?.type === 'p'));
            if (centralPawnsBlocked && !isCapture) {
                return "blocking the central pawn with the bishop, hindering central development";
            }
        }

        return null;
    }

    return {
        COMMON_OPENINGS,
        BOOK_POSITION_MAP,
        identifyOpening,
        isBookPosition,
        isBookMove,
        detectOpeningPrincipleViolation
    };
}));
