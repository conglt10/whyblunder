# Chẩn đoán Nước đi: Kế hoạch Cải thiện Tính Linh hoạt & Khả năng Thích ứng

Phạm vi: luồng chẩn đoán nước đi được dùng chung bởi **Chế độ Phân tích (Analysis mode)** (`js/browser-analyzer.js`) và
**Chế độ Huấn luyện (Coach mode)** (`js/coach-manager.js`), cùng với các module mà cả hai chế độ đều dựa vào
(`js/chess-evaluator.js`, `js/situation-recognizer.js`, `js/opening-detector.js`).

Mục tiêu: giúp việc chẩn đoán *thích ứng* với thế cờ (giai đoạn ván cờ, độ sắc bén, mức độ nghiêm trọng, độ tin cậy của
tìm kiếm) và với *người chơi* (persona của huấn luyện viên / các chủ đề lỗi lặp lại), thay vì
chạy một thang hình học cố định duy nhất và một bộ ngưỡng cố định duy nhất cho mọi trường hợp.

---

## 1. Cách thức hoạt động hiện nay

```
                       Analysis mode                     Coach mode
                  (browser-analyzer.js)              (coach-manager.js)
                           |                                 |
      pool.evaluate(fenBefore, depth 18, MultiPV 3)   _evaluatePosition(fen, 12, 3)
      pool.evaluate(fenAfter,  depth 16, MultiPV 1)   _evaluatePosition(fen, 12, 1)
                           |                                 |
                           +---------> ChessEvaluator.cpToWinProb
                           +---------> ChessEvaluator.classifyMove(wpBefore, wpAfter, {playedIsBest, isBook})
                           |                                 |
              SituationRecognizer.explainBlunderOrMistake  /  .explainGoodMove
                           |
               { explanation, tags[], flaw, missedChance, betterLine }
```

`explainBlunderOrMistake` (`js/situation-recognizer.js:1283`) là một thang ưu tiên cố định dài ~500 dòng:
**Phần A** (A1…A17) tìm một lý do khiến nước đi của engine tốt hơn, **Phần B** (B1…B3)
tìm một điểm yếu trong nước đi đã chơi / một hiệu quả của đòn phản công (refutation), **Phần C** chọn một trong sáu
mẫu câu. Bộ phát hiện (detector) nào khớp đầu tiên sẽ thắng; không có xếp hạng hay đối chiếu chéo.

---

## 2. Các phát hiện

### F1 — Hai pipeline độc lập đưa ra kết luận khác nhau
`browser-analyzer.js:560-635` và `coach-manager.js:925-1125` mỗi nơi triển khai lại
*đánh giá → phân loại → giải thích* với các tham số khác nhau:

| | Phân tích (Analysis) | Huấn luyện (Coach) |
|---|---|---|
| tìm kiếm trước nước đi | depth 18, MultiPV 3 | depth 12, MultiPV 3 |
| tìm kiếm sau nước đi | depth 16, MultiPV 1 | depth 12, MultiPV 1 |
| quét MultiPV để tìm nước đã chơi | các line 2–3 | các line 1–5 |
| cửa sổ book | ply ≤ 16 | ply ≤ 12 |
| chọn nước tốt nhất | `bestMove` thô | `_findVerifiedBestMove` (được tái kiểm chứng, MultiPV 5) |

Cùng một thế cờ khi xem lại ở hai chế độ có thể nhận hai kết luận khác nhau. Chế độ Huấn luyện còn
đi tắt: `coach-manager.js:919` gán nhãn nước đi là `best` với **không hề đánh giá** mỗi khi nó
khớp với `lastSuggestedMove` hoặc best đã kiểm chứng trong cache — vì vậy một gợi ý cũ có thể tẩy trắng một nước đi
vốn không còn là tốt nhất nữa.

### F2 — Các phân loại đã ghi trong tài liệu không bao giờ tới được
`classifyMove` chấp nhận `isSacrifice`, `isOnlyMove`, `mateMissed`
(`js/chess-evaluator.js:86-88`), nhưng **không nơi gọi nào truyền chúng vào**
(`browser-analyzer.js:567`, `coach-manager.js:1002` đều chỉ truyền `{playedIsBest, isBook}`).
Hệ quả: `brilliant` và `great` là mã chết (dead code) dù README vẫn mô tả chúng, và
`missed win` chỉ có thể đạt được qua heuristic xác suất thắng, không bao giờ từ một
nước chiếu hết ép buộc bị bỏ lỡ mà engine thực sự tìm ra.

### F3 — Ngưỡng tuyệt đối và mù ngữ cảnh
Các dải mất mát WP 0.04 / 0.10 / 0.22 được áp dụng giống hệt nhau cho một trung cuộc sắc như dao cạo và một
tàn cuộc xe hòa khô, cho một tìm kiếm huấn luyện ở depth 12 và một tìm kiếm phân tích ở depth 18, và cho một
đối thủ 800-Elo lẫn đối thủ 2200-Elo. Không có gì tính đến độ sắc bén của thế cờ (có bao nhiêu nước đáp trả gần
tốt nhất), giai đoạn ván cờ, hay độ tin cậy của tìm kiếm.

### F4 — Thang giải thích ai khớp trước thắng, không có độ tin cậy
`situation-recognizer.js:1345-1590` đi từ A1→A17 / B1→B3 và dừng ở điểm khớp đầu tiên. Không có
chấm điểm ứng viên, không có giá trị độ tin cậy (confidence), không đối chiếu bằng chứng với delta
đánh giá của chính engine, và không có cách kết hợp hai sự thật. Một đòn xiên (fork) hình học *ngẫu nhiên* do nước đi của engine
tạo ra xếp trên điểm mấu chốt thực sự của nước đi, và lời tường thuật khẳng định nó với độ chắc chắn tuyệt đối.

### F5 — Bộ phát hiện chỉ dựa vào hình học; không có SEE
`isPieceSafe` (`situation-recognizer.js:228`) xấp xỉ độ an toàn đổi quân bằng
"giá trị quân tấn công nhỏ nhất" + "số quân tấn công so với số quân phòng thủ". Không có đánh giá đổi quân tĩnh (static exchange evaluation)
thực sự, không xử lý x-ray/battery (quân ẩn sau), và quân phòng thủ đang bị ghim vẫn được tính là phòng thủ.
`detectHangingPieceBlunder` (`:863`) gắn cờ bất kỳ quân nào vừa di chuyển mà bị quân rẻ hơn tấn công, kể cả
khi nước đổi quân là đúng đắn hay nước đi là thí quân có chủ ý, và không bao giờ kiểm tra xem đòn
phản công của engine có thực sự ăn quân đó hay không.

### F6 — Ngôn ngữ không co giãn theo mức độ nghiêm trọng hay độ phân tán phương án
Các mẫu câu Phần C (`situation-recognizer.js:1738-1770`) nói *"tốt hơn nhiều"* cho cả một
inaccuracy 0.05 lẫn một nước bỏ lỡ chiếu hết trong 1 nước. Dữ liệu MultiPV vốn đã lấy về nhưng không bao giờ được dùng để
phân biệt *"có vài nước đều giữ được; X là một trong số đó"* với *"X là nước duy nhất"*.

### F7 — `explainGoodMove` mù với engine
Cả hai nơi gọi (`browser-analyzer.js:620`, `coach-manager.js:1108`) chỉ truyền bàn cờ + SAN +
`isBest` — không điểm số, không PV, không độ phân tán MultiPV, không mối đe dọa đã hóa giải. Vì vậy lời khen luôn là
mẫu chung chung về vị trí ("phát triển Mã ra ô tích cực") ngay cả khi nước đi là
phòng thủ duy nhất giữ hòa. Khoảng 80% số ply trong một ván đi qua nhánh này, nên đây là nơi tập trung hầu hết
cảm nhận "kém thông minh".

### F8 — Không nhận biết giai đoạn ván cờ
Không hề có hàm trợ giúp `gamePhase()` ở đâu trong codebase. Các lý do "phát triển quân", "kiểm soát trung tâm" và
nhập thành có thể kích hoạt trong tàn cuộc xe trơ trụi. Từ vựng tàn cuộc (hoạt động của Vua, đối Vua (opposition),
xe sau tốt thông, đua tốt, pháo đài (fortress)) vắng mặt ngoại trừ một
`detectPassedPawn` sơ khai.

### F9 — Kiến thức khai cuộc nhỏ và dễ vỡ
`js/opening-detector.js` chứa 37 biến cố định mã cứng; `isBookMove` là so khớp tiền tố, nên với hầu hết
ván cờ thực tế nó ngừng kích hoạt từ ply 4–10 bất kể trần ply-16.
`detectOpeningPrincipleViolation` chỉ có đúng hai luật và gán nhãn sai các nước rút lui và
điều chuyển hợp lệ thành "đi cùng một quân hai lần".

### F10 — Chế độ Huấn luyện không có mô hình người học
Huấn luyện viên không bao giờ tổng hợp các chủ đề lỗi lặp lại xuyên suốt một ván.
`_getContextualChallenge` (`coach-manager.js:1779`) rẽ nhánh theo hai sự thật bàn cờ mã cứng;
`generateHint` (`:1825`) rơi về `legalMoves[0]` và — tại `:1846-1854` — thông báo
*"Bạn đang có một đòn ăn quân chiến thuật!"* cho **bất kỳ** nước ăn T/M/X/H nào mà không kiểm tra
xem nước ăn đó có mất chất hay không. Persona chỉ ảnh hưởng đến Elo của engine và câu thoại: một persona 800-Elo
và một persona 2200-Elo cho ra nội dung chẩn đoán giống nhau từng byte.

### F11 — Ngân sách tìm kiếm cố định
Các depth được mã cứng khắp nơi (`browser-analyzer.js` 18/16; `coach-manager.js:931,996,1320,1472,1517`
ở 12/8/10). Không thích ứng theo độ phức tạp hay thời gian, và quan trọng là không tìm kiếm lại khi một
phân loại rơi gần biên ngưỡng — đúng trường hợp mà thêm hai ply nữa sẽ lật ngược
kết luận.

### F12 — Test harness không chạy được như khi check-in
`test_browser_modules.js:483` mã cứng `/home/king/code/whyblunder/index.html`, nên
`node test_browser_modules.js` thất bại trên mọi máy khác. Chỉ cần vá một đường dẫn đó, toàn bộ
suite hiện đều xanh — đó là baseline hồi quy của chúng ta.

---

## 3. Kế hoạch

Sáu giai đoạn, sắp xếp sao cho mỗi giai đoạn lên độc lập và giữ suite xanh. Giai đoạn 1–2 mang lại
hiệu quả hành vi lớn nhất; giai đoạn 0 mở đường cho mọi thứ.

### Phase 0 — Làm cho chẩn đoán có thể kiểm thử được *(nhỏ, làm trước)*
1. Sửa `test_browser_modules.js:483` thành `path.join(__dirname, 'index.html')`.
2. Thêm `test_diagnostics.js`: một bảng ~30 fixture FEN + nước đã chơi + *tag kỳ vọng / phân loại
   kỳ vọng* bao phủ quân treo, thí quân đúng, nước duy nhất, chiếu hết bị bỏ lỡ,
   prophylaxis yên lặng, và chuyển hóa tàn cuộc — với **output engine giả lập** (đối tượng
   `{lines: {...}}` viết tay), để corpus chạy trong Node không cần Stockfish và không chập chờn.
3. Thêm bộ assertion "kiểm toán diễn đạt": không lời giải thích nào được chứa mệnh đề lặp đôi, `${bestReason}` rỗng,
   hay từ "phát triển quân (development)" khi `gamePhase === 'endgame'`.

*Điều kiện xong:* `node test_browser_modules.js && node test_diagnostics.js` xanh từ một bản clone sạch.

### Phase 1 — Tách lõi `MoveDiagnostics` dùng chung *(sửa F1, F2)*
Module mới `js/move-diagnostics.js` (UMD, cùng mẫu với các module khác), cung cấp:

```js
MoveDiagnostics.diagnose({
  fenBefore, fenAfter, playedMove,
  engine: {                       // bằng chứng engine, không phụ thuộc chế độ
    bestUci, lines,               // các line MultiPV keyed 1..N
    postLines,                    // tìm kiếm sau nước đi (đòn phản công)
    depthPre, depthPost
  },
  context: { ply, sanHistory, phase, playerElo, mode: 'analysis' | 'coach' }
}) -> {
  classification: { uiQuality, detailedQuality, wpLoss, confidence },
  narrative:      { explanation, flaw, missedChance, betterLine, tags[] },
  evidence:       [ { kind, claim, confidence, source } ]   // để gỡ lỗi / hover UI
}
```

- `browser-analyzer.js:560-635` và `coach-manager.js:925-1125` được thu gọn thành *thu thập bằng chứng engine*
  và gọi `diagnose`; mọi phân loại và tường thuật nằm ở một nơi.
- Suy ra và truyền các tùy chọn hiện đang chết: `isOnlyMove` (từ độ phân tán MultiPV — line 1 hơn
  line 2 với cách biệt lớn, hoặc chỉ có một nước hợp lệ), `isSacrifice` (chất bị thí trong PV
  mà engine vẫn chấm tốt — tái dùng `detectMaterialGainInPv` theo chiều đảo), `mateMissed`
  (`lines[1].mate > 0` trong khi điểm của nước đã chơi không có mate). Việc này hồi sinh `brilliant`,
  `great` và `missed win` thực sự.
- Xóa lối tắt `wasSuggested → 'best'` không qua đánh giá của Coach (`coach-manager.js:919`); giữ lại
  giọng khen ("bạn đã chơi đúng như tôi gợi ý"), nhưng để phân loại thực sự đến từ
  `diagnose`, với `wasSuggested` được truyền qua như `context` chỉ để diễn đạt.

*Rủi ro:* đây là refactor lớn nhất. Giảm thiểu bằng cách đưa `move-diagnostics.js` lên trước như một
wrapper mỏng ủy thác cho các hàm hiện có (di chuyển thuần túy, không đổi hành vi, suite vẫn
xanh), rồi di chuyển logic vào dần theo từng giai đoạn.

### Phase 2 — Tường thuật xếp hạng theo bằng chứng thay vì thang cố định *(sửa F4, F6, F7)*
Tái cấu trúc `explainBlunderOrMistake` / `explainGoodMove` thành ba giai đoạn tách biệt:

1. **Thu thập (Collect)** — chạy *tất cả* các detector, mỗi cái trả về
   `{ kind, subject, square, text, weight, confidence }` thay vì cái khớp đầu tiên thắng.
   Thân các A1…A17 / B1…B3 hiện có trở thành các hàm detector; thang ladder biến mất.
2. **Xếp hạng & đối chiếu (Rank & corroborate)** — chấm mỗi ứng viên bằng
   `weight × confidence × engineAgreement`, trong đó `engineAgreement` kiểm tra khẳng định với các con số
   của chính engine: khẳng định "ăn được Hậu" phải được hậu thuẫn bởi dao động cp cỡ quân Hậu;
   khẳng định "quân treo" phải khớp với ô ăn quân thực tế của đòn phản công. Các khẳng định
   mâu thuẫn với engine bị hạ hạng, không in ra. Các khẳng định sống sót mang độ tin cậy để UI dùng
   (và để chọn cách nói hedging: *"có vẻ như"* so với *"để mất"*).
3. **Soạn câu (Compose)** — ngân hàng mẫu câu keyed theo `(dải nghiêm trọng, giai đoạn, độ tin cậy, loại khẳng định)`:
   - mức nghiêm trọng co giãn động từ: `0.04` → *"chính xác hơn một chút"*, `0.22+` → *"thắng hẳn"*,
     bỏ lỡ mate → *"kết thúc ván cờ ngay lập tức"*;
   - độ phân tán MultiPV co giãn cách diễn đạt: nếu các line 1–3 trong ~0.3 tốt, nói
     *"một trong vài lựa chọn tốt"*; nếu line 1 áp đảo, nói *"nước duy nhất"*;
   - xoay vòng nhỏ các mẫu tương đương cho mỗi bucket, seed bằng `ply` để output vẫn
     đơn định (repo vốn coi trọng tính đơn định — xem commit `87a25df`) mà không đọc
     giống hệt nhau trên mọi nước đi.

Trao cho `explainGoodMove` cùng đầu vào bằng chứng như nhánh blunder (điểm số, PV, độ phân tán MultiPV,
mối đe dọa của đối thủ đã hóa giải, `isOnlyMove`, `isSacrifice`). Riêng việc này đã đổi giọng của
~80% số ply hiện đang nhận boilerplate.

### Phase 3 — Phân loại thích ứng *(sửa F3)*
Trong `chess-evaluator.js`, thay các dải cố định bằng hàm ngưỡng:

```js
function classificationThresholds({ phase, sharpness, wpBefore, depth, playerElo }) -> { inaccuracy, mistake, blunder }
```

- **độ sắc bén (sharpness)** = độ chênh giữa line 1 MultiPV và các line 2/3 (đã có sẵn). Thế cờ sắc
  → dải *chặt hơn* (lỗi nhỏ thực sự có ý nghĩa); thế cờ yên → dải *rộng hơn*.
- **giai đoạn (phase)** — tàn cuộc phạt lỗi WP nhỏ nặng hơn (kỹ thuật chuyển hóa), khai cuộc nhẹ hơn.
- **thế cờ đã ngã ngũ** — tổng quát hóa cơ chế bảo vệ `wpBefore >= 0.95` hiện có thành giảm chấn mượt
  `wpLoss` khi `wpBefore` tiến về 0 hoặc 1, thay vì vách đứng ở 0.95/0.90.
- **độ tin cậy tìm kiếm** — nới rộng dải khi `depth` thấp (Coach ở 12) để Coach ngừng gọi
  nhiễu tìm kiếm nông là "mistake".
- **playerElo** (persona của Coach) — giữ kết luận trung thực nhưng để ngưỡng *báo cáo* dịch chuyển:
  một phiên 800-level không nên gắn cờ các inaccuracy 0.04 chút nào.

Giữ các hằng số cũ làm nhánh mặc định để các test hiện có vẫn xanh; thích ứng là
opt-in theo từng nơi gọi.

### Phase 4 — Detector thông minh hơn, nhận biết giai đoạn *(sửa F5, F8, F9)*
- **SEE thực sự.** Thêm `staticExchangeEval(board, square, side)` vào `situation-recognizer.js`
  (đổi quân lần lượt theo quân ít giá trị nhất, quét lại x-ray/battery sau mỗi nước ăn và
  loại trừ quân phòng thủ bị ghim). Viết lại `isPieceSafe` và `detectHangingPieceBlunder` dựa trên nó.
  Việc này diệt dương tính giả phổ biến nhất: "để Mã treo" trên một nước đổi quân hoàn toàn đúng
  hay một nước thí quân thực sự.
- **Đối chiếu đòn phản công.** `detectHangingPieceBlunder` chỉ nên khẳng định quân treo khi
  đòn phản công của engine thực sự ăn nó (hoặc ăn nó trong PV trong vòng 2-3 ply).
- **Hàm trợ giúp `gamePhase(fen)`** (chất + Hậu + số quân đã phát triển) export từ
  `chess-evaluator.js`; chặn từ vựng khai cuộc (phát triển quân, nhập thành, bộ đôi trung tâm) chỉ cho
  khai cuộc/trung cuộc, và thêm các detector tàn cuộc: hoạt động của Vua/đối Vua (opposition), xe sau tốt thông,
  đếm tempo đua tốt, tượng sai màu hòa, gợi ý pháo đài (fortress).
- **Lớp khai cuộc.** Chuyển book khỏi literal 37-entry sang bảng compact keyed theo thế cờ
  (key kiểu Zobrist-ish từ trường board của FEN) để nhận diện book sống sót qua chuyển nước (transposition); mở rộng
  `detectOpeningPrincipleViolation` (đếm quân chưa phát triển, nước tốt biên sớm, tốt trung tâm bị chặn,
  nhập thành muộn khi Vua lộ trên cột mở) và — quan trọng — bắt mỗi luật kiểm tra
  xem engine có đồng tình trước khi báo cáo hay không.

### Phase 5 — Khả năng thích ứng của Coach *(sửa F10)*
- **Mô hình người học** trên `CoachManager`: `this.errorProfile = { hangingPiece: n, missedFork: n,
  kingSafety: n, endgameTechnique: n, openingPrinciple: n }`, tăng dần từ `tags` mà
  `diagnose` trả về. Dùng nó để:
  - leo thang diễn đạt khi lặp lại chủ đề ("đây là quân thứ ba để hở không bảo vệ trong ván này — hãy quét
    mọi quân không được bảo vệ trước khi quyết định");
  - thiên vị `_getContextualChallenge` và `_findInstructiveBlunder` về chủ đề yếu nhất của người học
    thay vì hai kiểm tra bàn cờ mã cứng;
  - dẫn dắt tóm tắt cuối ván về 2 chủ đề lặp lại hàng đầu.
- **Chẩn đoán co giãn theo persona**: một núm *độ sâu* giải thích cho mỗi persona — persona 800-Elo
  nhận một ý cụ thể bằng lời đơn giản, persona 2200-Elo nhận biến thể và
  lập luận vị trí. Cùng bằng chứng, ngân sách soạn khác nhau (Phase 2 biến việc này thành
  tham số, không phải rẽ nhánh).
- **Sửa `generateHint`**: cho các nước ăn ứng viên chạy qua SEE trước khi gọi chúng là "đòn ăn quân
  chiến thuật"; xếp hạng gợi ý theo bằng chứng Phase-2 cho thế cờ *hiện tại* thay vì rơi
  về `legalMoves[0]`; giữ gợi ý thấp hơn đáp án một nấc (nêu ô mục tiêu hay
  motif, không nêu nước đi) và co giãn nấc đó theo persona.

### Phase 6 — Ngân sách tìm kiếm thích ứng *(sửa F11)*
- Thay các depth mã cứng bằng `searchBudget({ phase, sharpness, mode, elapsedMs })`.
- **Tìm kiếm lại ở biên ngưỡng**: khi `|wpLoss − threshold| < ε`, chạy lại thế cờ sâu hơn hai ply
  trước khi chốt kết luận. Việc này rẻ (chỉ kích hoạt trên một phần nhỏ số ply) và
  loại bỏ hầu hết phàn nàn "sao lại gọi đó là mistake?".
- Trong Coach, lập ngân sách theo *đồng hồ treo tường* thay vì depth để thiết bị chậm xuống cấp gracefully thay vì
  kẹt lượt đi.

---

## 4. Thứ tự triển khai gợi ý

| Bước | Giai đoạn | Quy mô | Vì sao ở đây |
|---|---|---|---|
| 1 | 0 | XS | Sửa đường dẫn test + corpus fixture; không có nó thì không kiểm chứng được gì khác |
| 2 | 1 (chỉ wrapper) | S | `move-diagnostics.js` ủy thác cho code hiện tại; không đổi hành vi |
| 3 | 1 (phần còn lại) | L | Cả hai mode gọi `diagnose`; hồi sinh `isOnlyMove`/`isSacrifice`/`mateMissed`; bỏ lối tắt của Coach |
| 4 | 4 (SEE) | M | SEE + đối chiếu đòn phản công loại bỏ dương tính giả ồn ào nhất |
| 5 | 2 | L | Xếp hạng bằng chứng + diễn đạt co giãn theo nghiêm trọng/giai đoạn; `explainGoodMove` hiểu engine |
| 6 | 3 | M | Ngưỡng thích ứng, giờ khi phân loại đã có một mái nhà chung |
| 7 | 4 (giai đoạn + khai cuộc) | M | Chặn theo giai đoạn và lớp khai cuộc rộng hơn |
| 8 | 5 | M | Mô hình người học của Coach, núm độ sâu theo persona, sửa gợi ý |
| 9 | 6 | S | Ngân sách thích ứng + tìm kiếm lại ở biên |

## 5. Hàng rào bảo vệ

- `node test_browser_modules.js` phải luôn xanh ở mọi bước; `test_diagnostics.js` lớn dần theo
  từng giai đoạn.
- Chẩn đoán phải giữ **tính đơn định** cho một cặp (thế cờ, output engine) cho trước — xoay vòng mẫu câu
  seed bằng ply, không bao giờ bằng `Math.random()`.
- Không thêm dependency runtime mới và không thêm build step: mọi module giữ UMD và tải được cả từ
  `index.html` lẫn từ Node.
- Hợp đồng output mà UI dùng (`move.analysis.{explanation, flaw, missed_chance,
  better_line}`, `move.tags`, `move.detailed_quality` — xem `index.html:5085-5190`, `:6509`,
  `:6539`) phải tiếp tục hoạt động; các trường mới (`confidence`, `evidence`) chỉ được thêm vào.

---

## 6. Trạng thái Triển khai (Tất cả các Giai đoạn Đã Hoàn thành)

| Giai đoạn | Cột mốc | Trạng thái | Kết quả chính & Bằng chứng |
|---|---|---|---|
| **Phase 0** | Test Harness & Regression Corpus | **Hoàn thành** | Đường dẫn test di động, `test_diagnostics.js` (39 fixture, nước đi hợp lệ đã kiểm chứng), kiểm toán diễn đạt |
| **Phase 1** | Lõi `MoveDiagnostics.diagnose()` dùng chung | **Hoàn thành** | Điểm vào hợp nhất `js/move-diagnostics.js`, suy ra `isOnlyMove`/`isSacrifice`/`mateMissed`, xóa lối tắt Coach cũ |
| **Phase 2** | Lõi tường thuật xếp hạng theo bằng chứng | **Hoàn thành** | Pipeline 3 giai đoạn (Thu thập $\to$ Xếp hạng & Đối chiếu $\to$ Soạn câu), kiểm tra engine agreement, co giãn cụm từ theo nghiêm trọng/độ phân tán, `explainGoodMove` hiểu engine |
| **Phase 3** | Tích hợp phân loại thích ứng | **Hoàn thành** | `ChessEvaluator.classificationThresholds`, chỉnh theo giai đoạn/độ sắc bén/Elo, giảm chấn mượt cho thế cờ đã ngã ngũ, bật trong cả chế độ phân tích và huấn luyện |
| **Phase 4** | Detector thông minh hơn, nhận biết giai đoạn | **Hoàn thành** | Đánh giá đổi quân tĩnh (Static Exchange Evaluation) (`staticExchangeEval` với đổi quân/x-ray), đối chiếu đòn phản công, hàm trợ giúp `gamePhase(fen)`, detector tàn cuộc (Tarrasch xe sau tốt thông, đối Vua (opposition)), bảng book chuyển nước keyed theo thế cờ (`BOOK_POSITION_MAP`), mở rộng kiểm tra vi phạm nguyên tắc khai cuộc |
| **Phase 5** | Khả năng thích ứng & núm độ sâu theo persona của Coach | **Hoàn thành** | Mô hình người học của Coach (theo dõi `errorProfile` các chủ đề lặp lại), câu leo thang, gợi ý motif/ô cờ có kiểm chứng SEE, núm độ sâu giải thích co giãn theo persona (`mcmarty` súc tích, `sophy` hướng dẫn, `pikaru` năng động, `mangoose` sâu), blunder instructive thiên vị theo chủ đề |
| **Phase 6** | Ngân sách tìm kiếm thích ứng & tìm kiếm lại ở biên | **Hoàn thành** | `MoveDiagnostics.searchBudget({ phase, sharpness, mode, elapsedMs })`, xuống cấp theo đồng hồ treo tường trong Coach, tìm kiếm lại sâu hơn 2-ply ở biên ngưỡng $\pm 0.015$ trong `browser-analyzer.js` |
