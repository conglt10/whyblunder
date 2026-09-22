/**
 * move-diagnostics.js - Unified move diagnosis engine for WhyBlunder.
 *
 * Exposes MoveDiagnostics.diagnose(options) which gathers engine evidence,
 * computes adaptive classification, evaluates tactical patterns, and
 * returns structured narrative and diagnostic evidence.
 *
 * Compatible with Browser and Node.js (UMD).
 */
(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.MoveDiagnostics = factory();
    }
}(typeof self !== 'undefined' ? self : this, function() {
    'use strict';

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

    function getEvaluator() {
        if (typeof ChessEvaluator !== 'undefined') return ChessEvaluator;
        if (typeof window !== 'undefined' && window.ChessEvaluator) return window.ChessEvaluator;
        if (typeof global !== 'undefined' && global.ChessEvaluator) return global.ChessEvaluator;
        try { return require('./chess-evaluator.js'); } catch (e) { return null; }
    }

    function getDetector() {
        if (typeof OpeningDetector !== 'undefined') return OpeningDetector;
        if (typeof window !== 'undefined' && window.OpeningDetector) return window.OpeningDetector;
        if (typeof global !== 'undefined' && global.OpeningDetector) return global.OpeningDetector;
        try { return require('./opening-detector.js'); } catch (e) { return null; }
    }

    function getRecognizer() {
        if (typeof SituationRecognizer !== 'undefined') return SituationRecognizer;
        if (typeof window !== 'undefined' && window.SituationRecognizer) return window.SituationRecognizer;
        if (typeof global !== 'undefined' && global.SituationRecognizer) return global.SituationRecognizer;
        try { return require('./situation-recognizer.js'); } catch (e) { return null; }
    }

    function uciToSan(chessInstance, uciMove) {
        if (!uciMove || typeof uciMove !== 'string' || uciMove.length < 4) return '';
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
        try {
            const m = chessInstance.move({ from, to, promotion });
            if (m) {
                const san = m.san;
                chessInstance.undo();
                return san;
            }
        } catch (e) {}
        return uciMove;
    }

    function formatPv(chessInstance, uciMoves, maxMoves) {
        maxMoves = maxMoves || 5;
        if (!uciMoves || !Array.isArray(uciMoves) || uciMoves.length === 0) return '';
        const ChessCtor = getChessConstructor();
        if (!ChessCtor) return uciMoves.slice(0, maxMoves).join(' ');
        const temp = new ChessCtor(chessInstance.fen());
        const tokens = [];
        for (let i = 0; i < Math.min(maxMoves, uciMoves.length); i++) {
            const uci = uciMoves[i];
            if (!uci || typeof uci !== 'string' || uci.length < 4) break;
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

    function detectOfferedPiece(boardBefore, boardAfter, moveObj, Recognizer) {
        if (!Recognizer || !Recognizer.staticExchangeEval) return false;
        if (!moveObj || !moveObj.to) return false;

        const oppTurn = boardAfter.turn();
        const moverTurn = oppTurn === 'w' ? 'b' : 'w';

        const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        let capturedValue = 0;
        if (moveObj.captured) {
            capturedValue = pieceValues[moveObj.captured] || 0;
        }

        const fenBeforeTokens = boardBefore.fen().split(' ');
        fenBeforeTokens[1] = oppTurn;
        fenBeforeTokens[3] = '-'; 
        const ChessCtor = getChessConstructor();
        const boardBeforeFlipped = new ChessCtor(fenBeforeTokens.join(' '));

        const moves = boardAfter.moves({ verbose: true });
        let maxSee = 0;
        let offeredPieceSquare = null;
        let offeredPieceType = null;

        for (const m of moves) {
            if (m.flags.includes('c') || m.flags.includes('e')) {
                const targetSq = m.to;
                const targetPiece = boardAfter.get(targetSq);
                if (!targetPiece) continue; 
                
                const type = targetPiece.type;
                const val = pieceValues[type] || 0;
                
                if (val >= 3 && targetPiece.color === moverTurn) {
                    let wasEnPrise = false;
                    if (targetSq !== moveObj.to) {
                        const seeBefore = Recognizer.staticExchangeEval(boardBeforeFlipped, targetSq, oppTurn);
                        if (seeBefore > 0) {
                            wasEnPrise = true;
                        }
                    }

                    if (!wasEnPrise) {
                        const seeAfter = Recognizer.staticExchangeEval(boardAfter, targetSq, oppTurn);
                        if (seeAfter > maxSee) {
                            maxSee = seeAfter;
                            offeredPieceSquare = targetSq;
                            offeredPieceType = type;
                        }
                    }
                }
            }
        }

        if (maxSee - capturedValue >= 2) {
            return {
                isOffered: true,
                piece: offeredPieceType,
                square: offeredPieceSquare
            };
        }
        return false;
    }

    /**
     * Unified move diagnosis function.
     *
     * @param {object} params
     * @param {string} params.fenBefore
     * @param {string} [params.fenAfter]
     * @param {object|string} params.playedMove - move object or UCI string
     * @param {object} [params.engine] - MultiPV root search and post search
     * @param {object} [params.context] - game context: ply, sanHistory, phase, playerElo, mode
     * @returns {object} unified diagnosis with classification and narrative
     */
    function diagnose(params) {
        const ChessCtor = getChessConstructor();
        const Evaluator = getEvaluator();
        const Detector = getDetector();
        const Recognizer = getRecognizer();

        const {
            fenBefore,
            fenAfter: passedFenAfter,
            playedMove,
            engine = {},
            context = {}
        } = params;

        if (!fenBefore || !ChessCtor) {
            throw new Error('MoveDiagnostics.diagnose requires fenBefore and a valid Chess constructor');
        }

        const boardBefore = new ChessCtor(fenBefore);
        let moveObj = null;
        let playedUci = '';

        if (typeof playedMove === 'string') {
            const trimmed = playedMove.trim();
            if (/^[a-h][1-8][a-h][1-8][qrbnQRBN]?$/.test(trimmed)) {
                playedUci = trimmed.toLowerCase();
                const testBoard = new ChessCtor(fenBefore);
                moveObj = testBoard.move({
                    from: playedUci.slice(0, 2),
                    to: playedUci.slice(2, 4),
                    promotion: playedUci.length > 4 ? playedUci[4] : undefined
                });
            } else {
                const testBoard = new ChessCtor(fenBefore);
                moveObj = testBoard.move(trimmed, { sloppy: true });
                if (moveObj) {
                    playedUci = moveObj.from + moveObj.to + (moveObj.promotion || '');
                }
            }
        } else if (playedMove && typeof playedMove === 'object') {
            playedUci = (playedMove.from || '') + (playedMove.to || '') + (playedMove.promotion || '');
            if (playedMove.san && playedMove.piece) {
                moveObj = playedMove;
            } else {
                const testBoard = new ChessCtor(fenBefore);
                moveObj = testBoard.move({
                    from: playedMove.from,
                    to: playedMove.to,
                    promotion: playedMove.promotion
                });
            }
        }

        if (!moveObj && playedUci.length >= 4) {
            const testBoard = new ChessCtor(fenBefore);
            moveObj = testBoard.move({
                from: playedUci.slice(0, 2),
                to: playedUci.slice(2, 4),
                promotion: playedUci.length > 4 ? playedUci[4] : undefined
            });
        }

        const fenAfter = passedFenAfter || (() => {
            const tb = new ChessCtor(fenBefore);
            if (moveObj) tb.move(moveObj);
            return tb.fen();
        })();
        const boardAfter = new ChessCtor(fenAfter);

        // Normalize engine data
        const preEval = engine || {};
        const lines = preEval.lines || {};
        const bestLine = lines[1] || { cp: 0, pv: [] };
        const bestUci = preEval.bestUci || preEval.bestMove || (bestLine.pv && bestLine.pv[0]) || '';
        const bestScoreObj = { cp: bestLine.cp, mate: bestLine.mate };
        const bestSan = uciToSan(boardBefore, bestUci);
        const bestPvFormatted = formatPv(boardBefore, bestLine.pv);

        const playedIsBest = (playedUci === bestUci) || Boolean(context.verifiedBest && context.verifiedBest.uci === playedUci);

        let playedScoreObj = bestScoreObj;
        let refUci = null;
        let refSan = null;
        let refFrom = null;
        let refTo = null;
        let refPv = [];
        let refPvFormatted = '';

        const postEval = preEval.post || { bestMove: '', lines: preEval.postLines || {} };

        if (playedIsBest) {
            playedScoreObj = bestScoreObj;
            if (bestLine.pv && bestLine.pv.length > 1) {
                refUci = bestLine.pv[1];
                refPv = bestLine.pv.slice(1);
            }
        } else {
            let foundInMultipv = false;
            for (let m = 1; m <= 5; m++) {
                if (lines[m] && lines[m].pv && lines[m].pv[0] === playedUci) {
                    playedScoreObj = { cp: lines[m].cp, mate: lines[m].mate };
                    foundInMultipv = true;
                    break;
                }
            }

            const postBest = (postEval.lines && postEval.lines[1]) || {};
            refUci = postEval.bestMove || (postBest.pv && postBest.pv[0]) || '';

            if (!foundInMultipv) {
                if (postBest.mate !== undefined) {
                    playedScoreObj = { mate: -postBest.mate };
                } else {
                    playedScoreObj = { cp: -(postBest.cp || 0) };
                }
            }
            if (postBest.pv) {
                refPv = postBest.pv;
                refPvFormatted = formatPv(boardAfter, postBest.pv);
            }
            if (!refUci && foundInMultipv) {
                for (let m = 1; m <= 5; m++) {
                    if (lines[m] && lines[m].pv && lines[m].pv[0] === playedUci && lines[m].pv.length > 1) {
                        refUci = lines[m].pv[1];
                        refPv = lines[m].pv.slice(1);
                        refPvFormatted = formatPv(boardAfter, refPv);
                        break;
                    }
                }
            }
        }

        if (refUci && refUci.length >= 4) {
            refSan = uciToSan(boardAfter, refUci);
            refFrom = refUci.substring(0, 2);
            refTo = refUci.substring(2, 4);
        }

        const bestCp = Evaluator ? Evaluator.scoreToCp(bestScoreObj) : (bestScoreObj.cp || 0);
        const playedCp = Evaluator ? Evaluator.scoreToCp(playedScoreObj) : (playedScoreObj.cp || 0);
        const wpBefore = Evaluator ? Evaluator.cpToWinProb(bestCp) : 0.5;
        const wpAfter = Evaluator ? Evaluator.cpToWinProb(playedCp) : 0.5;

        const ply = context.ply || (parseInt(fenBefore.split(' ')[5], 10) * 2 - (boardBefore.turn() === 'w' ? 1 : 0)) || 1;
        const sanHistory = context.sanHistory || [];
        const phase = context.phase || (Evaluator && Evaluator.gamePhase ? Evaluator.gamePhase(fenBefore) : 'middlegame');

        const isBook = (Detector && Detector.isBookMove) ? Detector.isBookMove(sanHistory, ply, fenAfter) : false;

        let secondBestWp = null;
        if (playedIsBest && lines[1] && lines[1].pv && lines[1].pv[0] !== playedUci) {
            // The played move was verified as best later, but the shallow search preferred lines[1].
            // So lines[1] is the alternative.
            if (lines[1]) {
                const cp1 = Evaluator ? Evaluator.scoreToCp(lines[1]) : (lines[1].cp || 0);
                secondBestWp = Evaluator ? Evaluator.cpToWinProb(cp1) : null;
            }
        } else if (lines[2]) {
            const cp2 = Evaluator ? Evaluator.scoreToCp(lines[2]) : (lines[2].cp || 0);
            secondBestWp = Evaluator ? Evaluator.cpToWinProb(cp2) : null;
        }

        let isSacrifice = false;
        let offeredObj = false;
        if (playedIsBest && Evaluator) {
            let pvSacrifice = false;
            let playedLinePv = null;
            if (lines[1] && lines[1].pv && lines[1].pv[0] === playedUci) {
                playedLinePv = lines[1].pv;
            }
            if (playedLinePv && Evaluator.deriveIsSacrifice) {
                pvSacrifice = Evaluator.deriveIsSacrifice(fenBefore, playedUci, playedLinePv);
            }
            offeredObj = detectOfferedPiece(boardBefore, boardAfter, moveObj, Recognizer);
            isSacrifice = !!(pvSacrifice || offeredObj);
        }

        const isOnlyMove = (Evaluator && Evaluator.deriveIsOnlyMove)
            ? Evaluator.deriveIsOnlyMove(lines)
            : false;

        const mateMissed = (Evaluator && Evaluator.deriveMateMissed)
            ? Evaluator.deriveMateMissed(bestScoreObj, playedScoreObj)
            : false;

        const sharpness = (Evaluator && Evaluator.positionSharpness)
            ? Evaluator.positionSharpness(lines)
            : 0.5;

        const evalContext = {
            phase,
            sharpness,
            depth: context.depth || preEval.depthPre || 16,
            playerElo: context.playerElo
        };

        const classification = Evaluator
            ? Evaluator.classifyMove(wpBefore, wpAfter, {
                playedIsBest,
                isBook,
                isSacrifice,
                isOnlyMove,
                mateMissed,
                secondBestWp,
                context: context.adaptive ? evalContext : null
            })
            : { uiQuality: 'good move', detailedQuality: 'good', wpLoss: 0, confidence: 'medium' };

        let explanation = '';
        let tags = [];
        let flaw = null;
        let missedChance = null;
        let betterLine = null;
        const evidence = [];

        const isBad = (classification.uiQuality === 'blunder'
            || classification.uiQuality === 'mistake'
            || classification.uiQuality === 'inaccuracy');

        if (Recognizer) {
            if (isBad) {
                const opViolation = (Detector && Detector.detectOpeningPrincipleViolation)
                    ? Detector.detectOpeningPrincipleViolation(boardBefore, moveObj, ply, { bestUci })
                    : null;
                const refMoveObj = (refFrom && refTo) ? { from: refFrom, to: refTo } : null;

                const res = Recognizer.explainBlunderOrMistake({
                    boardBefore,
                    boardAfter,
                    playedMove: moveObj,
                    bestMove: bestUci ? {
                        from: bestUci.substring(0, 2),
                        to: bestUci.substring(2, 4),
                        promotion: bestUci.length > 4 ? bestUci[4] : undefined
                    } : null,
                    refutationMove: refMoveObj,
                    sanPlayed: (moveObj && moveObj.san) || playedUci,
                    sanBest: bestSan,
                    sanRef: refSan,
                    bestScore: bestScoreObj,
                    playedScore: playedScoreObj,
                    bestPv: bestLine.pv || [],
                    refPv,
                    bestPvFormatted,
                    refPvFormatted,
                    quality: classification.uiQuality,
                    detailedQuality: classification.detailedQuality,
                    wpLoss: classification.wpLoss,
                    ply,
                    phase,
                    openingPrincipleViolation: opViolation,
                    isOnlyMove,
                    isSacrifice,
                    personaId: context.personaId,
                    playerElo: context.playerElo,
                    depthDial: context.depthDial
                });

                explanation = res.explanation;
                tags = res.tags || [];
                flaw = res.flaw;
                missedChance = res.missedChance;
                betterLine = res.betterLine;
                if (opViolation && !tags.includes('Opening Principle')) {
                    tags.push('Opening Principle');
                }
            } else {
                const refMoveObj = (refFrom && refTo) ? { from: refFrom, to: refTo } : null;
                const res = Recognizer.explainGoodMove({
                    boardBefore,
                    boardAfter,
                    move: moveObj,
                    san: (moveObj && moveObj.san) || playedUci,
                    isBest: playedIsBest,
                    detailedQuality: classification.detailedQuality,
                    isOnlyMove,
                    isSacrifice,
                    bestScore: bestScoreObj,
                    engineLines: lines,
                    refutationMove: refMoveObj,
                    sanRef: refSan,
                    phase,
                    ply,
                    personaId: context.personaId,
                    playerElo: context.playerElo,
                    depthDial: context.depthDial
                });

                explanation = res.explanation;
                tags = res.tags || [];
                flaw = res.flaw;
                missedChance = res.missedChance;
                betterLine = res.betterLine;
            }
        }

        evidence.push({
            kind: 'classification',
            claim: `${classification.detailedQuality} (${classification.uiQuality})`,
            confidence: classification.confidence || 'high',
            source: 'engine'
        });

        return {
            classification,
            narrative: {
                explanation,
                flaw,
                missedChance,
                betterLine,
                tags
            },
            evidence,
            explanation,
            tags,
            flaw,
            missedChance,
            betterLine,
            isBook,
            playedIsBest,
            wpBefore,
            wpAfter,
            wpLoss: classification.wpLoss,
            bestSan,
            refSan,
            bestScore: bestScoreObj,
            playedScore: playedScoreObj,
            sanPlayed: (moveObj && moveObj.san) || playedUci,
            bestUci,
            refUci,
            refPv,
            refPvFormatted,
            bestPvFormatted,
            phase,
            sharpness,
            sacrificedPiece: offeredObj ? offeredObj.piece : undefined,
            sacrificeSquare: offeredObj ? offeredObj.square : undefined
        };
    }

    /**
     * Compute an adaptive search budget based on game phase, position sharpness, mode, and wall-clock time.
     * @param {object} options
     * @param {string} [options.phase='middlegame'] - 'opening' | 'middlegame' | 'endgame'
     * @param {number} [options.sharpness=0.5] - 0.0 to 1.0
     * @param {string} [options.mode='analysis'] - 'analysis' | 'coach'
     * @param {number} [options.elapsedMs=0] - milliseconds spent on this turn
     * @param {number} [options.baseDepth=18] - base depth for analysis mode
     * @returns {object} { depthPre, depthPost, multipv }
     */
    function searchBudget(options = {}) {
        const {
            phase = 'middlegame',
            sharpness = 0.5,
            mode = 'analysis',
            elapsedMs = 0,
            baseDepth = (mode === 'coach' ? 12 : 18)
        } = options;

        if (mode === 'coach') {
            let depthPre = 12;
            let depthPost = 12;
            let multipv = 3;

            // Gracefully degrade search depth under wall-clock time pressure
            if (elapsedMs > 3500) {
                depthPre = 8;
                depthPost = 8;
            } else if (elapsedMs > 1800) {
                depthPre = 10;
                depthPost = 10;
            } else if (phase === 'endgame') {
                depthPre = 14;
                depthPost = 12;
            }

            return { depthPre, depthPost, multipv };
        }

        // Analysis mode
        let depthPre = baseDepth;
        let depthPost = Math.max(8, baseDepth - 2);
        let multipv = 3;

        if (phase === 'endgame') {
            // Endgames have fewer pieces; allow deeper tactical/conversion search
            depthPre = Math.min(22, baseDepth + 2);
            depthPost = Math.min(20, baseDepth);
        } else if (sharpness > 0.75) {
            // Razor-sharp tactical positions benefit from +1 ply
            depthPre = Math.min(22, baseDepth + 1);
            depthPost = Math.max(8, baseDepth - 1);
        }

        return { depthPre, depthPost, multipv };
    }

    function isBrilliantCandidate(fenBefore, lines) {
        const Evaluator = getEvaluator();
        const Recognizer = getRecognizer();
        const ChessCtor = getChessConstructor();
        if (!Evaluator || !Recognizer || !ChessCtor || !lines) return false;

        let bestLine = null;
        let secondBestLine = null;
        if (lines[1]) bestLine = lines[1];
        if (lines[2]) secondBestLine = lines[2];
        if (!bestLine || !bestLine.pv || bestLine.pv.length === 0) return false;

        const bestUci = bestLine.pv[0];
        const bestCp = Evaluator.scoreToCp(bestLine);
        const wpAfter = Evaluator.cpToWinProb(bestCp);

        let secondBestWp = null;
        if (secondBestLine) {
            const cp2 = Evaluator.scoreToCp(secondBestLine);
            secondBestWp = Evaluator.cpToWinProb(cp2);
        }

        const BRILLIANT = Evaluator.BRILLIANT_THRESHOLDS || { maxSecondBestWp: 0.90, minWpGap: 0.05 };

        if (wpAfter < 0.60) return false;
        if (secondBestWp === null) return false;
        if (secondBestWp >= BRILLIANT.maxSecondBestWp) return false;
        if ((wpAfter - secondBestWp) < BRILLIANT.minWpGap) return false;

        let isSacrifice = false;
        if (Evaluator.deriveIsSacrifice && Evaluator.deriveIsSacrifice(fenBefore, bestUci, bestLine.pv)) {
            isSacrifice = true;
        } else {
            const boardBefore = new ChessCtor(fenBefore);
            const boardAfter = new ChessCtor(fenBefore);
            const moveObj = boardAfter.move({
                from: bestUci.slice(0, 2),
                to: bestUci.slice(2, 4),
                promotion: bestUci.length > 4 ? bestUci[4] : undefined
            });
            if (moveObj) {
                const offeredObj = detectOfferedPiece(boardBefore, boardAfter, moveObj, Recognizer);
                if (offeredObj) isSacrifice = true;
            }
        }

        return isSacrifice ? { bestUci, wpAfter, secondBestWp } : false;
    }

    return {
        diagnose,
        uciToSan,
        formatPv,
        searchBudget,
        isBrilliantCandidate,
        _detectOfferedPiece: detectOfferedPiece
    };
}));
