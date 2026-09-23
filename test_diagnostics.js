/**
 * test_diagnostics.js - Regression corpus for the move-diagnosis path.
 *
 * Phase 0, steps 2 & 3 of docs/move-diagnostics-improvement-plan.md.
 *
 * Runs in plain Node with NO Stockfish and NO network: every fixture carries a
 * hand-written engine-evidence stub in exactly the shape the real code consumes
 * (see js/browser-analyzer.js:480-560 and js/coach-manager.js:925-1000):
 *
 *     engine: {
 *         bestMove: '<uci>',                          // engine's chosen move
 *         lines: { 1: { cp | mate, pv: ['<uci>',...] },  // MultiPV 3 root search
 *                  2: {...}, 3: {...} },
 *         post:  { bestMove: '<uci>',                  // MultiPV 1 search of fenAfter
 *                  lines: { 1: { cp | mate, pv: [...] } } }
 *     }
 *
 * `lines` holds the pre-move MultiPV search of fenBefore (scores from the mover's
 * point of view). `post` holds the post-move search of fenAfter (scores from the
 * OPPONENT's point of view, exactly as Stockfish reports them), which is where the
 * refutation move comes from.
 *
 * The fixtures are driven through the REAL SituationRecognizer.explainBlunderOrMistake /
 * .explainGoodMove and ChessEvaluator.classifyMove via runDiagnosis(), which mirrors
 * js/browser-analyzer.js step for step.
 *
 * IMPORTANT: this file snapshots CURRENT behaviour. Several fixtures are expected to
 * fail today - they are the acceptance targets for later phases of the plan. Those
 * carry `knownFail: 'F<n> - <short reason>'` naming the finding in section 2 of the
 * plan doc. Known-fails print as "KNOWN FAIL" and do not abort the run; any other
 * failure aborts with a non-zero exit code.
 */

const assert = require('assert');
const Chess = require('./js/chess.min.js').Chess || require('./js/chess.min.js');
const ChessEvaluator = require('./js/chess-evaluator.js');
const OpeningDetector = require('./js/opening-detector.js');
const SituationRecognizer = require('./js/situation-recognizer.js');
const MoveDiagnostics = require('./js/move-diagnostics.js');

// ---------------------------------------------------------------------------
// Engine-stub helpers
// ---------------------------------------------------------------------------

/** MultiPV line with a centipawn score. */
function cpLine(cp, pv) {
    return { cp: cp, pv: pv };
}

/** MultiPV line with a mate score (positive = side to move mates). */
function mateLine(mate, pv) {
    return { mate: mate, pv: pv };
}

/** Post-move (refutation) search stub: MultiPV 1 on fenAfter, opponent's POV. */
function post(bestMove, line) {
    return { bestMove: bestMove, lines: { 1: line } };
}

// ---------------------------------------------------------------------------
// The corpus
// ---------------------------------------------------------------------------
//
// Fixture fields:
//   name          unique id
//   fenBefore     position with the mover to move
//   playedUci     the move actually played, as UCI
//   sanHistory    full SAN list up to AND INCLUDING playedUci (for book detection)
//   ply           1-indexed ply number of playedUci
//   phase         'opening' | 'middlegame' | 'endgame' (drives the phrasing audit)
//   engine        stubbed engine evidence (see header)
//   expect        { detailedQuality?, uiQuality?, tags?, mustContain?, mustNotContain? }
//   knownFail     'F<n> - reason' when this fixture is a target for a later phase
//
// mustContain / mustNotContain are matched case-insensitively against the
// explanation text.

const FIXTURES = [
    // --- NEW STRICT BRILLIANT NEGATIVE FIXTURES ---
    {
        name: 'neg-brilliant-even-trade',
        fenBefore: 'r1bqkb1r/ppp1pppp/2n2n2/3p4/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 4',
        playedUci: 'c3d5',
        sanHistory: [],
        ply: 12,
        phase: 'middlegame',
        engine: {
            bestMove: 'c3d5',
            lines: {
                1: cpLine(150, ['c3d5', 'f6d5', 'e4d5']),
                2: cpLine(30, ['f1b5', 'a7a6']),
                3: cpLine(20, ['a2a3', 'h7h6'])
            },
            post: post('f6d5', cpLine(-150, ['f6d5', 'e4d5']))
        },
        expect: {
            detailedQualityNot: 'brilliant'
        }
    },
    {
        name: 'neg-brilliant-pawn-gambit',
        fenBefore: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2',
        playedUci: 'e4d5',
        sanHistory: [],
        ply: 3,
        phase: 'opening',
        engine: {
            bestMove: 'e4d5',
            lines: {
                1: cpLine(120, ['e4d5', 'g8f6', 'c2c4']),
                2: cpLine(20, ['d2d3', 'e7e5']),
                3: cpLine(10, ['b1c3', 'd5e4'])
            },
            post: post('g8f6', cpLine(-120, ['g8f6', 'c2c4']))
        },
        expect: {
            detailedQualityNot: 'brilliant'
        }
    },
    {
        name: 'neg-brilliant-already-crushing',
        fenBefore: 'r1bq1rk1/ppp2ppp/2n1pn2/3p4/1b1P4/2NBPN2/PPP2PPP/R1BQK2R w KQ - 0 1',
        playedUci: 'd3h7',
        sanHistory: [],
        ply: 20,
        phase: 'middlegame',
        engine: {
            bestMove: 'd3h7',
            lines: {
                1: cpLine(800, ['d3h7', 'g8h7', 'f3g5']),
                2: cpLine(600, ['e1g1', 'c8d7']),
                3: cpLine(500, ['a2a3', 'b4c3'])
            },
            post: post('g8h7', cpLine(-800, ['g8h7', 'f3g5']))
        },
        expect: {
            detailedQualityNot: 'brilliant'
        }
    },
    {
        name: 'neg-brilliant-low-gap',
        fenBefore: 'r1bq1rk1/ppp2ppp/2n1pn2/3p4/1b1P4/2NBPN2/PPP2PPP/R1BQK2R w KQ - 0 1',
        playedUci: 'd3h7',
        sanHistory: [],
        ply: 20,
        phase: 'middlegame',
        engine: {
            bestMove: 'd3h7',
            lines: {
                1: cpLine(200, ['d3h7', 'g8h7', 'f3g5']),
                2: cpLine(190, ['e1g1', 'c8d7']),
                3: cpLine(150, ['a2a3', 'b4c3'])
            },
            post: post('g8h7', cpLine(-200, ['g8h7', 'f3g5']))
        },
        expect: {
            detailedQualityNot: 'brilliant'
        }
    },
    {
        name: 'neg-brilliant-single-line',
        fenBefore: 'r1bq1rk1/ppp2ppp/2n1pn2/3p4/1b1P4/2NBPN2/PPP2PPP/R1BQK2R w KQ - 0 1',
        playedUci: 'd3h7',
        sanHistory: [],
        ply: 20,
        phase: 'middlegame',
        engine: {
            bestMove: 'd3h7',
            lines: {
                1: cpLine(300, ['d3h7', 'g8h7', 'f3g5'])
            },
            post: post('g8h7', cpLine(-300, ['g8h7', 'f3g5']))
        },
        expect: {
            detailedQualityNot: 'brilliant'
        }
    },
    {
        name: 'neg-brilliant-coach-verifiedBest-mismatch',
        fenBefore: 'r1bq1rk1/ppp2ppp/2n1pn2/3p4/1b1P4/2NBPN2/PPP2PPP/R1BQK2R w KQ - 0 1',
        playedUci: 'd3h7',
        sanHistory: [],
        ply: 20,
        phase: 'middlegame',
        context: { verifiedBest: { uci: 'd3h7', san: 'Bxh7+' } },
        engine: {
            bestMove: 'd3h7',
            lines: {
                1: cpLine(250, ['e1g1', 'c8d7']),
                2: cpLine(100, ['d3h7', 'g8h7']),
                3: cpLine(80, ['a2a3', 'b4c3'])
            },
            post: post('g8h7', cpLine(-100, ['g8h7']))
        },
        expect: {
            detailedQualityNot: 'brilliant'
        }
    },


    // -------------------------------------------------------------------
    // Book opening moves
    // -------------------------------------------------------------------
    {
        name: 'book-e4',
        fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        playedUci: 'e2e4',
        sanHistory: ['e4'],
        ply: 1,
        phase: 'opening',
        engine: {
            bestMove: 'e2e4',
            lines: {
                1: cpLine(30, ['e2e4', 'e7e5', 'g1f3']),
                2: cpLine(25, ['d2d4', 'd7d5', 'c2c4']),
                3: cpLine(20, ['g1f3', 'd7d5', 'd2d4'])
            },
            post: post('e7e5', cpLine(-25, ['e7e5', 'g1f3']))
        },
        expect: { detailedQuality: 'book', uiQuality: 'good move' }
    },
    {
        name: 'book-sicilian-c5',
        fenBefore: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        playedUci: 'c7c5',
        sanHistory: ['e4', 'c5'],
        ply: 2,
        phase: 'opening',
        engine: {
            bestMove: 'e7e5',
            lines: {
                1: cpLine(-25, ['e7e5', 'g1f3', 'b8c6']),
                2: cpLine(-30, ['c7c5', 'g1f3', 'd7d6']),
                3: cpLine(-35, ['e7e6', 'd2d4', 'd7d5'])
            },
            post: post('g1f3', cpLine(30, ['g1f3', 'd7d6']))
        },
        expect: { detailedQuality: 'book', uiQuality: 'good move' }
    },
    {
        name: 'book-italian-Bc4',
        fenBefore: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        playedUci: 'f1c4',
        sanHistory: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
        ply: 5,
        phase: 'opening',
        engine: {
            bestMove: 'f1c4',
            lines: {
                1: cpLine(30, ['f1c4', 'g8f6', 'd2d3']),
                2: cpLine(28, ['f1b5', 'a7a6', 'b5a4']),
                3: cpLine(20, ['d2d4', 'e5d4', 'f3d4'])
            },
            post: post('g8f6', cpLine(-28, ['g8f6', 'd2d3']))
        },
        expect: { detailedQuality: 'book', uiQuality: 'good move' }
    },
    {
        // Ruy Lopez main line, still deep theory at ply 11. isBookMove is prefix
        // matching over 37 hardcoded lines, so it has already stopped firing.
        name: 'book-ruy-lopez-Re1',
        fenBefore: 'r1bqk2r/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 4 6',
        playedUci: 'f1e1',
        sanHistory: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1'],
        ply: 11,
        phase: 'opening',
        engine: {
            bestMove: 'f1e1',
            lines: {
                1: cpLine(30, ['f1e1', 'b7b5', 'a4b3']),
                2: cpLine(25, ['d2d3', 'b7b5', 'a4b3']),
                3: cpLine(20, ['a4c6', 'd7c6', 'd2d3'])
            },
            post: post('b7b5', cpLine(-30, ['b7b5', 'a4b3']))
        },
        expect: { detailedQuality: 'book' }
    },

    // -------------------------------------------------------------------
    // Hanging pieces (true positives)
    // -------------------------------------------------------------------
    {
        // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.Ng5?? - the d8-g5 diagonal is open, so
        // the knight simply drops to Qxg5.
        name: 'hanging-knight-Ng5',
        fenBefore: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        playedUci: 'f3g5',
        sanHistory: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'Ng5'],
        ply: 7,
        phase: 'opening',
        engine: {
            bestMove: 'c2c3',
            lines: {
                1: cpLine(20, ['c2c3', 'g8f6', 'd2d4']),
                2: cpLine(15, ['d2d3', 'g8f6', 'b1c3']),
                3: cpLine(10, ['e1g1', 'g8f6', 'd2d3'])
            },
            post: post('d8g5', cpLine(280, ['d8g5', 'd2d3']))
        },
        expect: {
            uiQuality: 'blunder',
            tags: ['Hanging Piece'],
            mustContain: ['Ng5']
        }
    },
    {
        // Rook endgame: Rd8?? walks straight into Rxd8.
        name: 'endgame-hanging-rook-Rd8',
        fenBefore: '4r1k1/5ppp/8/8/8/7P/5PP1/3R2K1 w - - 0 1',
        playedUci: 'd1d8',
        sanHistory: [],
        ply: 61,
        phase: 'endgame',
        engine: {
            bestMove: 'd1d7',
            lines: {
                1: cpLine(80, ['d1d7', 'e8e1', 'g1h2']),
                2: cpLine(20, ['d1d4', 'e8e1', 'g1h2']),
                3: cpLine(10, ['g1h2', 'e8e1', 'd1d8'])
            },
            post: post('e8d8', cpLine(500, ['e8d8', 'g1h2']))
        },
        expect: {
            uiQuality: 'blunder',
            tags: ['Hanging Piece'],
            mustContain: ['Rd8']
        }
    },
    {
        // Bxf7+ here is a genuinely unsound sacrifice: a bishop for one pawn.
        name: 'unsound-sac-Bxf7',
        fenBefore: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        playedUci: 'c4f7',
        sanHistory: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'Bxf7+'],
        ply: 7,
        phase: 'opening',
        engine: {
            bestMove: 'c2c3',
            lines: {
                1: cpLine(20, ['c2c3', 'g8f6', 'd2d4']),
                2: cpLine(15, ['d2d3', 'g8f6', 'b1c3']),
                3: cpLine(10, ['e1g1', 'g8f6', 'd2d3'])
            },
            post: post('e8f7', cpLine(180, ['e8f7', 'd2d4']))
        },
        expect: {
            uiQuality: 'blunder',
            mustContain: ['Bxf7+']
        }
    },

    // -------------------------------------------------------------------
    // Sound sacrifices - must NOT be reported as hanging pieces
    // -------------------------------------------------------------------
    {
        // Legal's Mate: 5.Nxe5!! - the knight is "hanging" to dxe5 but the point
        // is 5...Bxd1 6.Bxf7+ Ke7 7.Nd5#.
        name: 'sac-legals-mate-Nxe5',
        fenBefore: 'r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 2 5',
        playedUci: 'f3e5',
        sanHistory: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'd6', 'Nc3', 'Bg4', 'Nxe5'],
        ply: 9,
        phase: 'opening',
        engine: {
            bestMove: 'f3e5',
            lines: {
                1: cpLine(150, ['f3e5', 'd6e5', 'd1g4']),
                2: cpLine(40, ['h2h3', 'g4f3', 'd1f3']),
                3: cpLine(30, ['d2d3', 'g8f6', 'c1e3'])
            },
            post: post('d6e5', cpLine(-150, ['d6e5', 'd1g4']))
        },
        expect: {
            detailedQuality: 'brilliant',
            mustNotContain: ['hanging', 'en prise', 'left the', 'loses a']
        }
    },
    {
        // Fried Liver Attack: 6.Nxf7! sacrifices the knight for a raging attack.
        name: 'sac-fried-liver-Nxf7',
        fenBefore: 'r1bqkb1r/ppp2ppp/2n5/3np1N1/2B5/8/PPPP1PPP/RNBQK2R w KQkq - 0 6',
        playedUci: 'g5f7',
        sanHistory: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7'],
        ply: 11,
        phase: 'opening',
        engine: {
            bestMove: 'g5f7',
            lines: {
                1: cpLine(140, ['g5f7', 'e8f7', 'd1f3']),
                2: cpLine(60, ['d2d4', 'c8e6', 'e1g1']),
                3: cpLine(40, ['g5e4', 'f8e7', 'd2d4'])
            },
            post: post('e8f7', cpLine(-140, ['e8f7', 'd1f3']))
        },
        expect: {
            detailedQuality: 'brilliant',
            mustNotContain: ['hanging', 'en prise', 'left the', 'loses a']
        }
    },
    {
        // Greek gift: Bxh7+ Kxh7 Ng5+ Kg8 Qh5 with a winning attack.
        name: 'sac-greek-gift-Bxh7',
        fenBefore: 'r1bq1rk1/ppp2ppp/2n1pn2/3p4/1b1P4/2NBPN2/PPP2PPP/R1BQK2R w KQ - 0 1',
        playedUci: 'd3h7',
        sanHistory: [],
        ply: 21,
        phase: 'middlegame',
        engine: {
            bestMove: 'd3h7',
            lines: {
                1: cpLine(190, ['d3h7', 'g8h7', 'f3g5']),
                2: cpLine(40, ['e1g1', 'b4c3', 'b2c3']),
                3: cpLine(30, ['c1d2', 'b4d6', 'e1g1'])
            },
            post: post('g8h7', cpLine(-190, ['g8h7', 'f3g5']))
        },
        expect: {
            detailedQuality: 'brilliant',
            mustNotContain: ['hanging', 'en prise', 'left the', 'loses a']
        }
    },
    {
        // Sicilian-style exchange sacrifice on c3: rook for knight, shattering
        // the queenside and opening the a5-e1 diagonal.
        name: 'sac-exchange-Rxc3',
        fenBefore: '2r1k2r/pp1bnppp/4p3/q7/3P4/2N1BN2/PP2BPPP/2RQ1RK1 b k - 0 1',
        playedUci: 'c8c3',
        sanHistory: [],
        ply: 24,
        phase: 'middlegame',
        engine: {
            bestMove: 'c8c3',
            lines: {
                1: cpLine(130, ['c8c3', 'b2c3', 'a5c3']),
                2: cpLine(20, ['e8g8', 'a2a3', 'e7f5']),
                3: cpLine(10, ['d7c6', 'a2a3', 'e8g8'])
            },
            post: post('b2c3', cpLine(-130, ['b2c3', 'a5c3']))
        },
        expect: {
            detailedQuality: 'brilliant',
            mustNotContain: ['hanging', 'en prise', 'left the', 'loses a']
        }
    },
    {
        // Same Greek gift, but the stub makes it the SECOND-best move, so the
        // move is routed through explainBlunderOrMistake and the geometric
        // hanging detector gets a chance to mislabel a sound sacrifice.
        name: 'sac-greek-gift-second-best-Bxh7',
        fenBefore: 'r1bq1rk1/ppp2ppp/2n1pn2/3p4/1b1P4/2NBPN2/PPP2PPP/R1BQK2R w KQ - 0 1',
        playedUci: 'd3h7',
        sanHistory: [],
        ply: 21,
        phase: 'middlegame',
        engine: {
            bestMove: 'e1g1',
            lines: {
                1: cpLine(120, ['e1g1', 'b4c3', 'b2c3']),
                2: cpLine(70, ['d3h7', 'g8h7', 'f3g5']),
                3: cpLine(30, ['c1d2', 'b4d6', 'e1g1'])
            },
            post: post('g8h7', cpLine(-70, ['g8h7', 'f3g5']))
        },
        expect: {
            uiQuality: 'inaccuracy',
            mustNotContain: ['hanging', 'en prise', 'left the', 'loses a']
        }
    },
    {
        // Same for the exchange sacrifice: Rxc3 is "attacked by a cheaper pawn",
        // which is exactly the shape detectHangingPieceBlunder flags.
        name: 'sac-exchange-second-best-Rxc3',
        fenBefore: '2r1k2r/pp1bnppp/4p3/q7/3P4/2N1BN2/PP2BPPP/2RQ1RK1 b k - 0 1',
        playedUci: 'c8c3',
        sanHistory: [],
        ply: 24,
        phase: 'middlegame',
        engine: {
            bestMove: 'e8g8',
            lines: {
                1: cpLine(70, ['e8g8', 'a2a3', 'e7f5']),
                2: cpLine(30, ['c8c3', 'b2c3', 'a5c3']),
                3: cpLine(10, ['d7c6', 'a2a3', 'e8g8'])
            },
            post: post('b2c3', cpLine(-30, ['b2c3', 'a5c3']))
        },
        expect: {
            uiQuality: 'inaccuracy',
            mustNotContain: ['hanging', 'en prise', 'left the', 'loses a']
        }
    },

    // -------------------------------------------------------------------
    // Only-moves
    // -------------------------------------------------------------------
    {
        // Ra8+ leaves Black exactly one legal reply.
        name: 'only-move-single-legal-Kf7',
        fenBefore: 'R5k1/6pp/8/8/8/8/6PP/6K1 b - - 0 1',
        playedUci: 'g8f7',
        sanHistory: [],
        ply: 52,
        phase: 'endgame',
        engine: {
            bestMove: 'g8f7',
            lines: {
                1: cpLine(-30, ['g8f7', 'a8a7', 'f7f6'])
            },
            post: post('a8a7', cpLine(30, ['a8a7', 'f7f6']))
        },
        expect: { detailedQuality: 'great' }
    },
    {
        // Only ...h6 parries the Qxh7# threat; everything else loses on the spot.
        name: 'only-move-defence-h6',
        fenBefore: '6k1/5ppp/8/6N1/8/7Q/5PPP/6K1 b - - 0 1',
        playedUci: 'h7h6',
        sanHistory: [],
        ply: 40,
        phase: 'middlegame',
        engine: {
            bestMove: 'h7h6',
            lines: {
                1: cpLine(-40, ['h7h6', 'g5e4', 'g8h7']),
                2: mateLine(-2, ['g8h8', 'h3h7']),
                3: mateLine(-2, ['f7f6', 'h3h7'])
            },
            post: post('g5e4', cpLine(40, ['g5e4', 'g8h7']))
        },
        expect: { detailedQuality: 'great' }
    },
    {
        // The same position, but the only defence is missed and it is mate.
        name: 'only-move-missed-Kh8',
        fenBefore: '6k1/5ppp/8/6N1/8/7Q/5PPP/6K1 b - - 0 1',
        playedUci: 'g8h8',
        sanHistory: [],
        ply: 40,
        phase: 'middlegame',
        engine: {
            bestMove: 'h7h6',
            lines: {
                1: cpLine(-40, ['h7h6', 'g5e4', 'g8h7']),
                2: cpLine(-900, ['f7f6', 'h3h7', 'g8f8']),
                3: cpLine(-950, ['f7f5', 'h3h7', 'g8f8'])
            },
            post: post('h3h7', mateLine(1, ['h3h7']))
        },
        expect: {
            uiQuality: 'blunder',
            mustContain: ['Kh8']
        }
    },

    // -------------------------------------------------------------------
    // Missed forced mates
    // -------------------------------------------------------------------
    {
        // Ra8# was mate in one; Rb1 throws the whole game away.
        name: 'missed-mate-back-rank-Rb1',
        fenBefore: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
        playedUci: 'a1b1',
        sanHistory: [],
        ply: 48,
        phase: 'endgame',
        engine: {
            bestMove: 'a1a8',
            lines: {
                1: mateLine(1, ['a1a8']),
                2: cpLine(20, ['a1b1', 'g8f8', 'b1b8']),
                3: cpLine(10, ['g1f1', 'g8f8', 'a1a8'])
            },
            post: post('h7h6', cpLine(0, ['h7h6', 'b1b8']))
        },
        expect: {
            detailedQuality: 'missed win',
            tags: ['Missed Mate'],
            mustContain: ['Ra8', 'Rb1']
        }
    },
    {
        // 4.Qxf7# was mate in one; 4.Qxe5+ hangs the Queen to Nxe5.
        name: 'missed-mate-scholars-Qxe5',
        fenBefore: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
        playedUci: 'h5e5',
        sanHistory: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxe5+'],
        ply: 7,
        phase: 'opening',
        engine: {
            bestMove: 'h5f7',
            lines: {
                1: mateLine(1, ['h5f7']),
                2: cpLine(60, ['g1f3', 'd7d5', 'e4d5']),
                3: cpLine(-800, ['h5e5', 'c6e5', 'd2d4'])
            },
            post: post('c6e5', cpLine(800, ['c6e5', 'd2d4']))
        },
        expect: {
            detailedQuality: 'missed win',
            tags: ['Missed Mate'],
            mustContain: ['Qxf7', 'Qxe5+']
        }
    },
    {
        // Qg7# was mate in one. Qg5?? is stalemate: the game is drawn on the spot.
        name: 'missed-mate-stalemate-Qg5',
        fenBefore: '7k/8/6QK/8/8/8/8/8 w - - 0 1',
        playedUci: 'g6g5',
        sanHistory: [],
        ply: 90,
        phase: 'endgame',
        engine: {
            bestMove: 'g6g7',
            lines: {
                1: mateLine(1, ['g6g7']),
                2: mateLine(1, ['g6e8']),
                3: cpLine(0, ['g6g5'])
            },
            post: post('', cpLine(0, []))
        },
        expect: {
            detailedQuality: 'missed win',
            mustContain: ['stalemate']
        }
    },
    {
        // The positive control: the mate actually gets played.
        name: 'mate-delivered-back-rank-Ra8',
        fenBefore: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
        playedUci: 'a1a8',
        sanHistory: [],
        ply: 48,
        phase: 'endgame',
        engine: {
            bestMove: 'a1a8',
            lines: {
                1: mateLine(1, ['a1a8']),
                2: cpLine(20, ['a1b1', 'g8f8', 'b1b8']),
                3: cpLine(10, ['g1f1', 'g8f8', 'a1a8'])
            },
            post: post('', mateLine(0, []))
        },
        expect: {
            uiQuality: 'good move',
            tags: ['Checkmate'],
            mustContain: ['Checkmate', 'Ra8']
        }
    },
    {
        name: 'mate-delivered-scholars-Qxf7',
        fenBefore: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
        playedUci: 'h5f7',
        sanHistory: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'],
        ply: 7,
        phase: 'opening',
        engine: {
            bestMove: 'h5f7',
            lines: {
                1: mateLine(1, ['h5f7']),
                2: cpLine(60, ['g1f3', 'd7d5', 'e4d5']),
                3: cpLine(-800, ['h5e5', 'c6e5', 'd2d4'])
            },
            post: post('', mateLine(0, []))
        },
        expect: {
            uiQuality: 'good move',
            tags: ['Checkmate'],
            mustContain: ['Checkmate', 'Qxf7']
        }
    },
    {
        name: 'mate-delivered-endgame-Qg7',
        fenBefore: '7k/8/6QK/8/8/8/8/8 w - - 0 1',
        playedUci: 'g6g7',
        sanHistory: [],
        ply: 90,
        phase: 'endgame',
        engine: {
            bestMove: 'g6g7',
            lines: {
                1: mateLine(1, ['g6g7']),
                2: mateLine(1, ['g6e8']),
                3: cpLine(0, ['g6g5'])
            },
            post: post('', mateLine(0, []))
        },
        expect: {
            uiQuality: 'good move',
            tags: ['Checkmate'],
            mustContain: ['Checkmate']
        }
    },

    // -------------------------------------------------------------------
    // Quiet / prophylactic best moves
    // -------------------------------------------------------------------
    {
        // h3 is pure prophylaxis: it takes g4 away from the black pieces.
        name: 'quiet-prophylaxis-h3',
        fenBefore: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 w - - 2 7',
        playedUci: 'h2h3',
        sanHistory: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O', 'h3'],
        ply: 13,
        phase: 'middlegame',
        engine: {
            bestMove: 'h2h3',
            lines: {
                1: cpLine(25, ['h2h3', 'a7a6', 'f1e1']),
                2: cpLine(22, ['f1e1', 'c8g4', 'h2h3']),
                3: cpLine(18, ['b1d2', 'c8g4', 'h2h3'])
            },
            post: post('a7a6', cpLine(-25, ['a7a6', 'f1e1']))
        },
        expect: {
            detailedQuality: 'best',
            mustNotContain: ['maintains a solid position and harmonious coordination']
        }
    },
    {
        // a3 (Samisch) denies b4 to the bishop before anything else happens.
        name: 'quiet-prophylaxis-a3',
        fenBefore: 'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4',
        playedUci: 'a2a3',
        sanHistory: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'a3'],
        ply: 7,
        phase: 'opening',
        engine: {
            bestMove: 'a2a3',
            lines: {
                1: cpLine(35, ['a2a3', 'b4c3', 'b2c3']),
                2: cpLine(30, ['d1c2', 'e8g8', 'a2a3']),
                3: cpLine(25, ['g1f3', 'e8g8', 'c1g5'])
            },
            post: post('b4c3', cpLine(-35, ['b4c3', 'b2c3']))
        },
        expect: {
            detailedQuality: 'best',
            mustContain: ['a3'],
            mustNotContain: ['maintains a solid position and harmonious coordination']
        }
    },
    {
        // Castling: a concrete king-safety improvement.
        name: 'quiet-castle-kingside',
        fenBefore: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 1 5',
        playedUci: 'e1g1',
        sanHistory: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'O-O'],
        ply: 9,
        phase: 'opening',
        engine: {
            bestMove: 'e1g1',
            lines: {
                1: cpLine(30, ['e1g1', 'e8g8', 'd2d4']),
                2: cpLine(28, ['d2d3', 'd7d6', 'e1g1']),
                3: cpLine(25, ['d2d4', 'e5d4', 'c3d4'])
            },
            post: post('e8g8', cpLine(-30, ['e8g8', 'd2d4']))
        },
        expect: {
            detailedQuality: 'best',
            mustContain: ['O-O']
        }
    },

    // -------------------------------------------------------------------
    // Simple recaptures
    // -------------------------------------------------------------------
    {
        name: 'recapture-exd5',
        fenBefore: 'r1bqkb1r/ppp2ppp/2n2n2/3pp1N1/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq d6 0 5',
        playedUci: 'e4d5',
        sanHistory: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5'],
        ply: 9,
        phase: 'opening',
        engine: {
            bestMove: 'e4d5',
            lines: {
                1: cpLine(60, ['e4d5', 'c6a5', 'c4b5']),
                2: cpLine(10, ['g5f3', 'd5e4']),
                3: cpLine(0, ['d2d3', 'd5c4', 'd3c4'])
            },
            post: post('c6a5', cpLine(-60, ['c6a5', 'c4b5']))
        },
        expect: { detailedQuality: 'best', mustContain: ['exd5'] }
    },
    {
        name: 'recapture-dxc6',
        fenBefore: 'r1bqkbnr/1ppp1ppp/p1B5/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4',
        playedUci: 'd7c6',
        sanHistory: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6'],
        ply: 8,
        phase: 'opening',
        engine: {
            bestMove: 'd7c6',
            lines: {
                1: cpLine(-20, ['d7c6', 'e1g1', 'f7f6']),
                2: cpLine(-60, ['b7c6', 'd2d4', 'e5d4']),
                3: cpLine(-70, ['d8e7', 'c6b7', 'c8b7'])
            },
            post: post('e1g1', cpLine(20, ['e1g1', 'f7f6']))
        },
        expect: { detailedQuality: 'best', mustContain: ['dxc6'] }
    },
    {
        // Recapturing with the wrong pawn: playable, slightly worse.
        name: 'recapture-wrong-pawn-bxc6',
        fenBefore: 'r1bqkbnr/1ppp1ppp/p1B5/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4',
        playedUci: 'b7c6',
        sanHistory: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'bxc6'],
        ply: 8,
        phase: 'opening',
        engine: {
            bestMove: 'd7c6',
            lines: {
                1: cpLine(-20, ['d7c6', 'e1g1', 'f7f6']),
                2: cpLine(-70, ['b7c6', 'd2d4', 'e5d4']),
                3: cpLine(-80, ['d8e7', 'c6b7', 'c8b7'])
            },
            post: post('d2d4', cpLine(70, ['d2d4', 'e5d4']))
        },
        expect: {
            uiQuality: 'inaccuracy',
            mustContain: ['bxc6']
        }
    },

    // -------------------------------------------------------------------
    // Tactical blunders (fork / opening principle)
    // -------------------------------------------------------------------
    {
        // Two Knights: 5...Nxd5?? 6.Nxf7! forks the queen and the rook.
        name: 'blunder-allows-fork-Nxd5',
        fenBefore: 'r1bqkb1r/ppp2ppp/2n2n2/3Pp1N1/2B5/8/PPPP1PPP/RNBQK2R b KQkq - 0 5',
        playedUci: 'f6d5',
        sanHistory: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5'],
        ply: 10,
        phase: 'opening',
        engine: {
            bestMove: 'c6a5',
            lines: {
                1: cpLine(-40, ['c6a5', 'c4b5', 'c7c6']),
                2: cpLine(-170, ['f6d5', 'g5f7', 'e8f7']),
                3: cpLine(-200, ['c6d4', 'c2c3', 'b7b5'])
            },
            post: post('g5f7', cpLine(170, ['g5f7', 'e8f7', 'd1f3']))
        },
        expect: {
            uiQuality: 'mistake',
            mustContain: ['Nxd5']
        }
    },
    {
        // 2.Qh5 - an early queen sortie the detector is supposed to notice.
        name: 'opening-principle-early-queen-Qh5',
        fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        playedUci: 'd1h5',
        sanHistory: ['e4', 'e5', 'Qh5'],
        ply: 3,
        phase: 'opening',
        engine: {
            bestMove: 'g1f3',
            lines: {
                1: cpLine(30, ['g1f3', 'b8c6', 'f1b5']),
                2: cpLine(25, ['f1c4', 'g8f6', 'd2d3']),
                3: cpLine(-20, ['d1h5', 'b8c6', 'f1c4'])
            },
            post: post('b8c6', cpLine(20, ['b8c6', 'f1c4']))
        },
        expect: {
            uiQuality: 'inaccuracy',
            tags: ['Opening Principle'],
            mustContain: ['Qh5', 'opening principles']
        }
    },

    // -------------------------------------------------------------------
    // Endgame conversions
    // -------------------------------------------------------------------
    {
        // King before pawn: Ke3 keeps the opposition and the win.
        name: 'endgame-opposition-Ke3',
        fenBefore: '8/8/8/3k4/8/8/3PK3/8 w - - 0 1',
        playedUci: 'e2e3',
        sanHistory: [],
        ply: 70,
        phase: 'endgame',
        engine: {
            bestMove: 'e2e3',
            lines: {
                1: cpLine(90, ['e2e3', 'd5e5', 'd2d4']),
                2: cpLine(0, ['d2d4', 'd5d6', 'e2e3']),
                3: cpLine(0, ['e2d3', 'd5d6', 'd3e4'])
            },
            post: post('d5e5', cpLine(-90, ['d5e5', 'd2d4']))
        },
        expect: {
            detailedQuality: 'best',
            mustContain: ['opposition']
        }
    },
    {
        // Pushing the pawn first throws the opposition away and draws.
        name: 'endgame-premature-push-d4',
        fenBefore: '8/8/8/3k4/8/8/3PK3/8 w - - 0 1',
        playedUci: 'd2d4',
        sanHistory: [],
        ply: 70,
        phase: 'endgame',
        engine: {
            bestMove: 'e2e3',
            lines: {
                1: cpLine(90, ['e2e3', 'd5e5', 'd2d4']),
                2: cpLine(0, ['d2d4', 'd5d6', 'e2e3']),
                3: cpLine(0, ['e2d3', 'd5d6', 'd3e4'])
            },
            post: post('d5d6', cpLine(0, ['d5d6', 'e2e3']))
        },
        expect: {
            uiQuality: 'mistake',
            mustContain: ['d4', 'opposition']
        }
    },
    {
        // Centralising the king in a symmetrical pawn endgame.
        name: 'endgame-king-activity-Kf2',
        fenBefore: '6k1/5ppp/8/8/8/5PPP/8/6K1 w - - 0 1',
        playedUci: 'g1f2',
        sanHistory: [],
        ply: 64,
        phase: 'endgame',
        engine: {
            bestMove: 'g1f2',
            lines: {
                1: cpLine(0, ['g1f2', 'g8f8', 'f2e3']),
                2: cpLine(0, ['g1g2', 'g8f8', 'g2f2']),
                3: cpLine(0, ['g1h2', 'g8f8', 'h2g2'])
            },
            post: post('g8f8', cpLine(0, ['g8f8', 'f2e3']))
        },
        expect: {
            detailedQuality: 'best',
            mustContain: ['king']
        }
    },
    {
        name: 'endgame-promotion-e8Q',
        fenBefore: '8/4P3/4K3/8/8/8/8/6k1 w - - 0 1',
        playedUci: 'e7e8q',
        sanHistory: [],
        ply: 84,
        phase: 'endgame',
        engine: {
            bestMove: 'e7e8q',
            lines: {
                1: mateLine(6, ['e7e8q', 'g1g2', 'e8g6']),
                2: cpLine(300, ['e6f6', 'g1f2', 'e7e8q']),
                3: cpLine(200, ['e6d6', 'g1f2', 'e7e8q'])
            },
            post: post('g1g2', mateLine(-5, ['g1g2', 'e8g6']))
        },
        expect: {
            detailedQuality: 'best',
            mustContain: ['promot']
        }
    },
    {
        // Lucena: Rc4 builds the bridge and converts.
        name: 'endgame-lucena-bridge-Rc4',
        fenBefore: '1K6/1P2k3/8/8/8/8/r7/2R5 w - - 0 1',
        playedUci: 'c1c4',
        sanHistory: [],
        ply: 96,
        phase: 'endgame',
        engine: {
            bestMove: 'c1c4',
            lines: {
                1: cpLine(700, ['c1c4', 'a2a1', 'b8c7']),
                2: cpLine(120, ['c1d1', 'e7e6', 'd1c1']),
                3: cpLine(0, ['b8c8', 'a2a1'])
            },
            post: post('a2a1', cpLine(-700, ['a2a1', 'b8c7']))
        },
        expect: {
            detailedQuality: 'best',
            mustContain: ['rook']
        }
    },
    {
        // Rook to the seventh in a rook endgame.
        name: 'endgame-rook-seventh-Rd7',
        fenBefore: '4r1k1/5ppp/8/8/8/7P/5PP1/3R2K1 w - - 0 1',
        playedUci: 'd1d7',
        sanHistory: [],
        ply: 61,
        phase: 'endgame',
        engine: {
            bestMove: 'd1d7',
            lines: {
                1: cpLine(80, ['d1d7', 'e8e1', 'g1h2']),
                2: cpLine(20, ['d1d4', 'e8e1', 'g1h2']),
                3: cpLine(10, ['g1h2', 'e8e1', 'd1d8'])
            },
            post: post('e8e1', cpLine(-80, ['e8e1', 'g1h2']))
        },
        expect: {
            detailedQuality: 'best',
            mustContain: ['Rd7']
        }
    },
    {
        // Transposition into Queen's Gambit Declined (1. c4 e6 2. d4 d5 3. Nc3)
        name: 'book-transposition-qgd',
        fenBefore: 'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
        playedUci: 'b1c3',
        sanHistory: ['c4', 'e6', 'd4', 'd5', 'Nc3'],
        ply: 5,
        phase: 'opening',
        engine: {
            bestMove: 'b1c3',
            lines: {
                1: cpLine(35, ['b1c3', 'g8f6', 'c4d5']),
                2: cpLine(30, ['g1f3', 'g8f6', 'b1c3']),
                3: cpLine(25, ['c4d5', 'e6d5', 'b1c3'])
            },
            post: post('g8f6', cpLine(-30, ['g8f6', 'c4d5']))
        },
        expect: { detailedQuality: 'book', uiQuality: 'good move' }
    },
    {
        // Persona depth dial: McMarty (800 Elo) gives concise, single-sentence feedback
        name: 'persona-dial-mcmarty-concise',
        fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
        playedUci: 'g8h6',
        sanHistory: ['e4', 'e5', 'Nf3', 'Nh6'],
        ply: 4,
        phase: 'opening',
        context: {
            personaId: 'mcmarty',
            depthDial: 'concise',
            playerElo: 800
        },
        engine: {
            bestMove: 'b8c6',
            lines: {
                1: cpLine(30, ['b8c6', 'f1c4']),
                2: cpLine(-250, ['g8h6', 'd2d4'])
            },
            post: post('d2d4', cpLine(250, ['d2d4', 'e5d4']))
        },
        expect: { uiQuality: 'blunder' }
    },
    {
        // Persona depth dial: Mangoose (2200 Elo) gives deep GM variation feedback
        name: 'persona-dial-mangoose-deep',
        fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
        playedUci: 'g8h6',
        sanHistory: ['e4', 'e5', 'Nf3', 'Nh6'],
        ply: 4,
        phase: 'opening',
        context: {
            personaId: 'mangoose',
            depthDial: 'deep',
            playerElo: 2200
        },
        engine: {
            bestMove: 'b8c6',
            lines: {
                1: cpLine(30, ['b8c6', 'f1c4']),
                2: cpLine(-250, ['g8h6', 'd2d4'])
            },
            post: post('d2d4', cpLine(250, ['d2d4', 'e5d4']))
        },
        expect: { uiQuality: 'blunder', mustContain: ['Better continuation:'] }
    }
];

// ---------------------------------------------------------------------------
// Driver - mirrors js/browser-analyzer.js:480-640 exactly
// ---------------------------------------------------------------------------

function uciToSan(chessInstance, uciMove) {
    if (!uciMove || uciMove.length < 4) return '';
    const from = uciMove.substring(0, 2);
    const to = uciMove.substring(2, 4);
    const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
    try {
        const m = chessInstance.move({ from: from, to: to, promotion: promotion });
        if (m) {
            const san = m.san;
            chessInstance.undo();
            return san;
        }
    } catch (e) {
        // Illegal move in PV - fall through
    }
    return uciMove;
}

function formatPv(chessInstance, uciMoves, maxMoves) {
    maxMoves = maxMoves || 5;
    if (!uciMoves || uciMoves.length === 0) return '';
    const temp = new Chess(chessInstance.fen());
    const tokens = [];
    for (let i = 0; i < Math.min(maxMoves, uciMoves.length); i++) {
        const uci = uciMoves[i];
        if (!uci || uci.length < 4) break;
        try {
            const isWhite = (temp.turn() === 'w');
            const moveNum = parseInt(temp.fen().split(' ')[5], 10) || 1;
            const m = temp.move({
                from: uci.substring(0, 2),
                to: uci.substring(2, 4),
                promotion: uci.length > 4 ? uci[4] : undefined
            });
            if (!m) break;
            if (isWhite) tokens.push(`${moveNum}. ${m.san}`);
            else if (i === 0) tokens.push(`${moveNum}... ${m.san}`);
            else tokens.push(m.san);
        } catch (e) {
            break;
        }
    }
    return tokens.join(' ');
}

/**
 * Run one fixture through the real classification + explanation path.
 * Returns { classification, explanation, tags, flaw, missedChance, betterLine, ... }.
 */
function runDiagnosis(fx) {
    const res = MoveDiagnostics.diagnose({
        fenBefore: fx.fenBefore,
        playedMove: fx.playedUci,
        engine: fx.engine,
        context: {
            ply: fx.ply,
            sanHistory: fx.sanHistory || [],
            phase: fx.phase,
            personaId: fx.context?.personaId,
            depthDial: fx.context?.depthDial,
            playerElo: fx.context?.playerElo
        }
    });

    const isBad = (res.classification.uiQuality === 'blunder'
        || res.classification.uiQuality === 'mistake'
        || res.classification.uiQuality === 'inaccuracy');

    return {
        path: isBad ? 'blunder' : 'good',
        classification: res.classification,
        explanation: res.explanation,
        tags: res.tags,
        flaw: res.flaw,
        missedChance: res.missedChance,
        betterLine: res.betterLine,
        isBook: res.isBook,
        playedIsBest: res.playedIsBest,
        wpBefore: res.wpBefore,
        wpAfter: res.wpAfter,
        sanPlayed: res.sanPlayed,
        sanBest: res.bestSan
    };
}

// ---------------------------------------------------------------------------
// Phrasing audit - runs over EVERY fixture's output
// ---------------------------------------------------------------------------

const OPENING_VOCAB = [/\bdevelop/i, /\bdevelopment\b/i, /castl/i, /opening principle/i];

/**
 * Returns an array of problem strings (empty array = clean).
 */
function auditPhrasing(fx, out) {
    const problems = [];
    const fields = [
        ['explanation', out.explanation],
        ['flaw', out.flaw],
        ['missedChance', out.missedChance],
        ['betterLine', out.betterLine]
    ];

    for (const [label, raw] of fields) {
        if (raw === null || raw === undefined) continue;
        if (typeof raw !== 'string') {
            problems.push(`${label} is not a string (${typeof raw})`);
            continue;
        }
        const text = raw;

        // 1. Placeholder leakage
        for (const bad of ['undefined', 'null', '[object Object]', 'NaN']) {
            if (text.includes(bad)) problems.push(`${label} contains literal "${bad}"`);
        }

        // 2. Doubled clauses / duplicated connectives
        if (/,\s*and\s*,\s*and/i.test(text)) problems.push(`${label} has a doubled ", and , and" clause`);
        if (/\band\s+and\b/i.test(text)) problems.push(`${label} has a doubled "and and"`);
        if (/\bbecause\s+because\b/i.test(text)) problems.push(`${label} has a doubled "because"`);
        if (/\s{2,}/.test(text)) problems.push(`${label} has collapsed whitespace ("${text.replace(/\s{2,}/, ' >>  << ')}")`);

        // 3. Empty reason fragments
        if (/\bbecause it\s*[.,!?]/i.test(text)) problems.push(`${label} has an empty "because it ." fragment`);
        if (/\bwhich\s*[.,!?]/i.test(text)) problems.push(`${label} has an empty "which ." fragment`);
        if (/\bit\s+[.,!?]/.test(text)) problems.push(`${label} has an empty "it ." fragment`);
        if (/\s[.,!?]/.test(text)) problems.push(`${label} has a space before punctuation`);
        if (/\bby\s*[.,!?]/i.test(text)) problems.push(`${label} has an empty "by ." fragment`);
        if (/##|\+\+|\+#|#\+/.test(text)) problems.push(`${label} has doubled check/mate punctuation`);
        if (/(?<!\.)[.,]{2}(?!\.)/.test(text)) problems.push(`${label} has doubled punctuation`);

        // 4. Repeated identical sentence
        const sentences = text.split(/(?<=[.!?])\s+/)
            .map(s => s.trim())
            .filter(s => s.length > 12);
        const seen = new Set();
        for (const s of sentences) {
            const key = s.toLowerCase();
            if (seen.has(key)) problems.push(`${label} repeats the sentence "${s}"`);
            seen.add(key);
        }
    }

    // 5. Opening vocabulary must never appear in an endgame
    if (fx.phase === 'endgame') {
        for (const [label, raw] of fields) {
            if (typeof raw !== 'string') continue;
            for (const re of OPENING_VOCAB) {
                if (re.test(raw)) {
                    problems.push(`${label} uses opening vocabulary ${re} in an endgame position`);
                }
            }
        }
    }

    // 6. Every fixture must produce a non-empty explanation
    if (!out.explanation || out.explanation.trim().length === 0) {
        problems.push('explanation is empty');
    }

    return problems;
}

// ---------------------------------------------------------------------------
// Expectation checking
// ---------------------------------------------------------------------------

/**
 * The UI surfaces move.analysis.{explanation, flaw, missed_chance, better_line}
 * together, so mustContain / mustNotContain are matched against all of them.
 */
function narrativeText(out) {
    return [out.explanation, out.flaw, out.missedChance, out.betterLine]
        .filter(v => typeof v === 'string')
        .join(' \u2016 ');
}

function checkExpectations(fx, out) {
    const problems = [];
    const exp = fx.expect || {};
    const hay = narrativeText(out).toLowerCase();

    if (exp.uiQuality !== undefined && out.classification.uiQuality !== exp.uiQuality) {
        problems.push(`uiQuality: expected "${exp.uiQuality}", got "${out.classification.uiQuality}"`);
    }
    if (exp.detailedQuality !== undefined && out.classification.detailedQuality !== exp.detailedQuality) {
        problems.push(`detailedQuality: expected "${exp.detailedQuality}", got "${out.classification.detailedQuality}"`);
    }
    if (exp.detailedQualityNot !== undefined && out.classification.detailedQuality === exp.detailedQualityNot) {
        problems.push(`detailedQualityNot: expected NOT "${exp.detailedQualityNot}", got "${out.classification.detailedQuality}"`);
    }
    if (exp.tags) {
        for (const tag of exp.tags) {
            if (!out.tags.includes(tag)) {
                problems.push(`tags: expected "${tag}", got [${out.tags.join(', ')}]`);
            }
        }
    }
    if (exp.mustContain) {
        for (const needle of exp.mustContain) {
            if (!hay.includes(needle.toLowerCase())) {
                problems.push(`narrative must contain "${needle}"`);
            }
        }
    }
    if (exp.mustNotContain) {
        for (const needle of exp.mustNotContain) {
            if (hay.includes(needle.toLowerCase())) {
                problems.push(`narrative must NOT contain "${needle}"`);
            }
        }
    }
    return problems;
}

// ---------------------------------------------------------------------------
// Corpus sanity: every FEN and every UCI in the corpus must be real chess
// ---------------------------------------------------------------------------

// chess.js silently loads a BOARD-ONLY FEN (no side-to-move / castling / ep /
// clocks) as a completely EMPTY board - it neither throws nor falls back to the
// start position. A fixture built on such a FEN would exercise nothing at all and
// would look like it passes. Every fixture FEN below is therefore a full 6-field
// FEN, and sanityCheckCorpus() hard-fails (aborts the run, never records a
// knownFail) if any fenBefore does not round-trip or if playedUci is not legal:
// that is a broken fixture, not a finding.
function sanityCheckCorpus() {
    // Self-test of the guard itself, so it can never silently stop guarding.
    const emptyBoardFen = new Chess('4k3/8/8/3q4/8/8/8/3RK3').fen().split(' ')[0];
    assert.strictEqual(emptyBoardFen, '8/8/8/8/8/8/8/8',
        'chess.js no longer blanks board-only FENs; revisit the corpus FEN guard');
    assert.notStrictEqual(emptyBoardFen, '4k3/8/8/3q4/8/8/8/3RK3',
        'round-trip guard would not catch a board-only FEN');

    const names = new Set();
    for (const fx of FIXTURES) {
        assert(!names.has(fx.name), `duplicate fixture name: ${fx.name}`);
        names.add(fx.name);

        let board;
        try {
            board = new Chess(fx.fenBefore);
        } catch (e) {
            assert.fail(`${fx.name}: fenBefore does not load: ${e.message}`);
        }
        assert.strictEqual(board.fen().split(' ')[0], fx.fenBefore.split(' ')[0],
            `${fx.name}: chess.js rewrote the board field of fenBefore`);

        const probe = new Chess(fx.fenBefore);
        const mv = probe.move({
            from: fx.playedUci.substring(0, 2),
            to: fx.playedUci.substring(2, 4),
            promotion: fx.playedUci.length > 4 ? fx.playedUci[4] : undefined
        });
        assert(mv, `${fx.name}: playedUci "${fx.playedUci}" is illegal in ${fx.fenBefore}`);
        const fenAfter = probe.fen();

        assert(fx.engine && fx.engine.lines && fx.engine.lines[1],
            `${fx.name}: engine stub must provide lines[1]`);
        assert(fx.engine.bestMove !== undefined, `${fx.name}: engine stub must provide bestMove`);

        // Every pre-search PV must be a legal sequence from fenBefore
        for (const key of Object.keys(fx.engine.lines)) {
            const line = fx.engine.lines[key];
            assert(line.cp !== undefined || line.mate !== undefined,
                `${fx.name}: engine.lines[${key}] needs a cp or mate score`);
            const t = new Chess(fx.fenBefore);
            (line.pv || []).forEach((uci, i) => {
                const m = t.move({
                    from: uci.substring(0, 2),
                    to: uci.substring(2, 4),
                    promotion: uci.length > 4 ? uci[4] : undefined
                });
                assert(m, `${fx.name}: engine.lines[${key}].pv[${i}] ("${uci}") is illegal`);
            });
        }

        // Every post-search PV must be a legal sequence from fenAfter
        const p = fx.engine.post;
        if (p && p.lines && p.lines[1]) {
            const t = new Chess(fenAfter);
            if (p.bestMove) {
                const probe2 = new Chess(fenAfter);
                assert(probe2.move({
                    from: p.bestMove.substring(0, 2),
                    to: p.bestMove.substring(2, 4),
                    promotion: p.bestMove.length > 4 ? p.bestMove[4] : undefined
                }), `${fx.name}: engine.post.bestMove ("${p.bestMove}") is illegal in fenAfter`);
            }
            (p.lines[1].pv || []).forEach((uci, i) => {
                const m = t.move({
                    from: uci.substring(0, 2),
                    to: uci.substring(2, 4),
                    promotion: uci.length > 4 ? uci[4] : undefined
                });
                assert(m, `${fx.name}: engine.post.lines[1].pv[${i}] ("${uci}") is illegal`);
            });
        }

        assert(['opening', 'middlegame', 'endgame'].includes(fx.phase),
            `${fx.name}: phase must be opening|middlegame|endgame`);
    }
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

console.log('Running move-diagnostics regression corpus (no engine, no network)...');
console.log('');

console.log('Validating corpus positions with chess.min.js...');
sanityCheckCorpus();
console.log(`✓ ${FIXTURES.length} fixtures: all FENs, played moves and engine PVs are legal.`);
console.log('');

let passed = 0;
let knownFailed = 0;
let failed = 0;
const knownFailList = [];
const failList = [];
const unexpectedPasses = [];

for (const fx of FIXTURES) {
    let out;
    try {
        out = runDiagnosis(fx);
    } catch (e) {
        failed++;
        failList.push(`${fx.name}: threw ${e.message}`);
        console.log(`✗ ${fx.name} — threw: ${e.message}`);
        continue;
    }

    const problems = checkExpectations(fx, out).concat(auditPhrasing(fx, out));

    if (problems.length === 0) {
        passed++;
        if (fx.knownFail) {
            unexpectedPasses.push(fx.name);
            console.log(`✓ ${fx.name}  [known-fail "${fx.knownFail}" now PASSES — retire the marker]`);
        } else {
            console.log(`✓ ${fx.name}`);
        }
        continue;
    }

    if (fx.knownFail) {
        knownFailed++;
        knownFailList.push(`${fx.name} — ${fx.knownFail}`);
        console.log(`⚠ KNOWN FAIL ${fx.name} — ${fx.knownFail}`);
        for (const p of problems) console.log(`      ${p}`);
        console.log(`      explanation: ${out.explanation}`);
    } else {
        failed++;
        failList.push(`${fx.name}: ${problems.join(' | ')}`);
        console.log(`✗ ${fx.name}`);
        for (const p of problems) console.log(`      ${p}`);
        console.log(`      explanation: ${out.explanation}`);
    }
}

console.log('');
if (knownFailList.length > 0) {
    console.log('Known failures (targets for later phases of the plan):');
    for (const k of knownFailList) console.log(`  ⚠ ${k}`);
    console.log('');
}
if (unexpectedPasses.length > 0) {
    console.log('Known-fail markers that can now be removed:');
    for (const u of unexpectedPasses) console.log(`  ✓ ${u}`);
    console.log('');
}
if (failList.length > 0) {
    console.log('Unexpected failures:');
    for (const f of failList) console.log(`  ✗ ${f}`);
    console.log('');
}

console.log(`${passed} passed, ${knownFailed} known-fail, ${failed} failed`);

if (failed > 0) {
    console.error('MOVE DIAGNOSTICS CORPUS FAILED.');
    process.exit(1);
}
console.log('MOVE DIAGNOSTICS CORPUS OK (known failures are expected until the plan lands). 🎉');

// ---------------------------------------------------------------------------
// Bilingual EN/VI parity: same verdict + tags, localized connective prose,
// English chess terms (incl. played SAN) preserved in VI output.
// ---------------------------------------------------------------------------
console.log('');
console.log('Running bilingual EN/VI parity checks...');
const WhyBlunderI18N = require('./js/i18n.js');
assert.deepStrictEqual(WhyBlunderI18N.SUPPORTED, ['en', 'vi']);

function diagnoseWithLang(fx, lang) {
    return MoveDiagnostics.diagnose({
        fenBefore: fx.fenBefore,
        playedMove: fx.playedUci,
        engine: fx.engine,
        context: {
            ply: fx.ply,
            sanHistory: fx.sanHistory || [],
            phase: fx.phase,
            lang
        }
    });
}

for (const name of ['hanging-knight-Ng5', 'missed-mate-back-rank-Rb1', 'quiet-castle-kingside']) {
    const fx = FIXTURES.find(f => f.name === name);
    assert(fx, `parity fixture "${name}" must exist in FIXTURES`);
    const en = diagnoseWithLang(fx, 'en');
    const vi = diagnoseWithLang(fx, 'vi');
    assert.strictEqual(vi.lang, 'vi', `${name}: result must carry lang 'vi'`);
    assert.strictEqual(vi.classification.uiQuality, en.classification.uiQuality,
        `${name}: uiQuality must be language-independent`);
    assert.strictEqual(vi.classification.detailedQuality, en.classification.detailedQuality,
        `${name}: detailedQuality must be language-independent`);
    assert.deepStrictEqual([...vi.tags].sort(), [...en.tags].sort(),
        `${name}: tags must stay English and identical`);
    assert(vi.explanation && vi.explanation.trim().length > 0, `${name}: VI explanation must be non-empty`);
    assert.notStrictEqual(vi.explanation, en.explanation, `${name}: VI prose must differ from EN`);
    for (const bad of ['undefined', 'null', '[object Object]', 'NaN']) {
        assert(!vi.explanation.includes(bad), `${name}: VI explanation leaks "${bad}"`);
    }
    assert(vi.explanation.includes(en.sanPlayed),
        `${name}: VI explanation must preserve played SAN "${en.sanPlayed}"`);
    console.log(`✓ bilingual parity ${name} (${vi.classification.detailedQuality})`);
}
console.log('BILINGUAL PARITY OK. 🎉');
