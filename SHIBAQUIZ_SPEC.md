# ShibaQuiz — Product & Technical Specification

> Phiên bản: 1.4
> Ngày: 2026-09-22
> Trạng thái: MVP đã triển khai và đang vận hành trên Vercel; tài liệu đã được đối chiếu lại với implementation thực tế
> Nguồn yêu cầu: `requirement.md`

## 1. Mục tiêu tài liệu

Tài liệu này chuyển yêu cầu ban đầu thành đặc tả có thể dùng trực tiếp để Codex thiết kế, lập trình, kiểm thử và triển khai ShibaQuiz. Phần lớn nội dung dưới đây vẫn là bản đặc tả gốc (viết trước khi build) và đã được cập nhật ở các mục đánh dấu để khớp với hành vi thực tế hiện tại; với những chi tiết vận hành/triển khai mới nhất (biến môi trường đầy đủ, quy trình deploy, giới hạn hiện tại), `README.md` ở thư mục gốc là nguồn chính xác nhất — tài liệu này ưu tiên mô tả ý định sản phẩm/kiến trúc.

ShibaQuiz là web app giúp người dùng ôn luyện các kỳ thi theo chủ đề hoặc đề hoàn chỉnh, làm bài theo nhiều chế độ, trao đổi tại từng câu hỏi và xem lại lịch sử. Admin quản lý kỳ thi, chủ đề, câu hỏi, cấu trúc đề và người dùng.

## 2. Quyết định và giả định đã bổ sung

Các điểm dưới đây chưa được nêu rõ trong yêu cầu gốc và được chốt để tránh mơ hồ khi triển khai:

1. Giao diện MVP hỗ trợ tiếng Việt và tiếng Anh, mặc định tiếng Việt; thiết kế responsive cho desktop và mobile.
2. Hệ thống có hai vai trò: `USER` và `ADMIN`. Một tài khoản chỉ có một vai trò tại một thời điểm.
3. Mỗi câu hỏi thuộc đúng một kỳ thi và một chủ đề; hỗ trợ `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TRUE_FALSE`, `MATCHING` và `ORDERING`.
4. Mọi dạng câu hỏi chỉ được tính đúng khi toàn bộ câu trả lời chính xác; MVP không chấm điểm một phần cho lựa chọn, ghép cặp hoặc sắp xếp.
5. Mặc định mỗi câu đúng được 1 điểm, câu sai hoặc bỏ trống được 0 điểm; chưa hỗ trợ điểm âm.
6. Đề thi có thể cấu hình thời gian, điểm đạt, số câu, tỷ lệ câu theo chủ đề, trộn thứ tự câu và trộn đáp án.
7. Một lần làm bài là một `attempt`. Mỗi người dùng chỉ có tối đa một attempt `IN_PROGRESS` cho cùng một đề/cấu hình luyện tập; có thể tiếp tục hoặc bỏ attempt để làm lại.
8. Câu trả lời được autosave sau mỗi thay đổi và khi chuyển câu; tải lại trang hoặc đăng nhập lại vẫn tiếp tục được.
9. Comment chỉ dành cho người đã đăng nhập. Admin có quyền ẩn comment; người viết được sửa/xóa comment của mình.
10. Admin không được xem hay gán trực tiếp mật khẩu người dùng. Admin chỉ có thể khóa/mở khóa tài khoản, đổi vai trò và gửi link đặt lại mật khẩu.
11. **[Cập nhật]** Không có adapter ghi bằng JSON. Local development dùng PGlite (Postgres chạy embedded, dữ liệu nằm trong `data/` bị loại khỏi Git) qua cùng driver Postgres; production/Vercel bắt buộc `STORAGE_DRIVER=postgres` trỏ tới PostgreSQL thật. `STORAGE_DRIVER=pglite` bị từ chối khi `NODE_ENV=production` hoặc chạy trên Vercel.
12. MVP không có thanh toán, tổ chức/tenant, chứng chỉ, leaderboard, app mobile native hay nội dung do AI tạo.
13. MVP hỗ trợ hai locale `vi` (Tiếng Việt) và `en` (English). `vi` là locale mặc định; lựa chọn của user được lưu trong hồ sơ và cookie.
14. Đa ngôn ngữ gồm cả giao diện hệ thống và nội dung học. Nội dung dịch được lưu theo từng locale, không lưu hai ngôn ngữ chung trong một chuỗi.
15. Media được lưu ở object storage; database chỉ lưu metadata và object key. Không lưu binary/base64 trong PostgreSQL hoặc JSON và không ghi media vào filesystem runtime của Vercel.
16. `SINGLE_CHOICE` có 2–6 lựa chọn; `TRUE_FALSE` có đúng 2 lựa chọn; các dạng “nhiều” được giới hạn 2–20 item trong MVP để giới hạn payload, thời gian validate và độ phức tạp giao diện. `MULTIPLE_CHOICE` vẫn cần ít nhất hai đáp án đúng và một đáp án sai.
17. `MATCHING` dùng ID đích ghép độc lập và trộn danh sách đích; `ORDERING` luôn trộn thứ tự trình bày. Quan hệ ghép đúng, thứ tự đúng, cờ đúng và explanation không xuất hiện trong DTO trước thời điểm disclosure cho phép.
18. Answer của attempt là payload phân biệt theo loại câu hỏi và nằm trong localized immutable snapshot. Migration giữ `selectedOptionIds` cũ để tương thích, nhưng mọi nghiệp vụ mới đi qua repository và `answerPayload`.

## 3. Phạm vi

### 3.1. MVP bắt buộc

- Xác thực email có thể bật/tắt theo cấu hình triển khai và quản lý tài khoản.
- Danh sách kỳ thi, chủ đề và đề thi đã publish.
- Ba phạm vi luyện tập: theo chủ đề, đề hoàn chỉnh, toàn bộ ngân hàng câu hỏi của kỳ thi.
- Chế độ ôn tập và hai biến thể chế độ thi.
- Làm bài, autosave, đánh dấu câu, tiếp tục attempt, nộp bài và xem kết quả.
- Lịch sử làm bài.
- Comment theo câu hỏi và moderation cơ bản.
- Giao diện và email hệ thống bằng tiếng Việt/Anh; user chuyển ngôn ngữ mà không mất trạng thái làm bài.
- Nội dung kỳ thi, chủ đề, đề, câu hỏi, lựa chọn và giải thích hỗ trợ bản dịch Việt/Anh.
- Admin upload và gắn ảnh/audio/video vào câu hỏi; user xem/nghe/phát media trong lúc học và làm bài.
- Admin CRUD kỳ thi, chủ đề, câu hỏi, đề thi/cấu trúc đề.
- Import CSV/XLSX có preview, validation và báo cáo lỗi.
- Admin quản lý trạng thái/vai trò người dùng và audit log.
- Seed data, test tự động, tài liệu cài đặt và triển khai Vercel.

### 3.2. Ngoài phạm vi MVP

- Thanh toán/subscription, coupon và hóa đơn.
- Multi-tenant, lớp học hoặc doanh nghiệp.
- Thi giám sát, chống gian lận nâng cao.
- Social login, SSO/SAML.
- Thông báo realtime, chat realtime.
- Chấm điểm tự luận.
- Thống kê nâng cao, gợi ý học bằng AI và spaced repetition.

## 4. Thuật ngữ

| Thuật ngữ                           | Ý nghĩa                                                           |
| ----------------------------------- | ----------------------------------------------------------------- |
| Kỳ thi (`Exam`)                     | Nhóm nội dung cấp cao, ví dụ AWS SAA-C03                          |
| Chủ đề (`Topic`)                    | Phân nhóm câu hỏi trong một kỳ thi                                |
| Câu hỏi (`Question`)                | Một câu single-choice hoặc multiple-choice                        |
| Đề thi (`Test`)                     | Cấu hình tạo một bài hoàn chỉnh từ ngân hàng câu hỏi              |
| Attempt                             | Một lần người dùng bắt đầu làm bài                                |
| Locale                              | Mã ngôn ngữ của giao diện/nội dung; MVP gồm `vi` và `en`          |
| Media asset                         | File ảnh/audio/video lưu ở object storage và được gắn vào câu hỏi |
| Ôn tập (`STUDY`)                    | Hiển thị đáp án và giải thích trong quá trình học                 |
| Thi từng câu (`PRACTICE_IMMEDIATE`) | Chỉ hiện kết quả câu hiện tại sau khi kiểm tra đáp án             |
| Thi cuối bài (`EXAM_DEFERRED`)      | Không hiện đáp án cho đến khi nộp toàn bài                        |

## 5. Vai trò và phân quyền

| Chức năng                        | Guest | User | Admin |
| -------------------------------- | :---: | :--: | :---: |
| Xem landing page                 |   ✓   |  ✓   |   ✓   |
| Đăng ký/đăng nhập/quên mật khẩu  |   ✓   |  —   |   —   |
| Xem nội dung đã publish          |   —   |  ✓   |   ✓   |
| Làm bài và xem lịch sử của mình  |   —   |  ✓   |   ✓   |
| Comment                          |   —   |  ✓   |   ✓   |
| Sửa/xóa comment của mình         |   —   |  ✓   |   ✓   |
| Ẩn/khôi phục comment bất kỳ      |   —   |  —   |   ✓   |
| Quản lý kỳ thi/chủ đề/câu hỏi/đề |   —   |  —   |   ✓   |
| Import/export dữ liệu            |   —   |  —   |   ✓   |
| Quản lý user và xem audit log    |   —   |  —   |   ✓   |

Mọi API admin phải kiểm tra quyền ở server; ẩn nút trên giao diện không được coi là biện pháp phân quyền.

## 6. Yêu cầu chức năng chi tiết

### FR-01 — Đăng ký và xác minh email

- Người dùng đăng ký bằng tên hiển thị, email và mật khẩu.
- Email được chuẩn hóa về lowercase và phải duy nhất.
- Mật khẩu tối thiểu 10 ký tự; phải có ít nhất chữ và số.
- Form đăng ký phải yêu cầu nhập lại mật khẩu; client và server đều từ chối khi hai giá trị không khớp.
- Cấu hình server `REQUIRE_EMAIL_VERIFICATION` cho phép bật/tắt yêu cầu xác minh email, mặc định là `true`; thay đổi cấu hình có hiệu lực sau khi restart/deploy và không được tin cậy từ dữ liệu client gửi lên.
- Khi yêu cầu xác minh đang bật, gửi email xác minh với token một lần, hết hạn sau 24 giờ; chỉ tài khoản đã xác minh, được miễn xác minh hợp lệ và đang hoạt động mới được đăng nhập/làm bài/comment.
- Khi yêu cầu xác minh đang tắt, đăng ký không tạo token hoặc gửi email xác minh; tài khoản mới được ghi nhận miễn xác minh và có thể đăng nhập ngay. Tài khoản được miễn trong giai đoạn này vẫn đăng nhập được nếu cấu hình được bật lại, tránh khóa ngược người dùng.
- Tài khoản cũ chưa xác minh có thể đăng nhập trong thời gian yêu cầu đang tắt nhưng không tự động được miễn vĩnh viễn; khi bật lại, tài khoản đó phải xác minh email.
- Có chức năng gửi lại email xác minh trên giao diện public `vi`/`en`, kèm rate limit. Mỗi lần gửi hợp lệ vô hiệu hóa token chưa dùng trước đó và tạo token một lần mới có hạn 24 giờ.
- Resend luôn trả phản hồi chung để không tiết lộ tài khoản có tồn tại, đã xác minh, được miễn hay tính năng đang tắt. Khi yêu cầu xác minh đang tắt, resend không tạo token và không gửi email.

Tiêu chí chấp nhận:

- Không tạo hai tài khoản với cùng email, không phân biệt hoa thường.
- Token hết hạn/đã dùng trả về thông báo an toàn, không lộ dữ liệu nhạy cảm.
- Sau khi xác minh thành công, người dùng có thể đăng nhập.
- Có test cho cả hai giá trị của `REQUIRE_EMAIL_VERIFICATION`, bao gồm đăng ký, đăng nhập, authorization session và hành vi resend.
- UI đăng ký/verify/resend phải giải thích đúng trạng thái cấu hình bằng tiếng Việt và tiếng Anh, có trạng thái success/error truy cập được bằng assistive technology.

### FR-02 — Đăng nhập, đăng xuất và mật khẩu

- Đăng nhập bằng email + mật khẩu; thông báo lỗi không tiết lộ email có tồn tại hay không.
- Đăng xuất vô hiệu session hiện tại.
- Đổi mật khẩu yêu cầu mật khẩu hiện tại; sau khi đổi, vô hiệu các session khác.
- Form đặt lại/đổi mật khẩu phải yêu cầu xác nhận mật khẩu mới; client và server đều từ chối khi hai giá trị không khớp.
- Quên mật khẩu gửi link một lần, hết hạn sau 60 phút.
- Token xác minh/reset chỉ lưu dạng hash trong database.
- Tài khoản bị khóa không được tạo session mới.

### FR-03 — Khám phá nội dung

- Trang danh sách chỉ hiển thị kỳ thi `PUBLISHED`.
- Cho phép tìm theo tên/mã kỳ thi.
- Trang chi tiết kỳ thi hiển thị mô tả, số chủ đề, số câu đã publish và các đề đã publish.
- User chọn một trong ba phạm vi:
  - `TOPIC`: chọn một chủ đề và luyện các câu trong chủ đề đó.
  - `FULL_TEST`: chọn một đề thi đã cấu hình.
  - `QUESTION_BANK`: luyện toàn bộ câu đã publish của kỳ thi.
- Trước khi bắt đầu, user chọn chế độ làm bài và xem tóm tắt số câu/thời gian.

### FR-04 — Chế độ làm bài

#### STUDY

- Hiển thị câu hỏi, toàn bộ lựa chọn, đáp án đúng và giải thích ngay khi mở câu.
- Không tính điểm chính thức nhưng vẫn ghi tiến độ và hoàn thành vào lịch sử với mode `STUDY`.

#### PRACTICE_IMMEDIATE

- User chọn đáp án rồi nhấn “Kiểm tra”.
- Sau khi kiểm tra, câu hiện tại bị khóa trong attempt, hiển thị đúng/sai, đáp án đúng và giải thích.
- Không cho đổi đáp án của câu đã kiểm tra.

#### EXAM_DEFERRED

- Không hiển thị đúng/sai, đáp án hoặc giải thích trước khi nộp.
- User được thay đổi câu trả lời cho đến khi nộp hoặc hết giờ.
- Sau khi submit, hiển thị kết quả và review toàn bài.
- **[Cập nhật]** Với phạm vi `TOPIC` ("thi thật" theo chủ đề), user tự chọn thời gian làm bài (phút, 1–600) khi bắt đầu attempt thay vì dùng thời gian cố định của đề; cơ chế đếm ngược/tự nộp khi hết giờ dùng chung hạ tầng đã có cho `FULL_TEST`. Với `FULL_TEST`, thời gian vẫn lấy từ cấu hình đề do admin đặt (không đổi).

### FR-05 — Tạo nội dung của attempt

- Với `FULL_TEST`, hệ thống lấy snapshot câu hỏi theo cấu hình đề tại thời điểm bắt đầu.
- Với đề cố định, dùng danh sách câu đã gán cho đề.
- Với đề sinh động, chọn ngẫu nhiên câu đã publish theo số lượng/tỷ lệ từng chủ đề.
- Nếu tỷ lệ sinh số lẻ, phân bổ theo phương pháp phần dư lớn nhất; tổng cuối cùng phải đúng `questionCount`.
- Không được tạo attempt nếu ngân hàng không đủ câu; trả thông báo chỉ rõ chủ đề thiếu cho admin, thông báo thân thiện cho user.
- Snapshot phải giữ nguyên nội dung, lựa chọn, đáp án và giải thích của attempt dù admin sửa câu hỏi về sau.
- Thứ tự câu/đáp án được lưu trong snapshot để resume không bị thay đổi.

### FR-06 — Trải nghiệm làm bài

- Hiển thị số thứ tự, nội dung, lựa chọn, điều hướng trước/sau và bảng điều hướng toàn bài.
- Mỗi câu có trạng thái: chưa trả lời, đã trả lời, đã đánh dấu, đã kiểm tra. **[Cập nhật]** Ở `PRACTICE_IMMEDIATE`, bảng điều hướng còn tô riêng màu cho câu đã kiểm tra nhưng trả lời sai (khác màu với "đã trả lời" thông thường), dựa trên `isCorrect` trả về sau khi kiểm tra.
- User có thể đánh dấu/bỏ đánh dấu câu. **[Cập nhật]** Việc đánh dấu vẫn thực hiện được sau khi câu đã bị khóa do đã kiểm tra — chỉ nội dung đáp án là bị khóa, cờ đánh dấu là ghi chú cá nhân độc lập với đáp án.
- Autosave đáp án và cờ đánh dấu, có trạng thái "Đang lưu/Đã lưu/Lỗi lưu".
- Autosave debounce tối đa 500 ms và retry khi lỗi mạng tạm thời.
- Khi rời trang có dữ liệu chưa lưu, hiển thị cảnh báo.
- Nếu có thời gian, server lưu `startedAt` và `expiresAt`; client chỉ hiển thị đếm ngược. Server là nguồn thời gian chuẩn.
- Hết giờ, server tự coi attempt là đã nộp ở request tiếp theo; client chủ động submit khi đồng hồ về 0.
- **[Cập nhật]** Ngay khi đáp án của một câu được công bố (đã kiểm tra ở `PRACTICE_IMMEDIATE`, hoặc `STUDY`), khung thảo luận (xem FR-09) của câu đó hiển thị ngay trong màn làm bài, không phải đợi đến trang kết quả; khung thảo luận mặc định mở sẵn và nằm dưới nút điều hướng trước/sau để không phải cuộn khi chuyển câu.

### FR-07 — Nộp bài và kết quả

- Trước khi nộp sớm, hiển thị số câu chưa trả lời và yêu cầu xác nhận.
- Submit phải idempotent: gọi lặp lại không tạo nhiều kết quả.
- Điểm phần trăm = `số câu đúng / tổng số câu * 100`, làm tròn 2 chữ số.
- Kết quả gồm: điểm, đạt/không đạt, số đúng/sai/bỏ trống, thời gian làm và thống kê theo chủ đề.
- Review hiển thị đáp án user, đáp án đúng và explanation.
- Attempt đã submit là bất biến đối với user.
- **[Cập nhật]** Màn review dùng layout hai cột giống màn làm bài: chỉ hiển thị một câu tại một thời điểm bên trái, kèm nút Trước/Sau; bên phải là bảng điều hướng dạng lưới (tô màu đúng/sai/bỏ trống) cho phép nhảy thẳng tới câu bất kỳ, không cuộn tuần tự qua toàn bộ danh sách câu.
- **[Cập nhật]** Với mỗi topic, trang bắt đầu làm bài của topic đó hiển thị lịch sử tối đa 10 lần làm bài gần nhất đã hoàn tất thuộc phạm vi `TOPIC` (cả `PRACTICE_IMMEDIATE` và `EXAM_DEFERRED`, không gồm `STUDY`), mỗi dòng có ghi rõ chế độ, kèm liên kết xem toàn bộ lịch sử của kỳ thi đã lọc sẵn.

### FR-08 — Lịch sử

- Danh sách attempt của user hiện tại, mới nhất trước.
- Lọc theo kỳ thi, mode, trạng thái và khoảng ngày.
- Hiển thị tên kỳ thi/đề, mode, thời gian bắt đầu, trạng thái, điểm và thời lượng.
- Attempt `IN_PROGRESS` có nút tiếp tục; attempt hoàn tất có nút xem chi tiết.
- User không thể truy cập attempt của người khác.

### FR-09 — Comment theo câu hỏi

- Thread comment gắn với `questionId`, không gắn với snapshot riêng của attempt; dùng chung một thread cho mọi attempt đã dùng câu hỏi đó.
- Nội dung plain text, 1–2.000 ký tự; render dưới dạng text thuần (escape HTML) nhưng **[Cập nhật]** vẫn giữ nguyên định dạng xuống dòng người dùng đã nhập khi hiển thị (`white-space: pre-wrap`), không gộp thành một dòng.
- Sắp xếp cũ đến mới, phân trang khi quá 50 comment (cursor pagination, nút "Tải thêm").
- User được tạo, sửa, xóa mềm comment của mình.
- Admin được ẩn/khôi phục comment và lưu lý do moderation.
- Không hỗ trợ attachment, rich text, reply lồng nhau hoặc realtime trong MVP.
- **[Cập nhật]** Không có route riêng `/questions/[id]/discussion`; khung thảo luận là một component nhúng (`CommentThread`) xuất hiện ngay trong màn làm bài (khi đáp án của câu đã được công bố) và trong màn xem lại kết quả — mặc định mở sẵn, tự tải trang bình luận đầu tiên khi hiển thị.
- **[Cập nhật]** Nếu một câu hỏi bị admin xóa vĩnh viễn (xem FR-11), toàn bộ comment của câu đó bị xóa theo (cascade); các attempt-question snapshot từng tham chiếu câu hỏi đó chỉ mất liên kết tới câu hỏi sống (không còn mở được khung thảo luận), nội dung snapshot để xem lại kết quả không bị ảnh hưởng.

### FR-10 — Admin quản lý kỳ thi và chủ đề

- CRUD kỳ thi: mã duy nhất, tên, mô tả, trạng thái `DRAFT/PUBLISHED/ARCHIVED`.
- CRUD chủ đề trong một kỳ thi: tên, mô tả, thứ tự hiển thị.
- Kỳ thi/chủ đề/đề thi chỉ hard-delete được sau khi đã chuyển `ARCHIVED`; không hard-delete bản ghi đang được tham chiếu (ví dụ câu hỏi còn trong một đề cố định đã publish) — xem thêm ràng buộc chi tiết ở FR-11 cho câu hỏi.
- Chỉ publish kỳ thi khi có ít nhất một chủ đề và một câu hỏi hợp lệ đã publish.
- **[Cập nhật]** Mỗi chủ đề có nút "Nhân bản": mở lại dialog tạo/sửa, điền sẵn toàn bộ dữ liệu của chủ đề được chọn (không mang theo ID) để admin chỉnh sửa nhanh rồi lưu thành chủ đề mới, tiết kiệm thời gian nhập liệu khi tạo nhiều chủ đề tương tự nhau. Slug được tự thêm hậu tố để tránh trùng (slug là duy nhất theo từng kỳ thi).

### FR-11 — Admin quản lý câu hỏi

- Trường bắt buộc: kỳ thi, chủ đề, loại, nội dung localized và cấu trúc trả lời hợp lệ. Explanation localized là tùy chọn (0–20.000 ký tự).
- `SINGLE_CHOICE`: 2–6 lựa chọn, đúng một đáp án đúng.
- `MULTIPLE_CHOICE`: 2–20 lựa chọn, ít nhất hai đáp án đúng và ít nhất một đáp án sai.
- `TRUE_FALSE`: đúng hai lựa chọn Đúng/Sai và đúng một đáp án đúng.
- `MATCHING`: 2–20 cặp; cả vế trái và vế đích phải đủ bản dịch cho mọi locale được publish.
- `ORDERING`: 2–20 bước; `displayOrder` trong ngân hàng câu hỏi là thứ tự chuẩn nhưng không được phát nguyên trạng cho attempt.
- Editor và import/export phải hỗ trợ đủ năm loại; validation cấu trúc chạy ở domain trước transaction ghi dữ liệu.
- Cho phép trạng thái `DRAFT/PUBLISHED/ARCHIVED`.
- CRUD thủ công; tìm/lọc theo kỳ thi, chủ đề, loại, trạng thái và từ khóa. **[Cập nhật]** Riêng danh sách câu hỏi dùng phân trang số ở server (trang mặc định 20 dòng, có tổng số kết quả), vì đây là bảng có quy mô lớn nhất trong admin; các bảng exam/topic/test khác vẫn tải toàn bộ do quy mô nhỏ.
- **[Cập nhật]** Chuyển trạng thái sang `ARCHIVED` (dù qua nút xóa từng dòng hay đổi trạng thái hàng loạt) chính là soft delete: luôn đi qua cùng một guard, luôn đánh dấu `deletedAt`, và từ đó câu hỏi không thể sửa được nữa — không còn khái niệm "archived nhưng chưa thật sự xóa". Archive bị chặn nếu câu hỏi còn nằm trong danh sách câu cố định của một đề (`FIXED`) đang `PUBLISHED`.
- **[Cập nhật]** Sau khi đã soft-delete, câu hỏi có thể được **xóa vĩnh viễn (hard delete)** khỏi database khi thỏa một trong hai điều kiện: (a) đã qua bước soft-delete ở trên, hoặc (b) chủ đề của câu hỏi đó hiện không còn `PUBLISHED` (không thể bị học viên tiếp cận) — trường hợp này cho phép xóa thẳng mà không cần soft-delete trước. Trong mọi trường hợp, hard-delete vẫn bị chặn nếu câu hỏi còn nằm trong một đề `FIXED` đang publish. Hard-delete **không** còn bị chặn bởi việc câu hỏi đã từng xuất hiện trong lịch sử làm bài hoặc còn bình luận: snapshot của attempt cũ (`AttemptQuestion.questionSnapshot`) là bản sao độc lập nên vẫn xem lại được đầy đủ điểm/đáp án/giải thích sau khi câu hỏi gốc bị xóa (chỉ mất khả năng mở lại khung thảo luận cho câu đó); bình luận của câu hỏi bị xóa theo (cascade).
- Lưu `createdBy`, `updatedBy`, timestamps và audit event; hành động archive/hard-delete ghi log tách biệt (`CONTENT_QUESTION_SOFT_DELETED` / `CONTENT_QUESTION_HARD_DELETED`).

### FR-12 — Admin quản lý đề thi

- CRUD đề: kỳ thi, tên, mô tả, trạng thái, kiểu `FIXED/DYNAMIC`, số câu, thời gian phút hoặc không giới hạn, điểm đạt, shuffle questions, shuffle options.
- `FIXED`: admin chọn danh sách câu và thứ tự; số câu bằng số câu được chọn.
- `DYNAMIC`: admin nhập tỷ lệ phần trăm theo chủ đề; tổng phải bằng 100% và đủ nguồn câu.
- Preview số câu thực tế mỗi chủ đề trước khi lưu/publish.
- Khi sửa đề, attempt đã tạo không thay đổi.

### FR-13 — Import CSV/XLSX

Luồng import gồm bốn bước:

1. Tải file hoặc tải template mẫu.
2. Parse và preview tối đa 100 dòng đầu.
3. Validate toàn bộ file, hiển thị lỗi theo sheet/dòng/cột; mỗi dòng lỗi kèm `external_id` (nếu có) và toàn bộ lỗi cần sửa.
4. Chỉ commit khi không có lỗi nghiêm trọng và admin xác nhận.

Yêu cầu:

- Hỗ trợ `.csv` UTF-8 và `.xlsx`; giới hạn mặc định 10 MB và 10.000 dòng/file.
- Với XLSX, đọc sheet đầu tiên hoặc sheet tên `questions`.
- Import chạy trong transaction: lỗi khi commit phải rollback toàn bộ.
- Khi admin xác nhận, API chỉ validate/stage và trả về `ImportJob`; việc ghi câu hỏi chạy nền. Admin có thể xem trạng thái, tiến độ, log đã loại dữ liệu nhạy cảm và retry job thất bại.
- File nguồn không được lưu binary trong database hoặc runtime filesystem. Sau validation, từng dòng được chuẩn hóa và stage trong PostgreSQL qua repository; worker phải revalidate trước transaction commit.
- Worker dùng lease để tránh xử lý trùng, có cơ chế recovery cho job bị gián đoạn và chỉ đánh dấu `COMPLETED` trong cùng transaction ghi nội dung.
- Hỗ trợ `CREATE_ONLY` và `UPSERT_BY_EXTERNAL_ID`.
- Không dùng nội dung câu hỏi làm khóa định danh.
- Sinh báo cáo số dòng tạo mới/cập nhật/bỏ qua/lỗi.
- Escape dữ liệu khi export CSV để giảm nguy cơ CSV formula injection.
- Các cột nội dung dùng hậu tố locale `_vi`/`_en`. Dòng có thể được lưu `DRAFT` khi chỉ có ngôn ngữ chính; chỉ được `PUBLISHED` cho locale đã đủ toàn bộ trường bắt buộc.
- Trong riêng luồng import, nếu một ô localized `_vi` hoặc `_en` để trống nhưng ô tương ứng ở ngôn ngữ còn lại có dữ liệu, hệ thống sao chép nguyên văn dữ liệu đó sang ô thiếu trước khi validation. Quy tắc áp dụng độc lập cho question content, explanation, option content và matching target. Nếu cả hai ô đều trống, chỉ các trường bắt buộc mới làm import lỗi; explanation được chuẩn hóa thành chuỗi rỗng.
- Spreadsheet không chứa binary hoặc URL media tùy ý. Cột `media_ids` chỉ tham chiếu các asset `READY` đã upload vào thư viện và admin có quyền sử dụng.

Schema import chuẩn:

| Cột                                    | Bắt buộc | Quy tắc/ví dụ                                                                |
| -------------------------------------- | :------: | ---------------------------------------------------------------------------- |
| `external_id`                          |    ✓     | ID ổn định trong nguồn import, ví dụ `SAA-001`                               |
| `exam_code`                            |    ✓     | Mã kỳ thi đã tồn tại                                                         |
| `topic_name_vi`, `topic_name_en`       |    ✓*    | Bắt buộc cho locale được publish; tạo topic mới chỉ khi import cho phép      |
| `question_type`                        |    ✓     | `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TRUE_FALSE`, `MATCHING` hoặc `ORDERING` |
| `question_text_vi`, `question_text_en` |    ✓*    | 1–10.000 ký tự; bắt buộc cho locale được publish                             |
| `option_a_vi` ... `option_h_vi`        |    ✓*    | Ít nhất A và B cho tiếng Việt; tối đa 8 lựa chọn                             |
| `option_a_en` ... `option_h_en`        |    ✓*    | Cùng option identity với bản Việt; bắt buộc khi publish English              |
| `correct_options`                      |    ✓     | Danh sách chữ cái phân cách bằng `                                           | `, ví dụ `A | C`  |
| `explanation_vi`, `explanation_en`     |    —     | Tùy chọn, 0–20.000 ký tự; nếu chỉ có một locale thì tự điền sang locale kia  |
| `media_ids`                            |    —     | Danh sách asset ID trạng thái `READY`, phân cách bằng `                      | `           |
| `status`                               |    —     | Mặc định `DRAFT`; `PUBLISHED` chỉ nếu dòng hợp lệ                            |
| `tags`                                 |    —     | Phân cách bằng `                                                             | `           |

### FR-14 — Admin quản lý user

- Tìm theo email/tên; lọc vai trò, trạng thái xác minh và trạng thái khóa.
- Xem thông tin cơ bản và số attempt, không hiển thị password hash/token.
- Khóa/mở khóa tài khoản; khóa phải vô hiệu toàn bộ session.
- Đổi vai trò `USER/ADMIN`; không cho admin tự hạ quyền nếu đó là admin hoạt động cuối cùng.
- Gửi email reset mật khẩu thay vì nhập mật khẩu thay user.
- Mọi thay đổi phải có audit log gồm actor, action, target, thời gian và metadata an toàn.

### FR-15 — Đa ngôn ngữ Việt/Anh

#### Giao diện hệ thống

- Toàn bộ navigation, label, validation, thông báo lỗi, trạng thái làm bài và email template có bản `vi` và `en`.
- User có thể đổi ngôn ngữ từ header hoặc trang tài khoản; thay đổi có hiệu lực ngay và không làm mất answer/attempt state.
- Thứ tự ưu tiên locale: lựa chọn trong hồ sơ → cookie → `Accept-Language` → `vi`.
- Route dùng locale prefix `/vi/...` và `/en/...`, hoặc một chiến lược i18n tương đương nhưng phải tạo URL ổn định và không nhân đôi logic nghiệp vụ.
- Format ngày, giờ, số và phần trăm theo locale; dữ liệu gốc vẫn lưu UTC và giá trị số chuẩn.
- Không dùng chuỗi giao diện hard-code trong component; translation key phải typed hoặc được kiểm tra tự động.

#### Nội dung học

- `Exam`, `Topic`, `Test`, `Question`, `QuestionOption` và caption/transcript của media có bản dịch theo locale.
- Mỗi kỳ thi có `primaryLocale` và `enabledLocales`. MVP chỉ chấp nhận `vi`, `en`.
- Nội dung được quản lý trong các bản ghi translation riêng với cùng entity ID; đáp án đúng và cấu trúc đề là dữ liệu trung lập ngôn ngữ.
- Admin editor có tab Tiếng Việt/English và chỉ báo phần dịch còn thiếu.
- Một locale của kỳ thi chỉ được bật cho user khi toàn bộ nội dung `PUBLISHED` cần thiết của locale đó đã đủ. Nhờ vậy một attempt không trộn tiếng Việt và tiếng Anh ngoài chủ ý.
- Nếu URL yêu cầu locale chưa được bật cho kỳ thi, fallback về `primaryLocale` và hiển thị thông báo; không trả lỗi trắng.
- `Attempt` lưu `locale`; toàn bộ `questionSnapshot`, option và explanation được chụp theo locale đó. Đổi ngôn ngữ giao diện giữa attempt không tự đổi ngôn ngữ snapshot.
- Search hỗ trợ tên/mã ở locale hiện tại; mã kỳ thi luôn trung lập ngôn ngữ.

Tiêu chí chấp nhận:

- User chuyển toàn bộ UI giữa Việt/Anh và preference được giữ sau lần đăng nhập tiếp theo.
- Cùng một câu hỏi hiển thị đúng bản dịch theo locale nhưng dùng chung loại câu, option identity và đáp án đúng.
- Không publish/bật locale English cho kỳ thi nếu còn câu hỏi bắt buộc thiếu `question` hoặc option tiếng Anh; explanation có thể để trống.

### FR-16 — Media trong nội dung câu hỏi

- Admin có thể upload media vào thư viện và gắn vào phần thân câu hỏi. Một asset có thể được tái sử dụng; một câu hỏi có tối đa 5 asset trong MVP.
- Loại hỗ trợ mặc định:
  - Ảnh: JPEG, PNG, WebP, GIF; tối đa 5 MB/file.
  - Audio: MP3, M4A/AAC, OGG; tối đa 25 MB/file.
  - Video: MP4/H.264 và WebM; tối đa 100 MB/file.
- Không chấp nhận SVG/HTML hoặc định dạng có thể chứa script trong MVP.
- Kích thước, loại MIME khai báo và file signature phải được kiểm tra ở server; giới hạn có thể cấu hình qua environment variables.
- Upload trực tiếp từ browser đến object storage bằng signed upload URL ngắn hạn. Server tạo record `PENDING`, chỉ chuyển thành `READY` sau khi xác minh object tồn tại và metadata hợp lệ.
- Media mới chỉ được hiển thị khi trạng thái `READY`; asset lỗi/quarantine không xuất hiện với user.
- Admin nhập alt text cho ảnh, caption cho audio/video và transcript khi nội dung media mang thông tin cần thiết. Các trường này hỗ trợ `vi`/`en`.
- UI dùng image responsive/lazy loading; audio/video dùng native controls, không autoplay, giữ đúng aspect ratio và có trạng thái tải/lỗi.
- Snapshot attempt lưu tham chiếu bất biến gồm asset ID, object version/key và localized accessibility text để admin thay file sau này không làm đổi attempt cũ.
- Xóa asset là soft delete. Không xóa object còn được câu hỏi hoặc attempt snapshot tham chiếu; job dọn file mồ côi chỉ xóa asset `PENDING` quá hạn hoặc asset không còn reference sau retention period.
- Object key do server sinh, không dùng trực tiếp tên file user. Bucket production là private; quyền đọc dùng signed URL ngắn hạn hoặc authenticated proxy phù hợp.
- Admin có thể xem preview, thay thứ tự, gỡ liên kết và xem upload status. Thay file tạo asset/version mới thay vì ghi đè âm thầm.

Tiêu chí chấp nhận:

- File hợp lệ upload, preview và xuất hiện đúng thứ tự trong câu hỏi ở cả study/exam/review.
- File sai loại, vượt size hoặc giả MIME bị từ chối với thông báo rõ ràng.
- User không có quyền không thể lấy signed URL của media thuộc nội dung chưa publish.
- Audio/video không autoplay và dùng được bằng bàn phím; ảnh có alt text theo locale.

## 7. Màn hình và route

Mọi route (trừ nhóm `/admin`) đều có tiền tố locale `/vi/...` hoặc `/en/...` theo FR-15; bảng dưới đây bỏ tiền tố cho gọn.

| Route đề xuất                                           | Màn hình                                     | Quyền       |
| -------------------------------------------------------- | --------------------------------------------- | ----------- |
| `/`                                                      | Landing page                                  | Public      |
| `/register`, `/login`                                    | Xác thực                                      | Public      |
| `/verify-email`, `/forgot-password`, `/reset-password`   | Xác thực email/mật khẩu                       | Public      |
| `/exams`                                                 | Danh sách kỳ thi                              | User        |
| `/exams/[examSlug]`                                      | Chi tiết kỳ thi (danh sách chủ đề/đề)         | User        |
| `/exams/[examSlug]/start`                                | **[Cập nhật]** Chọn phạm vi/chế độ, xem lịch sử thi thật của chủ đề (FR-07) | User        |
| `/attempts/[attemptId]`                                  | Làm/tiếp tục bài                              | Owner/Admin |
| `/attempts/[attemptId]/result`                           | Kết quả/review (layout 1 câu + lưới điều hướng, FR-07) | Owner/Admin |
| `/history`                                               | Lịch sử cá nhân                               | User        |
| `/account`                                               | Hồ sơ/đổi mật khẩu                            | User        |
| `/admin`                                                 | Dashboard admin                               | Admin       |
| `/admin/exams`, `/admin/topics`                          | Quản lý nội dung                              | Admin       |
| `/admin/questions`, `/admin/import`                      | Ngân hàng (có phân trang, FR-11)/import       | Admin       |
| `/admin/media`                                           | Thư viện và trạng thái media                  | Admin       |
| `/admin/tests`                                           | Quản lý cấu trúc đề                           | Admin       |
| `/admin/users`, `/admin/audit`                           | User/audit log                                | Admin       |

**[Cập nhật]** Không có route riêng cho khung thảo luận (`/questions/[id]/discussion` không tồn tại) — xem FR-09. Khu vực `/admin` dùng layout sidebar bên trái cố định (không phải thanh điều hướng ngang trên cùng), gập lại thành thanh ngang ở màn hình hẹp (≤60rem).

Trạng thái loading, empty, error, forbidden và success phải được thiết kế cho mọi màn hình dữ liệu.

## 8. Mô hình dữ liệu logic

Mọi ID dùng UUID hoặc ULID; mọi bảng chính có `createdAt`, `updatedAt`. Thời gian lưu UTC, hiển thị theo timezone người dùng.

### User

- `id`, `email` (unique, normalized), `displayName`
- `passwordHash`, `role`, `emailVerifiedAt`
- `status` (`ACTIVE/LOCKED`), `lockedAt`, `lastLoginAt`
- `preferredLocale` (`vi/en`, nullable)

### AuthToken / Session

- Token xác minh và reset: `id`, `userId`, `type`, `tokenHash`, `expiresAt`, `usedAt`
- Session: tùy cơ chế auth nhưng phải hỗ trợ revoke theo user

### Exam

- `id`, `code` (unique), `slug` (unique), `primaryLocale`, `enabledLocales`, `status`
- Text theo locale nằm trong `ExamTranslation(examId, locale, name, description)`; unique `(examId, locale)`

### Topic

- `id`, `examId`, `slug`, `displayOrder`, `status`
- Text theo locale nằm trong `TopicTranslation(topicId, locale, name, description)`
- Unique `(examId, slug)`

### Question

- `id`, `externalId` (nullable), `examId`, `topicId`, `type`
- `status`, `version`; text nằm trong `QuestionTranslation(questionId, locale, content, explanation)`
- `createdBy`, `updatedBy`, `deletedAt`
- Unique `(examId, externalId)` khi `externalId` không null

### QuestionOption

- `id`, `questionId`, `label`, `isCorrect`, `displayOrder`
- Text theo locale nằm trong `QuestionOptionTranslation(optionId, locale, content)`

`isCorrect` chỉ được trả về từ server trong STUDY, sau khi câu đã check ở PRACTICE_IMMEDIATE, hoặc sau submit ở EXAM_DEFERRED.

### Test

- `id`, `examId`, `type`, `status`; text nằm trong `TestTranslation(testId, locale, name, description)`
- `questionCount`, `durationMinutes`, `passingScorePercent`
- `shuffleQuestions`, `shuffleOptions`

### TestTopicRule / TestQuestion

- Rule động: `testId`, `topicId`, `percentage`
- Đề cố định: `testId`, `questionId`, `displayOrder`

### Attempt

- `id`, `userId`, `examId`, `testId` nullable
- `scope`, `mode`, `status` (`IN_PROGRESS/SUBMITTED/EXPIRED/ABANDONED`)
- `locale` (`vi/en`) cố định cho nội dung snapshot
- `startedAt`, `expiresAt`, `submittedAt`, `lastActivityAt`
- `scorePercent`, `correctCount`, `incorrectCount`, `unansweredCount`
- `generationConfigSnapshot` JSON

### AttemptQuestion

- `id`, `attemptId`, `sourceQuestionId`, `topicId`, `displayOrder`
- `questionSnapshot` JSON chứa nội dung localized, options và media references theo đúng thứ tự đã phát
- `answerPayload` JSON phân biệt `CHOICE/MATCHING/ORDERING`; giữ `selectedOptionIds` trong giai đoạn tương thích migration
- `isFlagged`, `checkedAt`, `isCorrect`
- `answeredAt`, `updatedAt`

### Comment

- `id`, `questionId`, `userId`, `content`, `status` (`VISIBLE/HIDDEN/DELETED`)
- `editedAt`, `moderatedBy`, `moderationReason`

### MediaAsset / MediaTranslation / QuestionMedia

- `MediaAsset`: `id`, `type` (`IMAGE/AUDIO/VIDEO`), `status` (`PENDING/READY/QUARANTINED/DELETED`)
- `objectKey`, `objectVersion` nullable, `originalFileName`, `mimeType`, `sizeBytes`, `checksum`, `width`, `height`, `durationSeconds`
- `createdBy`, `readyAt`, `deletedAt`
- `MediaTranslation`: `mediaAssetId`, `locale`, `altText`, `caption`, `transcript`; unique `(mediaAssetId, locale)`
- `QuestionMedia`: `questionId`, `mediaAssetId`, `displayOrder`; unique `(questionId, mediaAssetId)`

### ImportJob

- `id`, `fileName`, `examId`, `mode`, `status`, `createdBy`
- `totalRows`, `processedRows`, `createdCount`, `updatedCount`, `attemptCount`
- `summary` JSON, `errorReport` JSON, `errorMessage`, lease/start/completion timestamps
- `ImportJobRow` lưu payload đã chuẩn hóa theo dòng; `ImportJobLog` lưu event/log an toàn để Admin theo dõi.

### AuditLog

- `id`, `actorUserId`, `action`, `entityType`, `entityId`
- `metadata` JSON đã loại dữ liệu nhạy cảm, `ipHash` nullable, `createdAt`

## 9. API và quy ước server

Có thể dùng Route Handlers hoặc Server Actions, nhưng nghiệp vụ phải nằm trong service/domain layer độc lập với UI.

Nhóm endpoint tối thiểu:

- `/api/auth/*`: register, verify, resend, login/logout, password flows.
- `/api/exams`, `/api/exams/:id/topics`, `/api/tests/:id`.
- `/api/attempts`: create/list; `/:id`: read; `/:id/answers`: save; `/:id/submit`: submit.
- `/api/questions/:id/comments` và `/api/comments/:id`.
- `/api/media/:id/access`: cấp quyền đọc media theo user/nội dung.
- `/api/admin/exams|topics|questions|tests|users|imports|audit-logs`.
- `/api/admin/media/uploads`: tạo signed upload; `/complete`: finalize và validate; `/api/admin/media/:id`: quản lý asset.

Quy ước:

- Validate input ở server bằng schema dùng chung.
- Response lỗi có `code`, `message`, `fieldErrors?`, `requestId` và HTTP status đúng.
- Mutation quan trọng dùng transaction.
- Pagination cursor cho comments/audit/history/media/users. **[Cập nhật]** Bảng câu hỏi trong admin dùng pagination trang (numbered, `page`/`pageSize`, trả kèm `totalCount`) vì đây là bảng có quy mô lớn nhất; các bảng admin còn lại (exam/topic/test) hiện vẫn tải toàn bộ trong một lần gọi do quy mô nhỏ — chỉ nên áp dụng pagination trang tương tự nếu quy mô dữ liệu tăng đáng kể.
- Không log mật khẩu, token, cookie, đáp án chưa được phép công bố hoặc toàn bộ file import.
- API nhận locale hợp lệ và không để locale từ client thay đổi logic chấm điểm.
- API autosave và submit phải kiểm tra owner, trạng thái attempt và thời hạn ở server.

## 10. Kiến trúc kỹ thuật đề xuất

### Stack

**[Cập nhật]** Danh sách dưới đây là lựa chọn gốc trước khi build; các mục có ghi chú `(đã chọn)` là quyết định cuối cùng đang chạy trong implementation hiện tại.

- Next.js App Router + TypeScript strict mode. (đã chọn)
- React và server components mặc định; client components chỉ cho phần tương tác cần thiết. (đã chọn)
- Tailwind CSS + bộ component accessible (ví dụ shadcn/ui/Radix). **[Cập nhật]** Thực tế dùng CSS thuần (global stylesheet, quy ước class riêng của dự án) thay vì component library ngoài; Tailwind chỉ còn ở tầng preflight/tooling.
- Thư viện i18n hỗ trợ Next.js App Router, locale routing và server components; message catalog tách `vi`/`en`. (đã chọn — catalog tự viết, kiểm tra parity key trong CI)
- PostgreSQL production; **[Cập nhật]** ORM/migration dùng **Drizzle ORM** (đã chọn, không còn phân vân với Prisma).
- Auth tự quản lý bằng session cookie an toàn (đã chọn, không dùng Auth.js).
- bcrypt với cost cấu hình được (`AUTH_BCRYPT_COST`) để hash mật khẩu. (đã chọn)
- Zod cho validation; thư viện đọc XLSX duy trì tốt và hỗ trợ chạy server-side. (đã chọn)
- Vitest cho unit/integration. **[Cập nhật]** Chưa có bộ E2E (Playwright) hay accessibility (axe) tự động; các luồng attempt/media/import/comment/admin-user hiện được phủ bởi test integration/unit và kiểm thử thủ công — xem NFR-04 và mục 15.
- Object storage production dùng **S3-compatible** (client tự chọn provider qua `MEDIA_S3_*`); local dev dùng MinIO qua cùng driver S3. **[Cập nhật]** Không có driver ghi filesystem cục bộ cho media ở bất kỳ môi trường nào — kể cả local dev cũng bắt buộc object storage (MinIO) khi cần test luồng media.

### Storage abstraction

Domain/service không đọc/ghi file trực tiếp. Repository interfaces theo từng feature area (`AdminContentRepository`, `AttemptRepository`, `AuthRepository`, `MediaRepository`, `CommentRepository`, `ImportRepository`, `AdminUserRepository`, `AuditLogRepository`...) — **[Cập nhật]** không dùng một "unit-of-work" chung, mỗi feature area có repository/transaction riêng; media đi qua `MediaStorage` độc lập với metadata repository.

- **[Cập nhật]** Không có `JsonRepository`/driver ghi JSON. Local development dùng **PGlite** (Postgres embedded chạy trong tiến trình Node, dữ liệu nằm ở `data/pglite` bị loại khỏi Git) qua cùng code path Postgres — không phải một adapter riêng biệt.
- `PostgresRepository` (Drizzle + `postgres-js`): production và staging; bắt buộc khi `STORAGE_DRIVER=postgres`.
- Chọn adapter bằng `STORAGE_DRIVER=postgres|pglite`; `pglite` bị từ chối ngoài local development (kiểm tra ở tầng cấu hình khi `NODE_ENV=production` hoặc `VERCEL=1`).
- Migration chạy bằng Drizzle Kit (`npm run db:generate`, `npm run db:migrate`); **[Cập nhật]** không có script migrate dữ liệu JSON→Postgres vì chưa từng có dữ liệu JSON để migrate.

Lý do: filesystem của serverless/edge không phải kho dữ liệu ghi bền vững; dữ liệu quan hệ của quiz cần transaction, foreign key và truy vấn lịch sử. PostgreSQL serverless có thể bắt đầu ở free tier và mở rộng mà không đổi domain layer.

### Cấu trúc source đề xuất

**[Cập nhật]** Cây dưới đây là cấu trúc gốc trước khi build. Cấu trúc thực tế không có `src/features/` hay `src/lib/`; nghiệp vụ mỗi feature nằm trực tiếp trong `domain/<feature>` (types, zod schema, repository interface) và `server/{repositories,services}/<feature>` (implementation Drizzle + service passthrough), theo đúng nguyên tắc domain không phụ thuộc UI/storage cụ thể ở NFR-05. Có thêm `src/i18n/` (catalog `vi`/`en` tách theo nhóm: chung, auth, admin, quiz) không có trong bản gốc.

```text
src/
  app/                 # routes, pages, route handlers (Next.js App Router)
  components/          # UI theo khu vực: app/ (quiz), admin/, auth/, dùng chung ở gốc
  domain/              # entities, zod schema, repository interfaces theo feature
    admin/ attempts/ auth/ comments/ common/ content/ discovery/ import/ media/
  server/
    auth/ config/ content/ db/ email/ http/ i18n/ repositories/ services/ storage/
  i18n/                # message catalogs vi/en (kiểm tra parity trong CI)
tests/
  unit/
  integration/         # chạy với PGlite thật, không mock database
data/                  # PGlite local dev only, bị loại khỏi Git
scripts/               # seed, migrate, import/export, inspect-db
docs/
  decisions/           # ADR
  operations/          # deployment, backup-restore
```

## 11. Yêu cầu phi chức năng

### NFR-01 — Hiệu năng và tài nguyên

- Mục tiêu p95 cho request đọc thông thường dưới 500 ms, không tính cold start và mạng bên thứ ba.
- Trang public/auth JavaScript client tối thiểu; phân trang, không tải toàn bộ lịch sử/comment.
- Tránh polling liên tục. Autosave chỉ khi dữ liệu thay đổi.
- Ảnh dùng responsive sizes và lazy loading; video không được đi qua server function nếu object storage/CDN có thể phục vụ bằng signed URL.
- Index database tối thiểu cho email, exam slug/code, topic theo exam, question filters, attempt theo user/date/status, comment theo question/date.

### NFR-02 — Bảo mật

- HTTPS production; cookie `HttpOnly`, `Secure`, `SameSite=Lax` hoặc chặt hơn.
- CSRF protection cho mutation dùng cookie; kiểm tra origin khi phù hợp.
- Rate limit đăng nhập, register, resend verify, forgot password, comment và import.
- Password hash bằng thuật toán chuẩn; secret chỉ qua environment variables.
- Escape nội dung user; không render HTML từ câu hỏi/comment nếu chưa sanitize.
- Kiểm tra MIME, extension và size file import; parse ở server.
- Media upload phải kiểm tra MIME, file signature, size, checksum và quyền truy cập; cân nhắc malware scanning async trước khi `READY` trong production.
- Cấu hình CSP phù hợp cho domain object storage; không cho nội dung upload chạy script.
- Không gửi trường `isCorrect`/explanation trước thời điểm được phép.
- Audit các hành động admin và sự kiện auth nhạy cảm.
- Dependency scan và secret scan trong CI.

### NFR-03 — Tin cậy và toàn vẹn

- Migration database có version và rollback/forward fix rõ ràng.
- Submit attempt, import và thay đổi cấu trúc đề dùng transaction.
- Backup production theo khả năng provider; tài liệu hóa restore drill.
- Không chỉnh sửa lịch sử đã submit khi nội dung nguồn thay đổi.

### NFR-04 — Trải nghiệm và accessibility

- Responsive từ 360 px; thao tác làm bài dùng được bằng bàn phím.
- Semantic HTML, label đầy đủ, focus visible, contrast tối thiểu WCAG 2.1 AA.
- Không chỉ dùng màu để biểu đạt đúng/sai/trạng thái.
- Ảnh có localized alt text; audio/video có accessible label, keyboard controls, caption/transcript khi media truyền tải nội dung cần để trả lời.
- Chuyển locale không làm reset form, answer hoặc vị trí hiện tại; `lang` attribute của document phải đúng.
- Confirm cho thao tác phá hủy hoặc submit; toast không thay thế lỗi inline quan trọng.

**[Cập nhật]** Các quy ước trên được tuân thủ ở mức review code thủ công (label/focus-visible/không chỉ dùng màu); chưa có audit tự động (axe) hay kiểm thử trực tiếp bằng trình đọc màn hình — xem ghi chú tương tự ở mục 15.

### NFR-05 — Khả năng bảo trì/thương mại hóa

- TypeScript strict, lint/format tự động, module nghiệp vụ không phụ thuộc UI/storage cụ thể.
- Mọi thay đổi schema qua migration; API/domain có test.
- Config qua environment variables và có `.env.example` không chứa secret.
- Chuẩn bị `organizationId` như hướng mở rộng trong tài liệu, nhưng chưa thêm vào mọi bảng ở MVP để tránh phức tạp sớm.
- Không hard-code tên tác giả, domain email, provider database/email trong nghiệp vụ.
- Translation catalog có kiểm tra key thiếu/thừa trong CI; content translation dùng schema chung thay vì thêm cột ngôn ngữ vào entity cốt lõi.

### NFR-06 — Quan sát hệ thống

- Structured logs có `requestId`, level và event name; redact dữ liệu nhạy cảm.
- Error tracking production và health endpoint kiểm tra app/database.
- Theo dõi tối thiểu: error rate, latency, số lần login thất bại, import thất bại và submit thất bại.

## 12. Email

Template tối thiểu:

- Xác minh email.
- Đặt lại mật khẩu.
- Thông báo tài khoản bị khóa/mở khóa (khuyến nghị).

Local development dùng provider giả ghi link ra console hoặc inbox dev; production dùng email provider qua interface `EmailService`. URL trong email lấy từ `APP_URL`, không tin header do client gửi.

## 13. Quyền tác giả và giấy phép

Repository phải có:

- `LICENSE` với giấy phép do chủ sở hữu chọn.
- `NOTICE` ghi rõ `Copyright © 2026 {{AUTHOR_NAME}}. ShibaQuiz.`
- Trường `author` trong `package.json` và mục “Tác giả/Quyền tác giả” trong README.
- Header bản quyền cho các file cốt lõi nếu chủ sở hữu yêu cầu.
- CI kiểm tra `LICENSE`, `NOTICE` và thông tin tác giả không bị thiếu.

Khuyến nghị nếu muốn mã nguồn mở nhưng hạn chế việc bên khác biến bản fork thành SaaS đóng: cân nhắc AGPL-3.0 và mô hình dual-license cho khách hàng thương mại. Nếu ưu tiên phổ biến/tái sử dụng rộng, cân nhắc Apache-2.0 kèm `NOTICE`. Việc chọn license có hệ quả pháp lý và phải được chủ sở hữu xác nhận; trước khi release, thay `{{AUTHOR_NAME}}` bằng tên pháp lý hoặc tên thương hiệu mong muốn.

**[Cập nhật]** Quyết định này hiện chưa được chốt (xem `docs/decisions/` — ADR 0005): repository vẫn ở trạng thái `private`/`UNLICENSED`, chặn public release cho đến khi chủ sở hữu cung cấp tên pháp lý và chọn license.

## 14. Biến môi trường tối thiểu

**[Cập nhật]** Danh sách dưới đây thay bằng đúng biến đang dùng trong `.env.example` hiện tại; xem file đó để có mô tả chi tiết từng biến.

```dotenv
APP_URL=http://localhost:3000
DEFAULT_LOCALE=vi
SUPPORTED_LOCALES=vi,en

STORAGE_DRIVER=postgres
DATABASE_URL=postgresql://shibaquiz:shibaquiz@localhost:5432/shibaquiz
DATABASE_SSL=false
PGLITE_DATA_DIR=./data/pglite

AUTH_SECRET=
AUTH_BCRYPT_COST=12
AUTH_SESSION_DAYS=7
REQUIRE_EMAIL_VERIFICATION=true
EMAIL_PROVIDER=console
EMAIL_FROM=
EMAIL_API_KEY=

SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
SEED_ADMIN_DISPLAY_NAME=
SEED_ADMIN_CONFIRM=
SEED_ADMIN_PRODUCTION_CONFIRM=

MEDIA_STORAGE_DRIVER=s3
MEDIA_S3_REGION=auto
MEDIA_S3_ENDPOINT=
MEDIA_S3_BUCKET=
MEDIA_S3_ACCESS_KEY_ID=
MEDIA_S3_SECRET_ACCESS_KEY=
MEDIA_S3_FORCE_PATH_STYLE=false
MEDIA_SIGNED_URL_TTL_SECONDS=300
MEDIA_MAX_IMAGE_MB=5
MEDIA_MAX_AUDIO_MB=25
MEDIA_MAX_VIDEO_MB=100

CRON_SECRET=
```

Production bắt buộc `STORAGE_DRIVER=postgres`, `DATABASE_URL`, `AUTH_SECRET` (≥32 ký tự), email provider thật (không phải `console`), object storage thật (`MEDIA_S3_*`) và `APP_URL` HTTPS; `STORAGE_DRIVER=pglite` bị từ chối ngoài local development. `CRON_SECRET` (tùy chọn) bảo vệ endpoint `/api/internal/import-jobs/run` dùng cho worker phục hồi import job chạy qua Vercel Cron hoặc scheduler tương đương.

## 15. Kiểm thử và Definition of Done

### Test bắt buộc

**[Cập nhật]** Hiện có ~286 test unit/integration chạy qua Vitest với PGlite (database thật, không mock), phủ auth, admin content CRUD/bulk/hard-delete, attempt/scoring/expiry, comment, import, media policy... Chưa có bộ E2E (Playwright) hay accessibility (axe) tự động chạy trong CI — các kịch bản E2E liệt kê dưới đây hiện được đảm bảo qua test integration/unit tương đương cộng kiểm thử thủ công, không phải browser tự động hóa; đây là giới hạn đã biết, không phải mục tiêu đã đạt.

- Unit: chấm single/multiple choice; phân bổ tỷ lệ; tính điểm; expiry; validation import; locale resolution; validation media.
- Integration: auth token một lần; permissions; autosave; submit idempotent; snapshot bất biến/localized; transaction import; signed upload/finalize/access authorization.
- E2E (mục tiêu, chưa tự động hóa — xem ghi chú trên):
  1. Register → verify → login.
  2. Chọn kỳ thi/topic → practice immediate → submit → history.
  3. Làm deferred exam → refresh/resume → hết giờ/submit → review.
  4. Admin tạo kỳ thi/topic/question/test → publish → user nhìn thấy.
  5. Admin import file hợp lệ và file lỗi.
  6. User không truy cập được admin hoặc attempt của user khác.
  7. Đổi Việt/Anh ở UI và bắt đầu hai attempt localized có nội dung/đáp án logic tương ứng.
  8. Admin upload ảnh/audio/video, gắn vào câu hỏi và user phát/xem được; file sai loại/quá size bị chặn.

### Definition of Done cho MVP

- Tất cả FR trong mục MVP chạy được và có acceptance test tương ứng.
- Typecheck, lint, unit/integration pass trong CI. **[Cập nhật]** E2E trọng yếu chưa có trong CI (xem ghi chú đầu mục 15); coi đây là hạng mục còn nợ, không chặn các thay đổi khác.
- Không có lỗi security mức critical/high đã biết.
- Migration và seed chạy được trên database rỗng.
- Deploy preview và production Vercel thành công; production dùng PostgreSQL.
- UI/email và nội dung mẫu hoạt động đầy đủ ở `vi`/`en`; CI không có translation key bị thiếu.
- Media production dùng object storage private; không có binary/base64 trong database hoặc Git và authorization test pass.
- README mô tả setup, env, seed, test, deploy, backup/restore và giới hạn hiện tại.
- Có `LICENSE`, `NOTICE`, tác giả đã thay placeholder và được chủ sở hữu duyệt.

## 16. Kế hoạch triển khai đề xuất

**[Cập nhật]** Cả 10 bước dưới đây đã hoàn thành (trừ nhánh E2E/accessibility tự động ở bước 10, xem ghi chú mục 15); ứng dụng đang chạy production trên Vercel. Kế hoạch được giữ lại làm tài liệu tham khảo trình tự triển khai gốc.

1. Khởi tạo project, design system, CI, database schema và storage abstraction.
2. Auth, authorization, account screens và seed admin an toàn.
3. i18n nền tảng, locale routing, bilingual message/email catalogs và translation schema.
4. Admin CRUD kỳ thi/chủ đề/câu hỏi/đề thi với editor Việt/Anh.
5. Media storage adapter, upload/finalize/access và admin media library.
6. Import CSV/XLSX và báo cáo validation.
7. User discovery, tạo localized attempt, media snapshot, autosave và ba mode.
8. Submit/scoring/result/history.
9. Comment/moderation/audit log.
10. E2E, accessibility, hardening, docs và deploy Vercel.

Mỗi bước phải kèm migration, test và dữ liệu seed liên quan; không để toàn bộ kiểm thử đến bước cuối.

## 17. Các quyết định cần chủ sở hữu xác nhận trước khi public release

Các mục này không chặn việc triển khai MVP bằng giá trị mặc định trong spec:

- Tên tác giả hoặc pháp nhân để thay `{{AUTHOR_NAME}}`.
- License chính thức: AGPL-3.0, Apache-2.0 hay phương án khác.
- Logo, màu thương hiệu và domain production.
- Email provider và database provider production cụ thể.
- Object storage provider, hạn mức dung lượng tổng và retention period cho media mồ côi.
- Có cho phép user tự xóa tài khoản/dữ liệu hay chỉ gửi yêu cầu hỗ trợ.
- Chính sách riêng tư, điều khoản sử dụng và thời gian lưu dữ liệu.

## 18. Chỉ dẫn ngắn cho Codex khi triển khai

> Hãy triển khai ShibaQuiz theo `SHIBAQUIZ_SPEC.md`, bắt đầu từ bước 1 trong kế hoạch. Trước khi code, tạo backlog theo FR/NFR và ghi các quyết định kỹ thuật vào `docs/decisions/`. Không dùng JSON làm database ghi trên Vercel; mọi nghiệp vụ phải đi qua repository interface. Media phải qua object storage adapter, không lưu binary trong database/runtime filesystem. Hoàn thành từng vertical slice với migration và test; mọi UI/content hỗ trợ `vi`/`en` và không tiết lộ đáp án qua API trước thời điểm cho phép. Nếu phát hiện xung đột, ưu tiên bảo mật, accessibility, toàn vẹn localized attempt snapshot và acceptance criteria trong spec, đồng thời ghi rõ giả định trong tài liệu.
