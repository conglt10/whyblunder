# WhyBlunder — Làm mới giao diện Mobile: Kế hoạch & Định nghĩa thiết kế

> **Đối tượng:** agent/lập trình viên sẽ triển khai việc này.
> **Trạng thái:** đã triển khai (implemented).
> **Phạm vi:** trình bày trên mobile & tablet nhỏ của `index.html` (chế độ Analysis + chế độ Play Coach).
> Không thay đổi engine, chẩn đoán (diagnostics), logic coach, hay hợp đồng đầu ra công khai (public output contract).

---

## 0. Tóm tắt nhanh (TL;DR)

Bản mobile hiện tại là một layout desktop bị bóp lại. Có sáu thứ hỏng về mặt cấu trúc:

1. Thanh ứng dụng (app bar) trên cùng tràn theo chiều ngang và tự cắt các nút của chính nó.
2. Điều hướng dưới cùng nằm *dưới* thanh công cụ của iOS Safari vì thiếu `viewport-fit=cover`, nên mọi `env(safe-area-inset-*)` trong stylesheet đều về `0`.
3. Chiều cao bàn cờ được suy ra từ một số ma thuật (magic number) chỉnh tay (`calc(100dvh - 315px)`), bị lặp lại theo từng chế độ, và sai mỗi khi khung giao diện (chrome) thay đổi.
4. Vùng nội dung bên dưới bàn cờ (Move Analysis / Coach) là một phần thừa bị bóp méo, cắt xén thay vì là một bề mặt hạng nhất.
5. Vùng chạm (touch target) chỉ 24–28px ở nhiều cụm; cỡ chữ tụt xuống 0.62rem.
6. Bong bóng thoại của coach là một thẻ trắng trong app tối màu, và hành động chính là một bóng đèn xanh lá không nhãn.

Cách sửa là một **vỏ ứng dụng mobile (mobile app shell)** đúng nghĩa: một nguồn sự thật duy nhất cho chiều cao viewport, một thanh ứng dụng gọn, một vùng bàn cờ ổn định, và một **tấm đáy phủ (overlay bottom sheet)** cho mọi nội dung phụ, nằm trên một thanh hành động dưới cùng cố định. Kích thước bàn cờ không còn là số ma thuật mà trở thành giá trị suy ra (derived value).

**Đừng** viết lại `index.html` từ đầu. Chỉ thêm một khối CSS làm mới mobile được phân định rõ ràng và vô hiệu hóa (neutralise) có chọn lọc các rule legacy đã liệt kê. Cả hai bộ test phải giữ xanh.

---

## 1. Các ràng buộc (đọc trước khi chạm vào bất cứ thứ gì)

| Ràng buộc | Hệ quả |
| :--- | :--- |
| Không bước build, không npm, không bundler (`AGENTS.md` §4.1) | Chỉ CSS thuần + JS thuần trong `index.html`. Không PostCSS, không Tailwind, không framework. |
| Bootstrap 5.3 + Bootstrap Icons đã được tải qua CDN | Tái dùng `offcanvas`, `modal`, `dropdown`, `d-none`. Không thêm thư viện UI mới. |
| `test_browser_modules.js` kiểm tra chuỗi ký tự (literal string) trong `index.html` | Mọi ID/class/tên hàm liệt kê ở §9 phải tồn tại. Cái mới phải dùng tên mới. |
| UI một file duy nhất | Mọi CSS mới vào khối `<style>` hiện có; mọi JS mới vào IIFE hiện có. |
| Cả hai bộ test phải đậu | `node test_browser_modules.js && node test_diagnostics.js` → 0 lỗi. |
| Chẩn đoán tất định (deterministic) | Việc này chỉ là trình bày. Không chạm vào các đường chẩn đoán trong `js/*.js`. |

---

## 2. Danh mục vấn đề (lần từ hai ảnh chụp màn hình)

Mỗi hàng là một lỗi (defect), triệu chứng nhìn thấy được, và nguyên nhân gốc kèm tham chiếu file.

### 2.1 Thanh ứng dụng (App bar)

| # | Triệu chứng (ảnh chụp) | Nguyên nhân gốc |
| :-- | :--- | :--- |
| A1 | **Ảnh 2:** "Import Game" bị xén ở mép phải; chú thích phím `← → F Space` lại hiện trên điện thoại. | `switchAppMode()` gọi `analysisKeysLegend.classList.remove('d-none')` (`index.html:7737`), phá vỡ cặp responsive `d-none d-lg-flex` đã khai báo ở `index.html:3087`. Chú thích (legend) sau đó đẩy header vượt quá viewport. |
| A2 | **Ảnh 1:** "Play Coach" bị ngắt xuống hai dòng; thanh bar trông cao hơn 42px đã khai báo. | `.lic-header` (`index.html:95`, ghi đè mobile ở `index.html:2011`) là `display:flex; justify-content:space-between` nhưng **không** có `flex-wrap`, **không** có `min-width:0` trên các con, và `.lic-mode-btn` (`index.html:2228`) không có kích thước mobile. Các phần tử con không co lại được, nên tràn hoặc tự ngắt dòng bên trong. |
| A3 | Năm điều khiển chen nhau trong một thanh 390px: thương hiệu, công tắc 2 tab, hành động chính, chevron thu gọn (+ chú thích). | Không có thứ bậc thông tin cho màn hình nhỏ. Không có gì được hạ cấp xuống menu tràn (overflow menu). |
| A4 | Chevron "ẩn header" và viên `Menu` nổi (`index.html:3066`) là một mẹo không gian thủ công, chỉ vô tình mới phát hiện ra. | Dùng để bù cho A1–A3 thay vì sửa chúng. |

### 2.2 Viewport, vùng an toàn (safe area), khung dưới cùng

| # | Triệu chứng | Nguyên nhân gốc |
| :-- | :--- | :--- |
| B1 | **Ảnh 2:** thanh điều hướng dưới ("MOV…", ⚡, viên capsule) bị thanh URL của Safari che mất một nửa. | Meta viewport ở `index.html:5` thiếu `viewport-fit=cover`. Không có nó, iOS báo `env(safe-area-inset-bottom) = 0`, nên rule safe-area duy nhất trong file (`index.html:1869`) thành vô tác dụng. |
| B2 | Layout giật khi thanh công cụ iOS thu/gãn. | `html, body { height: 100dvh; overflow: hidden !important }` (`index.html:2006-2012`) tạo một vỏ app cố định, nhưng `dvh` và viewport trực quan (visual viewport) lệch nhau trong lúc Safari animate thanh công cụ. Không có gì lắng nghe `visualViewport`. |
| B3 | `user-scalable=no, maximum-scale=1.0` (`index.html:5`). | Lỗi accessibility (WCAG 1.4.4). Không được tắt pinch-zoom trên toàn app. |
| B4 | Thanh điều hướng dưới không có độ nổi/blur, nên quân cờ trông như va vào nó. | `.mobile-nav-toolbar` (`index.html:1862`) là một flex con trong luồng (in-flow) chỉ có viền trên 1px. |

### 2.3 Vùng bàn cờ

| # | Triệu chứng | Nguyên nhân gốc |
| :-- | :--- | :--- |
| C1 | Bàn cờ chiếm ~55% màn hình và đẩy mọi nội dung xuống dưới nếp gấp (fold). | `.board-container-card { max-width: min(100%, calc(100dvh - 315px)) }` (`index.html:2046`) — một số ma thuật, bị lặp cho coach (`315` → `330` → `280` ở `index.html:2341-2347`). Nó không bám theo chiều cao chrome thực tế, và trên điện thoại cao nó luôn ra `100%` (bị ràng buộc theo chiều rộng), nên bàn cờ *luôn* full-width. |
| C2 | Tọa độ file/hạng (`a b c d …`, `1–8`) đè lên quân cờ và khó đọc. | `.notation-322f9` là mặc định của vendor: Helvetica 14px, định vị tuyệt đối trong ô cờ (`css/chessboard-1.0.0.css:39-51`). Không có xử lý mobile. |
| C3 | Thanh đánh giá (eval bar) trông như một thanh tiến trình trắng full-width với con số `0.0` bơ vơ. | `.mobile-eval-bar` (`index.html:1719`): rãnh (track) là `#141311`, phần đầy (fill) là `#f0f0f0` ở 50%, và viên (pill) ghim cứng ở giữa bất kể giá trị. Ở 0.0, nửa trắng + viên ở giữa trông như trạng thái đang tải. Nó còn hiện trước cả khi ván cờ được tải. |
| C4 | Các dải người chơi tốn cả một dòng cho metadata. | `updateCoachPlayerBars()` (`index.html:7397`) ghi `Coach Pikaru (1600) 🇺🇸` + `Speed & Passed Pawn Prodigy` vào một thanh cao tối thiểu 22px (`index.html:2058`). Dòng tagline không có giá trị gì trên điện thoại. |

### 2.4 Vùng nội dung (Analysis + Coach)

| # | Triệu chứng | Nguyên nhân gốc |
| :-- | :--- | :--- |
| D1 | **Ảnh 2:** trạng thái rỗng của Move Analysis bị thanh dưới cắt ngang câu. | `.col-analysis` là `flex:1` trong một vỏ `overflow:hidden` (`index.html:2072-2090`); còn thừa bao nhiêu sau bàn cờ thì được bấy nhiêu, thường chỉ ~90px. |
| D2 | **Ảnh 1:** dải mở đầu, dải nước đi (move ticker) và thanh hành động của panel coach bị đẩy xuống dưới nếp gấp. | Tương tự: cột coach là `flex:1` sau một bàn cờ bị ràng buộc theo chiều rộng (`index.html:2348`). |
| D3 | Mật độ nội dung tụt xuống 0.62–0.78rem với padding 1–3px (`index.html:2107-2165`). | Lấy giá trị density của desktop thu nhỏ lại thay vì dùng thang chữ mobile. |
| D4 | Hai bề mặt nước đi riêng trên một màn hình (dải ticker dưới bàn cờ *và* tấm offcanvas) cộng thêm một cái thứ ba ở chế độ coach. | `#mobileMoveTicker` (`index.html:3310`), `#mobileMovesOffcanvas` (`index.html:3524`), `#coachMobileMoveTicker` (`index.html:3453`) là ba cài đặt cho cùng một ý tưởng. |

### 2.5 Đặc thù chế độ Coach

| # | Triệu chứng | Nguyên nhân gốc |
| :-- | :--- | :--- |
| E1 | Bong bóng thoại trắng trong app tối màu; nó choán hết màn hình. | `.coach-speech-bubble { background:#ffffff; color:#1a1a1a }` (`index.html:2622`) với đuôi CSS trắng (`index.html:2610-2620`). Trần mobile là 88px (`index.html:2408`) nên văn bản coach dài bị cuộn ngầm trong bong bóng mà không có dấu hiệu nào. |
| E2 | Hành động chính là một bóng đèn xanh lá khổng lồ không nhãn. | `.btn-coach-hint { flex-grow:1; border-radius:22px }` (`index.html:2882`) + markup chỉ icon (`index.html:3474`). Không rõ nó làm gì; trọng lượng mất cân đối so với Resign/Takeback 36px. |
| E3 | Resign (cờ) và Takeback nằm ở 36×36 trên mobile (`index.html:2503-2509`). | Dưới mức tối thiểu 44px cho chạm, mà Resign lại là hành động phá hoại (destructive) nhưng không có xác nhận. |

### 2.6 Vùng chạm & cỡ chữ (cả hai chế độ)

| Phần tử | Hiện tại | Yêu cầu |
| :--- | :--- | :--- |
| `.ticker-nav-btn` (`index.html:1775`) | 24 × 28 | Vùng bấm (hit area) ≥ 44 × 44 |
| `.var-nav-btn-group .btn-lic-tool` (`index.html:2208`) | 26 × 26 | Vùng bấm ≥ 44 × 44 |
| `.coach-icon-btn` (`index.html:2557`, mobile `index.html:2372`) | glyph ~20px, không có hộp padding | Vùng bấm ≥ 44 × 44 |
| `.mobile-tool-label` (`index.html:1894`) | 0.6rem (9.6px) | ≥ 11px |
| `.ticker-badge` (`index.html:1849`) | 0.62rem (9.9px) | ≥ 11px |
| `.diag-tag` mobile (`index.html:2135`) | 0.65rem (10.4px) | ≥ 11px |

---

## 3. Nguyên tắc thiết kế

1. **Bàn cờ trước, mọi thứ khác theo nhu cầu.** Bàn cờ là phần tử duy nhất được đảm bảo một vị trí cố định. Mọi bề mặt khác hoặc là dải mỏng hoặc là tấm (sheet) người dùng kéo lên.
2. **Một nguồn sự thật duy nhất cho chiều cao.** Một custom property `--app-h`, được nuôi bởi `visualViewport`, điều khiển toàn bộ vỏ. Không component nào tự tính `100dvh - N`.
3. **Không bao giờ di chuyển bàn cờ.** Các bề mặt phụ *phủ lên trên*; chúng không resize bàn cờ. `resize()` của bàn cờ chỉ chạy khi xoay/thay đổi viewport, không bao giờ chạy khi kéo tấm.
4. **Một bề mặt cho một việc.** Một danh sách nước đi, một kênh coach, một thanh hành động cho mỗi chế độ.
5. **Vùng ngón cái (thumb zone).** Hành động chính nằm ở 25% dưới cùng màn hình. Thanh ứng dụng chỉ dành cho nhận diện và chuyển chế độ.
6. **Sàn 44px / 11px.** Không phần tử tương tác nào dưới vùng bấm 44×44; không chữ nào dưới 11px.
7. **Toàn vẹn theme.** Mọi thứ dùng token `--lic-*` hiện có. Không thẻ trắng.
8. **Tiết lộ dần (progressive disclosure).** Nhìn lướt (Peek) → Nửa (Half) → Đầy (Full), thay vì nhồi nhét.

---

## 4. Điểm ngắt (Breakpoint) & token

### 4.1 Điểm ngắt

```
phone      :  max-width: 599.98px      (mới — mục tiêu chính của công việc này)
tablet     :  600px – 991.98px         (vỏ mobile hiện có, density nới lỏng)
desktop    :  min-width: 992px         (giữ nguyên; không được hồi quy)
landscape  :  max-width: 991.98px and (orientation: landscape) and (max-height: 500px)
```

`d-lg-none` / `d-none d-lg-flex` (Bootstrap `lg` = 992px) vẫn đúng cho ranh giới mobile/desktop. Ranh giới 600px là mới và chỉ sống trong khối revamp.

### 4.2 Token mới

Thêm vào `:root` trong `index.html` (cạnh khối `--lic-*` hiện có, ~`index.html:22-70`):

```css
:root {
  /* --- Hình học vỏ mobile (mặc định phone; ghi đè theo từng breakpoint) --- */
  --app-h:            100svh;   /* JS ghi đè bằng visualViewport.height */
  --safe-top:         env(safe-area-inset-top, 0px);
  --safe-bottom:      env(safe-area-inset-bottom, 0px);
  --safe-left:        env(safe-area-inset-left, 0px);
  --safe-right:       env(safe-area-inset-right, 0px);

  --m-gutter:         8px;    /* lề ngang trang trên phone */
  --m-gap:            6px;    /* khe dọc giữa các vùng vỏ */

  --m-appbar-h:       48px;
  --m-evalstrip-h:    10px;
  --m-playerbar-h:    32px;
  --m-sheet-peek-h:   76px;   /* tấm thu gọn: header + một dòng */
  --m-bottombar-h:    56px;   /* chưa gồm vùng an toàn */

  /* Suy ra: tổng chrome không tính bàn cờ. Không bao giờ chỉnh tay chiều cao bàn cờ nữa. */
  --m-chrome-h: calc(
      var(--m-appbar-h)
    + var(--m-evalstrip-h)
    + (var(--m-playerbar-h) * 2)
    + var(--m-sheet-peek-h)
    + var(--m-bottombar-h)
    + var(--safe-bottom)
    + (var(--m-gap) * 5)
  );

  /* --- Thang chữ mobile (chỉ phone; thang desktop giữ nguyên) --- */
  --m-fs-body:        0.9375rem;  /* 15px — văn chẩn đoán, thoại coach */
  --m-fs-ui:          0.875rem;   /* 14px — nút, nhãn, hàng danh sách     */
  --m-fs-meta:        0.75rem;    /* 12px — chú thích, số đếm             */
  --m-fs-chip:        0.6875rem;  /* 11px — SÀN CỨNG. Không có gì nhỏ hơn. */

  --m-tap:            44px;       /* vùng bấm tối thiểu */
  --m-radius:         10px;
  --m-radius-sheet:   16px;

  --m-z-sheet:        1035;
  --m-z-sheet-scrim:  1034;
  --m-z-bottombar:    1040;
  --m-z-appbar:       1020;
}

body.mobile-header-hidden { --m-appbar-h: 0px; }
```

> Backdrop của modal Bootstrap là `1050` và modal là `1055`. Giữ tấm (sheet) ở `1035` và thanh dưới ở `1040` nghĩa là modal cài đặt coach vẫn phủ lên tất cả. Không vượt quá 1045.

### 4.3 Meta viewport (`index.html:5`) — thay thế

```html
<!-- trước -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<!-- sau -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

Một dòng này là thứ khiến mọi `env(safe-area-inset-*)` trong file bắt đầu hoạt động (sửa **B1**) và khôi phục pinch-zoom (sửa **B3**). Kéo-thả quân trên bàn cờ đã được bảo vệ bởi các rule `touch-action` / `user-select` trên `#board` (`index.html:~1032`); thêm `touch-action: none` cho `.board-container` cho chắc (xem §6.3).

---

## 5. Layout mục tiêu

### 5.1 Chế độ Analysis — phone dọc

```
┌──────────────────────────────────────────────┐  ← safe-area-inset-top
│ [icon] │ Analysis · Coach │        [+] [⋯]   │  thanh ứng dụng 48
├──────────────────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓│░░░░░░░░░░░░░░░░░░         +0.4  │  dải eval       10
│ ● Magnus Carlsen (2830)          ♟♟♝    +3   │  thanh người chơi 32
│ ┌──────────────────────────────────────────┐ │
│ │                                          │ │
│ │              C H E S S B O A R D         │ │  hình vuông, ràng buộc theo rộng
│ │                                          │ │
│ └──────────────────────────────────────────┘ │
│ ● Bạn (1450)                                 │  thanh người chơi 32
├══════════════════════════════════════════════┤
│                  ────                        │  tay cầm kéo
│ 12. Nxd5  [BLUNDER]  +1.2 → −2.4       ⌃    │  tấm peek       76
├──────────────────────────────────────────────┤
│  ☰      ◀      12. Nxd5        ▶      ⚡     │  thanh dưới     56
│ Moves        24 of 61                  3/7   │
└──────────────────────────────────────────────┘  ← safe-area-inset-bottom
```

Các trạng thái tấm (sheet):

| Trạng thái | Chiều cao | Vào bằng cách |
| :--- | :--- | :--- |
| `peek` (mặc định) | `var(--m-sheet-peek-h)` | mặc định; vuốt xuống từ `half` |
| `half` | `min(52vh, calc(var(--app-h) * 0.52))` | chạm hàng peek, kéo lên, hoặc chạm một nước đi |
| `full` | `calc(var(--app-h) - var(--m-appbar-h) - 56px)` | kéo lên từ `half`; thêm một lớp phủ mờ (scrim) |

Ở `half` và `full`, tấm phủ lên bàn cờ. Bàn cờ **không** resize.

### 5.2 Chế độ Coach — phone dọc

```
┌──────────────────────────────────────────────┐
│ [icon] │ Analysis · Coach │     [New] [⋯]    │  thanh ứng dụng 48
├──────────────────────────────────────────────┤
│ 😎 Coach Pikaru  [1600]              ● turn  │  thanh người chơi 32
│ ┌──────────────────────────────────────────┐ │
│ │              C H E S S B O A R D         │ │
│ └──────────────────────────────────────────┘ │
│ ● Bạn                              ♟ +1      │  thanh người chơi 32
├══════════════════════════════════════════════┤
│                  ────                        │
│ 😎 Nice! That knight was hanging — you…  ⌃  │  tấm peek       76
├──────────────────────────────────────────────┤
│  🏳      ◀      💡 Hint      ↺       ☰      │  thanh dưới     56
│ Resign         (chính)      Undo   Moves     │
└──────────────────────────────────────────────┘
```

Tấm coach ở `half` chứa, theo thứ tự: dải khai cuộc (tên + ECO), toàn bộ thông điệp coach, các hành động xin đi lại khi có blunder, rồi đến danh sách nước đi. Không có dải eval ở chế độ coach (đã ẩn ở `index.html:2266`; giữ nguyên).

### 5.3 Ngang (landscape) (`max-height: 500px`)

Hai cột: bàn cờ trái (ràng buộc theo chiều cao, `height: calc(var(--app-h) - var(--m-appbar-h) - 8px)`, `aspect-ratio: 1`), tấm neo phải như một panel tĩnh 320px — không peek/half/full, không thanh dưới (các hành động chuyển vào footer của panel phải). Thanh ứng dụng co xuống 40px.

---

## 6. Đặc tả component

Cho mỗi component: thay rule legacy, giữ ID.

### 6.1 Thanh ứng dụng — `.lic-header`

**Cấu tạo (phone):** `[thương hiệu 28px] [điều khiển phân đoạn, flex:1 1 auto, min-width:0] [hành động chính] [⋯ 44px]`

```css
@media (max-width: 991.98px) {
  .lic-header {
    height: var(--m-appbar-h);
    min-height: var(--m-appbar-h);
    padding: 0 max(var(--m-gutter), var(--safe-right)) 0 max(var(--m-gutter), var(--safe-left));
    padding-top: var(--safe-top);
    gap: 8px;
    flex-wrap: nowrap;
    overflow: hidden;
  }
  .lic-header > * { min-width: 0; }
  .lic-brand span { display: none; }            /* tắt wordmark dưới 600px */
}
@media (min-width: 600px) and (max-width: 991.98px) {
  .lic-brand span { display: inline; }
}
```

Quy tắc:

- **Sửa A1 đúng cách:** ngừng bật/tắt `d-none` trên `#analysisKeysLegend`. Gắn cho nó một class riêng và bật/tắt class đó thay thế:
  ```html
  <div class="analysis-keys-legend d-none d-lg-flex …" id="analysisKeysLegend">
  ```
  ```js
  // index.html:7710 và :7737 — thay classList.add/remove('d-none') bằng:
  analysisKeysLegend.classList.toggle('mode-hidden', mode === 'coach');
  ```
  ```css
  .analysis-keys-legend.mode-hidden { display: none !important; }
  @media (max-width: 991.98px) { .analysis-keys-legend { display: none !important; } }
  ```
- **Công tắc chế độ:** nhãn `.lic-mode-btn` `"Play Coach"` → `"Coach"` trên phone bằng cách tách `<span class="mode-btn-label-full">Play </span>Coach`, hoặc dùng `::after` thuần CSS. Giữ icon. `height: 36px; padding: 0 12px; white-space: nowrap; font-size: var(--m-fs-ui);`
- **Cụm phải (A3):** đúng **hai** điều khiển trên phone:
  - nút chính theo ngữ cảnh — `Import` (analysis, `#btnTogglePgn`) hoặc `New` (coach, `#btnHeaderNewCoachGame`), icon + nhãn ngắn, `height: 36px`;
  - một **nút tràn (overflow)** mới `#mobileBtnMore` (44×44, `bi-three-dots-vertical`) mở **tấm Tùy chọn (Options sheet)** (§6.8).
  Nút split-dropdown của import, chọn độ sâu (depth select), chọn tốc độ (speed select), lật bàn (flip), và "ẩn header" đều chuyển vào tấm Tùy chọn.
- **A4:** giữ `#btnToggleMobileHeader` và `#btnRestoreMobileHeader` trong DOM (các ID đã được handler hiện có tham chiếu ở `index.html:8012-8037`), nhưng chuyển *trigger* vào tấm Tùy chọn và restyle `.btn-restore-mobile-header` thành nút tròn nổi 44×44 ở `top: max(8px, var(--safe-top))`.

**Nghiệm thu:** ở rộng 320px, cả hai chế độ, `document.querySelector('.lic-header').scrollWidth === clientWidth`. Không con nào bị cắt.

### 6.2 Mô hình chiều cao vỏ — thay B2/C1

Thêm một lần, gần đầu khối mobile:

```css
@media (max-width: 991.98px) {
  html, body { height: var(--app-h); overflow: hidden; overscroll-behavior: none; }
  body { display: flex; flex-direction: column; }
  .studio-container { flex: 1; min-height: 0; padding: var(--m-gap) var(--m-gutter) 0; }
}
```

```js
// Nguồn sự thật duy nhất cho chiều cao viewport. Đặt gần đoạn wiring resize hiện có
// (index.html:3981) bên trong IIFE hiện tại.
function syncAppViewport() {
    const vv = window.visualViewport;
    const h = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-h', h + 'px');
}
syncAppViewport();
window.addEventListener('resize', syncAppViewport);
window.addEventListener('orientationchange', syncAppViewport);
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncAppViewport);
}
```

Kích thước bàn cờ trở thành giá trị suy ra, và ba số ma thuật (`index.html:2046`, `:2341`, `:2345`) bị **xóa**:

```css
@media (max-width: 991.98px) {
  .board-container-card {
    width: 100%;
    max-width: min(100%, calc(var(--app-h) - var(--m-chrome-h)));
    margin-inline: auto;
    gap: var(--m-gap);
  }
}
```

Vì `--m-chrome-h` được cấu thành từ cùng các token mà các component dùng, thay đổi chiều cao bất kỳ dải nào sẽ tự resize bàn cờ. `body.mobile-header-hidden` đưa `--m-appbar-h` về 0 và bàn cờ to ra — không cần rule thứ hai.

Gọi `board.resize()` + `updateSvgDimensions()` (debounce ~100ms) từ `syncAppViewport`, và **không bao giờ** gọi từ chuyển trạng thái tấm.

### 6.3 Bàn cờ & tọa độ — sửa C2

```css
@media (max-width: 991.98px) {
  .board-container { touch-action: none; }

  /* Tọa độ dễ đọc, gọn gàng */
  .notation-322f9 {
    font-family: 'JetBrains Mono', monospace;
    font-size: clamp(8px, 2.4vw, 11px);
    font-weight: 700;
    opacity: 0.78;
    text-shadow: 0 1px 1px rgba(0,0,0,0.25);
  }
  .alpha-d2270  { bottom: 1px; right: 3px; }
  .numeric-fc462 { top: 2px; left: 3px; }
}
```

Giữ mặc định `showNotation` (`true`) — đừng đổi `boardConfig` ở `index.html:3911`; markup của vendor chính là thứ `.notation-322f9` nhắm tới.

Khung bàn cờ trên phone: `border-radius: var(--m-radius); overflow: hidden;` để bo góc bàn cờ khớp với vỏ.

### 6.4 Dải đánh giá — `#mobileEvalBar` (sửa C3)

Giữ các ID `mobileEvalBar`, `mobileEvalWhite`, `mobileEvalPill` (đã được kiểm tra, `test_browser_modules.js:723`).

```css
@media (max-width: 991.98px) {
  .mobile-eval-bar {
    height: var(--m-evalstrip-h);
    margin: 0;
    border: none;
    border-radius: 999px;
    background: #3a3734;              /* phía ĐEN — tối rõ ràng, không đen kịt */
    overflow: visible;
  }
  .mobile-eval-track { border-radius: 999px; overflow: hidden; background: transparent; }
  .mobile-eval-fill-white { background: #e8e6e3; }

  /* vạch giữa để 0.0 đọc là "cân bằng", không phải "đang tải một nửa" */
  .mobile-eval-bar::after {
    content: ''; position: absolute; left: 50%; top: 0; bottom: 0;
    width: 1px; background: rgba(0,0,0,0.35); z-index: 1;
  }

  /* viên nổi ở CUỐI thanh, mã màu theo bên, không ghim giữa */
  .mobile-eval-pill {
    left: auto; right: 0; top: 50%;
    transform: translate(0, -50%);
    font-size: var(--m-fs-chip);
    line-height: 18px; height: 18px; padding: 0 7px;
    border-radius: 9px;
    background: var(--lic-bg-surface-header);
    border: 1px solid var(--lic-border);
    color: var(--lic-text-bright);
  }
  .mobile-eval-pill[data-side="white"] { color: #e8e6e3; }
  .mobile-eval-pill[data-side="black"] { color: #9aa0a6; }
}
```

Thay đổi hành vi: **ẩn hẳn dải này cho đến khi có phân tích.** Thêm `.mobile-eval-bar.is-idle { display: none !important; }` và bật/tắt `is-idle` ở mọi nơi ghi eval (tìm các chỗ ghi `mobileEvalWhite`). Chế độ coach vốn đã ẩn nó (`index.html:2266`).

### 6.5 Thanh người chơi — sửa C4

```css
@media (max-width: 599.98px) {
  .lic-player-bar {
    min-height: var(--m-playerbar-h);
    height: var(--m-playerbar-h);
    padding: 0 10px;
    border-radius: var(--m-radius);
    font-size: var(--m-fs-ui);
  }
  .player-name-text {
    font-weight: 600;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 52vw;
  }
  /* tagline persona không có giá trị trên điện thoại */
  #topPlayerMeta, #bottomPlayerMeta { display: none; }
  .player-avatar { width: 20px; height: 20px; }
  .material-piece-icon { width: 12px; height: 12px; }
}
```

Ngoài ra, trong `updateCoachPlayerBars()` (`index.html:7397`) render ELO thành một chip riêng thay vì nhét vào chuỗi tên, để có thể style/cắt độc lập:

```js
topPlayerName.textContent = `${p.name} ${p.flag}`;
topPlayerMeta.textContent = p.title;              // ẩn trên phone bằng CSS
// mới: <span class="player-elo-chip" id="topPlayerElo">1600</span> bên trong .player-info-main
```

Giữ `topPlayerMeta` / `bottomPlayerMeta` trong DOM (ẩn bằng CSS) — desktop vẫn dùng chúng.

### 6.6 Tấm đáy (Bottom sheet) — **component mới**, lõi của đợt làm mới

Đây là bề mặt thay thế `.col-analysis` / `.col-coach` bị bóp méo trên phone.

**Markup** — thêm một lần, làm con cuối cùng của `<body>` (trước offcanvas), với các panel hiện có được *chuyển vào trong* (không nhân đôi nội dung; di chuyển node lúc runtime hoặc trong markup):

```html
<div class="m-sheet" id="mobileSheet" data-state="peek" aria-label="Details">
  <div class="m-sheet-grip" id="mobileSheetGrip" role="button" tabindex="0"
       aria-expanded="false" aria-controls="mobileSheetBody">
    <span class="m-sheet-handle" aria-hidden="true"></span>
    <div class="m-sheet-summary" id="mobileSheetSummary">
      <!-- analysis: "12. Nxd5" + huy hiệu chất lượng + chênh eval
           coach:    avatar + 1 dòng tin coach mới nhất -->
    </div>
    <i class="bi bi-chevron-up m-sheet-chevron" aria-hidden="true"></i>
  </div>
  <div class="m-sheet-body" id="mobileSheetBody"><!-- ô chứa --></div>
</div>
<div class="m-sheet-scrim" id="mobileSheetScrim" hidden></div>
```

**CSS**

```css
@media (max-width: 991.98px) {
  .m-sheet {
    position: fixed; left: 0; right: 0;
    bottom: calc(var(--m-bottombar-h) + var(--safe-bottom));
    z-index: var(--m-z-sheet);
    display: flex; flex-direction: column;
    height: var(--m-sheet-peek-h);
    background: var(--lic-bg-surface);
    border-top: 1px solid var(--lic-border);
    border-radius: var(--m-radius-sheet) var(--m-radius-sheet) 0 0;
    box-shadow: 0 -8px 28px rgba(0,0,0,0.55);
    transition: height 0.26s cubic-bezier(0.2, 0.8, 0.2, 1);
    will-change: height;
    overscroll-behavior: contain;
  }
  .m-sheet[data-state="half"] { height: min(52vh, calc(var(--app-h) * 0.52)); }
  .m-sheet[data-state="full"] { height: calc(var(--app-h) - var(--m-appbar-h) - 56px); }
  .m-sheet.is-dragging { transition: none; }

  .m-sheet-grip {
    flex: 0 0 auto; min-height: var(--m-sheet-peek-h);
    display: grid; grid-template-columns: 1fr auto;
    align-items: center; gap: 10px;
    padding: 10px 14px 8px; cursor: grab;
    touch-action: none;     /* ta sở hữu cử chỉ dọc */
  }
  .m-sheet-handle {
    position: absolute; top: 6px; left: 50%; transform: translateX(-50%);
    width: 36px; height: 4px; border-radius: 2px; background: var(--lic-border-strong);
  }
  .m-sheet-body {
    flex: 1; min-height: 0;
    overflow-y: auto; -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding: 0 14px calc(14px + var(--m-gap));
  }
  .m-sheet[data-state="peek"] .m-sheet-body { display: none; }
  .m-sheet[data-state="full"] .m-sheet-chevron { transform: rotate(180deg); }

  .m-sheet-scrim {
    position: fixed; inset: 0; z-index: var(--m-z-sheet-scrim);
    background: rgba(0,0,0,0.45); opacity: 0;
    transition: opacity 0.2s ease; pointer-events: none;
  }
  .m-sheet-scrim.is-visible { opacity: 1; pointer-events: auto; }
}
@media (min-width: 992px) { .m-sheet, .m-sheet-scrim { display: none !important; } }
```

**Hành vi**

| Cử chỉ / sự kiện | Kết quả |
| :--- | :--- |
| Chạm tay cầm (grip) | `peek ↔ half` |
| Kéo tay cầm lên/xuống | Bám theo ngón tay (đặt `height` inline, `is-dragging`); khi thả snap tới peek/half/full gần nhất theo vị trí + vận tốc (`> 0.5 px/ms` = hất). |
| Vuốt xuống khi ở `full` và đang ở đỉnh cuộn | `full → half → peek` |
| Chạm lớp phủ mờ (scrim) | → `half` |
| Chọn một nước đi (ticker / thanh dưới / offcanvas) | tự mở lên `half` nếu đang ở `peek` |
| Coach gửi tin mới | nháy sáng dòng tóm tắt peek; **không** tự bung |
| `Escape` | thu lại một nấc |

**Hợp đồng JS** (một helper công khai duy nhất, để code khác giữ đơn giản):

```js
window.MobileSheet = {
  set(state),          // 'peek' | 'half' | 'full'
  get(),               // trạng thái hiện tại
  setSummary(html),    // ghi vào #mobileSheetSummary
  isMobile()           // matchMedia('(max-width: 991.98px)').matches
};
```

**Định tuyến nội dung** (không nhân đôi DOM — di chuyển node khi qua breakpoint):

| Chế độ | Thân tấm chứa |
| :--- | :--- |
| analysis | `.col-analysis .lic-panel-body` (`#moveExplanation`) |
| coach | dải khai cuộc của coach, `#coachBubble`, `#coachBlunderCard`, danh sách nước đi của coach |

Triển khai bằng hàm `relocateForViewport()` chạy lúc tải và khi vượt breakpoint: `sheetBody.appendChild(node)` dưới 992px, `originalParent.appendChild(node)` từ 992px trở lên. Giữ một `WeakMap` node → parent gốc. Cách này giữ desktop nguyên vẹn và giữ mọi hàm render hiện có ghi vào cùng ID phần tử.

### 6.7 Thanh hành động dưới — thay `.mobile-nav-toolbar` / `.coach-action-bar` trên phone

Một thanh, năm ô (slot), nội dung tùy chế độ. Giữ `#mobileNavToolbar` làm phần tử (các ID đã được kiểm tra ở `test_browser_modules.js:725-727`); restyle và chia lại ô, và render biến thể coach vào cùng thanh thay vì vào `#coachActionBar` khi dưới 992px.

```css
@media (max-width: 991.98px) {
  .mobile-nav-toolbar {
    position: fixed; left: 0; right: 0; bottom: 0;
    z-index: var(--m-z-bottombar);
    height: calc(var(--m-bottombar-h) + var(--safe-bottom));
    padding: 0 max(var(--m-gutter), var(--safe-left)) var(--safe-bottom) max(var(--m-gutter), var(--safe-right));
    display: grid;
    grid-template-columns: 56px 56px 1fr 56px 56px;
    align-items: center; gap: 4px;
    background: color-mix(in srgb, var(--lic-bg-surface-header) 92%, transparent);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--lic-border);
  }
  .mobile-nav-tool-btn {
    height: var(--m-tap); min-width: var(--m-tap);
    border: none; background: transparent;
    font-size: 1.15rem; border-radius: var(--m-radius);
  }
  .mobile-tool-label { font-size: var(--m-fs-chip); }   /* sàn 11px */

  /* ô giữa: viên nước đi hiện tại (analysis) hoặc hành động chính (coach) */
  .mobile-nav-capsule {
    max-width: none; height: var(--m-tap); border-radius: var(--m-radius);
    box-shadow: none; background: var(--lic-bg-surface);
  }
  .mobile-nav-arrow-btn { width: var(--m-tap); height: var(--m-tap); }
  .mobile-nav-move-san { font-size: var(--m-fs-ui); }
  .mobile-nav-move-count { font-size: var(--m-fs-chip); }
}
```

**Sơ đồ ô (slot)**

| Ô | Analysis | Coach |
| :--- | :--- | :--- |
| 1 | `☰ Moves` → mở `#mobileMovesOffcanvas` | `🏳 Resign` (bắt buộc hộp xác nhận) |
| 2 | `◀ Prev` | `↺ Undo` (xin đi lại / takeback) |
| 3 | viên nước đi `12. Nxd5 / 24 of 61` (chạm → tấm lên `half`) | **`💡 Hint`** — chính, xanh lá, **có nhãn** |
| 4 | `▶ Next` (chính, xanh lá) | `☰ Moves` |
| 5 | `⚡ Key` + huy hiệu `n/m` | `⚙ Coach` (modal cài đặt) |

Cách này sửa **E2** (nút hint có nhãn chữ, không còn là nút bí ẩn full-width) và **E3** (mọi điều khiển coach ≥44px). `#btnCoachResign` phải mở xác nhận tương đương `confirm()` — tái dùng một Bootstrap modal nhỏ hoặc `window.confirm` — trước khi chịu thua.

`.coach-action-bar` (`index.html:2848`) **ẩn dưới 992px**; nó vẫn là bề mặt desktop. Giữ các ID `#coachActionBar`, `#btnCoachHint`, `#btnCoachResign`, `#btnCoachTakeback`, `#btnCoachReview` và chỉ chuyển tiếp click từ thanh mobile sang `.click()` trên chúng, để không trùng lặp logic handler.

### 6.8 Tấm Tùy chọn (Options sheet) — **mới**, `#mobileOptionsSheet`

Một `offcanvas-bottom` của Bootstrap, mở bởi `#mobileBtnMore`. Các hàng (mỗi hàng 44px, icon + nhãn + điều khiển):

- Độ sâu phân tích (Analysis depth) (`#analysisDepth` di dời, hoặc một `<select>` sao chép ghi vào nó)
- Tốc độ phát lại (Playback speed) (`#speedControl`, kỹ thuật tương tự)
- Lật bàn cờ (Flip board) (`#btnFlip.click()`)
- Import từ Lichess / Dán PGN (mở ngăn kéo hiện có)
- Ẩn header (`#btnToggleMobileHeader.click()`)
- Phím tắt (chỉ desktop; bỏ trên phone)

Đây là thứ làm rỗng thanh ứng dụng và sửa **A3**.

### 6.9 Các bề mặt nước đi — gom D4

Giữ **hai**, không phải bốn:

1. **Viên (pill) ở thanh dưới** — vị trí hiện tại luôn thấy; chạm mở tấm.
2. **`#mobileMovesOffcanvas`** — tấm nước đi đầy đủ, nay cũng dùng ở chế độ coach.

`#mobileMoveTicker` và `#coachMobileMoveTicker` **ẩn trên phone** (`display: none` trong `@media (max-width: 599.98px)`) nhưng **giữ trong DOM và vẫn render** — `renderMobileMoveTicker` và markup `#coachMobileMoveTicker` đã được test kiểm tra (`test_browser_modules.js:744`, `:1814`, `:1825`). Trên tablet (600–991px) chúng vẫn hiện.

Restyle offcanvas:

```css
@media (max-width: 991.98px) {
  .mobile-moves-offcanvas {
    height: min(78vh, calc(var(--app-h) * 0.78)) !important;
    border-radius: var(--m-radius-sheet) var(--m-radius-sheet) 0 0;
    padding-bottom: var(--safe-bottom);
  }
  .mobile-moves-offcanvas .move-pair { min-height: var(--m-tap); }   /* trước là 28px */
  .mobile-moves-offcanvas .move-cell { font-size: var(--m-fs-ui); }
}
```

### 6.10 Thoại coach — sửa E1

Khai tử thẻ trắng. Bong bóng thành một khối theo theme nằm trong tấm.

```css
@media (max-width: 991.98px) {
  body.coach-mode .coach-speech-bubble {
    background: var(--lic-bg-surface-hover);
    color: var(--lic-text-primary);
    border: 1px solid var(--lic-border);
    border-radius: 12px;
    padding: 10px 12px;
    font-size: var(--m-fs-body);
    line-height: 1.5;
    max-height: none;          /* TẤM cuộn, không phải bong bóng */
    overflow: visible;
  }
  body.coach-mode .coach-bubbles-col::before,      /* đuôi trắng */
  body.coach-mode .coach-speech-bubble::before { display: none; }

  /* tóm tắt peek kẹp một dòng; văn đầy đủ nằm ở half/full */
  .m-sheet[data-state="peek"] #mobileSheetSummary {
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden;
  }
  body.coach-mode .coach-avatar-wrapper { width: 32px; height: 32px; font-size: 18px; }
}
```

> Các rule mobile hiện có `body.coach-mode .coach-speech-bubble` và `body.coach-mode .coach-speech-bubble.expanded` đều phải còn trong file — `test_browser_modules.js:1207-1208` kiểm tra selector theo chữ. Giữ selector `.expanded` ngay cả khi nó thành no-op (cho nó `max-height: none;`).

### 6.11 Lượt qua density & cỡ chữ (sửa D3, §2.6)

Trong `@media (max-width: 599.98px)`, thay khối thu-nhỏ-mọi-thứ ở `index.html:2107-2165` bằng:

| Phần tử | Giá trị mới |
| :--- | :--- |
| `.diagnosis-text` | `font-size: var(--m-fs-body); line-height: 1.5; padding: 10px 12px` |
| `.move-san` | `1.125rem` |
| `.badge-q`, `.eval-tag`, `.eval-best-tag`, `.metric-chip` | `font-size: var(--m-fs-chip); padding: 3px 8px` |
| `.diag-tag` | `font-size: var(--m-fs-chip); padding: 3px 8px; min-height: 24px` |
| `.better-move-strip`, `.threat-alert-box` | `font-size: var(--m-fs-ui); padding: 8px 10px` |
| `.variation-box .lic-btn` | `min-height: var(--m-tap); font-size: var(--m-fs-ui)` |
| `.ticker-nav-btn` | `width: var(--m-tap); height: var(--m-tap)` |
| `.var-nav-btn-group .btn-lic-tool` | `width: var(--m-tap); height: var(--m-tap)` |
| `.coach-icon-btn` | `width: var(--m-tap); height: var(--m-tap)` |
| `.ticker-badge` | `font-size: var(--m-fs-chip)` |

Không có gì dưới `--m-fs-chip` (11px). Không tương tác nào dưới `--m-tap`.

---

## 7. Các giai đoạn triển khai

Mỗi giai đoạn kết thúc bằng `node test_browser_modules.js && node test_diagnostics.js` xanh và một commit.

### Phase 0 — Giàn giáo (chưa đổi hình ảnh)

- `index.html:5` — meta viewport mới (§4.3).
- `:root` — thêm toàn bộ token (§4.2).
- Thêm `syncAppViewport()` + listener (§6.2); debounce `board.resize()`.
- Thêm vùng CSS phân định ở cuối khối `<style>`: `/* ===== MOBILE REVAMP v2 — START ===== */ … /* ===== MOBILE REVAMP v2 — END ===== */`. Mọi CSS mobile mới vào đây để thứ tự cascade thắng các rule legacy mà chưa cần xóa chúng.

### Phase 1 — Thanh ứng dụng (A1–A4)

- Sửa lỗi class `#analysisKeysLegend` ở `index.html:7710` và `:7737`.
- Cứng hóa flex header, rule brand/wordmark, `Play Coach` → `Coach`.
- Thêm `#mobileBtnMore` + `#mobileOptionsSheet` (§6.8); di dời depth/speed/flip/hide-header.
- Restyle `.btn-restore-mobile-header` thành vòng tròn nổi 44px.

### Phase 2 — Vỏ & bàn cờ (B1–B4, C1–C2)

- Xóa ba rule bàn cờ `calc(100dvh - N)` (`index.html:2046`, `:2341`, `:2345`); thay bằng công thức `--m-chrome-h`.
- Fix thanh dưới thành `position: fixed` với padding vùng an toàn + blur.
- Restyle tọa độ; `touch-action: none` trên `.board-container`.

### Phase 3 — Tấm đáy (D1, D2)

- Thêm markup `#mobileSheet`, CSS, JS kéo/snap, API `window.MobileSheet`.
- Triển khai `relocateForViewport()` di chuyển node cho `#moveExplanation` và các node coach.
- Nối dây: chọn nước đi mở `half`; tin coach cập nhật tóm tắt peek.

### Phase 4 — Ô thanh dưới + coach mobile (E1–E3, D4)

- Chia lại `#mobileNavToolbar` thành lưới 5 cột; thêm biến thể coach chuyển tiếp click tới các nút coach hiện có.
- Ẩn `.coach-action-bar` dưới 992px; gắn nhãn nút Hint; thêm xác nhận Resign.
- Bong bóng coach theo theme; ẩn hai ticker dưới 600px.

### Phase 5 — Dải eval, thanh người chơi, density (C3, C4, D3, §2.6)

- Thiết kế lại dải eval + ẩn `is-idle`.
- Chiều cao thanh người chơi, cắt tên, chip ELO, ẩn tagline.
- Lượt qua toàn bộ density/cỡ chữ/vùng chạm.

### Phase 6 — Ngang, dọn dẹp, test

- Rule hai cột landscape (§5.3).
- Xóa các rule legacy đã chết trong `@media (max-width: 991px)` mà khối revamp ghi đè (làm cuối cùng, từng rule một, chạy suite sau mỗi lần xóa).
- Thêm các kiểm tra mới (§9.2).

---

## 8. File chạm tới

| File | Thay đổi |
| :--- | :--- |
| `index.html` | meta viewport, token `:root`, vùng CSS mobile mới, markup tấm + tấm tùy chọn, chia lại ô thanh dưới, `syncAppViewport`, `MobileSheet`, `relocateForViewport`, sửa class `#analysisKeysLegend`, chip ELO trong `updateCoachPlayerBars`. |
| `test_browser_modules.js` | Thêm các kiểm tra ở §9.2. Không nới lỏng các kiểm tra hiện có. |
| `docs/mobile-ui-revamp-plan.md` | Tài liệu này (cập nhật trạng thái khi các phase xong). |
| `css/`, `js/`, `img/` | **Không đổi.** Không sửa CSS chessboard vendored — ghi đè từ `index.html`. |

---

## 9. Hợp đồng test

### 9.1 Không được làm hỏng (các kiểm tra hiện có)

Các ID (`test_browser_modules.js:722-728`): `mobileEvalBar`, `mobileEvalWhite`, `mobileEvalPill`, `mobileMoveTicker`, `tickerScroll`, `tickerNavLeft`, `tickerNavRight`, `mobileNavToolbar`, `mobileBtnPrev`, `mobileBtnNext`, `mobileBtnKey`, `mobileKeyBadge`, `mobileNavSan`, `mobileNavCount`, `mobileBtnFlip`, `mobileMovesOffcanvas`, `mobileMovesOffcanvasBody`, `mobileSheetMoveCount`, cộng `coachMobileMoveTicker`.

Chuỗi ký tự (literal) (`:734-748`, `:1207-1208`, `:1825`): `.mobile-eval-bar`, `.mobile-move-ticker`, `.mobile-nav-toolbar`, `.mobile-nav-capsule`, `.mobile-moves-offcanvas`, `overflow-y: auto !important;`, `function renderMobileMoveTicker(`, `function syncMobileOffcanvas(`, `mobileBtnPrev.addEventListener`, `mobileBtnNext.addEventListener`, `mobileBtnKey.addEventListener`, `mobileBtnFlip.addEventListener`, `body.coach-mode .coach-speech-bubble`, `body.coach-mode .coach-speech-bubble.expanded`, `body.coach-mode .coach-mobile-move-ticker`.

Cũng được tham chiếu ở nơi khác trong suite: `#variationBanner`, `#btnTogglePgn`, `#topMaterialDisplay`, `.var-move-btn`, `.diag-missed-banner`.

> **Quy tắc:** ẩn các phần tử legacy bằng CSS; không bao giờ xóa markup hay hàm render của chúng.

### 9.2 Kiểm tra mới cần thêm

```js
// Section 10b — Mobile Revamp v2
assert(indexHtml.includes('viewport-fit=cover'),            "viewport must opt into safe areas");
assert(!indexHtml.includes('user-scalable=no'),             "pinch-zoom must not be disabled");
assert(indexHtml.includes('--m-chrome-h'),                  "board height must derive from --m-chrome-h");
assert(!/max-width:\s*min\(100%,\s*calc\(100dvh - \d+px\)\)/.test(indexHtml),
                                                            "no magic-number board heights remain");
assert(indexHtml.includes('function syncAppViewport('),     "must sync --app-h from visualViewport");
assert(indexHtml.includes('MOBILE REVAMP v2 — START'),      "mobile revamp CSS region must be delimited");
['mobileSheet','mobileSheetGrip','mobileSheetBody','mobileSheetSummary','mobileSheetScrim',
 'mobileBtnMore','mobileOptionsSheet'].forEach(id => {
    assert(indexHtml.includes(`id="${id}"`), `Missing mobile element #${id}`);
});
assert(indexHtml.includes('window.MobileSheet'),            "must expose MobileSheet API");
assert(indexHtml.includes('function relocateForViewport('), "must relocate panels between shell and sheet");
assert(indexHtml.includes('.analysis-keys-legend'),         "keys legend must use a dedicated class, not d-none toggling");
assert(!/analysisKeysLegend\.classList\.remove\('d-none'\)/.test(indexHtml),
                                                            "keys legend must not have d-none stripped on mobile");
assert(indexHtml.includes('--m-tap'),                       "touch-target token must exist");
assert(indexHtml.includes('--m-fs-chip'),                   "mobile type floor token must exist");
```

---

## 10. Tiêu chí nghiệm thu

Kiểm chứng ở **320×568**, **390×844** (thiết bị trong ảnh chụp), **430×932**, **768×1024**, và **844×390 ngang**, cả hai chế độ, trên iOS Safari và Android Chrome.

**Layout**

1. Không thanh cuộn ngang và không điều khiển bị cắt ở mọi rộng ≥320px. (`document.documentElement.scrollWidth === clientWidth`.)
2. Thanh ứng dụng vừa một dòng ở cả hai chế độ; không gì ngắt dòng; không chú thích bàn phím trên phone.
3. Thanh dưới hiện đầy đủ phía trên khung trình duyệt và home indicator; không gì bị che khi thanh URL iOS giãn/thu.
4. Bàn cờ hình vuông, căn giữa, không bao giờ đè lên thanh người chơi hay tấm ở `peek`.
5. Xoay thiết bị relayout trong một frame và chỉ resize bàn cờ đúng một lần.

**Tấm (Sheet)**

6. Trạng thái mặc định là `peek`; dòng tóm tắt đọc được và đúng sự thật ở cả hai chế độ.
7. Kéo lên/xuống snap tới peek/half/full mà bàn cờ không reflow (`getBoundingClientRect()` của bàn cờ giống hệt trước và sau).
8. Nội dung tấm cuộn nội tại; trang phía sau không bao giờ cuộn (`overscroll-behavior` giữ).
9. Chạm một nước đi mở tấm lên `half` và hiện chẩn đoán của nước đó.

**Chạm & chữ**

10. Mọi phần tử tương tác có vùng bấm ≥44×44 px CSS (kiểm bằng script DevTools).
11. Không chữ render nào dưới 11px.
12. Nút Hint của coach có nhãn; Resign hỏi xác nhận.

**Theme & a11y**

13. Không bề mặt trắng; mọi màu từ `--lic-*`.
14. Pinch-zoom hoạt động; vòng focus thấy được; tay cầm tấm dùng được bằng bàn phím (`Enter`/`Space` bật/tắt, `Escape` thu lại).
15. Kéo-thả quân và bấm-để-đi đều còn hoạt động ở chế độ coach; trang không cuộn khi kéo quân.

**Hồi quy**

16. Desktop (≥992px) giống pixel với `main` — kiểm điểm 3-cột studio, layout coach, banner biến thể (variation banner), và danh sách nước đi.
17. `node test_browser_modules.js && node test_diagnostics.js` → 0 lỗi.

---

## 11. Ngoài phạm vi

- Mọi thay đổi logic chẩn đoán, coach, evaluator hay analyzer trong `js/*.js`.
- Tính năng mới (đồng bộ cloud, tài khoản, persona coach mới, cài PWA/offline).
- Tái cấu trúc design-token của theme desktop.
- Thay chessboard.js.

## 12. Rủi ro

| Rủi ro | Giảm thiểu |
| :--- | :--- |
| Test chuỗi ký tự hỏng khi refactor | Commit theo từng phase, chạy suite sau mỗi phase; §9.1 là danh sách không-được-chạm. |
| Di chuyển node DOM giữa vỏ và tấm làm hỏng handler sự kiện | Handler gắn trên chính phần tử bị di chuyển hoặc ủy quyền từ `document`; `appendChild` giữ listener. Kiểm tra tường minh click-to-move của coach và click hàng nước đi. |
| Hỗ trợ `color-mix()` trên Safari cũ | Khai báo dự phòng `rgba()` thuần ngay trước dòng `color-mix()`. |
| Chi phí `backdrop-filter` trên Android yếu | Chấp nhận được trên một thanh 56px; hạ xuống nền đặc trong `@media (prefers-reduced-transparency: reduce)`. |
| Kéo tấm xung đột kéo bàn cờ | Cử chỉ tấm chỉ gắn trên `.m-sheet-grip`, với `touch-action: none` giới hạn ở tay cầm. |
