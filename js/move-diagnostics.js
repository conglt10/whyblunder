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

        const isBook = (Detector && Detector.isBookMove) ? Detector.isBookMove(sanHistory, ply) : false;

        const isSacrifice = (Evaluator && Evaluator.deriveIsSacrifice)
            ? Evaluator.deriveIsSacrifice(fenBefore, playedUci, bestLine.pv)
            : false;

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
                    ? Detector.detectOpeningPrincipleViolation(boardBefore, moveObj, ply)
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
                    openingPrincipleViolation: opViolation
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
                    ply
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
            sharpness
        };
    }

    return {
        diagnose,
        uciToSan,
        formatPv
    };
}));
