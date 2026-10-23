# Teacher AI — Học giáo trình từng dòng

Website học tập cho sinh viên: tải giáo trình lên, AI chia bài, giải nghĩa từng dòng/câu bằng lời dễ hiểu, tóm tắt có người đọc, ra đề trắc nghiệm và bài luyện tập. Dùng được cho mọi môn: lập trình, ngoại ngữ, khoa học, lý thuyết (triết, sử…).

Viết bằng HTML, CSS và JavaScript thuần, không dùng framework, không cần cài đặt.

## Tính năng

**Nhập giáo trình**
- Hỗ trợ PowerPoint (`.pptx`, gồm cả ghi chú của giảng viên), Word (`.docx`), PDF, `.txt`, `.md`, hoặc dán chữ trực tiếp.
- PDF dạng ảnh scan và ảnh chụp trang sách: AI đọc chữ trên ảnh. Có thể chọn khoảng trang cần học.
- Tự lọc watermark, số trang, header/footer lặp lại.

**Bài học**
- AI chia giáo trình thành các bài. Mỗi bài có: mục tiêu, cốt lõi, thuật ngữ, ví dụ giải nghĩa từng dòng (ngoại ngữ có cách đọc), lỗi hay gặp, câu hỏi tự kiểm tra, xem đoạn gốc.
- **Video bài giảng** kiểu YouTube: thầy cô AI giảng trên bảng đen, mở đầu gợi tò mò, giảng từng ý kèm ví dụ, viết bảng từng dòng theo lời giảng, có phụ đề, câu hỏi nhanh giữa bài, tổng kết và mẹo nhớ cuối bài.
  - Mỗi bài có **sơ đồ tư duy** tổng quan và tổng kết; mỗi ý giảng đều kèm **ví dụ** cụ thể.
  - Từ và câu ngoại ngữ trong video được đọc bằng **giọng bản xứ** (Anh, Nhật, Hàn, Trung), phần giảng bằng giọng Việt.
- Môn lý thuyết (triết, sử…): thêm phần “Mở rộng ngoài giáo trình” với kiến thức liên quan hay gặp khi thi, được đánh dấu rõ.
- Chọn bất kỳ dòng nào (tô vàng) để hỏi AI. AI chỉ trả lời dựa trên giáo trình.

**Luyện tập**
- Lập trình: đoán kết quả → sắp xếp dòng code → tìm và sửa lỗi → tự viết code, có gợi ý từng bước và AI chấm. JavaScript chạy thật trong trình duyệt. Có “Sân code” để thử tự do.
- Ngoại ngữ:
  - **Học nhanh 5 phút** (kiểu Duolingo): 12 câu trộn nhiều dạng (chọn nghĩa, nghe chọn từ, ghép cặp, xếp câu, nghe và gõ lại), câu sai quay lại cuối bài, có âm thanh, phím tắt 1–4 và Enter.
  - **Ngữ pháp** kiểu Bunpro: mẫu câu, nghĩa, cách dùng, ví dụ có phát âm.
  - **Bảng chữ cái tiếng Nhật**: hiragana, katakana, âm đục, chạm để nghe, luyện nhanh 10 chữ.
  - Nghe và nói theo, nghe chép, tập viết tay (AI chấm chữ viết), điền từ, ghép câu, dịch hai chiều.
- Lý thuyết: trắc nghiệm phủ mọi ý của bài, câu hỏi tự luận.

**Ôn thi**
- Danh sách video bài giảng của cả môn, tạo nhanh video cho các bài còn thiếu.
- Thi thử trắc nghiệm: đề ngẫu nhiên tối đa 30 câu, chấm điểm và giải thích từng câu.
- Thẻ ghi nhớ Leitner (1-3-7-14-30 ngày), mỗi phiên tối đa 10 thẻ, thẻ sai làm lại.
- Tab “Độ phủ” kiểm tra đã phủ hết các mục của giáo trình chưa.

**Khác**
- Giao diện pastel, sáng/tối, dùng tốt trên điện thoại và màn hình lớn.
- Điểm XP và chuỗi ngày học, mục tiêu 50 XP mỗi ngày.
- Tiến độ đồng bộ theo tài khoản giữa các thiết bị.

## Cấu trúc thư mục

```
├─ index.html            Khung trang, nạp CSS và các file JavaScript theo thứ tự
├─ css/
│  └─ style.css          Màu sắc, bố cục, giao diện sáng/tối, điện thoại
├─ js/
│  ├─ utils.js           Tiện ích dùng chung và trạng thái chung S
│  ├─ storage.js         Lưu tiến độ theo tài khoản hoặc trên trình duyệt
│  ├─ ai.js              Gọi AI, tạo prompt, đọc kết quả JSON
│  ├─ doc-reader.js      Đọc PDF, Word, PowerPoint, ảnh scan; lọc watermark
│  ├─ course-data.js     Dữ liệu môn học, bài học, tiến độ
│  ├─ render.js          Vẽ thanh danh sách môn và vùng nội dung chính
│  ├─ speech.js          Chọn giọng đọc, đọc xen tiếng Việt và tiếng nước ngoài
│  ├─ lesson.js          Trang bài học: giải nghĩa từng dòng, đoạn gốc
│  ├─ practice.js        Bài tập, tập viết tay, chạy JavaScript bằng Web Worker
│  ├─ xp.js              Điểm XP và chuỗi ngày học
│  ├─ quick-learn.js     Học nhanh kiểu Duolingo, bảng chữ cái tiếng Nhật
│  ├─ exam.js            Tóm tắt toàn môn, thi thử
│  ├─ flashcards.js      Thẻ ghi nhớ Leitner
│  ├─ chat.js            Khung hỏi AI, chọn dòng để hỏi
│  ├─ ai-tasks.js        Chia bài, giải nghĩa, tóm tắt, tạo bài luyện
│  ├─ reader.js          Đọc to phần tóm tắt
│  ├─ video.js           Video bài giảng, sơ đồ tư duy
│  ├─ add-course.js      Thêm môn học mới
│  ├─ sample-course.js   Môn học mẫu
│  ├─ events.js          Xử lý mọi nút bấm và phím tắt
│  └─ main.js            Khởi động ứng dụng
└─ tools/
   └─ build.py           Gộp tất cả thành một file để đăng lên Claude Artifact
```

## Cách chạy

**Trên máy:** mở `index.html` bằng trình duyệt, hoặc chạy `python -m http.server` rồi vào http://localhost:8000.

**Trên claude.ai (có AI):** chạy `python tools/build.py` để tạo `dist/teacher-ai.html` (một file duy nhất), rồi đăng file đó làm **Claude Artifact**. Các tính năng AI (giải nghĩa, chấm bài, đọc ảnh) và đồng bộ tiến độ dùng runtime `window.claude` của claude.ai.

Khi mở ngoài claude.ai, giao diện, môn mẫu, chạy JavaScript và đọc phát âm vẫn hoạt động, nhưng các tính năng AI sẽ tắt và tiến độ chỉ lưu trên trình duyệt đó.

## Ghi chú về việc dùng AI

Dự án có sử dụng trợ lý AI (Claude) hỗ trợ viết code. Ý tưởng, yêu cầu tính năng, kiểm thử và chỉnh sửa theo trải nghiệm thực tế do tác giả thực hiện.

## Công nghệ

- HTML, CSS, JavaScript thuần, một file duy nhất.
- Thư viện tải khi cần từ cdnjs: pdf.js (đọc PDF), mammoth (đọc Word), JSZip (đọc PowerPoint).
- Web Speech API để đọc thành tiếng, Web Worker để chạy JavaScript an toàn.
