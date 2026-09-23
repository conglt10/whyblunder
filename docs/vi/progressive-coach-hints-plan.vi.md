# Gợi ý tiến bộ của Coach & Bẫy theo Motif — Kế hoạch

## 1. Hiện trạng

Tất cả nằm trong `js/coach-manager.js` trừ khi có ghi chú khác.

| Khu vực | Hành vi hiện tại | Vấn đề |
|---|---|---|
| Thông báo bẫy (`_generateCoachBubbles`, ~L1790) | Luôn là `"Wait, take a close look at the board! " + pickRandom(challengeBlunderBait)` | Cùng một câu chung chung cho mọi bẫy, dù `_findInstructiveBlunder` đã biết motif (chủ đề chiến thuật) (`type: 'hanging' \| 'fork' \| 'pin' \| 'kingSafety'`). |
| Phát hiện bẫy (`_findInstructiveBlunder`, ~L1471) | Kiểm tra quân treo (hanging piece), đòn đôi (fork), ghim (pin), vua lộ trên PV 2–5 | Chưa có xiên (skewer), đòn mở (discovered attack), đe dọa chiếu hết (mate threat) hay quân bị nhốt (trapped piece), dù `SituationRecognizer` đã có sẵn `detectSkewer` và `detectDiscoveredAttack`. Đối tượng challenge cũng không lưu các ô quan trọng (quân tấn công, các ô mục tiêu). |
| Gợi ý (`generateHint`, ~L2061) | Không trạng thái (stateless). Trả về kết quả khớp đầu tiên trong một chuỗi cố định: challenge đang chờ → nước bắt quân có SEE dương tính → gợi ý hoàn nước (takeback) → *bất kỳ* nước chiếu nào → đòn fork đầu tiên tìm được → nước tốt nhất đã cache → nước phát triển trung tâm → `legalMoves[0]` | Nhấn lại vẫn ra cùng một câu chữ. Không có leo thang và không đếm theo từng nước đi. Gợi ý "chiếu bất kỳ" và "nước hợp lệ đầu tiên" thường sai hoặc gây hiểu lầm. Gợi ý cho challenge làm nổi bật quân của **coach** (`pendingChallenge.move.to`), chứ không phải quân mà người chơi nên đi. |
| UI gợi ý (`index.html`, handler `#btnCoachHint` ~L8957) | Ghi chữ vào bong bóng thoại, làm nổi bật ô trong 3 giây | Không có chỉ báo cấp độ gợi ý và không có mũi tên. `#arrow-svg` và `drawMoveArrows` đã có sẵn cho chế độ phân tích (analysis mode) và có thể tái sử dụng. |
| Đầu ra bộ phát hiện (`js/situation-recognizer.js`) | `detectFork` → `{attacker, targets:[names]}`, `detectPin` → `{pinned}` | Chỉ trả về **tên** quân, không trả về **ô cờ**, nên coach không thể làm nổi bật "hai quân mà bạn đang dùng đòn đôi tấn công". |

## 2. Mục tiêu

1. **Bẫy theo motif cụ thể.** Khi coach cố tình đi sai, câu thoại gọi tên đòn chiến thuật ở độ khó phù hợp: *"Bạn có thấy đòn đôi (fork) không?"*, *"Ở đây có gì đó bị ghim…"*, *"Ôi, xe của mình đang hở à?"*
2. **Thang gợi ý tiến bộ (hint ladder).** Mỗi lần nhấn gợi ý trên cùng một thế cờ sẽ hé lộ thêm một lớp, từ ý tưởng, đến quân cờ, đến mục tiêu, đến toàn bộ nước đi.
3. **Theo dõi gợi ý (hint tracking).** Đếm số lần nhấn cho mỗi nước đi của người chơi, lưu số đếm vào bản ghi nước đi, và dùng nó trong phản hồi, mô hình người học (learner model) và tổng kết cuối ván.
4. **Nhắc cơ hội (opportunity nudges).** Khi người chơi có đòn chiến thuật thật mà coach *không* cố tình giăng sẵn, coach có thể nhắc khéo trước khi họ đi, có kiểm soát theo persona.

## 3. Thiết kế

### 3.1 Một `HintPlan` cho mỗi thế cờ (ý tưởng cốt lõi)

Thay vì tính toán một chuỗi ký tự một lần duy nhất, hãy xây dựng một **kế hoạch** một lần cho mỗi lượt của người chơi rồi hé lộ dần từng bước.

```js
// Được xây dựng lười (lazily) ở lần nhấn gợi ý đầu tiên (hoặc tính trước sau khi coach đi)
this.hintState = {
  posKey,            // _normalizeFen(fen): kế hoạch chỉ hợp lệ cho thế cờ này
  level: 0,          // số lần nhấn gợi ý cho tới nay trên thế cờ này
  plan: {
    source: 'challenge' | 'opportunity' | 'suggestion' | 'engine' | 'heuristic',
    motif: 'fork' | 'pin' | 'skewer' | 'discovered' | 'hanging' | 'mateThreat'
         | 'check' | 'trapped' | 'positional',
    move: { from, to, san, uci, piece },   // đáp án
    keySquares: { targets: [...], line: [...], weakSquare },  // các ô giải thích motif
    followUp: 'Nxe8' | null                 // nước thứ hai tùy chọn của ý tưởng
  }
};
```

**Cách chọn nước đi đáp án, theo thứ tự ưu tiên:**
1. `pendingChallenge` → `bestSan` / nước phản công (refutation) đầu tiên (đây là bẫy ta đã giăng).
2. `lastSuggestedMove` cho thế cờ này (sau khi hoàn nước).
3. Nước tốt nhất của engine đã lưu trong cache (`_positionEvalCache` → `verifiedBestMove`).
4. Nếu chưa có cache: `await _evaluatePosition(fen, 10, 3)` + `_findVerifiedBestMove` (điều này làm `generateHint` thành async).
5. Không có engine: quay về heuristic hiện tại (bắt quân có SEE dương → quét fork → trung tâm), với `source: 'heuristic'`.

**Cách phân loại motif:** đi thử nước đáp án trên bàn cờ tạm và chạy `detectFork`, `detectPin`, `detectSkewer`, `detectDiscoveredAttack`, `detectHangingPieceBlunder` / bắt quân có SEE, chiếu / chiếu hết trong N nước từ eval, rồi `explainGoodMove` cho các chủ đề thế trận (positional). Bộ phát hiện nào kích hoạt đầu tiên sẽ đặt `motif` và `keySquares`. Mọi khẳng định về hơn chất đều phải được SEE kiểm chứng (bất biến trong AGENTS.md).

Cách này sửa lỗi "chiếu bất kỳ" và "`legalMoves[0]`": gợi ý luôn chỉ về nước tốt *thực sự*.

### 3.2 Thang gợi ý

| Lần nhấn | Hé lộ | Ví dụ (đòn đôi) | Làm nổi bật trên bàn cờ |
|---|---|---|---|
| 1 | **Motif + quân cờ.** Gọi tên đòn chiến thuật và làm nổi bật quân nên đi. | "Ở đây đang ẩn một đòn đôi. Bạn có thấy không?" | `move.from` |
| 2 | **Mục tiêu.** Nói đòn đánh vào đâu. | "Mã của bạn có thể đánh vua và xe của mình cùng lúc." | `from` + `keySquares.targets` |
| 3 | **Điểm đến.** | "Hãy nhìn ô e7, nơi mã tấn công cả hai." | `from`, `to` (cộng thêm targets) |
| 4 | **Lộ toàn bộ + giải thích.** Cho thấy nước đi và nước tiếp theo. | "Nf7+! Sau khi vua của mình chạy, Nxd8 sẽ ăn xe." | mũi tên `from→to`, giữ nguyên cho đến khi người chơi đi |

Cấp 1 làm nổi bật quân cờ ngay lập tức, như bạn đã yêu cầu: lần nhấn đầu tiên cho thấy *quân nào*, các lần nhấn sau hé lộ *vì sao* và *ở đâu*. Nếu bạn muốn lần nhấn đầu tiên chỉ có chữ mà thôi, hãy bỏ phần làm nổi bật ở hàng 1. Đó là thay đổi một dòng.

Mẫu câu cho mỗi motif (trong bảng `HINT_TEMPLATES` mới, một mục cho mỗi motif × cấp độ):

- **fork**: "Bạn có thấy đòn đôi không?" → "Quân {piece} của bạn có thể tấn công {t1} và {t2} cùng lúc." → "Hãy thử {to}." → "{san}! …"
- **pin**: "Bạn có thấy đòn ghim không?" → "Quân {pinned} của mình đang bị kẹt trước quân {behind}." → "Hãy gây áp lực lên nó từ {to}." → …
- **skewer**: "Hãy tìm đòn xiên: xếp hai quân giá trị thẳng hàng." → …
- **discovered**: "Điều gì xảy ra nếu một quân của bạn tránh đường?" → "Quân {piece} của bạn đang chặn quân {slider} của bạn." → …
- **hanging**: "Có quân nào của mình không được bảo vệ không?" → "Hãy đếm quân phòng thủ của quân {piece} của mình trên ô {sq}." → …
- **mateThreat / check**: "Vua của mình trông hơi trống trải…" → "Chiếu trước đã: bạn có những nước chiếu nào?" → …
- **positional**: "Ở đây không có đòn chiến thuật. Hãy cải thiện quân xấu nhất của bạn." → "Quân {piece} của bạn trên ô {from} chưa làm được gì nhiều." → …

Giọng điệu persona: tái sử dụng các nhánh `elo <= 900 / >= 2000` hiện có, chuyển chúng vào bảng mẫu (`beginner | default | master`). Với `mangoose` (2200), cấp 1 có thể bỏ phần làm nổi bật để hợp với tính cách tàn nhẫn.

**Quy tắc đặt lại (reset):** `hintState` đặt lại khi thế cờ thay đổi (người chơi đi, coach đi, hoàn nước, `resetGame`, `setPersona` ở nước 0). Kiểm tra đơn giản là `hintState.posKey !== currentPosKey → xây dựng lại`.

**Trần cấp độ:** ở cấp 4, các lần nhấn tiếp theo lặp lại cấp 4 và giữ mũi tên bật.

### 3.3 Theo dõi gợi ý

- `hintState.level` trở thành `hintsUsed` trên bản ghi nước đi của **người chơi** trong `processPlayerMove`: `record.hintsUsed = (hintState.posKey === posKey) ? hintState.level : 0`.
- Tổng toàn ván: `this.hintStats = { totalPresses, movesWithHints, fullReveals, challengesSolved: { unaided, withHints, missed } }`.
- **Phản hồi thích ứng** (xử lý challenge, ~L868):
  - Giải được với 0 gợi ý: dùng `praiseSpotBlunder` hiện tại.
  - Giải được với 1–2 gợi ý: dùng `voice.praiseWithHint` mới ("Hay lắm, bạn đã tìm ra với một cú huých nhẹ!").
  - Giải được sau khi lộ toàn bộ đáp án: dùng `voice.praiseAfterReveal` mới (trung tính; không khen giả tạo).
- **Mô hình người học:** motif nào cần ít nhất 3 gợi ý sẽ cộng 0,5 vào bộ đếm `errorProfile` liên quan (`missedFork`, `tacticalBlunder`, …), để các bẫy sau tập trung vào nó (`_findInstructiveBlunder` đã đọc `errorProfile`).
- **Tổng kết cuối ván** (`_getGameOverMessage`): "Bạn đã dùng 7 gợi ý trên 4 nước đi. Đòn đôi cần trợ giúp nhiều nhất."
- Đưa `hintsUsed` vào PGN dưới dạng bình luận (`{hints: 2}`) để Chế độ Phân tích (Analysis Mode) hiển thị sau này. Tùy chọn, dành cho giai đoạn 4.

### 3.4 Bẫy theo motif cụ thể ("tạo tình huống")

1. **Lưu thêm vào đối tượng challenge** trong `_findInstructiveBlunder`: `type`, `refutationMove {from,to,san}`, `keySquares` (từ các bộ phát hiện đã mở rộng theo §3.5), `followUp` (`line.pv[2]`).
2. **Thêm motif:** xiên (`detectSkewer`) và đòn mở (`detectDiscoveredAttack`) trên nước phản công, cộng thêm *đe dọa chiếu hết* (`line.mate` từ phía người chơi sau bẫy). Đồng thời xoay vòng motif để cùng một loại không được chọn hai lần liên tiếp (`this.lastBaitType`).
3. **Bảng thoại mới** `voice.baitByMotif[type]` cho mỗi persona trong 4 persona, ví dụ:
   - pikaru fork: "Hmm, quân của mình trông hơi chật chội. Có gì nổi bật với bạn không?"
   - mcmarty hanging: "Ôi… mình có bỏ quên quân nào không có quân canh không? 🙈"
   - sophy pin: "Mình nghĩ một quân của mình không di chuyển tự do được nữa. Bạn có thấy đòn ghim không?"
   - mangoose skewer: "Một đường mở ra. Ít người chơi thấy được."
   Núm độ khó (difficulty dial): persona Elo thấp **gọi tên** motif ("Bạn có thấy đòn đôi không?"), còn persona Elo cao chỉ **gợi ý** ("Có gì đó sai sai trên đường chéo dài"). Thang gợi ý sẽ cung cấp phần còn lại.
4. `_generateCoachBubbles` chọn `baitByMotif[type]` và quay về `challengeBlunderBait` chung chung nếu không có.

### 3.5 Bổ sung cho `SituationRecognizer`

Các bổ sung này chỉ cộng thêm; các trường hiện có giữ nguyên để các hàm gọi hiện tại và test chẩn đoán không bị ảnh hưởng.

- `detectFork` → thêm `targetSquares: [sq1, sq2]`, `attackerSquare`.
- `detectPin` → thêm `pinnedSquare`, `behindSquare`, `line: [...]`.
- `detectSkewer` → thêm `frontSquare`, `backSquare`.
- `detectDiscoveredAttack` → thêm `blockerSquare`, `sliderSquare`, `targetSquare`.
- Helper mới `classifyTacticalMotif(boardBefore, move)`: chạy các bộ phát hiện theo thứ tự và trả về `{ motif, keySquares, description }`. Cả kế hoạch gợi ý và bộ tìm bẫy đều dùng nó.

### 3.6 Nhắc cơ hội (không được yêu cầu)

Sau `computeCoachMove`, nếu **không** có challenge đang chờ, chạy kiểm tra nhẹ trong nền: đánh giá thế cờ của người chơi (MultiPV 2). Nếu `line1` hơn `line2` ít nhất 150cp **và** `classifyTacticalMotif` tìm thấy đòn chiến thuật, đặt `this.pendingOpportunity = plan` và thêm một câu thoại persona vào bong bóng 2:

- mcmarty / sophy: luôn luôn ("Hmm, mình có cảm giác bạn đang có gì đó hay ở đây…")
- pikaru: 50% số lần
- mangoose: không bao giờ (bạn phải tự nhận ra)

Cách này tái sử dụng cùng một `HintPlan`, nên lần nhấn gợi ý tiếp theo sẽ bắt đầu thang với `source: 'opportunity'`. Các cơ hội mà người chơi tự tìm ra không cần trợ giúp sẽ được tính vào tổng kết ("Bạn đã tự tìm ra 3 trên 5 đòn chiến thuật").

### 3.7 UI (`index.html`)

- `generateHint()` trở thành `async`. Handler click `await` nó, hiển thị spinner hoặc "Coach đang nghĩ…" trong khi engine chạy, và bỏ qua click trong thời gian đó (debounce).
- Nút hiển thị cấp độ hiện tại: chấm nhỏ hoặc huy hiệu `Hint 2/4`. Nhãn đổi thành "Hiện đáp án" ở cấp 3→4.
- Làm nổi bật: giữ `.highlight-hint` cho quân cờ, và thêm `.highlight-hint-target` (màu khác) cho `keySquares.targets`. Điểm nổi bật cấp 1–3 **giữ nguyên cho đến khi người chơi đi** thay vì timeout 3 giây như hiện tại, vì bạn không thể nghiên cứu một gợi ý nhấp nháy rồi biến mất.
- Cấp 4: vẽ một mũi tên trên `#arrow-svg` bằng code marker mũi tên hiện có (tách ra `drawSingleArrow(from, to, cls)` từ `drawMoveArrows`). Xóa nó ở nước đi tiếp theo.
- Mục nước đi trong danh sách nước đi của người chơi hiển thị 💡×N nhỏ khi `hintsUsed > 0`.

## 4. Thay đổi API (tóm tắt)

```js
// coach-manager.js
async generateHint()          // giờ là async, leo thang ở mỗi lần gọi; trả về
  → { hintText, highlightSquares, targetSquares, arrow: {from,to}|null,
      level, maxLevel, motif, source }
getHintState()                // { level, maxLevel, motif } cho huy hiệu trên nút
_buildHintPlan(fen)           // async, được cache trong this.hintState
_renderHintLevel(plan, level) // thuần túy (pure): mẫu + persona → chữ/ô cờ
_resetHintState()
this.hintState, this.hintStats, this.pendingOpportunity, this.lastBaitType

// situation-recognizer.js
classifyTacticalMotif(boardBefore, move)
// + các trường ô cờ bổ sung trên detectFork/Pin/Skewer/DiscoveredAttack
```

Hình dạng trả về vẫn tương thích: `hintText` vẫn bắt đầu bằng `"Coach Hint:"` và `highlightSquares` vẫn là mảng, nên các assertion test hiện có vẫn pass sau khi thêm `await`.

## 5. Các giai đoạn triển khai

| Giai đoạn | Phạm vi | Tệp |
|---|---|---|
| **1. Thang + theo dõi (không cần engine)** | `hintState`, quy tắc đặt lại, `_renderHintLevel`, `HINT_TEMPLATES`. Kế hoạch chỉ xây từ challenge / gợi ý / nước tốt nhất đã cache / heuristic. `hintsUsed` trên bản ghi nước đi, `hintStats`, lời khen theo gợi ý. Sửa gợi ý challenge để làm nổi bật quân phản công của người chơi. | coach-manager.js |
| **2. Ô cờ bộ phát hiện + bộ phân loại motif** | Trường ô cờ bổ sung, `classifyTacticalMotif`, `keySquares` trong kế hoạch và challenge. | situation-recognizer.js, coach-manager.js |
| **3. Bẫy theo motif** | Bảng thoại `baitByMotif` cho cả 4 persona, bẫy xiên / đòn mở / chiếu hết, xoay vòng motif. | coach-manager.js |
| **4. Kế hoạch có engine + nhắc cơ hội** | `generateHint` async, eval theo yêu cầu, `pendingOpportunity`, kiểm soát theo persona. | coach-manager.js, index.html |
| **5. Đánh bóng UI** | Huy hiệu cấp độ, lớp làm nổi bật mục tiêu, giữ điểm nổi bật, mũi tên cấp 4, 💡×N trong danh sách nước đi, dòng tổng kết. | index.html |

Mỗi giai đoạn phát hành độc lập và giữ `node test_browser_modules.js && node test_diagnostics.js` xanh.

## 6. Test cần thêm (`test_browser_modules.js`)

1. **Leo thang:** thế fork cố định (ví dụ mã trắng có sẵn ô fork c7). Các lần gọi 1→4 trả về `level` tăng dần. Cấp 1 gọi tên "fork" và làm nổi bật `from`. Cấp 2 bao gồm cả hai ô mục tiêu. Cấp 4 trả về `arrow` bằng nước đáp án.
2. **Đặt lại:** gợi ý hai lần, đi một nước, gợi ý lại → `level === 1`. Tương tự sau `takeback()`.
3. **Theo dõi:** gợi ý ×2 rồi đi → bản ghi người chơi có `hintsUsed === 2`, `hintStats.totalPresses === 2`.
4. **Gợi ý challenge:** với `pendingChallenge`, điểm nổi bật cấp 1 là `from` của quân phản công, **không phải** ô đã đi của coach.
5. **Lời khen theo gợi ý:** giải challenge sau 2 gợi ý → câu chữ lấy từ `praiseWithHint`.
6. **Câu bẫy:** stub `_findInstructiveBlunder` trả về `type: 'pin'` → bong bóng 2 chứa một dòng `baitByMotif.pin`.
7. **Ô cờ bộ phát hiện:** `detectFork(...).targetSquares` bằng cặp ô kỳ vọng. Các fixture chẩn đoán hiện có không đổi.
8. **Chắn SEE:** không bao giờ đưa gợi ý bắt quân có SEE âm (hồi quy cho bất biến trong AGENTS.md).

## 7. Câu hỏi mở

1. **Làm nổi bật ở cấp 1.** Làm nổi bật quân cờ ngay ở lần nhấn đầu tiên (như kế hoạch), hay bắt đầu chỉ có chữ và làm nổi bật từ lần nhấn 2?
2. **Chi phí engine.** Eval theo yêu cầu ~200–500ms ở lần nhấn gợi ý đầu tiên có chấp nhận được không, hay nên tính trước kế hoạch trong nền ngay sau mỗi nước của coach? Tính trước mượt hơn nhưng chạy tìm kiếm engine ngay cả khi người chơi không bao giờ hỏi gợi ý.
3. **Nhắc cơ hội.** Kiểm soát theo persona ở trên đã đúng chưa, hay bạn muốn một cài đặt người dùng ("Mẹo của coach: tắt / chỉ chiến thuật / luôn luôn")?
4. **Phạt.** Gợi ý có nên ảnh hưởng thứ gì hiển thị không (điểm chính xác, chuỗi "không dùng gợi ý"), hay chỉ ảnh hưởng phản hồi và tổng kết?
