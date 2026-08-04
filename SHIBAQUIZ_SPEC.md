# ShibaQuiz — Product & Technical Specification

> Phiên bản: 1.2
> Ngày: 2026-08-04
> Trạng thái: Sẵn sàng triển khai MVP
> Nguồn yêu cầu: `requirement.md`

## 1. Mục tiêu tài liệu

Tài liệu này chuyển yêu cầu ban đầu thành đặc tả có thể dùng trực tiếp để Codex thiết kế, lập trình, kiểm thử và triển khai ShibaQuiz.

ShibaQuiz là web app giúp người dùng ôn luyện các kỳ thi theo chủ đề hoặc đề hoàn chỉnh, làm bài theo nhiều chế độ, trao đổi tại từng câu hỏi và xem lại lịch sử. Admin quản lý kỳ thi, chủ đề, câu hỏi, cấu trúc đề và người dùng.

## 2. Quyết định và giả định đã bổ sung

Các điểm dưới đây chưa được nêu rõ trong yêu cầu gốc và được chốt để tránh mơ hồ khi triển khai:

1. Giao diện MVP hỗ trợ tiếng Việt và tiếng Anh, mặc định tiếng Việt; thiết kế responsive cho desktop và mobile.
2. Hệ thống có hai vai trò: `USER` và `ADMIN`. Một tài khoản chỉ có một vai trò tại một thời điểm.
3. Mỗi câu hỏi thuộc đúng một kỳ thi và một chủ đề; hỗ trợ câu chọn một đáp án và chọn nhiều đáp án.
4. Câu nhiều đáp án chỉ được tính đúng khi người dùng chọn đúng toàn bộ đáp án và không chọn thừa; MVP không chấm điểm một phần.
5. Mặc định mỗi câu đúng được 1 điểm, câu sai hoặc bỏ trống được 0 điểm; chưa hỗ trợ điểm âm.
6. Đề thi có thể cấu hình thời gian, điểm đạt, số câu, tỷ lệ câu theo chủ đề, trộn thứ tự câu và trộn đáp án.
7. Một lần làm bài là một `attempt`. Mỗi người dùng chỉ có tối đa một attempt `IN_PROGRESS` cho cùng một đề/cấu hình luyện tập; có thể tiếp tục hoặc bỏ attempt để làm lại.
8. Câu trả lời được autosave sau mỗi thay đổi và khi chuyển câu; tải lại trang hoặc đăng nhập lại vẫn tiếp tục được.
9. Comment chỉ dành cho người đã đăng nhập. Admin có quyền ẩn comment; người viết được sửa/xóa comment của mình.
10. Admin không được xem hay gán trực tiếp mật khẩu người dùng. Admin chỉ có thể khóa/mở khóa tài khoản, đổi vai trò và gửi link đặt lại mật khẩu.
11. Dữ liệu JSON chỉ dùng cho local development, demo read-only hoặc seed/import/export. Production trên Vercel dùng PostgreSQL thông qua một storage adapter.
12. MVP không có thanh toán, tổ chức/tenant, chứng chỉ, leaderboard, app mobile native hay nội dung do AI tạo.
13. MVP hỗ trợ hai locale `vi` (Tiếng Việt) và `en` (English). `vi` là locale mặc định; lựa chọn của user được lưu trong hồ sơ và cookie.
14. Đa ngôn ngữ gồm cả giao diện hệ thống và nội dung học. Nội dung dịch được lưu theo từng locale, không lưu hai ngôn ngữ chung trong một chuỗi.
15. Media được lưu ở object storage; database chỉ lưu metadata và object key. Không lưu binary/base64 trong PostgreSQL hoặc JSON và không ghi media vào filesystem runtime của Vercel.

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
- Mỗi câu có trạng thái: chưa trả lời, đã trả lời, đã đánh dấu, đã kiểm tra.
- User có thể đánh dấu/bỏ đánh dấu câu.
- Autosave đáp án và cờ đánh dấu, có trạng thái “Đang lưu/Đã lưu/Lỗi lưu”.
- Autosave debounce tối đa 500 ms và retry khi lỗi mạng tạm thời.
- Khi rời trang có dữ liệu chưa lưu, hiển thị cảnh báo.
- Nếu có thời gian, server lưu `startedAt` và `expiresAt`; client chỉ hiển thị đếm ngược. Server là nguồn thời gian chuẩn.
- Hết giờ, server tự coi attempt là đã nộp ở request tiếp theo; client chủ động submit khi đồng hồ về 0.

### FR-07 — Nộp bài và kết quả

- Trước khi nộp sớm, hiển thị số câu chưa trả lời và yêu cầu xác nhận.
- Submit phải idempotent: gọi lặp lại không tạo nhiều kết quả.
- Điểm phần trăm = `số câu đúng / tổng số câu * 100`, làm tròn 2 chữ số.
- Kết quả gồm: điểm, đạt/không đạt, số đúng/sai/bỏ trống, thời gian làm và thống kê theo chủ đề.
- Review hiển thị đáp án user, đáp án đúng và explanation.
- Attempt đã submit là bất biến đối với user.

### FR-08 — Lịch sử

- Danh sách attempt của user hiện tại, mới nhất trước.
- Lọc theo kỳ thi, mode, trạng thái và khoảng ngày.
- Hiển thị tên kỳ thi/đề, mode, thời gian bắt đầu, trạng thái, điểm và thời lượng.
- Attempt `IN_PROGRESS` có nút tiếp tục; attempt hoàn tất có nút xem chi tiết.
- User không thể truy cập attempt của người khác.

### FR-09 — Comment theo câu hỏi

- Thread comment gắn với `questionId`, không gắn với snapshot riêng của attempt.
- Nội dung plain text, 1–2.000 ký tự; hiển thị xuống dòng nhưng escape HTML.
- Sắp xếp cũ đến mới, phân trang khi quá 50 comment.
- User được tạo, sửa, xóa mềm comment của mình.
- Admin được ẩn/khôi phục comment và lưu lý do moderation.
- Không hỗ trợ attachment, rich text, reply lồng nhau hoặc realtime trong MVP.

### FR-10 — Admin quản lý kỳ thi và chủ đề

- CRUD kỳ thi: mã duy nhất, tên, mô tả, trạng thái `DRAFT/PUBLISHED/ARCHIVED`.
- CRUD chủ đề trong một kỳ thi: tên, mô tả, thứ tự hiển thị.
- Không hard-delete kỳ thi/chủ đề đang được tham chiếu; chuyển sang `ARCHIVED` hoặc soft delete.
- Chỉ publish kỳ thi khi có ít nhất một chủ đề và một câu hỏi hợp lệ đã publish.

### FR-11 — Admin quản lý câu hỏi

- Trường bắt buộc: kỳ thi, chủ đề, loại, nội dung, ít nhất 2 lựa chọn, đáp án đúng, explanation.
- `SINGLE_CHOICE` phải có đúng một đáp án đúng.
- `MULTIPLE_CHOICE` phải có ít nhất hai đáp án đúng và ít nhất một đáp án sai.
- Cho phép trạng thái `DRAFT/PUBLISHED/ARCHIVED`.
- CRUD thủ công; tìm/lọc theo kỳ thi, chủ đề, loại, trạng thái và từ khóa.
- Xóa là soft delete. Attempt cũ vẫn đọc được từ snapshot.
- Lưu `createdBy`, `updatedBy`, timestamps và audit event.

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
3. Validate toàn bộ file, hiển thị lỗi theo sheet/dòng/cột.
4. Chỉ commit khi không có lỗi nghiêm trọng và admin xác nhận.

Yêu cầu:

- Hỗ trợ `.csv` UTF-8 và `.xlsx`; giới hạn mặc định 10 MB và 10.000 dòng/file.
- Với XLSX, đọc sheet đầu tiên hoặc sheet tên `questions`.
- Import chạy trong transaction: lỗi khi commit phải rollback toàn bộ.
- Hỗ trợ `CREATE_ONLY` và `UPSERT_BY_EXTERNAL_ID`.
- Không dùng nội dung câu hỏi làm khóa định danh.
- Sinh báo cáo số dòng tạo mới/cập nhật/bỏ qua/lỗi.
- Escape dữ liệu khi export CSV để giảm nguy cơ CSV formula injection.
- Các cột nội dung dùng hậu tố locale `_vi`/`_en`. Dòng có thể được lưu `DRAFT` khi chỉ có ngôn ngữ chính; chỉ được `PUBLISHED` cho locale đã đủ toàn bộ trường bắt buộc.
- Spreadsheet không chứa binary hoặc URL media tùy ý. Cột `media_ids` chỉ tham chiếu các asset `READY` đã upload vào thư viện và admin có quyền sử dụng.

Schema import chuẩn:

| Cột                                    | Bắt buộc | Quy tắc/ví dụ                                                           |
| -------------------------------------- | :------: | ----------------------------------------------------------------------- |
| `external_id`                          |    ✓     | ID ổn định trong nguồn import, ví dụ `SAA-001`                          |
| `exam_code`                            |    ✓     | Mã kỳ thi đã tồn tại                                                    |
| `topic_name_vi`, `topic_name_en`       |    ✓*    | Bắt buộc cho locale được publish; tạo topic mới chỉ khi import cho phép |
| `question_type`                        |    ✓     | `SINGLE_CHOICE` hoặc `MULTIPLE_CHOICE`                                  |
| `question_text_vi`, `question_text_en` |    ✓*    | 1–10.000 ký tự; bắt buộc cho locale được publish                        |
| `option_a_vi` ... `option_h_vi`        |    ✓*    | Ít nhất A và B cho tiếng Việt; tối đa 8 lựa chọn                        |
| `option_a_en` ... `option_h_en`        |    ✓*    | Cùng option identity với bản Việt; bắt buộc khi publish English         |
| `correct_options`                      |    ✓     | Danh sách chữ cái phân cách bằng `                                      | `, ví dụ `A | C`  |
| `explanation_vi`, `explanation_en`     |    ✓*    | 1–20.000 ký tự; bắt buộc cho locale được publish                        |
| `media_ids`                            |    —     | Danh sách asset ID trạng thái `READY`, phân cách bằng `                 | `           |
| `status`                               |    —     | Mặc định `DRAFT`; `PUBLISHED` chỉ nếu dòng hợp lệ                       |
| `tags`                                 |    —     | Phân cách bằng `                                                        | `           |

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
- Không publish/bật locale English cho kỳ thi nếu còn câu hỏi bắt buộc thiếu `question`, option hoặc explanation tiếng Anh.

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

| Route đề xuất                                          | Màn hình                     | Quyền       |
| ------------------------------------------------------ | ---------------------------- | ----------- |
| `/`                                                    | Landing page                 | Public      |
| `/register`, `/login`                                  | Xác thực                     | Public      |
| `/verify-email`, `/forgot-password`, `/reset-password` | Xác thực email/mật khẩu      | Public      |
| `/exams`                                               | Danh sách kỳ thi             | User        |
| `/exams/[examSlug]`                                    | Chi tiết kỳ thi/chọn phạm vi | User        |
| `/attempts/[attemptId]`                                | Làm/tiếp tục bài             | Owner/Admin |
| `/attempts/[attemptId]/result`                         | Kết quả/review               | Owner/Admin |
| `/history`                                             | Lịch sử cá nhân              | User        |
| `/questions/[questionId]/discussion`                   | Trao đổi câu hỏi             | User        |
| `/account`                                             | Hồ sơ/đổi mật khẩu           | User        |
| `/admin`                                               | Dashboard admin              | Admin       |
| `/admin/exams`, `/admin/topics`                        | Quản lý nội dung             | Admin       |
| `/admin/questions`, `/admin/imports`                   | Ngân hàng/import             | Admin       |
| `/admin/media`                                         | Thư viện và trạng thái media | Admin       |
| `/admin/tests`                                         | Quản lý cấu trúc đề          | Admin       |
| `/admin/users`, `/admin/audit-logs`                    | User/audit                   | Admin       |

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
- `selectedOptionIds` JSON/array, `isFlagged`, `checkedAt`, `isCorrect`
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

- `id`, `fileName`, `mode`, `status`, `createdBy`
- `summary` JSON, `errorReport` JSON, timestamps

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
- Pagination cursor cho comments/audit/history; pagination trang cho bảng admin là chấp nhận được ở MVP.
- Không log mật khẩu, token, cookie, đáp án chưa được phép công bố hoặc toàn bộ file import.
- API nhận locale hợp lệ và không để locale từ client thay đổi logic chấm điểm.
- API autosave và submit phải kiểm tra owner, trạng thái attempt và thời hạn ở server.

## 10. Kiến trúc kỹ thuật đề xuất

### Stack

- Next.js App Router + TypeScript strict mode.
- React và server components mặc định; client components chỉ cho phần tương tác cần thiết.
- Tailwind CSS + bộ component accessible (ví dụ shadcn/ui/Radix).
- Thư viện i18n hỗ trợ Next.js App Router, locale routing và server components; message catalog tách `vi`/`en`.
- PostgreSQL production; ORM/migration dùng Drizzle ORM hoặc Prisma, chọn một và dùng nhất quán.
- Auth.js hoặc auth tự quản lý bằng session cookie an toàn; không tự tạo thuật toán mã hóa.
- Argon2id hoặc bcrypt với cost phù hợp để hash mật khẩu.
- Zod cho validation; thư viện đọc XLSX duy trì tốt và hỗ trợ chạy server-side.
- Vitest cho unit/integration; Playwright cho luồng E2E trọng yếu.
- Object storage production tương thích signed upload/read (ưu tiên Vercel Blob hoặc S3-compatible); local dùng filesystem adapter trong thư mục data bị loại khỏi Git.

### Storage abstraction

Domain/service không đọc/ghi file trực tiếp. Định nghĩa repository interfaces như `QuestionRepository`, `AttemptRepository`, `UserRepository`; media đi qua `MediaStorage` độc lập với metadata repository.

- `JsonRepository`: local development/seed/demo; ghi file atomic bằng temp + rename và mutex trong một process. Không dùng cho production nhiều instance.
- `PostgresRepository`: production và staging; là implementation mặc định khi deploy Vercel.
- Chọn adapter bằng `STORAGE_DRIVER=json|postgres`.
- Có script migrate dữ liệu JSON sang PostgreSQL và export backup JSON có version schema.

Lý do: filesystem của serverless/edge không phải kho dữ liệu ghi bền vững; dữ liệu quan hệ của quiz cần transaction, foreign key và truy vấn lịch sử. PostgreSQL serverless có thể bắt đầu ở free tier và mở rộng mà không đổi domain layer.

### Cấu trúc source đề xuất

```text
src/
  app/                 # routes, pages, route handlers
  components/          # UI dùng chung
  features/            # auth, exams, attempts, comments, admin
  domain/              # entities, rules, repository interfaces
  server/
    auth/
    db/
    repositories/
    services/
  lib/                 # validation, errors, utilities
tests/
  unit/
  integration/
  e2e/
data/                  # JSON seed/local only
scripts/               # seed, import/export, migration
docs/
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

## 14. Biến môi trường tối thiểu

```dotenv
APP_URL=http://localhost:3000
DEFAULT_LOCALE=vi
SUPPORTED_LOCALES=vi,en
AUTH_SECRET=
STORAGE_DRIVER=json
DATABASE_URL=
EMAIL_PROVIDER=console
EMAIL_FROM=
EMAIL_API_KEY=
JSON_DATA_DIR=./data
MEDIA_STORAGE_DRIVER=local
MEDIA_BUCKET=
MEDIA_ACCESS_TOKEN=
MEDIA_MAX_IMAGE_MB=5
MEDIA_MAX_AUDIO_MB=25
MEDIA_MAX_VIDEO_MB=100
```

Production bắt buộc `STORAGE_DRIVER=postgres`, `DATABASE_URL`, `AUTH_SECRET`, email provider thật, object storage thật và `APP_URL` HTTPS. `MEDIA_ACCESS_TOKEN` là tên tổng quát; implementation dùng đúng biến secret mà provider yêu cầu và cập nhật `.env.example`.

## 15. Kiểm thử và Definition of Done

### Test bắt buộc

- Unit: chấm single/multiple choice; phân bổ tỷ lệ; tính điểm; expiry; validation import; locale resolution; validation media.
- Integration: auth token một lần; permissions; autosave; submit idempotent; snapshot bất biến/localized; transaction import; signed upload/finalize/access authorization.
- E2E:
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
- Typecheck, lint, unit/integration/E2E trọng yếu pass trong CI.
- Không có lỗi security mức critical/high đã biết.
- Migration và seed chạy được trên database rỗng.
- Deploy preview và production Vercel thành công; production dùng PostgreSQL.
- UI/email và nội dung mẫu hoạt động đầy đủ ở `vi`/`en`; CI không có translation key bị thiếu.
- Media production dùng object storage private; không có binary/base64 trong database hoặc Git và authorization test pass.
- README mô tả setup, env, seed, test, deploy, backup/restore và giới hạn hiện tại.
- Có `LICENSE`, `NOTICE`, tác giả đã thay placeholder và được chủ sở hữu duyệt.

## 16. Kế hoạch triển khai đề xuất

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
