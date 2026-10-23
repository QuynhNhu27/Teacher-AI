/* Gọi AI: tạo câu lệnh (prompt), đọc kết quả JSON, xử lý lỗi và giới hạn. */
"use strict";

/* ---------- AI ---------- */
async function aiJSON(prompt, tier, images) {
  if (!S.ai) throw { code: "unavailable", message: "AI chưa sẵn sàng" };
  const o = { modelTier: tier || "default" };
  if (images) o.images = images;
  try {
    return await S.ai.json(prompt, o);
  } catch (e) {
    if (e && e.code === "invalid_json" && e.text) {
      const t = e.text,
        a = t.indexOf("{"),
        b = t.lastIndexOf("}");
      if (a >= 0 && b > a) {
        try {
          return JSON.parse(t.slice(a, b + 1));
        } catch (x) {}
      }
    }
    throw e;
  }
}
const RULES = `QUY TẮC BẮT BUỘC:
- Chỉ dùng nội dung có trong giáo trình được đưa. Không bịa thêm kiến thức, ví dụ, số liệu hay kết quả ngoài giáo trình.
- Giải nghĩa thật ngắn (1-2 câu), dùng từ dễ nhất, như giảng cho người mới bắt đầu.
- Viết tiếng Việt có dấu. Giữ nguyên thuật ngữ, code, câu ngoại ngữ như trong giáo trình.`;
const VIDU = {
  lap_trinh: `"vi_du": lấy TỪNG đoạn code trong phần giáo trình. Mỗi dòng code là một phần tử của "dong", "t" chép nguyên văn dòng đó (giữ thụt lề), "g" giải nghĩa dòng đó làm gì. Không bỏ dòng code nào. "doc" để "".`,
  ngoai_ngu: `"vi_du": lấy TỪNG câu, cụm từ, mẫu câu ngoại ngữ trong giáo trình. Mỗi câu một phần tử: "t" nguyên văn, "doc" là cách đọc (tiếng Nhật: hiragana + romaji; tiếng Anh: phiên âm IPA), "g" là nghĩa tiếng Việt + giải thích ngữ pháp/từ thật ngắn. Không bỏ câu nào. Trong "thuat_ngu" cũng điền "doc".`,
  khoa_hoc: `"vi_du": lấy từng công thức, định luật, bài giải, ví dụ trong giáo trình. Mỗi dòng hoặc mỗi bước là một phần tử: "t" nguyên văn, "g" giải nghĩa từng ký hiệu/bước. "doc" để "".`,
  ly_thuyet: `"vi_du": lấy TỪNG câu/ý quan trọng của đoạn giáo trình theo thứ tự. Mỗi câu một phần tử: "t" nguyên văn câu, "g" giải nghĩa bằng lời dễ hiểu. Không bỏ ý nào. "doc" để "".`,
  khac: `"vi_du": lấy TỪNG câu/dòng quan trọng của đoạn giáo trình theo thứ tự. Mỗi câu một phần tử: "t" nguyên văn, "g" giải nghĩa dễ hiểu. Không bỏ ý nào. "doc" để "".`,
};
const SUM_SPEC = `lời giảng tóm tắt TOÀN BỘ đoạn giáo trình để sinh viên NGHE là hiểu và nhớ, như một thầy cô giảng gần gũi, vui vẻ. Yêu cầu:
  * Đoạn đầu: một câu nói bài này học gì và vì sao cần học.
  * Đi đúng thứ tự giáo trình, phủ hết mọi ý, định nghĩa, luận điểm, số liệu, mốc thời gian, tên riêng; không bỏ ý nào.
  * Mỗi đoạn 2-4 câu ngắn (dưới 20 từ), xưng "mình" và gọi "bạn", dùng từ thường ngày. Thuật ngữ khó thì giải thích ngay bằng lời dễ hiểu.
  * Mỗi ý quan trọng kèm một ví dụ đời thường hoặc so sánh dễ hình dung. Ý khó nhớ thì thêm mẹo nhớ (viết tắt, vần, liên tưởng).
  * Nhắc lại từ khóa chính để dễ nhớ. Số và năm viết sao cho đọc to vẫn rõ.
  * Đoạn cuối: "Tóm lại, bạn nhớ giúp mình các ý chính:" rồi liệt kê 3-5 ý bằng câu ngắn.
  * Không dùng ký hiệu markdown, gạch đầu dòng, ngoặc kép lồng nhau hay ký tự đặc biệt vì sẽ được đọc thành tiếng.`;
const MO_RONG_SPEC = `"mo_rong": NGOẠI LỆ được dùng kiến thức ngoài giáo trình. Ghi 4-8 ý liên quan trực tiếp và hay gặp khi thi môn này (bối cảnh lịch sử, tác giả/nhân vật, sự kiện, khái niệm liên quan, so sánh, ý nghĩa thực tiễn). Mỗi ý 1-2 câu. Chỉ ghi kiến thức chắc chắn đúng và phổ biến trong chương trình đại học Việt Nam, không bịa. "vi_sao": ý này liên quan đến phần nào của bài. Dạng [{"y":"...","vi_sao":"..."}]`;
function pVideo(sub, b, numbered) {
  return `Bạn là một giảng viên đại học giảng rất hay, kiểu các thầy cô dạy online nổi tiếng trên YouTube. Hãy soạn kịch bản VIDEO BÀI GIẢNG cho bài "${b.ten}" môn "${sub.name}" (loại: ${T(sub.type).n}) từ đoạn giáo trình bên dưới.
Cách giảng:
- Cảnh "mo_dau": mở bằng một tình huống hoặc câu hỏi gợi tò mò gắn với đời thực, rồi nói rõ hôm nay học gì, học xong làm được gì.
- Chia nhỏ: mỗi cảnh chỉ 1 ý. Giải thích bằng lời dễ hiểu trước rồi mới nói thuật ngữ. Luôn có ví dụ cụ thể hoặc so sánh đời thường.
- ${sub.type === "lap_trinh" ? 'Có cảnh "vi_du" làm mẫu: viết code từng bước, giải thích từng dòng, chạy thử trong đầu, chỉ ra lỗi hay gặp.' : sub.type === "ngoai_ngu" ? 'Có cảnh "vi_du" luyện: đọc mẫu câu, phân tích từng thành phần, cách đọc, đặt câu tương tự, lỗi người Việt hay mắc.' : 'Có cảnh "vi_du" phân tích ví dụ, so sánh các khái niệm dễ nhầm, liên hệ thực tế, nhấn mạnh ý thi hay hỏi.'}
- Sau mỗi 2-3 cảnh giảng có 1 cảnh "hoi" (câu hỏi nhanh) để kiểm tra hiểu bài.
- Nhấn mạnh bằng lời như "Chỗ này quan trọng nè", "Đề thi rất hay hỏi chỗ này", "Nhiều bạn hay nhầm".
- Cảnh cuối "tong_ket": tóm 3-5 ý chính, một mẹo nhớ, gợi ý tự luyện.
- Phủ TOÀN BỘ nội dung đoạn giáo trình, không bỏ ý. Kiến thức lấy từ giáo trình; ví dụ đời thường để so sánh thì được tự đặt${EXT(sub.type) ? ", phần liên hệ được dùng kiến thức phổ biến chắc chắn đúng" : ""}.
- "loi" (lời giảng): xưng "mình", gọi "các bạn", câu ngắn dưới 20 từ, tự nhiên như đang nói, không ký hiệu markdown. Mỗi cảnh 3-7 câu.
- "bang": những gì viết lên bảng, 2-5 dòng thật ngắn (từ khóa, công thức, định nghĩa rút gọn), hiện dần theo lời giảng.
- "minh_hoa" (khi cần): {"kieu":"code","noi_dung":"..."} hoặc {"kieu":"so_do","noi_dung":"Bước 1 → Bước 2 → Bước 3"} hoặc {"kieu":"bang","noi_dung":"Cột A | Cột B\\nx | y"}.
- BẮT BUỘC có ví dụ: mọi cảnh "giang" và "vi_du" phải có "vd" là một ví dụ cụ thể, ngắn, dễ nhớ (đời thường hoặc lấy từ giáo trình), và lời giảng phải nói về ví dụ đó.
- BẮT BUỘC có sơ đồ tư duy:
  * Cảnh thứ hai là "ban_do": sơ đồ tư duy toàn bài, lời giảng đi qua từng nhánh để các bạn thấy bức tranh tổng thể trước khi học chi tiết.
  * Cảnh "giang" nào có nhiều phần, nhiều loại, các bước hoặc cần so sánh thì thêm "tu_duy" nhỏ 2-4 nhánh.
  * Cảnh "tong_ket" có "tu_duy" tổng kết.
  * Dạng: {"goc":"chủ đề ngắn","nhanh":[{"ten":"tên nhánh ngắn","y":["ý con thật ngắn","..."]}]}, mỗi nhánh tối đa 3 ý con, chữ thật ngắn.
- ĐÁNH DẤU NGOẠI NGỮ: mọi từ, cụm từ, câu tiếng nước ngoài hoặc tên lệnh code trong "loi", "bang", "vd" phải đặt trong {{ }}, ví dụ: Câu {{I am a student}} nghĩa là tôi là sinh viên. Lệnh {{print}} dùng để in. Phần tiếng Việt thì không đặt.${
    sub.type === "ngoai_ngu"
      ? `
- Môn ngoại ngữ: giảng bằng tiếng Việt nhưng mỗi câu mẫu ngoại ngữ phải nằm trọn trong {{ }} để giọng bản xứ đọc. Cảnh "vi_du" đọc câu mẫu hai lần (một lần thường, một lần sau khi phân tích), nhắc cách phát âm, trọng âm, nối âm.`
      : ""
  }
Tổng 9-16 cảnh.
Chỉ trả về JSON: {"canh":[{"loai":"mo_dau|ban_do|giang|vi_du|hoi|tong_ket","tieu_de":"...","bang":["..."],"vd":"ví dụ cụ thể","tu_duy":{"goc":"...","nhanh":[{"ten":"...","y":["..."]}]},"minh_hoa":{"kieu":"...","noi_dung":"..."},"loi":["..."],"cau_hoi":"chỉ với cảnh hoi","lua_chon":["...","...","..."],"dap_an":0,"giai_thich":"..."}]}

ĐOẠN GIÁO TRÌNH:
${numbered}`;
}
function pSummary(sub, b, numbered) {
  return `Soạn phần nghe giảng cho bài "${b.ten}" môn "${sub.name}" (loại: ${T(sub.type).n}).
- "tom_tat": ${SUM_SPEC}
${EXT(sub.type) ? `- ${MO_RONG_SPEC}` : ""}
Tiếng Việt có dấu, từ dễ hiểu.
Chỉ trả về JSON: {"tom_tat":["..."]${EXT(sub.type) ? ',"mo_rong":[{"y":"...","vi_sao":"..."}]' : ""}}

ĐOẠN GIÁO TRÌNH:
${numbered}`;
}
function pOutline(sub, numbered, i, n) {
  return `Bạn giúp sinh viên học giáo trình môn "${sub.name}" (loại: ${T(sub.type).n}).
Dưới đây là ${n > 1 ? `phần ${i + 1}/${n} của ` : ""}giáo trình. Mỗi dòng có số thứ tự trong ngoặc vuông.

Nhiệm vụ:
1. "muc": liệt kê ĐẦY ĐỦ mọi mục, tiểu mục, khái niệm, lệnh, quy tắc, từ vựng/mẫu câu cần học, theo thứ tự. Không bỏ sót ý nào. Mỗi mục ghi dòng bắt đầu "tu" và dòng kết thúc "den".
2. "bai": chia phần cần học thành các bài liên tiếp, mỗi bài khoảng 15-80 dòng, cắt theo ranh giới chủ đề tự nhiên. Các bài nối tiếp nhau, không chồng lấn.
3. "bo_qua": các đoạn không cần học (lời nói đầu, mục lục, số trang, tài liệu tham khảo, bản quyền), kèm lý do ngắn.
Mọi dòng có chữ phải thuộc một bài hoặc thuộc bo_qua.
Tên mục và tên bài đặt theo giáo trình, ngắn gọn.

Chỉ trả về JSON đúng dạng sau, không thêm chữ nào khác:
{"muc":[{"ten":"...","tu":1,"den":5}],"bai":[{"ten":"...","tu":1,"den":40}],"bo_qua":[{"ly_do":"...","tu":1,"den":3}]}

GIÁO TRÌNH:
${numbered}`;
}
function pLesson(sub, b, numbered, items, extra) {
  return `Bạn soạn bài học cho môn "${sub.name}" (loại: ${T(sub.type).n}) từ đoạn giáo trình bên dưới (bài "${b.ten}", dòng ${b.tu}-${b.den}). Mỗi dòng có số thứ tự trong ngoặc vuông.
${RULES}

Trả về JSON:
- "muc_tieu": 2-4 mục tiêu ngắn của bài.
- "cot_loi": các ý cốt lõi, mỗi ý 1 câu. Phủ hết ý chính trong đoạn.
- "thuat_ngu": mọi thuật ngữ/từ khóa/lệnh/từ vựng xuất hiện, [{"tu","doc","nghia"}].
- ${VIDU[sub.type] || VIDU.khac}
  Mỗi phần tử "dong" có "n" = số dòng gốc.
${sub.type === "ngoai_ngu" ? `- "ngu_phap": MỌI mẫu ngữ pháp/mẫu câu trong đoạn, [{"mau":"cấu trúc, ví dụ N1 は N2 です","nghia":"nghĩa tiếng Việt","cach_dung":"dùng khi nào, lưu ý, điểm dễ sai","vi_du":[{"t":"câu ví dụ lấy từ giáo trình","doc":"cách đọc","g":"nghĩa"}]}]` : ""}
- "loi": lỗi hay gặp hoặc điều dễ nhầm, CHỈ khi giáo trình có nêu lưu ý, cảnh báo, quy tắc liên quan. Nếu không có thì để [].
- "hoi": 3-6 câu hỏi tự kiểm tra, đáp án ngắn lấy từ giáo trình. [{"q","a"}].
${EXT(sub.type) ? `- ${MO_RONG_SPEC}` : ""}
- "phu": mã các mục đã giải nghĩa trong bài. "khong_co": mã các mục không tìm thấy trong đoạn này.
Các mục cần phủ trong bài:
${items.length ? items.map((m) => `${m.id}: ${m.ten} (dòng ${m.tu}-${m.den})`).join("\n") : "(không có danh sách, tự phủ hết đoạn)"}
${extra || ""}
Dạng JSON:
{"muc_tieu":["..."],"cot_loi":["..."],"thuat_ngu":[{"tu":"...","doc":"","nghia":"..."}],"vi_du":[{"tieu_de":"...","dong":[{"n":1,"t":"...","doc":"","g":"..."}]}],"loi":["..."],"hoi":[{"q":"...","a":"..."}],${sub.type === "ngoai_ngu" ? '"ngu_phap":[{"mau":"...","nghia":"...","cach_dung":"...","vi_du":[{"t":"...","doc":"...","g":"..."}]}],' : ""}${EXT(sub.type) ? '"mo_rong":[{"y":"...","vi_sao":"..."}],' : ""}"phu":["m1"],"khong_co":[]}
Chỉ trả về JSON.

ĐOẠN GIÁO TRÌNH:
${numbered}`;
}
const MCQ_SHAPE = `{"loai":"trac_nghiem","hoi":"...","lua_chon":["...","...","...","..."],"dap_an":0,"giai_thich":"vì sao đúng, dẫn ý trong giáo trình"} (dap_an là chỉ số 0-3 của lựa chọn đúng)`;
function pPractice(sub, b, numbered) {
  const spec =
    {
      lap_trinh: `Tạo bài luyện từ DỄ đến KHÓ để sinh viên tự tay viết code và rèn tư duy, theo đúng thứ tự:
- 2 bài "doan_ket_qua": {"loai":"doan_ket_qua","ngon_ngu":"python|javascript|c|cpp|java|sql|...","code":"...","dap_an":"kết quả in ra chính xác","giai_thich":[{"t":"dòng code","g":"giải nghĩa"}]} (giải thích MỌI dòng; chỉ ra đề khi chắc chắn kết quả).
- 2 bài "sap_xep": {"loai":"sap_xep","ngon_ngu":"...","de":"đoạn code này làm gì","dong":["các dòng code theo ĐÚNG thứ tự, giữ thụt lề"]} (4-8 dòng, không có hai dòng giống hệt nhau).
- 1 bài "sua_loi": {"loai":"sua_loi","ngon_ngu":"...","de":"code cần làm gì","code_loi":"code có 1-2 lỗi người mới hay mắc","dap_an_code":"code đã sửa đúng","goi_y":["gợi ý chỗ sai"]}.
- 3 bài "viet_code": {"loai":"viet_code","ngon_ngu":"...","de":"đề bài rõ ràng, nói rõ đầu vào và đầu ra","goi_y":["gợi ý 1: hướng suy nghĩ","gợi ý 2: các bước làm","gợi ý 3: lệnh cần dùng"],"kiem_tra":[{"vao":"...","ra":"..."}],"mau":"lời giải mẫu"}. Bài sau khó hơn bài trước; bài cuối kết hợp nhiều kiến thức của bài.
- 4 bài "trac_nghiem" về khái niệm, cú pháp, độ phức tạp: ${MCQ_SHAPE}
Ngôn ngữ lập trình lấy theo giáo trình. Nếu đoạn giáo trình không có code (chỉ lý thuyết), thay bằng "dien_tu" và "tu_luan".`,
      ngoai_ngu: `Tạo bài luyện:
- 3 bài "dien_tu": câu ngoại ngữ trong giáo trình bỏ trống một từ hoặc trợ từ: {"loai":"dien_tu","cau":"... ___ ...","nghia":"nghĩa tiếng Việt của cả câu","dap_an":"...","goi_y":"..."}
- 3 bài "sap_xep_cau": {"loai":"sap_xep_cau","nghia":"nghĩa tiếng Việt","manh":["các mảnh của câu ngoại ngữ theo ĐÚNG thứ tự"]} (4-7 mảnh).
- 3 bài "dich": 2 bài Việt → ngoại ngữ, 1 bài ngoại ngữ → Việt: {"loai":"dich","cau":"...","huong":"Việt → Nhật","mau":"bản dịch mẫu"}
- 1 bài "tu_luan": tự đặt câu với từ/mẫu ngữ pháp mới của bài: {"loai":"tu_luan","hoi":"Hãy đặt 1 câu dùng ...","mau":"câu mẫu"}
- 5 bài "trac_nghiem" về nghĩa từ, ngữ pháp, cách dùng: ${MCQ_SHAPE}`,
    }[sub.type] ||
    `Tạo bộ câu hỏi "vắt kiệt" đoạn giáo trình để ôn thi:
- "trac_nghiem": phủ MỌI ý trong đoạn giáo trình, mỗi ý (định nghĩa, luận điểm, đặc điểm, nguyên nhân, kết quả, ý nghĩa, mốc thời gian, nhân vật, số liệu) ít nhất 1 câu, thường 12-25 câu. Xen độ khó: nhớ, hiểu, vận dụng, so sánh. Đáp án nhiễu hợp lý, cùng độ dài, không dùng "tất cả đều đúng". Dạng: ${MCQ_SHAPE}
${EXT(sub.type) ? `- Thêm 3-6 câu "trac_nghiem" từ kiến thức NGOÀI giáo trình nhưng liên quan và hay gặp khi thi môn này (chỉ kiến thức chắc chắn đúng), thêm "mo_rong":true.` : ""}
- 2 bài "dien_tu": {"loai":"dien_tu","cau":"câu có ___","dap_an":"...","goi_y":"..."}
- 2 bài "tu_luan" dạng câu hỏi thi tự luận: {"loai":"tu_luan","hoi":"...","mau":"dàn ý đáp án"}
- 1 bài "tu_luan" dạng giảng lại: "Giải thích lại ... bằng lời của bạn như đang dạy bạn cùng lớp".`;
  return `Tạo bài luyện cho bài "${b.ten}" môn "${sub.name}" (loại: ${T(sub.type).n}).
QUY TẮC: Chỉ dùng kiến thức, lệnh, từ vựng, ngữ pháp có trong đoạn giáo trình bên dưới (được đặt đề hoặc câu mới, nhưng không dùng kiến thức ngoài giáo trình${EXT(sub.type) ? `, trừ các câu đánh dấu "mo_rong":true` : ""}). Lời giải thích ngắn, từ dễ hiểu, tiếng Việt có dấu.
${spec}
Chỉ trả về JSON: {"items":[...]}

ĐOẠN GIÁO TRÌNH:
${numbered}`;
}
