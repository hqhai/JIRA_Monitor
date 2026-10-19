# FSLP Backend sprint dashboard

Dashboard local cho Hải (Team lead), Phương (Senior/core), Phúc (Junior), Khoa (Junior thử thách Middle) và Duy (Fresher). Một màn hình, không có mục định hướng phát triển member.

## Mở dashboard

- Chạy `Open Dashboard.cmd`, hoặc `powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1` từ thư mục này.
- Mở <http://127.0.0.1:8765>. Python chạy nền với cửa sổ ẩn.
- Cần Python 3.11 trở lên. App dùng thư viện chuẩn, không cần npm install hay build.
- Chọn sprint để tải dữ liệu tương ứng; nút **Đồng bộ Jira** lấy dữ liệu mới. Không tự chạy theo lịch.
- Bộ lọc thành viên, trạng thái, nội dung và độ khó áp dụng trên cùng dashboard.

## Dùng như extension Edge / Chrome

- Thư mục `public/` đồng thời là extension Manifest V3. Mở `edge://extensions` (hoặc `chrome://extensions`), bật **Developer mode**, chọn **Load unpacked** và trỏ tới `backend-dashboard/public`.
- Bấm icon extension trên thanh công cụ để mở dashboard trong tab riêng; nếu tab đã mở, extension chuyển tới tab đó.
- Extension chỉ chứa giao diện. Dữ liệu vẫn đi qua `server.py` ở `127.0.0.1:8765` nên token Jira không nằm trong trình duyệt. Cần chạy server trước (`Open Dashboard.cmd`, hoặc `start.ps1 -NoBrowser` nếu chỉ dùng extension); nếu server chưa chạy, dashboard hiển thị hướng dẫn và nút **Kết nối lại**.
- Sau khi sửa file trong `public/`, bấm **Reload** trên trang extensions để nạp lại.

## Quy ước của team

- **Priority**: chỉ quan tâm `Highest` và `High`. Mặc định dashboard lọc **High & Highest**; đổi ở bộ lọc Priority (lựa chọn được nhớ trên trình duyệt). Medium / Low / Lowest không có nhãn và chỉ hiện khi chọn "Mọi priority".
- **Hoàn thành**: `Done`, `Testing Done`, `Ready for Integration` (với BE đã là Done, chỉ chờ FE / Mob ghép) và `Ready for Review` (hoàn thành, chờ nghiệm thu). `Open`, `In Progress`, `Pending` và các status khác là **chưa hoàn thành**. Remaining, capacity, burndown và task vượt estimate chỉ tính việc chưa hoàn thành. `Canceled` không tính vào tỷ lệ hoàn thành.
- **Pending trong sprint**: dựng lại từ lịch sử status Jira, lấy khoảng thời gian task ở `Pending` (không phân biệt hoa thường, kể cả `PENDING` của workflow cũ) giao với khoảng ngày sprint tới hiện tại; bỏ qua lần chuyển qua Pending dưới 5 phút. Giờ bị chặn tính theo giờ làm việc.

## Ready for Integration → Done

- Màn **Tiến độ** có thẻ **Ready for Integration**: mỗi task BE kèm các task FE / Mob liên quan và status hiện tại. Task liên quan là Task / Bug có label `Frontend` / `FE` / `FE-Frontend` / `Mobile` / `Mob`, nối cùng Story với task BE (BE –Relates– Story –Relates– FE/Mob) hoặc nối thẳng vào task BE. Task Tester và Story khác không tính.
- Trạng thái: **Có thể chuyển Done** khi có ít nhất một task FE / Mob và tất cả đã Done (status category Done); **Chờ N task FE / Mob**; **Không có task FE / Mob** (task BE thuần, cần kéo Done tay).
- Nút **Chuyển Done (N)** mở danh sách để chọn, rồi chuyển các task đã chọn sang `Done` trên Jira. Trước khi chuyển, server đọc lại Jira cho từng task: vẫn ở Ready for Integration, có label Backend/BE, owner là 1 trong 5 member, mọi task FE / Mob liên quan đã Done, workflow có transition tới Done. Task không đạt bị bỏ qua và có lý do. Xong thì dashboard tự đồng bộ lại.
- Đây là thao tác ghi duy nhất của dashboard; chỉ chạy khi bạn bấm xác nhận. Jira ghi lịch sử với tài khoản của token fsel-jira.

## Cảnh báo

- Mục **Cảnh báo** đầu trang Tổng quan, xếp theo mức Nghiêm trọng / Cảnh báo / Lưu ý; số cảnh báo (trừ Lưu ý) hiện trên sidebar.
- Gồm: sprint sắp hết mà còn việc mở, remaining vượt capacity, burndown chậm hơn nhịp lý tưởng >15%, task vượt estimate kể từ khi start, logwork không có nội dung, logwork dưới 70% kỳ vọng, thiếu remaining estimate, logwork tải thiếu, task Pending, Ready for Integration, remaining = 0 nhưng chưa xong, dữ liệu cũ hơn 12 giờ.
- Bấm từng cảnh báo để tới bảng hoặc bộ lọc tương ứng. Bảng Task sort được theo từng cột (tăng → giảm → bỏ sort; giá trị thiếu luôn ở cuối).

## Tiến độ sprint

- **Thời gian / Task Done / Giờ đã log**: % ngày làm việc đã qua, % task Done, giờ log trong sprint ÷ (giờ log + remaining đã biết).
- **Burndown**: giờ còn lại ước tính sau mỗi ngày = (giờ log trong sprint + remaining hiện tại) − giờ đã log tới hết ngày đó; Jira không lưu lịch sử remaining nên đây là ước tính lùi từ logwork. Đường nét đứt là nhịp đều về 0, đi ngang vào cuối tuần.
- **Logwork trong sprint**: giờ log của từng người so với kỳ vọng tới hết hôm nay = ngày làm việc đã qua × 8h × focus.
- **Task vượt estimate kể từ khi start**: start = lần đầu task chuyển sang `In Progress` / `In Development` (đọc changelog Jira). Thời gian đã trôi qua tính theo giờ làm việc 08:30–17:30 giờ Việt Nam, bỏ cuối tuần, tối đa 8h/ngày; chỉ xét task chưa Done / Canceled. Có thể chuyển giữa mọi việc mở và chỉ `In Progress`.
- **Logwork không có nội dung**: bản ghi worklog trong sprint có comment rỗng.
- Hai mục cuối cần snapshot đồng bộ từ phiên bản server mới; snapshot cũ hiển thị nhắc đồng bộ lại.

## Phân tích chỉ số

- Màn hình **Phân tích**: donut status category (To Do / In Progress / Done của Jira), danh sách status đúng tên trên Jira, donut độ khó sơ bộ, logwork theo người ghi, remaining theo owner.
- Status luôn hiển thị nguyên tên Jira, không dịch.
- Bấm lát cắt hoặc dòng chú thích để lọc toàn dashboard; bấm lại để bỏ lọc. Mỗi donut bỏ qua bộ lọc của chính chiều đó để vẫn thấy đủ các phần.
- Remaining theo owner chỉ cộng việc mở có remaining estimate; số việc thiếu estimate hiển thị ngay dưới tiêu đề.

## Giao diện

- Theme mặc định là **Dracula**; nút mặt trời / mặt trăng chuyển sang **Alucard** (bản sáng của Dracula). Lựa chọn được nhớ trên trình duyệt.

## Nguồn dữ liệu và cách đọc

- Board: `FSEL Platform Board - DEV` (33), project FSLP. Sprint mặc định: 2026W42 (251). Danh sách sprint lấy trực tiếp từ Jira.
- Chỉ tính Task, Bug, Technical Story có label Backend / BackEnd / BE và assignee là một trong 5 member. Không cộng Story/Epic hoặc các thành viên đã loại.
- Khối lượng task, original estimate và remaining estimate nhóm theo assignee (hoặc owner trong phương án thử).
- **Logwork sprint** đọc từng bản ghi qua API worklog, lọc `started` theo ngày bắt đầu/kết thúc sprint ở múi giờ Việt Nam (bao gồm hai ngày biên), nhóm theo tác giả. Không dùng `timespent` toàn issue để làm logwork sprint.
- Logwork chỉ bao gồm 5 member trên các task thuộc phạm vi dashboard. Không bao gồm mọi hoạt động của member ở project/task khác. Khi lọc member, task lọc theo owner còn logwork lọc theo tác giả; hai tập có thể khác nhau.
- Original, remaining và trạng thái luôn là giá trị hiện tại trên Jira; không tái dựng trạng thái lịch sử khi sprint đóng. Original estimate có thể thuộc công việc từ sprint trước.
- Task thiếu estimate hiển thị dấu `—`; tổng giờ chỉ cộng phần đã biết, kèm số lượng thiếu. Remaining chỉ cộng task chưa hoàn tất/hủy. Remaining bằng 0 trên việc Open/In Progress/Pending được cảnh báo riêng.
- Nếu một task không tải được worklog, dashboard hiển thị danh sách thiếu; không tuyên bố tổng logwork đầy đủ.

## Engine độ khó và phân công thử

- Rule-based v1 từ tiêu đề + mô tả Jira; không phải mô hình AI và không tự đọc tài liệu liên kết.
- 5 chiều mức 0–4: nghiệp vụ 20%, dữ liệu 25%, tích hợp 20%, core 20%, rủi ro 15%.
- Điểm = tổng (mức / 4 × trọng số). Mặc định mỗi chiều là 1 khi chưa có tín hiệu; đó là giả định, không phải bằng chứng việc dễ. Core/data/risk mức 4 đặt điểm tối thiểu 65 và cần Senior/Lead.
- Ngưỡng: 0–25 cơ bản, 26–45 vừa, 46–65 khó, 66–80 chuyên sâu, 81–100 rất chuyên sâu.
- Mở **Phân tích** để xem tín hiệu, ghi căn cứ và hiệu chỉnh thủ công. Thay đổi nội dung Jira làm hiệu chỉnh cũ cần được duyệt lại.
- Gợi ý phân công xét role, domain, capacity và phần remaining đã biết. Role do người dùng cung cấp; vector domain/focus và ngưỡng là giả định ban đầu cần lead hiệu chỉnh qua thực tế. Không xem điểm này là chỉ số năng lực.
- Task đang làm / chờ / Pending giữ owner; task hoàn tất/hủy không được đề xuất giao mới. Lead có thể thử phân công task chưa bắt đầu; Jira không thay đổi.
- Capacity mặc định = giờ làm việc còn lại của sprint × focus. Giờ còn lại tính từ bây giờ tới 17:30 ngày kết thúc sprint, 08:30–17:30 giờ Việt Nam, bỏ cuối tuần, chưa trừ ngày nghỉ. Capacity lưu thủ công là số giờ cố định riêng từng sprint, không tự giảm theo thời gian. Chọn **Dùng công thức theo ngày** để quay lại tính động.
- Workload có thẻ **Remaining so với thời gian còn lại**: giờ làm việc còn lại, tổng remaining của task chưa hoàn thành (Ready for Review / Ready for Integration không tính), capacity còn lại và tỷ lệ remaining / capacity. Mỗi người có trạng thái Dư / Sát capacity (≥ 85%) / Thiếu N giờ, và ngày dự kiến xong nếu làm đều theo focus từ bây giờ. Task thiếu remaining không được cộng; số lượng hiển thị kèm theo.

## Kết nối và lưu trữ

- Backend ưu tiên bộ cấu hình `[mcp_servers.fsel-jira.env]` trong `$CODEX_HOME/config.toml` (mặc định `~/.codex/config.toml`). Nếu chưa có, dùng bộ biến môi trường `JIRA_URL`, `JIRA_PERSONAL_TOKEN`, `JIRA_SSL_VERIFY`.
- Không chép token vào source, snapshot, browser hoặc log. Backend chỉ đọc Jira, trừ thao tác chuyển Ready for Integration → Done khi bạn xác nhận (xem mục trên).
- Server chỉ bind `127.0.0.1`. Snapshot và cấu hình local trong `data/`, đã được ignore khỏi Git. Chạy lại app giữ snapshot và các hiệu chỉnh.
- `data/snapshot.json`: sprint đã tải gần nhất; `data/settings.json`: đánh giá task và capacity/phân công theo sprint; `data/sprints.json`: danh sách sprint gần nhất.
- Nếu lỗi mạng/quyền truy cập, snapshot trước giữ nguyên và hiển thị thời điểm đồng bộ.

## Kiểm tra

```powershell
node --test tests/engine.test.mjs
python -m unittest discover -s tests -p 'test_*.py' -v
node --check public/app.js
```

UI test chạy trên cổng 8766 với dữ liệu/settings tách biệt bằng `python tests/ui_server.py`, sau đó `node tests/browser-check.cjs` (cần Playwright có sẵn và Microsoft Edge). Không thay đổi settings của dashboard thật. Các test không được đưa vào commit/PR trừ khi người dùng yêu cầu.

Đã kiểm tra ngày 15/10/2026: 10 test engine + 6 test backend pass; UI desktop/mobile, bộ lọc, biểu đồ, lưu hiệu chỉnh, phân công thử, capacity riêng theo sprint, CSV và chuyển sprint closed/future/active pass. Snapshot 2026W42 lúc kiểm tra: 65 task, 23 worklog, 99 giờ, không lỗi tải worklog.
