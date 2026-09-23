/**
 * i18n.js - English/Vietnamese localization for WhyBlunder.
 *
 * Zero-build UMD module (browser <script> + Node.js require()).
 * Holds Vietnamese (vi) string tables only; English stays inline at each
 * call site so the EN product is byte-identical and existing assertions keep
 * passing. Every lookup falls back to the supplied English default, so
 * untranslated keys degrade gracefully and deterministically (no randomness).
 *
 * Chess vocabulary (Blunder, Fork, Pin, Skewer, Hanging Piece, piece names,
 * SAN moves, squares) intentionally stays in English inside VI sentences.
 *
 * Usage:
 *   var I18N = getI18n(); // UMD-safe, may be null in bare Node contexts
 *   var s = I18N ? I18N.t('chrome.analyze', 'Analyze Game') : 'Analyze Game';
 */
(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.WhyBlunderI18N = factory();
    }
}(typeof self !== 'undefined' ? self : this, function() {
    'use strict';

    var SUPPORTED = ['en', 'vi'];
    var current = 'en';

    // ------------------------------------------------------------------
    // Vietnamese flat string table (key -> sentence with {placeholders}).
    // ------------------------------------------------------------------
    var VI = {
        // ---- header / mode tabs ----
        'chrome.analysis': 'Phân tích',
        'chrome.coach': 'Huấn luyện viên',
        'chrome.coachPlayPrefix': 'Chơi ',
        'chrome.new': 'Mới',
        'chrome.import': 'Nhập',
        'chrome.toggleDropdown': 'Chuyển đổi menu',
        'chrome.lichessGame': 'Ván Lichess',
        'chrome.rawPgn': 'Văn bản PGN thô',
        'chrome.moreOptions': 'Tùy chọn khác',
        'chrome.hideHeader': 'Ẩn thanh tiêu đề để có thêm không gian',
        // ---- import drawer ----
        'chrome.depth': 'Độ sâu:',
        'chrome.fast14': 'Nhanh (14)',
        'chrome.standard16': 'Tiêu chuẩn (16)',
        'chrome.deep18': 'Sâu (18)',
        'chrome.master20': 'Cao thủ (20)',
        'chrome.gm22': 'Đại kiện tướng (22)',
        'chrome.elite24': 'Tìm kiếm siêu sâu (24)',
        'chrome.lichessHelpPre': 'Dán URL Lichess (ví dụ',
        'chrome.lichessHelpPost': ') hoặc ID ván 8 ký tự:',
        'chrome.examples': 'Ví dụ:',
        'chrome.presets': 'Mẫu sẵn:',
        'chrome.pgnHelp': 'Dán ký hiệu PGN thô:',
        'chrome.analyzeGame': 'Phân tích ván',
        'chrome.cancel': 'Hủy',
        'chrome.closeDrawer': 'Đóng bảng',
        // ---- analysis panel ----
        'chrome.moveAnalysis': 'Phân tích nước đi',
        'chrome.emptyDiagnosis': 'Chọn bất kỳ nước đi nào trong danh sách để xem chẩn đoán của engine, thẻ chiến thuật, mối đe dọa và các biến thể thay thế.',
        // ---- board / variation ----
        'chrome.punishingLine': 'Biến trừng phạt',
        'chrome.recommendedLine': 'Biến đề xuất',
        'chrome.playingVariation': 'Đang chạy biến thể...',
        'chrome.return': 'Quay lại',
        'chrome.returnGame': 'Về lại ván cờ (Space hoặc Esc)',
        // ---- moves column ----
        'chrome.moves': 'Các nước đi',
        'chrome.movesCount': '{n} nước',
        'chrome.momentsCount': '{n} điểm nhấn',
        'chrome.flip': 'Đảo bàn',
        'chrome.importPrompt': 'Nhập ván cờ từ Lichess hoặc dán PGN để bắt đầu phân tích đầy đủ.',
        'chrome.speed': 'Tốc độ:',
        'chrome.instant': 'Tức thì (Nhảy)',
        'chrome.slow': 'Chậm',
        'chrome.normal': 'Bình thường',
        'chrome.fast': 'Nhanh',
        'chrome.veryFast': 'Rất nhanh',
        'chrome.next': 'Tiếp',
        // ---- coach panel ----
        'chrome.playHuấn luyện viên': 'Chơi với Huấn luyện viên',
        'chrome.takeBack': 'Đi lại & Thử lại',
        'chrome.playOn': 'Chơi tiếp',
        'chrome.standardGame': 'Ván tiêu chuẩn',
        'chrome.gameReady': 'Ván đã sẵn sàng. Hãy đi nước đầu tiên!',
        'chrome.gameReadyShort': 'Ván đã sẵn sàng. Hãy đi một nước!',
        'chrome.gameReview': 'Đánh giá ván',
        // ---- mobile ----
        'chrome.movesLabel': 'Các nước',
        'chrome.resign': 'Xin thua',
        'chrome.undo': 'Hoàn nước',
        'chrome.hint': 'Gợi ý',
        'chrome.review': 'Đánh giá',
        'chrome.coachLabel': 'Huấn luyện viên',
        'chrome.fullMoves': 'Toàn bộ nước đi',
        'chrome.options': 'Tùy chọn',
        'chrome.analysisDepth': 'Độ sâu phân tích',
        'chrome.animSpeed': 'Tốc độ hoạt ảnh',
        'chrome.flipBoard': 'Đảo bàn cờ',
        'chrome.importPgnLichess': 'Nhập PGN / Lichess',
        'chrome.hideHeaderBar': 'Ẩn thanh tiêu đề',
        'chrome.details': 'Chi tiết',
        'chrome.selectMove': 'Chọn nước đi bất kỳ để xem phân tích',
        'chrome.loadMoves': 'Tải ván cờ để xem các nước...',
        'chrome.loadSheet': 'Tải ván cờ để xem toàn bộ bảng nước đi.',
        // ---- coach modal ----
        'chrome.chooseHuấn luyện viên': 'Chọn Huấn luyện viên của bạn',
        'chrome.playAs': 'Chơi cầm:',
        'chrome.white': 'Trắng ⚪',
        'chrome.black': 'Đen ⚫',
        'chrome.startGame': 'Bắt đầu ván mới',
        'chrome.close': 'Đóng',
        'coach.card.pikaru': 'Thần đồng tốc độ & tốt thông. Sắc bén, dí dỏm và chiến thuật.',
        'coach.card.mcmarty': 'Huấn luyện viên tân binh nhiệt tình. Thân thiện và thường xuyên mắc lỗi để bạn phát hiện!',
        'coach.card.sophy': 'Huấn luyện viên câu lạc bộ & giảng viên. Dạy phối hợp, an toàn vua và đòn Pin.',
        'coach.card.mangoose': 'Phù thủy tàn cuộc. Bậc thầy điềm tĩnh, hiếm khi mắc sai lầm.',
        // ---- dynamic badges / chips ----
        'chrome.missed': 'BỎ LỠ',
        'chrome.missedWin': 'BỎ LỠ CHIẾN THẮNG',
        'chrome.best': 'Hay nhất:',
        'chrome.win': 'Thắng:',
        'chrome.winProb': 'Xác suất thắng của {name}',
        'chrome.keyMoment': 'Key Moment',
        'chrome.punishLabel': 'Trừng phạt: ',
        'chrome.outcomeLabel': 'Kết quả: ',
        // ---- tooltips (title=) ----
        'tip.fullAnalysis': 'Phân tích toàn bộ ván',
        'tip.playWithHuấn luyện viên': 'Chơi với Huấn luyện viên',
        'tip.newGame': 'Ván đấu tập mới',
        'tip.importGame': 'Nhập ván cờ từ Lichess hoặc PGN',
        'tip.selectSource': 'Chọn nguồn nhập',
        'tip.firstMove': 'Nước đầu (Home)',
        'tip.prevMove': 'Nước trước (←)',
        'tip.prevKey': 'Key Moment trước (P)',
        'tip.nextKey': 'Key Moment tiếp (Space hoặc N)',
        'tip.nextKeySkip': 'Nhảy thẳng tới key moment tiếp theo',
        'tip.nextMove': 'Nước tiếp (→)',
        'tip.lastMove': 'Nước cuối (End)',
        'tip.varFirst': 'Đầu biến thể (Home)',
        'tip.varPrev': 'Nước trước của biến thể (←)',
        'tip.varPlay': 'Chạy/Dừng hoạt ảnh (P)',
        'tip.varNext': 'Nước tiếp của biến thể (→)',
        'tip.varLast': 'Cuối biến thể (End)',
        'tip.eval': 'Đánh giá thế cờ',
        'tip.flipBoardT': 'Đảo bàn cờ (F)',        'tip.toggleSound': 'Bật/tắt âm thanh',
        'tip.coachSettings': 'Nhân vật & cài đặt Huấn luyện viên',
        'tip.takeBack': 'Hoàn nước và tìm nước hay hơn',
        'tip.playOn': 'Cứ chơi tiếp thế cờ này',
        'tip.resign': 'Xin thua / Ván mới',
        'tip.askHint': 'Xin Huấn luyện viên gợi ý',
        'tip.review': 'Đánh giá ván (Phân tích trong chế độ Analysis)',
        'tip.takeback': 'Hoàn nước đi',
        'tip.mobileNav': 'Điều hướng ván trên di động',
        'tip.fullSheet': 'Toàn bộ bảng nước',
        'tip.moveList': 'Danh sách nước',
        'tip.returnPlayed': 'Về nước đã đi',
        'tip.exploreLine': 'Khám phá biến đề xuất',
        'tip.bestEval': 'Đánh giá của biến hay nhất',

        // ---- progress / status ----
        'status.init': 'Đang khởi tạo Stockfish WASM...',
        'status.spinning': 'Đang khởi động Stockfish WASM...',
        'status.analyzing': 'Đang phân tích các nước đi bằng Stockfish...',
        'status.progress': 'Đã phân tích {ply} trên {total}...',
        'status.fetching': 'Đang tải ván cờ từ Lichess ({id})...',
        'status.cached': 'Đã tải từ bộ nhớ đệm...Độ sâu {n}',
        'status.ready': 'SẴN SÀNG',
        'status.fetchingBadge': 'ĐANG TẢI',
        'status.analyzingBadge': 'ĐANG PHÂN TÍCH',
        'status.cachedBadge': 'ĐÃ LƯU ĐỆM',
        'status.complete': 'HOÀN TẤT',
        'status.error': 'LỖI',
        'status.cancelledMsg': 'Đã hủy phân tích.',

        // ---- errors ----
        'error.parsePgn': 'Không thể đọc ván cờ từ dữ liệu PGN đã nhập',
        'error.cancelled': 'Quá trình phân tích đã bị người dùng hủy',
        'error.workerInit': 'Worker chưa được khởi tạo',
        'error.evalStopped': 'Quá trình đánh giá đã dừng',
        'error.hintNone': 'Hiện tại không cần gợi ý.',
        'error.hintNonePos': 'Không có gợi ý nào cho thế cờ này.',

        // ---- diagnostics narrative (fragments stay English by design) ----
        'diag.missMateStalemate': '{played} bỏ lỡ chiếu hết! {best} đã có thể kết thúc ván cờ ngay. Thay vào đó, {played} để hòa stalemate, đánh rơi chiến thắng.',
        'diag.missMate': '{played} bỏ lỡ chiếu hết! {best} đã có thể kết thúc ván cờ ngay. Thay vào đó, {played} để {opp} tiếp tục ván cờ.',
        'diag.missTactic': '{played} bỏ qua cơ hội chiến thuật{extra}. {best} mới là nước thắng vì {reason}. Thay vào đó, {played} {effect}.',
        'diag.missTacticExtra': ' và {chance}',
        'diag.blunderEffect': '{played} {reason}, và {effect}. {best} hay hơn nhiều vì {bestReason}.',
        'diag.blunderPlain': '{played} mắc Blunder khi {reason}. {best} mới là nước cần thiết vì {bestReason}.',
        'diag.tacticTrouble': '{played} rơi vào rắc rối chiến thuật: {effect}. {best} an toàn hơn nhiều vì {bestReason}.',
        'diag.openingViol': '{played} vi phạm nguyên tắc khai cuộc khi {viol}. {best} mạnh hơn vì {bestReason}.',
        'diag.passive': '{played} quá bị động và {effect}. Phương án mạnh hơn là {best}, vì {bestReason}.',
        'diag.generic': '{played} {effect}. {best} hay hơn vì {bestReason}.',
        'diag.flawFallback': 'nhường ưu thế cho {opp}',
        'diag.betterCont': 'Diễn biến hay hơn: {pv}',
        'diag.checkmate': 'Chiếu hết! {san} chiếu hết và kết thúc ván cờ.',
        'diag.prefixBest': 'Nước hay nhất! ',
        'diag.prefixGreat': 'Nước tuyệt vời! ',
        'diag.prefixBrilliant': 'Nước Thiên tài! ',
        'diag.prefixStrong': 'Nước mạnh. ',
        'diag.goodMaintain': '{prefix}{san} duy trì thế cờ vững chắc và phối hợp hài hòa.',
        'diag.goodJoin': ', và ',
        'diag.strongestLine': 'Biến mạnh nhất: {pv}',
        'diag.oppWhite': 'Trắng',
        'diag.oppBlack': 'Đen',
        'diag.maintainCoord': 'duy trì phối hợp quân vững chắc',

        // ---- coach shared ----
        'coach.suggestion': 'Gợi ý của Huấn luyện viên: Hãy cân nhắc điều {piece} về {to} ({san}) như chúng ta đã trao đổi!',
        'coach.followUp': ' Tiếp theo bạn có {x}.',
        'coach.enemyPieces': 'các quân đối phương',
        'coach.joinAnd': ' và ',
        'coach.oppNudgeMcmarty': ' Hmm, tôi có cảm giác bạn đang có gì đó thú vị ở đây!',
        'coach.oppNudgeSophy': ' Hãy quan sát kỹ thế cờ này — có thể có cơ hội chiến thuật đấy.',
        'coach.oppNudgePikaru': ' Khoan đã, bạn có đòn chiến thuật nào ở đây không?',
        'coach.sacrificeNudge': ' Kỳ thủ mạnh sẽ tìm ra đòn hy sinh ở đây.',
        'coach.baitFallback': 'Khoan, hãy nhìn kỹ bàn cờ! {x}',
        'coach.onlyMoveFallback': 'Ở đây chỉ có một nước hợp lệ — cho tôi xem nào!',
        'coach.newGameAgain': 'Nhấn \'New Game\' hoặc nút cờ bất cứ khi nào bạn sẵn sàng chơi tiếp.',
        'coach.playedChallenge': 'Tôi đã đi {san}...',
        'coach.playedPunish': 'Tôi đã đi {san}. Hãy tìm đòn trừng phạt chiến thuật!',
        'coach.playSan': 'Tôi đi {san}.',
        'coach.castle': 'Tôi nhập thành {san} để đưa vua về nơi an toàn và kích hoạt xe.',
        'coach.castleChallenge': 'Hãy phối hợp các quân và đảm bảo vua của bạn an toàn!',
        'coach.check': 'Chiếu! {piece} của tôi ở {to} ({san}) đang tấn công vua của bạn.',
        'coach.checkChallenge': 'Hãy tìm ô thoát an toàn nhất hoặc nước chặn chiếu.',
        'coach.capture': 'Tôi đi {san}, bắt {cap} của bạn ở {to}.',
        'coach.captureChallenge': 'Bạn định ăn lại hay phản công thế nào?',
        'coach.pressureQueen': 'Tôi đi {san}, gây sức ép lên Hậu của bạn ở {sq}!',
        'coach.pressureQueenChallenge': 'Hậu của bạn sẽ đi đâu để duy trì sức ép?',
        'coach.aimRook': 'Tôi đi {san}, nhắm vào xe của bạn ở {sq}.',
        'coach.aimRookChallenge': 'Bạn sẽ phòng thủ hay hóa giải mối đe dọa này thế nào?',
        'coach.pinAnnoy': 'Tôi đi {san}, tạo đòn Pin khó chịu lên quân của bạn.',
        'coach.strikeCenter': 'Tôi đánh vào trung tâm với {san}!',
        'coach.pushPassed': 'Đẩy tốt thông của tôi tới {to} ({san}).',
        'coach.pushPassedChallenge': 'Bạn có thể chặn hoặc tấn công tốt thông này không?',
        'coach.outpost': 'Đặt {piece} của tôi ở {to} ({san}) làm đồn trú (Outpost) chủ động.',
        'coach.outpostChallenge': 'Bạn sẽ đối phó với {piece} đặt đẹp này thế nào?',
        'coach.invade7': 'Xâm nhập hàng 7 với xe của tôi ở {to} ({san}).',
        'coach.invade7Challenge': 'Xe ở hàng 7 rất nguy hiểm! Bạn có thể đối đầu hoặc bảo vệ tốt của mình không?',
        'coach.rookFile': 'Đưa xe của tôi tới {to} ({san}) để kiểm soát cột {file}.',
        'coach.rookFileChallenge': 'Bạn sẽ tranh giành cột này thế nào?',
        'coach.playOpening': 'Tôi đi {san} trong {name}.',
        'coach.developN': 'Phát triển mã của tôi tới {to} ({san}) để tranh giành các ô quan trọng.',
        'coach.developB': 'Phát triển tượng của tôi tới {to} ({san}) để kiểm soát các đường chéo quan trọng.',
        'coach.pushCenter': 'Đẩy tốt tới {to} ({san}) để tranh giành trung tâm.',
        'coach.advancePawn': 'Tiến tốt tới {to} ({san}) để điều chỉnh cấu trúc tốt.',
        'coach.pawnStruct': 'Mỗi nước tốt đều tạo thay đổi cấu trúc lâu dài. Kế hoạch của bạn là gì?',
        'coach.mobilizeRook': 'Điều xe của tôi tới {to} ({san}) để tăng tính chủ động.',
        'coach.mobilizeRookChallenge': 'Xe chủ động cần cột mở. Bạn sẽ tranh giành hay hạn chế tầm hoạt động của nó thế nào?',
        'coach.centralizeQ': 'Tập trung Hậu ở {to} ({san}) để thống trị các ô và đường chéo quan trọng.',
        'coach.centralizeQChallenge': 'Hậu ở trung tâm kiểm soát rất lớn. Bạn sẽ đối phó ra sao?',
        'coach.repositionQ': 'Chuyển Hậu của tôi tới {to} ({san}) để tăng sức ép.',
        'coach.repositionQChallenge': 'Hãy để mắt tới các đường chéo của Hậu tôi. Đâu là hướng phản công an toàn nhất của bạn?',
        'coach.stepKing': 'Đưa vua của tôi tới {to} ({san}) để an toàn hơn.',
        'coach.stepKingChallenge': 'Vị trí vua rất quan trọng. Giờ bạn sẽ tổ chức các quân thế nào?',
        'coach.improveActivity': 'Tôi đi {san} với {piece} để tăng tính chủ động.',
        'coach.entering': 'Bước vào {name}! Hãy xem ai kiểm soát các ô quan trọng.',
        'coach.strategicPlan': 'Kế hoạch chiến lược chính của bạn trong khai cuộc này là gì?',
        'coach.makeMove': ' Hãy đi nước khai cuộc để bắt đầu!',
        'coach.makeMoveFull': 'Hãy đi nước khai cuộc để bắt đầu!',
        'coach.coachFirst': 'Tôi sẽ đi trước. Cho tôi xem bạn có gì nào!',
        'coach.thinkingFallback': 'Đang tính toán các phương án trả lời...',
        'coach.brilliantFallback': 'Nước Thiên tài!',
        'coach.praiseHintFallback': 'Tuyệt! Bạn đã tìm ra với một chút gợi ý!',
        'coach.praiseRevealFallback': 'Thực hiện tốt đòn chiến thuật.',
        'coach.missedSuffix': ' ({best} mới là đòn trừng phạt!)',
        // ---- coach opening commentary ----
        'coach.open.sicilian1': 'Sicilian Defense! Khai cuộc sắc bén với tiềm năng phản công phong phú.',
        'coach.open.sicilian2': 'Bạn sẽ phát triển cánh vua và đối phó tốt e4 của tôi thế nào?',
        'coach.open.french1': 'French Defense! Xây dựng chuỗi tốt trung tâm vững như đá.',
        'coach.open.french2': 'Hãy coi chừng tượng ô trắng! Bạn định kích hoạt nó thế nào?',
        'coach.open.italian1': 'Italian Game! Triển khai quân cổ điển, nhắm vào điểm yếu f7.',
        'coach.open.italian2': 'Bạn có thể vô hiệu hóa tượng của tôi và tranh giành trung tâm không?',
        'coach.open.caro1': 'Caro-Kann! Nổi tiếng với cấu trúc tốt vững và tàn cuộc bền bỉ.',
        'coach.open.caro2': 'Bạn có chuẩn bị đánh vào trung tâm bằng ...d5 không?',
        'coach.open.spanish1': 'Spanish Game! Điều quân chiến lược sâu sắc theo trường phái cổ điển từ nước 3.',
        'coach.open.spanish2': 'Bạn có giữ được phối hợp quân dưới sức ép trung tâm không?',
        'coach.open.queensGambit1': 'Queen\'s Gambit! Cuộc chiến ý chí và không gian trung tâm từ nước 2.',
        'coach.open.queensGambit2': 'Bạn ăn tốt gambit hay giữ vững trung tâm?',
        'coach.open.kingsIndian1': 'King\'s Indian! Bạn nhường không gian để chuẩn bị bão cánh vua.',
        'coach.open.kingsIndian2': 'Bạn định đối phó chuỗi tốt trung tâm của tôi thế nào?',
        'coach.open.scandinavian1': 'Scandinavian! Đòn đánh ngay vào e4 từ nước 1.',
        'coach.open.scandinavian2': 'Phát triển hậu sớm có thể rủi ro. Hãy giữ an toàn cho hậu!',
        // ---- coach game over ----
        'coach.over.base': 'Ván cờ kết thúc!',
        'coach.over.resignedPlayer': 'Bạn đã xin thua. Đừng lo, mỗi ván cờ đều là cơ hội học hỏi!',
        'coach.over.resignedHuấn luyện viên': 'Huấn luyện viên xin thua! Chơi quá xuất sắc!',
        'coach.over.mateLoss': 'Chiếu hết! Ván hay! Đừng lo, mỗi thất bại đều là bài học.',
        'coach.over.mateWin': 'Chiếu hết! Chơi ngoạn mục! Bạn đã thắng ván cờ!',
        'coach.over.stalemate': 'Stalemate! Ván cờ kết thúc với tỷ số hòa.',
        'coach.over.draw': 'Hòa! Một trận chiến quyết liệt từ cả hai bên.',
        'coach.over.hintsUsed': ' Bạn đã dùng {p} gợi ý trong {m} nước.',
        'coach.over.hintOne': 'gợi ý',
        'coach.over.hintsMany': 'gợi ý',
        'coach.over.moveOne': 'nước',
        'coach.over.movesMany': 'nước',
        'coach.over.takeaways': ' Rút kinh nghiệm từ ván này: cẩn thận với {s}.',
        // ---- coach player-move feedback ----
        'coach.calcResp': 'Đang tính toán nước đáp trả...',
        'coach.greatAdjust': 'Điều chỉnh tuyệt vời! Chơi {san} giữ thế cờ của bạn vững chắc và duy trì kiểm soát.',
        'coach.hangRepeat': 'Cẩn thận! Lại một quân bị treo. Hãy quét mọi quân không được bảo vệ trước khi quyết định!',
        'coach.tactRepeat': 'Lại nguy hiểm chiến thuật! Luôn tìm nước bắt buộc của đối thủ trước khi đi.',
        'coach.openRepeat': 'Chú ý nguyên tắc khai cuộc: phát triển đầy đủ và tránh điều quân sớm không cần thiết.',
        'coach.blunderFallback': 'Nước đó có thể là sai lầm. Hãy xem lại thẻ phân tích chiến thuật bên dưới!',
        'coach.bookMove': 'Nước Book! {san} theo đúng lý thuyết khai cuộc chuẩn.',
        'coach.missChance': 'Bạn đã có thứ đặc biệt ở đây: {what}. Muốn đi lại và tìm nó không?',
        'coach.missBrilliant': 'một đòn hy sinh brilliant',
        'coach.missTactic': 'một đòn chiến thuật thắng',
        'coach.dontRush': 'Đừng vội! Cùng nhìn lại thế cờ đó nào.',
        'coach.sacRip': 'Bạn đã thí {piece} ở {sq} để xé toang thế cờ.',
        'coach.spectacular': 'Một đòn hy sinh ngoạn mục.',
        'coach.playable': '{san} chơi được, nhưng hơi thiếu chính xác. Xem bạn đối phó phản công của tôi thế nào.',
        'coach.goodMoveFallback': 'Nước hay với {san}!',
        'coach.err.hanging': 'quân treo (hanging pieces)',
        'coach.err.tactical': 'sơ suất chiến thuật (tactical oversights)',
        'coach.err.fork': 'đòn Fork chiến thuật bị bỏ lỡ',
        'coach.err.king': 'điểm yếu an toàn vua',
        'coach.err.endgame': 'kỹ thuật tàn cuộc',
        'coach.err.opening': 'nguyên tắc khai cuộc'
    };

    // ------------------------------------------------------------------
    // Vietnamese hint templates: motif -> level(1..4) -> tier -> template.
    // Same {placeholders} as the English HINT_TEMPLATES.
    // ------------------------------------------------------------------
    var HINT_VI = {
        fork: {
            1: {
                beginner: 'Gợi ý của Huấn luyện viên: Bạn có thấy đòn Fork không? Hãy nhìn kỹ {piece} của bạn ở {from}.',
                'default': 'Gợi ý của Huấn luyện viên: Có một đòn Fork chiến thuật đang ẩn ở đây. Bạn có thấy {piece} của mình có thể tấn công từ ô nào không?',
                master: 'Gợi ý của Huấn luyện viên: Mẫu hình học: {piece} của bạn đang có đòn tấn công đôi.'
            },
            2: {
                beginner: 'Gợi ý của Huấn luyện viên: {piece} của bạn có thể tấn công {targetNames} cùng lúc!',
                'default': 'Gợi ý của Huấn luyện viên: {piece} của bạn có thể đánh nhiều mục tiêu cùng lúc ({targetNames}).',
                master: 'Gợi ý của Huấn luyện viên: Nhiều mục tiêu của đối phương ({targetNames}) đang dính đòn tấn công đồng thời.'
            },
            3: {
                beginner: 'Gợi ý của Huấn luyện viên: Thử đưa {piece} tới {to}!',
                'default': 'Gợi ý của Huấn luyện viên: Hãy nhìn ô {to}, nơi {piece} của bạn tấn công nhiều quân cùng lúc.',
                master: 'Gợi ý của Huấn luyện viên: Tập trung vào {to} để tạo đòn tấn công đôi không thể chống đỡ.'
            },
            4: {
                beginner: 'Gợi ý của Huấn luyện viên: Chơi {san}! Đòn này Fork {targetNames}!',
                'default': 'Gợi ý của Huấn luyện viên: {san}! Sau đòn Fork này, bạn thắng chất.{followUpText}',
                master: 'Gợi ý của Huấn luyện viên: {san} quyết định, tạo đòn tấn công đôi không thể hóa giải.{followUpText}'
            }
        },
        pin: {
            1: {
                beginner: 'Gợi ý của Huấn luyện viên: Bạn có thấy đòn Pin không? Hãy nhìn {piece} của bạn ở {from}.',
                'default': 'Gợi ý của Huấn luyện viên: Có một đòn Pin bạn có thể khai thác. Hãy nhìn kỹ {piece} của bạn ở {from}.',
                master: 'Gợi ý của Huấn luyện viên: Pin tương đối hay tuyệt đối: hãy tìm đường tấn công của {piece}.'
            },
            2: {
                beginner: 'Gợi ý của Huấn luyện viên: Quân của tôi đang bị Pin trước mục tiêu giá trị! Hãy gây sức ép lên nó.',
                'default': 'Gợi ý của Huấn luyện viên: Một quân đối phương không thể di chuyển tự do nếu không lộ quân giá trị phía sau.',
                master: 'Gợi ý của Huấn luyện viên: Khai thác quân bị Pin dọc theo đường chéo/hàng để làm tê liệt phòng thủ.'
            },
            3: {
                beginner: 'Gợi ý của Huấn luyện viên: Gây sức ép lên quân bị Pin bằng cách đi tới {to}!',
                'default': 'Gợi ý của Huấn luyện viên: Đưa {piece} tới {to} để nhắm và làm tê liệt quân bị Pin.',
                master: 'Gợi ý của Huấn luyện viên: Ép quân bị Pin bằng cách nhắm vào {to}.'
            },
            4: {
                beginner: 'Gợi ý của Huấn luyện viên: Chơi {san}! Đòn Pin thắng chắc!',
                'default': 'Gợi ý của Huấn luyện viên: {san}! Khai thác đòn Pin để thắng chất hoặc làm chủ đường chéo.{followUpText}',
                master: 'Gợi ý của Huấn luyện viên: {san} khai thác đòn Pin với kỹ thuật tối đa.{followUpText}'
            }
        },
        skewer: {
            1: {
                beginner: 'Gợi ý của Huấn luyện viên: Hãy tìm đòn Skewer! {piece} của bạn ở {from} có thể xâu hai quân.',
                'default': 'Gợi ý của Huấn luyện viên: Thế xếp quân cho phép đòn Skewer với {piece} của bạn ở {from}.',
                master: 'Gợi ý của Huấn luyện viên: Hình học đường thẳng: có thể thực hiện Skewer bằng {piece}.'
            },
            2: {
                beginner: 'Gợi ý của Huấn luyện viên: Tấn công quân giá trị hơn ở phía trước để quân phía sau bị bỏ trống!',
                'default': 'Gợi ý của Huấn luyện viên: Xếp các quân đối phương thành hàng: khi quân trước tránh đi, quân sau sẽ mất.',
                master: 'Gợi ý của Huấn luyện viên: Xâu các quân đối phương dọc theo cột, hàng hoặc đường chéo mở.'
            },
            3: {
                beginner: 'Gợi ý của Huấn luyện viên: Nhắm {piece} của bạn vào {to}!',
                'default': 'Gợi ý của Huấn luyện viên: Đưa {piece} tới {to} để xâu các quân đang xếp hàng.',
                master: 'Gợi ý của Huấn luyện viên: {to} tạo tia Skewer xuyên phá.'
            },
            4: {
                beginner: 'Gợi ý của Huấn luyện viên: Chơi {san}! Đòn Skewer thắng chất!',
                'default': 'Gợi ý của Huấn luyện viên: {san}! Quân trước buộc phải tránh, bỏ lại quân phía sau.{followUpText}',
                master: 'Gợi ý của Huấn luyện viên: {san} xâu các quân một cách quyết định.{followUpText}'
            }
        },
        discovered: {
            1: {
                beginner: 'Gợi ý của Huấn luyện viên: Điều gì xảy ra nếu {piece} của bạn ở {from} tránh đường?',
                'default': 'Gợi ý của Huấn luyện viên: Có một đòn tấn công mở (Discovered Attack) đang chờ! Hãy nhìn {piece} ở {from}.',
                master: 'Gợi ý của Huấn luyện viên: Rời {from} sẽ mở đòn tấn công mở.'
            },
            2: {
                beginner: 'Gợi ý của Huấn luyện viên: Di chuyển {piece} sẽ mở đòn tấn công bất ngờ vào {targetNames} của tôi!',
                'default': 'Gợi ý của Huấn luyện viên: Di chuyển {piece} sẽ mở đường tấn công trực tiếp từ quân hàng sau vào {targetNames}.',
                master: 'Gợi ý của Huấn luyện viên: Di chuyển quân trước sẽ lộ đòn tấn công che giấu vào {targetNames}.'
            },
            3: {
                beginner: 'Gợi ý của Huấn luyện viên: Hãy nhìn nước đưa {piece} tới {to} để lộ đòn tấn công!',
                'default': 'Gợi ý của Huấn luyện viên: Chuyển {piece} tới {to}, mở đường tấn công kèm tempo.',
                master: 'Gợi ý của Huấn luyện viên: {to} mở đòn tấn công mở với hiệu quả chiến thuật tối đa.'
            },
            4: {
                beginner: 'Gợi ý của Huấn luyện viên: Chơi {san}! Nước này mở đòn tấn công mở!',
                'default': 'Gợi ý của Huấn luyện viên: {san}! Mở đòn tấn công để thắng chất hoặc giành thế chủ động quyết định.{followUpText}',
                master: 'Gợi ý của Huấn luyện viên: {san} mở đòn tấn công mở một cách gọn gàng.{followUpText}'
            }
        },
        hanging: {
            1: {
                beginner: 'Gợi ý của Huấn luyện viên: Có quân nào của tôi không được bảo vệ không? Hãy nhìn {piece} của bạn ở {from}.',
                'default': 'Gợi ý của Huấn luyện viên: Bạn đang có một nước bắt quân chiến thuật! Hãy nhìn {piece} ở {from}.',
                master: 'Gợi ý của Huấn luyện viên: Sơ suất chiến thuật: có quân không được bảo vệ cho {piece} của bạn.'
            },
            2: {
                beginner: 'Gợi ý của Huấn luyện viên: Đếm quân bảo vệ của tôi — hãy nhìn kỹ quân lỏng của tôi ở {to}!',
                'default': 'Gợi ý của Huấn luyện viên: Quân đối phương ở {to} không được bảo vệ hoặc bảo vệ không đủ.',
                master: 'Gợi ý của Huấn luyện viên: Đánh giá đổi quân (SEE) ủng hộ việc bắt ở {to}.'
            },
            3: {
                beginner: 'Gợi ý của Huấn luyện viên: {piece} của bạn có thể bắt ở {to} ngay bây giờ!',
                'default': 'Gợi ý của Huấn luyện viên: Nhắm vào {to} — bắt ở đó thắng chất gọn mà không bị phòng thủ đầy đủ.',
                master: 'Gợi ý của Huấn luyện viên: Bắt ở {to} để thu quân không được bảo vệ.'
            },
            4: {
                beginner: 'Gợi ý của Huấn luyện viên: Chơi {san}! Lấy quân miễn phí!',
                'default': 'Gợi ý của Huấn luyện viên: {san}! Bắt ở {to} thắng chất an toàn.{followUpText}',
                master: 'Gợi ý của Huấn luyện viên: {san} lấy quân lỏng, chuyển hóa ưu thế.{followUpText}'
            }
        },
        mateThreat: {
            1: {
                beginner: 'Gợi ý của Huấn luyện viên: Vua của tôi trông thật trống trải! Hãy nhìn {piece} của bạn ở {from}.',
                'default': 'Gợi ý của Huấn luyện viên: Có đòn chiếu hết hoặc tấn công chiếu hết! Tập trung vào {piece} ở {from}.',
                master: 'Gợi ý của Huấn luyện viên: Lưới chiếu hết: hãy tính biến chiếu hết bắt buộc bắt đầu bằng {piece}.'
            },
            2: {
                beginner: 'Gợi ý của Huấn luyện viên: Bạn có thể bẫy vua của tôi bằng chiếu hoặc đe dọa hết không thể cản!',
                'default': 'Gợi ý của Huấn luyện viên: Vua đối phương thiếu ô thoát. Hãy tìm biến bắt buộc nhất.',
                master: 'Gợi ý của Huấn luyện viên: An toàn vua bị phá vỡ nghiêm trọng; hãy tính hành lang chiếu hết.'
            },
            3: {
                beginner: 'Gợi ý của Huấn luyện viên: Nhắm {piece} vào {to} để siết lưới!',
                'default': 'Gợi ý của Huấn luyện viên: Đưa {piece} tới {to} để tạo sức ép chiếu hết không thể cản.',
                master: 'Gợi ý của Huấn luyện viên: {to} thực hiện đe dọa chiếu hết quyết định.'
            },
            4: {
                beginner: 'Gợi ý của Huấn luyện viên: Chơi {san}! Nước này dẫn tới chiếu hết!',
                'default': 'Gợi ý của Huấn luyện viên: {san}! Đòn chí mạng khóa chặt chiếu hết hoặc chiến thắng quyết định.{followUpText}',
                master: 'Gợi ý của Huấn luyện viên: {san} kết thúc đòn tấn công bằng chiếu hết không thể tránh.{followUpText}'
            }
        },
        check: {
            1: {
                beginner: 'Gợi ý của Huấn luyện viên: Bạn đang có nước chiếu chủ động! Hãy nhìn {piece} ở {from}.',
                'default': 'Gợi ý của Huấn luyện viên: Hãy tìm nước chiếu bắt buộc để gây sức ép lên Vua đối phương bằng {piece} ở {from}.',
                master: 'Gợi ý của Huấn luyện viên: Tempo bắt buộc: hãy đánh giá nước chiếu của {piece}.'
            },
            2: {
                beginner: 'Gợi ý của Huấn luyện viên: Chiếu vua buộc tôi phải đáp trả trong khi bạn giữ thế chủ động!',
                'default': 'Gợi ý của Huấn luyện viên: Nước chiếu ở đây hạn chế lựa chọn của đối thủ và giữ tempo chắc chắn.',
                master: 'Gợi ý của Huấn luyện viên: Các nước chiếu liên tiếp trói chặt phòng thủ và dồn vua vào thế yếu.'
            },
            3: {
                beginner: 'Gợi ý của Huấn luyện viên: Hãy nhìn nước chiếu từ {to}!',
                'default': 'Gợi ý của Huấn luyện viên: Điều {piece} tới {to} để chiếu và trói vua.',
                master: 'Gợi ý của Huấn luyện viên: Tiến tới {to} kèm chiếu để kiểm soát thế chủ động.'
            },
            4: {
                beginner: 'Gợi ý của Huấn luyện viên: Chơi {san}! Chiếu!',
                'default': 'Gợi ý của Huấn luyện viên: {san}! Nước chiếu tích cực duy trì thế chủ động mạnh.{followUpText}',
                master: 'Gợi ý của Huấn luyện viên: {san} chiếu với sức ép chiến thuật tối ưu.{followUpText}'
            }
        },
        trapped: {
            1: {
                beginner: 'Gợi ý của Huấn luyện viên: Một quân của tôi hết ô an toàn! Hãy nhìn {piece} của bạn ở {from}.',
                'default': 'Gợi ý của Huấn luyện viên: Bạn có thể bẫy một quân đối phương bằng {piece} ở {from}.',
                master: 'Gợi ý của Huấn luyện viên: Mẫu Domination: có thể cắt toàn bộ ô thoát của quân đối phương.'
            },
            2: {
                beginner: 'Gợi ý của Huấn luyện viên: Một quân đối phương bị vây không còn đường chạy!',
                'default': 'Gợi ý của Huấn luyện viên: Quân đối phương bị hạn chế di chuyển — hãy bẫy và thắng chất.',
                master: 'Gợi ý của Huấn luyện viên: Từ chối ô một cách có hệ thống để bẫy quân mục tiêu.'
            },
            3: {
                beginner: 'Gợi ý của Huấn luyện viên: Đưa {piece} tới {to} để đóng cửa!',
                'default': 'Gợi ý của Huấn luyện viên: Tiến tới {to} để cắt ô rút lui cuối cùng.',
                master: 'Gợi ý của Huấn luyện viên: {to} sập bẫy quân mục tiêu.'
            },
            4: {
                beginner: 'Gợi ý của Huấn luyện viên: Chơi {san}! Quân đó bị bẫy!',
                'default': 'Gợi ý của Huấn luyện viên: {san}! Quân bị bẫy không thể thoát khỏi việc bị bắt.{followUpText}',
                master: 'Gợi ý của Huấn luyện viên: {san} bẫy quân một cách quyết định.{followUpText}'
            }
        },
        positional: {
            1: {
                beginner: 'Gợi ý của Huấn luyện viên: Ở đây không có đòn trực tiếp. Hãy nhìn việc cải thiện {piece} ở {from}.',
                'default': 'Gợi ý của Huấn luyện viên: Chơi vị trí vững: hãy kích hoạt {piece} ở {from}.',
                master: 'Gợi ý của Huấn luyện viên: Phối hợp vị trí: hãy tìm ô lý tưởng cho {piece}.'
            },
            2: {
                beginner: 'Gợi ý của Huấn luyện viên: {piece} của bạn ở {from} chưa làm được gì nhiều. Hãy tìm ô chủ động hơn!',
                'default': 'Gợi ý của Huấn luyện viên: Hãy kiểm soát trung tâm, cột mở hoặc đồn trú quan trọng bằng {piece}.',
                master: 'Gợi ý của Huấn luyện viên: Tăng cường phối hợp quân và tranh giành điểm yếu cấu trúc.'
            },
            3: {
                beginner: 'Gợi ý của Huấn luyện viên: Hãy cân nhắc đưa {piece} về hướng {to}!',
                'default': 'Gợi ý của Huấn luyện viên: Điều lại {piece} tới {to} để có không gian và tính chủ động tốt hơn.',
                master: 'Gợi ý của Huấn luyện viên: Đặt {piece} ở {to} để thống trị đồn trú quan trọng.'
            },
            4: {
                beginner: 'Gợi ý của Huấn luyện viên: Thử chơi {san}! Nước này cải thiện vị trí quân.',
                'default': 'Gợi ý của Huấn luyện viên: {san}! Nước vị trí hài hòa, cải thiện tính chủ động.{followUpText}',
                master: 'Gợi ý của Huấn luyện viên: {san} tối ưu phối hợp và duy trì kiểm soát chiến lược.{followUpText}'
            }
        },
        sacrifice: {
            1: {
                beginner: 'Gợi ý của Huấn luyện viên: Ở đây có nước táo bạo! Đôi khi hy sinh một quân lại thắng nhiều hơn.',
                'default': 'Gợi ý của Huấn luyện viên: Ở đây có một đòn hy sinh Thiên tài. Bạn có thể thí gì để đột phá?',
                master: 'Gợi ý của Huấn luyện viên: Chất không phải tất cả ở đây: hãy tìm đòn hy sinh mở thế cờ.'
            },
            2: {
                beginner: 'Gợi ý của Huấn luyện viên: Hãy nhìn {piece} của bạn ở {from}. Nó có thể là người hùng của nước này!',
                'default': 'Gợi ý của Huấn luyện viên: {piece} của bạn ở {from} chính là quân để thí.',
                master: 'Gợi ý của Huấn luyện viên: Ứng viên hy sinh là {piece} của bạn ở {from}.'
            },
            3: {
                beginner: 'Gợi ý của Huấn luyện viên: Đưa {piece} tới {to}, dù trông như có thể bị bắt!',
                'default': 'Gợi ý của Huấn luyện viên: Đặt {piece} ở {to}. Đối thủ có thể ăn, nhưng họ sẽ phải trả giá.',
                master: 'Gợi ý của Huấn luyện viên: {to} là ô quan trọng cho đòn hy sinh.'
            },
            4: {
                beginner: 'Gợi ý của Huấn luyện viên: Chơi {san}! Đó là một đòn hy sinh Thiên tài.',
                'default': 'Gợi ý của Huấn luyện viên: {san}!! Một đòn hy sinh Thiên tài.{followUpText}',
                master: 'Gợi ý của Huấn luyện viên: {san}!! Đòn hy sinh hoàn toàn đúng.{followUpText}'
            }
        }
    };

    // ------------------------------------------------------------------
    // Vietnamese persona voices: persona -> key -> string | string[].
    // Missing keys fall back to the English voice arrays in coach-manager.
    // ------------------------------------------------------------------
    var VOICE_VI = {
        pikaru: {
            intro: 'Chào! Sẵn sàng chơi chưa? Tôi mê tốt thông và lối chơi nhanh — bắt đầu nào!',
            thinking: 'Đang tính đòn phản công nhanh nhất...',
            brilliantNudge: ['Ở đây có một nước pháo hoa. Tìm ra nó!'],
            playerBrilliant: ['Wow, nước Thiên tài! Pháo hoa trên bàn cờ!'],
            playerBlunder: [
                'Khoan, dừng lại! Nhìn bàn cờ xem — tôi nghĩ đó có thể là Blunder!',
                'Cẩn thận! Nước đó để lộ thế cờ của bạn!'
            ],
            playerGoodMove: [
                'Nước hay! Rất gọn và chủ động.',
                'Phản công mạnh! Bạn đang giữ sức ép tốt.'
            ],
            playerBestMove: [
                'Bùm! Nước hay nhất trên bàn! Chủ động tối đa!',
                'Tầm nhìn chiến thuật sắc bén! Bạn đã tìm ra nước mạnh nhất của engine.'
            ],
            missedBlunder: [
                'Phù! Bạn đã tha cho tôi. Lẽ ra bạn có thể trừng phạt tôi ở đó!',
                'Tôi thoát nạn! Bạn đã bỏ lỡ đòn chiến thuật.'
            ],
            praiseSpotBlunder: [
                'Bùm! Bạn đã nhìn thấu sơ suất của tôi. Bắt đẹp lắm!',
                'Mắt tinh đấy! Bạn đã trừng phạt sai lầm của tôi ngay lập tức.'
            ],
            praiseWithHint: [
                'Tuyệt! Bạn đã tìm ra chỉ với một gợi ý nhỏ!',
                'Làm tốt lắm, biến gợi ý thành chiến thắng!'
            ],
            praiseAfterReveal: [
                'Đó chính là nước đi! Thực hiện chiến thuật tốt.',
                'Đúng đáp án. Hãy ghi nhớ mẫu này!'
            ],
            challengeBlunderBait: [
                'Ôi, tôi có bất cẩn không? Hãy nhìn kỹ các quân của tôi...',
                'Báo động chiến thuật! Có lẽ tôi đã quá đà. Bạn có thấy tôi bỏ lỡ gì không?'
            ],
            challengeOnlyMove: [
                'Ở đó chỉ có một lựa chọn, bạn làm gì nào?',
                'Gần như bị ép! Cho tôi xem câu trả lời của bạn.'
            ],
            challengeGeneric: [
                'Tới lượt bạn! Kế hoạch của bạn ở đây là gì?',
                'Xem bạn đáp trả thế nào nào!'
            ],
            challengeDevelopment: [
                'Bạn vẫn còn quân ngủ quên ở hàng cuối. Bạn có thể điều động chúng không?',
                'Đưa các quân nhẹ vào cuộc là ưu tiên hàng đầu. Bạn sẽ phát triển quân nào tiếp?'
            ],
            challengeCenter: [
                'Ai sẽ làm chủ trung tâm? Hãy tìm nước khẳng định không gian.',
                'Trung tâm đang bỏ ngỏ! Bạn có chiếm được không?'
            ],
            challengePinDefense: [
                'Một quân của bạn đang bị Pin. Bạn có thể phá Pin hoặc bảo vệ nó không?',
                'Đừng để đòn Pin của tôi làm tê liệt thế cờ!'
            ],
            challengeEndgame: [
                'Trong tàn cuộc, vua chủ động đáng giá cả một quân nhẹ. Hãy tiến lên!',
                'Tàn cuộc cần chính xác. Hãy tính trước vài nước rồi quyết định!'
            ],
            genericMove: [
                'Củng cố thế cờ và giữ kiểm soát.',
                'Cải thiện phối hợp từng bước.'
            ],
            baitByMotif: {
                fork: [
                    'Hmm, các quân của tôi trông hơi đông. Có gì nổi bật không?',
                    'Báo động rắc rối đôi! Kiểm tra xem có gì xếp hàng chống lại quân tôi.'
                ],
                pin: [
                    'Tôi vừa đóng băng quân mình trên đường đó? Nhìn kỹ xem!',
                    'Quân đó không thể đi nếu không có thảm họa phía sau... thấy không?'
                ],
                skewer: [
                    'Một đường mở xuyên qua các quân nặng của tôi. Tìm đòn chiến thuật!',
                    'Nhìn dọc các cột và đường chéo — tôi vừa xếp quân tệ phải không?'
                ],
                discovered: [
                    'Coi chừng đòn tấn công bất ngờ nếu một quân của bạn di chuyển!',
                    'Tôi có quên mất quân đang nấp sau quân bạn không? Hãy mở mối đe dọa!'
                ],
                hanging: [
                    'Ôi, tôi có để quân nào không được bảo vệ không? Nhìn xem!',
                    'Kiểm tra số quân bảo vệ — nước vừa rồi của tôi có mất chất không?'
                ],
                kingSafety: [
                    'Vua của tôi thấy hơi lạnh sau nước đó. Bạn có tìm ra đòn tấn công không?',
                    'Điểm yếu cánh vua! Bạn có thể phá vỡ vua của tôi không?'
                ],
                mateThreat: [
                    'Có phải lưới chiếu hết đang hình thành? Tìm đòn tấn công quyết định!',
                    'Vùng nguy hiểm! Bạn có thể đẩy tới chiếu hết không?'
                ]
            }
        },
        mcmarty: {
            intro: 'Chào bạn! Tôi cũng đang học cờ! Cùng chơi một ván thật vui nhé!',
            thinking: 'Đang nghĩ... để chắc là tôi không treo xe!',
            brilliantNudge: ['Ôi, tôi cảm thấy có gì đó *táo bạo* cho bạn ở đây...'],
            playerBrilliant: ['Thiên tài! Bạn là thiên tài! Tôi không thấy nước đó!'],
            playerBlunder: [
                'Ôi không, bạn ơi! Nhìn bàn cờ xem — nước đó nguy hiểm lắm!',
                'Từ từ! Quân đó của bạn đang bị ngắm đấy!'
            ],
            playerGoodMove: [
                'Nước hay lắm bạn! Rất gọn gàng.',
                'Tốt lắm! Cứ thế phát huy nhé.'
            ],
            playerBestMove: [
                'Tuyệt vời! Đúng nước mạnh nhất luôn!',
                'Bạn tìm ra nước hay nhất! Giỏi quá!'
            ],
            missedBlunder: [
                'Phù! Bạn tha cho tôi rồi. Lẽ ra bạn đã có cơ hội!',
                'May quá! Bạn bỏ lỡ đòn đó mất rồi.'
            ],
            praiseSpotBlunder: [
                'Đúng rồi! Bạn bắt được lỗi của tôi! Giỏi lắm!',
                'Mắt bạn tinh thật! Trừng phạt ngay sai lầm của tôi.'
            ],
            praiseWithHint: [
                'Hay! Có gợi ý là bạn làm được ngay!',
                'Tốt lắm, bạn đã tận dụng gợi ý rất tốt!'
            ],
            praiseAfterReveal: [
                'Đó chính là đáp án! Ghi nhớ mẫu này nhé.',
                'Đúng nước đó! Bạn thực hiện gọn lắm.'
            ],
            challengeBlunderBait: [
                'Hmm, tôi có vừa đi sai không? Bạn kiểm tra giúp tôi nhé...',
                'Có lẽ tôi hơi ẩu. Bạn có thấy gì không?'
            ],
            challengeOnlyMove: [
                'Chỉ còn một nước thôi, bạn đi xem nào?',
                'Bị ép rồi! Bạn đáp trả thế nào đây?'
            ],
            challengeGeneric: [
                'Tới lượt bạn! Bạn định làm gì nào?',
                'Cùng xem bạn xử lý thế nào nhé!'
            ],
            challengeDevelopment: [
                'Vẫn còn quân chưa ra trận. Bạn phát triển quân nào tiếp nào?',
                'Đưa các quân vào cuộc trước đã nhé!'
            ],
            challengeCenter: [
                'Trung tâm đang trống! Bạn chiếm nhé?',
                'Cùng xem ai làm chủ trung tâm nào!'
            ],
            challengePinDefense: [
                'Quân của bạn đang bị Pin. Thử tìm cách gỡ nhé?',
                'Đừng để bị Pin làm khó nhé!'
            ],
            challengeEndgame: [
                'Tàn cuộc thì vua phải tiến lên nhé, rất quan trọng đấy!',
                'Đi cẩn thận từng nước trong tàn cuộc nhé!'
            ],
            genericMove: [
                'Tôi củng cố thế cờ một chút.',
                'Sắp xếp lại các quân cho gọn.'
            ],
            baitByMotif: {
                fork: [
                    'Các quân của tôi đứng gần nhau quá. Bạn thấy gì không?',
                    'Có gì đó xếp hàng kìa! Kiểm tra xem nào.'
                ],
                pin: [
                    'Quân của tôi có bị kẹt không nhỉ? Nhìn kỹ giúp tôi!',
                    'Quân này đi là nguy to... bạn thấy không?'
                ],
                skewer: [
                    'Nhìn dọc hàng xem, quân tôi xếp thẳng hàng kìa!',
                    'Có đường nào xuyên qua quân tôi không nhỉ?'
                ],
                discovered: [
                    'Cẩn thận đòn bất ngờ nếu bạn di chuyển một quân nhé!',
                    'Có quân nào đang nấp sau không? Tìm xem!'
                ],
                hanging: [
                    'Tôi có để quên quân nào không được bảo vệ không?',
                    'Đếm thử xem — tôi có vừa mất chất không?'
                ],
                kingSafety: [
                    'Vua tôi thấy hơi lạnh. Bạn tấn công thử xem?',
                    'Cánh vua của tôi yếu quá! Bạn phá được không?'
                ],
                mateThreat: [
                    'Có phải sắp chiếu hết không? Tìm xem nào!',
                    'Nguy hiểm quá! Bạn chiếu hết được không?'
                ]
            }
        },
        sophy: {
            intro: 'Chào mừng đến với lớp học! Cùng tập trung vào phối hợp quân, phòng thủ vững và ý thức chiến thuật nhé.',
            thinking: 'Đang đánh giá động lực thế cờ và an toàn vua...',
            brilliantNudge: ['Ở đây có một ý tưởng Thiên tài; hãy nghĩ xem bạn có thể thí gì.'],
            playerBrilliant: ['Một đòn hy sinh Thiên tài! Chơi bậc thầy!'],
            playerBlunder: [
                'Dừng lại một chút! Hãy xem lại bàn cờ — nước đó có thể là Blunder.',
                'Cẩn thận! Nước đó làm suy yếu cấu trúc thế cờ của bạn.'
            ],
            playerGoodMove: [
                'Nước tốt! Rất có nguyên tắc.',
                'Xử lý hay! Phối hợp quân của bạn đang tốt lên.'
            ],
            playerBestMove: [
                'Xuất sắc! Đúng nước mạnh nhất của thế cờ.',
                'Chính xác! Bạn đã tìm ra nước tối ưu.'
            ],
            missedBlunder: [
                'Bạn đã bỏ qua cơ hội trừng phạt. Hãy xem lại nhé!',
                'Tiếc quá! Ở đó có một đòn chiến thuật mà bạn bỏ lỡ.'
            ],
            praiseSpotBlunder: [
                'Rất tốt! Bạn đã phát hiện và khai thác sai lầm.',
                'Quan sát tuyệt vời! Đúng tinh thần bài học.'
            ],
            praiseWithHint: [
                'Tốt! Bạn đã áp dụng gợi ý rất chuẩn.',
                'Làm đúng rồi! Hãy ghi nhớ quá trình suy nghĩ này.'
            ],
            praiseAfterReveal: [
                'Chính xác! Hãy lưu mẫu này vào trí nhớ.',
                'Đúng đáp án. Thực hiện sạch sẽ lắm.'
            ],
            challengeBlunderBait: [
                'Hmm, có lẽ tôi vừa mắc lỗi nguyên tắc. Bạn kiểm tra xem?',
                'Hãy xem như bài tập: nước vừa rồi của tôi có vấn đề gì?'
            ],
            challengeOnlyMove: [
                'Ở đây chỉ có một nước đúng. Bạn tìm xem?',
                'Thế cờ bị ép — đâu là câu trả lời duy nhất?'
            ],
            challengeGeneric: [
                'Tới lượt bạn! Hãy trình bày kế hoạch của mình.',
                'Bạn sẽ xử lý thế cờ này thế nào?'
            ],
            challengeDevelopment: [
                'Hãy nhớ nguyên tắc: phát triển quân trước khi tấn công.',
                'Quân nào của bạn còn chưa phát triển? Ưu tiên chúng nhé.'
            ],
            challengeCenter: [
                'Ai kiểm soát trung tâm sẽ kiểm soát ván cờ. Bạn tính sao?',
                'Trung tâm là bài học hôm nay. Hãy chiếm không gian!'
            ],
            challengePinDefense: [
                'Quân bị Pin cần được gỡ hoặc bảo vệ. Bạn có mấy cách?',
                'Bài học về Pin: đừng để quân bị trói mà không có kế hoạch.'
            ],
            challengeEndgame: [
                'Trong tàn cuộc, vua chủ động trị giá cả một quân nhẹ.',
                'Tàn cuộc đòi hỏi tính toán chính xác. Hãy tính kỹ!'
            ],
            genericMove: [
                'Cải thiện phối hợp và giữ cấu trúc.',
                'Từng bước củng cố thế cờ.'
            ],
            baitByMotif: {
                fork: [
                    'Bài tập nhỏ: có đòn tấn công đôi nào chống lại quân tôi không?',
                    'Quan sát các quân tôi: hai mục tiêu nào đang bị ngắm cùng lúc?'
                ],
                pin: [
                    'Đường nào đang trói quân của tôi? Tìm xem!',
                    'Quân này không thể đi mà không lộ mục tiêu phía sau.'
                ],
                skewer: [
                    'Các quân nặng của tôi đang xếp hàng. Đòn Skewer ở đâu?',
                    'Hãy nhìn dọc cột và đường chéo — bài học về Skewer đấy!'
                ],
                discovered: [
                    'Nếu một quân bạn di chuyển, đòn nào sẽ mở ra?',
                    'Đừng quên quân đang bị che — hãy mở đòn tấn công!'
                ],
                hanging: [
                    'Kiểm tra số lượng bảo vệ: tôi có để quân nào treo không?',
                    'Đếm quân tấn công và phòng thủ — có mất chất không?'
                ],
                kingSafety: [
                    'An toàn vua là bài học quan trọng. Vua tôi có yếu không?',
                    'Hãy đánh giá nơi trú ẩn của vua tôi và tìm đòn đánh.'
                ],
                mateThreat: [
                    'Lưới chiếu hết có đang hình thành? Hãy tính biến bắt buộc!',
                    'Bài tập chiếu hết: đâu là đòn quyết định?'
                ]
            }
        },
        mangoose: {
            intro: 'Chơi thôi. Đi gọn gàng, đừng vội, xem hiểu biết tàn cuộc của bạn tới đâu.',
            thinking: 'Đang tính... nhìn sâu vào tàn cuộc.',
            brilliantNudge: ['Có một nước mạnh ở đây. Người chơi giỏi sẽ tìm ra đòn hy sinh.'],
            playerBrilliant: ['Đòn hy sinh chuẩn xác. Rất ấn tượng.'],
            playerBlunder: [
                'Dừng. Nhìn lại bàn cờ — đó là Blunder.',
                'Nước yếu. Ô đó đang bị kiểm soát hoàn toàn.'
            ],
            playerGoodMove: [
                'Nước tốt. Gọn và chính xác.',
                'Xử lý ổn. Tiếp tục giữ áp lực.'
            ],
            playerBestMove: [
                'Nước mạnh nhất. Tính toán rất sâu.',
                'Chính xác tuyệt đối. Tốt.'
            ],
            missedBlunder: [
                'Bạn đã bỏ lỡ đòn trừng phạt. Đáng tiếc.',
                'Tôi thoát. Lẽ ra bạn phải thấy đòn đó.'
            ],
            praiseSpotBlunder: [
                'Bắt được. Quan sát tốt.',
                'Trừng phạt đúng lúc. Làm tốt.'
            ],
            praiseWithHint: [
                'Được. Bạn đã dùng gợi ý hiệu quả.',
                'Tốt. Tiếp tục.'
            ],
            praiseAfterReveal: [
                'Đúng nước. Ghi nhớ mẫu này.',
                'Thực hiện chuẩn.'
            ],
            challengeBlunderBait: [
                'Tôi có vừa sai không? Nhìn kỹ xem...',
                'Có lẽ tôi đã quá tay. Bạn có thấy không?'
            ],
            challengeOnlyMove: [
                'Chỉ một nước. Đi đi.',
                'Bị ép. Trả lời xem nào.'
            ],
            challengeGeneric: [
                'Tới lượt bạn. Kế hoạch là gì?',
                'Đi đi.'
            ],
            challengeDevelopment: [
                'Quân hàng cuối còn ngủ. Điều động đi.',
                'Phát triển hết quân trước đã.'
            ],
            challengeCenter: [
                'Trung tâm quyết định tất cả. Bạn tính sao?',
                'Chiếm trung tâm đi.'
            ],
            challengePinDefense: [
                'Quân bị Pin. Gỡ hoặc bảo vệ.',
                'Đừng để Pin trói thế cờ.'
            ],
            challengeEndgame: [
                'Tàn cuộc: vua phải chủ động. Tiến lên.',
                'Chính xác từng nước. Tính kỹ.'
            ],
            genericMove: [
                'Củng cố thế cờ.',
                'Cải thiện phối hợp.'
            ],
            baitByMotif: {
                fork: [
                    'Quân tôi đứng đông. Có gì không?',
                    'Kiểm tra đòn đôi xem.'
                ],
                pin: [
                    'Quân tôi có bị trói không? Nhìn xem.',
                    'Đường này có vấn đề. Thấy không?'
                ],
                skewer: [
                    'Quân nặng của tôi xếp hàng. Tìm đi.',
                    'Nhìn dọc cột và chéo.'
                ],
                discovered: [
                    'Di chuyển một quân sẽ mở đòn gì?',
                    'Đừng quên quân đang nấp.'
                ],
                hanging: [
                    'Tôi có treo quân nào không?',
                    'Đếm bảo vệ xem.'
                ],
                kingSafety: [
                    'Vua tôi yếu. Tấn công đi.',
                    'Tìm đòn đánh vào vua xem.'
                ],
                mateThreat: [
                    'Lưới chiếu hết? Tìm đòn quyết định.',
                    'Chiếu hết được không?'
                ]
            }
        }
    };

    // ------------------------------------------------------------------
    // API
    // ------------------------------------------------------------------
    function getLang() {
        return current;
    }

    function setLang(lang) {
        if (SUPPORTED.indexOf(lang) === -1) return current;
        current = lang;
        try {
            if (typeof document !== 'undefined' && document.documentElement) {
                document.documentElement.setAttribute('lang', lang);
            }
        } catch (e) { /* headless / Node: ignore */ }
        return current;
    }

    function interpolate(template, params) {
        if (!params || typeof template !== 'string') return template;
        return template.replace(/\{(\w+)\}/g, function(match, name) {
            return (params[name] !== undefined && params[name] !== null)
                ? String(params[name])
                : match;
        });
    }

    /**
     * Translate a flat key. Returns the VI sentence when the effective
     * language is 'vi' and the key exists, otherwise the supplied English
     * fallback (byte-identical EN). lang overrides the global current.
     */
    function t(key, fallback, params, lang) {
        const useLang = (lang === 'vi' || lang === 'en') ? lang : current;
        if (useLang === 'vi' && Object.prototype.hasOwnProperty.call(VI, key)) {
            return interpolate(VI[key], params);
        }
        if (typeof fallback === 'string' && params) return interpolate(fallback, params);
        return (typeof fallback === 'string') ? fallback : key;
    }

    /** True when a VI override exists for a flat key. */
    function hasVi(key) {
        return Object.prototype.hasOwnProperty.call(VI, key);
    }

    /**
     * Persona voice lookup with EN fallback.
     * personaId: 'pikaru' | 'mcmarty' | 'sophy' | 'mangoose'
     * key: voice key ('intro', 'playerBlunder', ...), sub for baitByMotif motif.
     * enValue: the English string/array at the call site (fallback).
     * lang: explicit language; defaults to the global current language.
     */
    function voice(personaId, key, enValue, sub, lang) {
        const useLang = (lang === 'vi' || lang === 'en') ? lang : current;
        if (useLang === 'vi' && VOICE_VI[personaId]) {
            var table = VOICE_VI[personaId];
            if (sub && table[key] && table[key][sub]) return table[key][sub];
            if (!sub && table[key] !== undefined) return table[key];
        }
        return enValue;
    }

    /**
     * Hint template lookup with EN fallback.
     * lang: explicit language; defaults to the global current language.
     */
    function hintTemplate(motif, level, tier, enTemplate, lang) {
        const useLang = (lang === 'vi' || lang === 'en') ? lang : current;
        if (useLang === 'vi' && HINT_VI[motif] && HINT_VI[motif][level] &&
            HINT_VI[motif][level][tier]) {
            return HINT_VI[motif][level][tier];
        }
        return enTemplate;
    }

    /**
     * Apply static translations to [data-i18n] (+ title/placeholder/aria
     * variants). English originals are cached on first pass so switching back
     * to 'en' restores byte-identical text (existing assertions unaffected).
     */
    function applyStatic(rootEl) {
        var rootNode = rootEl;
        try {
            if (!rootNode) {
                if (typeof document === 'undefined') return 0;
                rootNode = document;
            }
            var count = 0;
            var applyAttr = function(el, attrName, dataName, prop) {
                var key = el.getAttribute(dataName);
                if (!key) return;
                var cacheKey = '__i18n_' + prop;
                if (el[cacheKey] === undefined) {
                    el[cacheKey] = (prop === 'text') ? el.textContent : el.getAttribute(attrName);
                }
                if (current === 'vi' && hasVi(key)) {
                    var val = VI[key];
                    if (prop === 'text') el.textContent = val;
                    else el.setAttribute(attrName, val);
                } else {
                    var orig = el[cacheKey];
                    if (orig === null || orig === undefined) return;
                    if (prop === 'text') el.textContent = orig;
                    else el.setAttribute(attrName, orig);
                }
                count++;
            };
            var all = rootNode.querySelectorAll
                ? rootNode.querySelectorAll('[data-i18n],[data-i18n-title],[data-i18n-aria],[data-i18n-placeholder]')
                : [];
            for (var i = 0; i < all.length; i++) {
                var el = all[i];
                applyAttr(el, null, 'data-i18n', 'text');
                applyAttr(el, 'title', 'data-i18n-title', 'title');
                applyAttr(el, 'aria-label', 'data-i18n-aria', 'aria');
                applyAttr(el, 'placeholder', 'data-i18n-placeholder', 'placeholder');
            }
            try {
                if (typeof document !== 'undefined' && document.documentElement) {
                    document.documentElement.setAttribute('lang', current);
                }
            } catch (e) { /* ignore */ }
            return count;
        } catch (e) {
            return 0;
        }
    }

    return {
        SUPPORTED: SUPPORTED,
        getLang: getLang,
        setLang: setLang,
        t: t,
        hasVi: hasVi,
        voice: voice,
        hintTemplate: hintTemplate,
        applyStatic: applyStatic,
        VI: VI,
        HINT_VI: HINT_VI,
        VOICE_VI: VOICE_VI
    };
}));
