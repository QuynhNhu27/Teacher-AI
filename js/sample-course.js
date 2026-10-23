/* Môn học mẫu hiển thị khi mới mở trang (chỉ nằm trong bộ nhớ). */
"use strict";

/* ---------- môn mẫu (chỉ trong bộ nhớ) ---------- */
const MAU_SRC = [
  "Bài 1. Biến và kiểu dữ liệu",
  "Biến dùng để lưu một giá trị. Trong Python không cần khai báo kiểu trước.",
  'ten = "An"',
  "tuoi = 20",
  "print(ten, tuoi)",
  "Hàm type() cho biết kiểu dữ liệu của một giá trị.",
  "print(type(tuoi))",
  "Bài 2. Câu lệnh if",
  "if dùng để chọn lệnh chạy theo điều kiện đúng hay sai.",
  "diem = 7",
  "if diem >= 5:",
  '    print("Đậu")',
  "else:",
  '    print("Rớt")',
  "Lưu ý: các lệnh bên trong if và else phải thụt lề bằng nhau.",
].join("\n");
const MAU_L0 = {
  muc_tieu: ["Biết biến dùng để làm gì.", "Biết dùng type() để xem kiểu dữ liệu."],
  cot_loi: [
    "Biến là một cái tên để lưu một giá trị.",
    "Python tự hiểu kiểu, không cần khai báo kiểu trước.",
    "type() cho biết kiểu dữ liệu của một giá trị.",
  ],
  thuat_ngu: [
    { tu: "biến", nghia: "Tên dùng để lưu một giá trị." },
    { tu: "kiểu dữ liệu", nghia: "Loại của giá trị, ví dụ chữ hay số." },
    { tu: "type()", nghia: "Hàm cho biết kiểu dữ liệu của giá trị." },
  ],
  vi_du: [
    {
      tieu_de: "Tạo biến và in ra",
      dong: [
        { n: 3, t: 'ten = "An"', g: 'Tạo biến ten, lưu chữ "An".' },
        { n: 4, t: "tuoi = 20", g: "Tạo biến tuoi, lưu số 20." },
        { n: 5, t: "print(ten, tuoi)", g: "In giá trị của ten và tuoi ra màn hình." },
      ],
    },
    {
      tieu_de: "Xem kiểu dữ liệu",
      dong: [
        { n: 7, t: "print(type(tuoi))", g: "Lấy kiểu dữ liệu của tuoi bằng type(), rồi in ra." },
      ],
    },
  ],
  loi: [],
  hoi: [
    { q: "Biến dùng để làm gì?", a: "Để lưu một giá trị." },
    { q: "Có cần khai báo kiểu cho biến trong Python không?", a: "Không cần khai báo kiểu trước." },
    { q: "Hàm nào cho biết kiểu dữ liệu của một giá trị?", a: "type()" },
  ],
  video: [
    {
      loai: "mo_dau",
      tieu_de: "Biến là cái hộp có dán nhãn",
      bang: ["Biến = hộp chứa giá trị", "Tên biến = nhãn dán trên hộp"],
      minh_hoa: { kieu: "vi_du", noi_dung: "Hộp tên “tuoi” đang chứa số 20" },
      loi: [
        "Chào các bạn! Các bạn có bao giờ dán nhãn lên hộp đồ để dễ tìm không?",
        "Trong lập trình, biến chính là một cái hộp như vậy.",
        "Hộp thì chứa đồ, còn biến thì chứa giá trị.",
        "Tên biến là cái nhãn để mình gọi đúng hộp cần dùng.",
        "Hôm nay mình học cách tạo biến và xem kiểu dữ liệu của nó nhé.",
      ],
    },
    {
      loai: "ban_do",
      tieu_de: "Bản đồ bài học hôm nay",
      bang: [],
      tu_duy: {
        goc: "Biến trong {{Python}}",
        nhanh: [
          { ten: "Biến là gì", y: ["Hộp chứa giá trị", "Có tên để gọi"] },
          { ten: "Cách tạo", y: ["tên = giá trị", "Không khai báo kiểu"] },
          { ten: "In ra", y: ["{{print()}}"] },
          { ten: "Xem kiểu", y: ["{{type()}}"] },
        ],
      },
      loi: [
        "Trước khi vào chi tiết, mình xem bức tranh tổng thể nhé.",
        "Ở giữa là chủ đề chính, biến trong {{Python}}.",
        "Nhánh thứ nhất, biến là gì.",
        "Nhánh thứ hai, cách tạo biến.",
        "Nhánh thứ ba, in giá trị ra màn hình bằng {{print}}.",
        "Nhánh cuối, xem kiểu dữ liệu bằng {{type}}.",
      ],
    },
    {
      loai: "giang",
      tieu_de: "Tạo biến trong Python",
      vd: 'Giống như ghi tên lên hộp bút rồi bỏ bút vào: {{ten = "An"}}',
      bang: ["tên_biến = giá_trị", "Không cần khai báo kiểu trước"],
      minh_hoa: { kieu: "code", noi_dung: 'ten = "An"\ntuoi = 20' },
      loi: [
        "Để tạo biến, mình viết tên biến, dấu bằng, rồi giá trị.",
        "Ví dụ ten bằng An, tức là cất chữ An vào hộp tên ten.",
        "tuoi bằng 20 là cất số 20 vào hộp tuoi.",
        "Chỗ này quan trọng nè: Python không bắt mình khai báo kiểu trước.",
        "Nó tự nhìn giá trị và hiểu đó là chữ hay số.",
      ],
    },
    {
      loai: "hoi",
      tieu_de: "Kiểm tra nhanh",
      cau_hoi: "Trong Python, muốn tạo biến tuoi bằng 20 thì viết thế nào?",
      lua_chon: ["tuoi = 20", "int tuoi = 20", "20 = tuoi"],
      dap_an: 0,
      giai_thich: "Viết tên biến, dấu bằng, rồi giá trị. Python không cần ghi kiểu int phía trước.",
      bang: [],
      loi: [],
    },
    {
      loai: "vi_du",
      tieu_de: "In giá trị và xem kiểu",
      vd: "{{print(type(20))}} cho biết 20 là số nguyên",
      bang: ["print() in ra màn hình", "type() cho biết kiểu dữ liệu"],
      minh_hoa: { kieu: "so_do", noi_dung: "tuoi → type(tuoi) → print(...) → màn hình" },
      loi: [
        "Giờ mình in giá trị ra bằng lệnh print.",
        "print ten, tuoi sẽ in ra An và 20.",
        "Còn muốn biết hộp đang chứa loại gì, mình dùng hàm type.",
        "Viết print type tuoi, máy sẽ cho biết kiểu của biến tuoi.",
        "Nhiều bạn hay nhầm type với print. Nhớ nhé: type là hỏi kiểu, print là in ra.",
      ],
    },
    {
      loai: "tong_ket",
      tieu_de: "Tóm lại",
      bang: ["Biến = hộp có nhãn", "tên = giá trị", "type() hỏi kiểu, print() in ra"],
      tu_duy: {
        goc: "Ghi nhớ",
        nhanh: [
          { ten: "Biến", y: ["Hộp có nhãn"] },
          { ten: "Tạo", y: ["tên = giá trị"] },
          { ten: "{{print}}", y: ["In ra"] },
          { ten: "{{type}}", y: ["Hỏi kiểu"] },
        ],
      },
      loi: [
        "Tóm lại, các bạn nhớ giúp mình ba ý.",
        "Một, biến là hộp có nhãn để chứa giá trị.",
        "Hai, tạo biến bằng cách viết tên, dấu bằng, giá trị.",
        "Ba, type để hỏi kiểu, print để in ra.",
        "Về nhà các bạn thử tạo ba biến về bản thân rồi in ra nhé!",
      ],
    },
  ],
  tom_tat: [
    "Bài này nói về biến. Biến là một cái tên dùng để lưu một giá trị. Trong Python, ta không cần khai báo kiểu trước khi tạo biến.",
    "Ví dụ, ten bằng An là lưu một chữ, tuoi bằng 20 là lưu một số. Lệnh print in giá trị của hai biến này ra màn hình.",
    "Hàm type cho biết kiểu dữ liệu của một giá trị. Lệnh print type tuoi sẽ lấy kiểu của biến tuoi rồi in ra.",
  ],
  phu: ["m1", "m2"],
  khong_co: [],
};
const MEM = {
  sub_mau: {
    kind: "subject",
    sid: "mau",
    name: "Python cơ bản (mẫu)",
    type: "lap_trinh",
    created: 0,
    nlines: 15,
    parts: 1,
    sample: true,
    outline: {
      muc: [
        { id: "m1", ten: "Biến", tu: 2, den: 5 },
        { id: "m2", ten: "Hàm type()", tu: 6, den: 7 },
        { id: "m3", ten: "Câu lệnh if/else", tu: 9, den: 14 },
        { id: "m4", ten: "Thụt lề trong if/else", tu: 15, den: 15 },
      ],
      bai: [
        { id: "b1", ten: "Biến và kiểu dữ liệu", tu: 1, den: 7 },
        { id: "b2", ten: "Câu lệnh if", tu: 8, den: 15 },
      ],
      bo_qua: [],
    },
    ready: { b1: true },
    done: {},
    miss: {},
  },
  src_mau_0: { kind: "source", text: MAU_SRC },
  les_mau_b1: { kind: "lesson", data: MAU_L0 },
  prac_mau_b1: {
    kind: "practice",
    items: [
      {
        loai: "doan_ket_qua",
        code: 'ten = "An"\ntuoi = 20\nprint(ten, tuoi)',
        dap_an: "An 20",
        giai_thich: [
          { t: 'ten = "An"', g: 'Lưu chữ "An" vào ten.' },
          { t: "tuoi = 20", g: "Lưu số 20 vào tuoi." },
          { t: "print(ten, tuoi)", g: "In hai giá trị, cách nhau một dấu cách." },
        ],
      },
      {
        loai: "dien_tu",
        cau: "Hàm ___ cho biết kiểu dữ liệu của một giá trị.",
        dap_an: "type()",
        goi_y: "Xem dòng 6 của giáo trình.",
      },
      {
        loai: "trac_nghiem",
        hoi: "Trong Python, muốn biết kiểu dữ liệu của một giá trị thì dùng hàm nào?",
        lua_chon: ["type()", "print()", "kind()", "int()"],
        dap_an: 0,
        giai_thich: "Dòng 6 của giáo trình: hàm type() cho biết kiểu dữ liệu của một giá trị.",
      },
      {
        loai: "trac_nghiem",
        hoi: "Khi tạo biến trong Python, có cần khai báo kiểu trước không?",
        lua_chon: ["Không cần", "Bắt buộc phải khai báo", "Chỉ cần với số", "Chỉ cần với chữ"],
        dap_an: 0,
        giai_thich: "Dòng 2: trong Python không cần khai báo kiểu trước.",
      },
    ],
  },
};
const isMem = (id) => /_mau(_|$)/.test(id);
MEM.cards_mau = {
  kind: "cards",
  list: cardsFromLesson("b1", MAU_L0).map((c) => ({ ...c, box: 1, due: 0 })),
};
