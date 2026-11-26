import type {
  ContestSettings,
  FontFamilyName,
  McqQuestion,
  PackageGroup,
  ScenarioQuestion,
} from "./types";

export const FONT_OPTIONS: {
  name: FontFamilyName;
  cssVar: string;
  note: string;
}[] = [
  {
    name: "Be Vietnam Pro",
    cssVar: "var(--font-be-vietnam-pro)",
    note: "Hiện đại, tối ưu tiếng Việt",
  },
  {
    name: "Montserrat",
    cssVar: "var(--font-montserrat)",
    note: "Mạnh mẽ, chuẩn sân khấu truyền hình",
  },
  {
    name: "Lexend",
    cssVar: "var(--font-lexend)",
    note: "Dễ đọc từ xa trên màn hình LED",
  },
  {
    name: "Roboto",
    cssVar: "var(--font-roboto)",
    note: "Cân đối, trung tính, rõ nét",
  },
  {
    name: "Oswald",
    cssVar: "var(--font-oswald)",
    note: "Cao gọn, nổi bật cho tiêu đề & đồng hồ",
  },
];

export function getFontCss(fontName: FontFamilyName): string {
  const found = FONT_OPTIONS.find((item) => item.name === fontName);
  return found
    ? `${found.cssVar}, system-ui, -apple-system, sans-serif`
    : "var(--font-be-vietnam-pro), system-ui, sans-serif";
}

export interface ColorThemePreset {
  id: string;
  name: string;
  vibe: string;
  bg_color: string;
  card_color: string;
  text_color: string;
  slogan_color: string;
  accent_color: string;
  overlay_opacity: number;
}

export const THEME_PRESETS: ColorThemePreset[] = [
  {
    id: "tech-neon-default",
    name: "Xanh Công Nghệ (Mặc định)",
    vibe: "Tông neon công nghệ ban đầu của dự án",
    bg_color: "#061326",
    card_color: "#0e2444",
    text_color: "#f8fafc",
    slogan_color: "#fbbf24",
    accent_color: "#38bdf8",
    overlay_opacity: 45,
  },
  {
    id: "vtv-olympia",
    name: "Đường Lên Đỉnh Olympia (VTV3)",
    vibe: "Xanh hoàng gia & vàng ánh kim kinh điển",
    bg_color: "#0b2259",
    card_color: "#143785",
    text_color: "#ffffff",
    slogan_color: "#ffd43b",
    accent_color: "#f59e0b",
    overlay_opacity: 20,
  },
  {
    id: "vtv-trieu-phu",
    name: "Ai Là Triệu Phú (VTV3)",
    vibe: "Xanh đêm sâu trường quay & cam vàng đồng",
    bg_color: "#060e33",
    card_color: "#0f2167",
    text_color: "#ffffff",
    slogan_color: "#fbbf24",
    accent_color: "#f97316",
    overlay_opacity: 25,
  },
  {
    id: "vtv-rung-chuong-vang",
    name: "Rung Chuông Vàng (VTV3)",
    vibe: "Đỏ đô lễ hội & vàng rực rỡ hội trường",
    bg_color: "#4a0816",
    card_color: "#731024",
    text_color: "#fffdf5",
    slogan_color: "#facc15",
    accent_color: "#f59e0b",
    overlay_opacity: 20,
  },
  {
    id: "vtv-o-nha-chu-nhat",
    name: "Ở Nhà Chủ Nhật (VTV3 Gia đình)",
    vibe: "Xanh cổ vịt ấm áp & cam nắng cuối tuần",
    bg_color: "#0b3545",
    card_color: "#134e63",
    text_color: "#ffffff",
    slogan_color: "#fde047",
    accent_color: "#fb923c",
    overlay_opacity: 18,
  },
  {
    id: "vtv-chiec-non-ky-dieu",
    name: "Chiếc Nón Kỳ Diệu (VTV3)",
    vibe: "Tím hoàng gia sân khấu & vàng kim rực sáng",
    bg_color: "#22104d",
    card_color: "#361b75",
    text_color: "#ffffff",
    slogan_color: "#facc15",
    accent_color: "#f59e0b",
    overlay_opacity: 22,
  },
  {
    id: "vtv-gala-vtv1",
    name: "Gala Trường Quay VTV1",
    vibe: "Xanh navy trang trọng, vàng đồng & đỏ cờ",
    bg_color: "#0d1b38",
    card_color: "#19305c",
    text_color: "#f8fafc",
    slogan_color: "#eab308",
    accent_color: "#dc2626",
    overlay_opacity: 22,
  },
  {
    id: "vtv-daylight",
    name: "Hội Nghị Ban Ngày (Nền Sáng)",
    vibe: "Trắng kem thanh lịch, xanh VTV & vàng đồng",
    bg_color: "#f2f5fb",
    card_color: "#ffffff",
    text_color: "#0f172a",
    slogan_color: "#b45309",
    accent_color: "#1d4ed8",
    overlay_opacity: 0,
  },
];

export function isLightHexColor(hex: string): boolean {
  const cleaned = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return false;
  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.58;
}

export const DEFAULT_SETTINGS: ContestSettings = {
  id: 1,
  org_name: "BAN TỔ CHỨC NGÀY HỘI CHUYỂN ĐỔI SỐ",
  contest_title: "CUỘC THI GIA ĐÌNH CHUYỂN ĐỔI SỐ",
  slogan: "Mỗi gia đình một hạt nhân số — Chung tay kiến tạo tương lai",
  logo_url: null,
  background_mode: "gradient",
  background_url: null,
  overlay_opacity: 45,

  bg_color: "#061326",
  card_color: "#0e2444",
  text_color: "#f8fafc",
  slogan_color: "#fbbf24",
  accent_color: "#38bdf8",

  heading_font: "Be Vietnam Pro",
  body_font: "Lexend",

  title_size: 54,
  title_weight: 800,
  slogan_size: 24,
  slogan_weight: 600,
  question_size: 34,
  question_weight: 700,
  option_size: 26,
  option_weight: 600,
  timer_size: 52,
  timer_weight: 800,

  mcq_duration: 15,
  scenario_duration: 120,
  auto_reveal_answer: true,
  lock_during_countdown: true,
};

export const DEMO_MCQS: McqQuestion[] = [
  {
    id: 1,
    package_name: "Gói 1 - Công dân số",
    question:
      "Ứng dụng định danh điện tử quốc gia do Bộ Công an phát triển giúp công dân tích hợp CCCD, BHYT, GPLX là gì?",
    option_a: "VNeID",
    option_b: "VssID",
    option_c: "PC-Covid",
    option_d: "eTax Mobile",
    correct_answer: "A",
    explanation:
      "VNeID là ứng dụng định danh điện tử quốc gia chính thức do Trung tâm Dữ liệu quốc gia về dân cư (Bộ Công an) phát triển.",
    order_index: 1,
  },
  {
    id: 2,
    package_name: "Gói 1 - Công dân số",
    question:
      "Cổng Dịch vụ công Quốc gia có địa chỉ truy cập chính thức là gì?",
    option_a: "dichvucong.vn",
    option_b: "dichvucong.gov.vn",
    option_c: "congdan.gov.vn",
    option_d: "chinhphu.org.vn",
    correct_answer: "B",
    explanation:
      "Địa chỉ chính thức của Cổng Dịch vụ công Quốc gia là https://dichvucong.gov.vn (tên miền .gov.vn của cơ quan nhà nước).",
    order_index: 2,
  },
  {
    id: 3,
    package_name: "Gói 1 - Công dân số",
    question:
      "Ngày Chuyển đổi số quốc gia của Việt Nam được tổ chức vào ngày nào hằng năm?",
    option_a: "Ngày 02 tháng 9",
    option_b: "Ngày 10 tháng 10",
    option_c: "Ngày 15 tháng 10",
    option_d: "Ngày 20 tháng 11",
    correct_answer: "B",
    explanation:
      "Thủ tướng Chính phủ quyết định lấy ngày 10/10 hằng năm là Ngày Chuyển đổi số quốc gia (số 1 và số 0 là hai chữ số của hệ nhị phân).",
    order_index: 3,
  },
  {
    id: 4,
    package_name: "Gói 1 - Công dân số",
    question:
      "Lợi ích nổi bật nhất khi sử dụng thanh toán không dùng tiền mặt (VietQR, ví điện tử) trong gia đình là gì?",
    option_a: "Bắt buộc phải có thẻ tín dụng quốc tế mới dùng được",
    option_b:
      "Nhanh chóng, minh bạch, dễ quản lý chi tiêu và hạn chế rủi ro tiền giả",
    option_c: "Không cần kết nối Internet hay điện thoại thông minh",
    option_d: "Miễn toàn bộ tiền điện, tiền nước hằng tháng",
    correct_answer: "B",
    explanation:
      "Thanh toán số qua mã VietQR, Mobile Banking giúp giao dịch nhanh gọn, có sao kê rõ ràng, an toàn và thuận tiện cho mọi thành viên gia đình.",
    order_index: 4,
  },
  {
    id: 5,
    package_name: "Gói 1 - Công dân số",
    question:
      "Tài khoản định danh điện tử mức độ 2 trên VNeID được đăng ký bằng cách nào?",
    option_a: "Tự đăng ký hoàn toàn qua tin nhắn SMS",
    option_b: "Nhờ người thân gửi ảnh chụp CCCD qua mạng xã hội",
    option_c:
      "Đến trực tiếp Công an xã/phường/thị trấn để thu nhận thông tin sinh trắc học",
    option_d: "Gọi điện cho tổng đài để cấp tự động",
    correct_answer: "C",
    explanation:
      "Định danh điện tử mức độ 2 yêu cầu xác thực trực tiếp ảnh chân dung và vân tay tại cơ quan Công an để đảm bảo giá trị pháp lý tương đương thẻ CCCD gắn chip.",
    order_index: 5,
  },
  {
    id: 6,
    package_name: "Gói 2 - An toàn không gian mạng",
    question:
      'Khi nhận được cuộc gọi tự xưng là cán bộ Công an yêu cầu tải ứng dụng lạ qua đường link ngoài CH Play/App Store để "cập nhật VNeID", bạn nên làm gì?',
    option_a: "Làm theo ngay để tránh bị khóa tài khoản",
    option_b: "Đọc mã OTP cho người gọi để họ hỗ trợ nhanh",
    option_c:
      "Tuyệt đối không cài đặt, ngắt máy và liên hệ trực tiếp Công an địa phương để xác minh",
    option_d: "Chuyển thử một khoản tiền nhỏ để kiểm tra",
    correct_answer: "C",
    explanation:
      "Cơ quan Công an không bao giờ yêu cầu cài ứng dụng qua link lạ hay cung cấp mã OTP qua điện thoại. Đây là thủ đoạn lừa đảo chiếm quyền điều khiển điện thoại phổ biến.",
    order_index: 1,
  },
  {
    id: 7,
    package_name: "Gói 2 - An toàn không gian mạng",
    question:
      "Nguyên tắc đặt mật khẩu an toàn cho tài khoản ngân hàng số và mạng xã hội của gia đình là gì?",
    option_a: "Dùng ngày sinh hoặc số điện thoại cho dễ nhớ",
    option_b: 'Dùng chung một mật khẩu "12345678" cho tất cả tài khoản',
    option_c:
      "Kết hợp chữ hoa, chữ thường, chữ số, ký tự đặc biệt và bật xác thực 2 lớp (2FA)",
    option_d: "Ghi mật khẩu công khai lên trang cá nhân Facebook",
    correct_answer: "C",
    explanation:
      "Mật khẩu mạnh kết hợp xác thực hai yếu tố (2FA) giúp giảm thiểu tối đa nguy cơ bị đánh cắp tài khoản.",
    order_index: 2,
  },
  {
    id: 8,
    package_name: "Gói 2 - An toàn không gian mạng",
    question:
      "Thủ đoạn lừa đảo sử dụng trí tuệ nhân tạo (AI) giả mạo khuôn mặt và giọng nói người thân qua video call để vay tiền gấp gọi là gì?",
    option_a: "Deepfake",
    option_b: "Blockchain",
    option_c: "Cloud Computing",
    option_d: "Big Data",
    correct_answer: "A",
    explanation:
      "Deepfake là công nghệ AI ghép khuôn mặt và giọng nói giả. Khi gặp cuộc gọi video chập chờn hỏi vay tiền gấp, cần gọi lại bằng số điện thoại thường để kiểm chứng.",
    order_index: 3,
  },
  {
    id: 9,
    package_name: "Gói 2 - An toàn không gian mạng",
    question:
      "Thông tin nào sau đây TUYỆT ĐỐI KHÔNG được chia sẻ cho bất kỳ ai kể cả nhân viên ngân hàng?",
    option_a: "Tên ngân hàng bạn đang mở tài khoản",
    option_b: "Mã OTP, mật khẩu đăng nhập và số CVV/CVC mặt sau thẻ",
    option_c: "Mã QR nhận tiền công khai tại cửa hàng",
    option_d: "Tên chủ tài khoản khi nhận chuyển khoản",
    correct_answer: "B",
    explanation:
      "Mã OTP, mật khẩu và mã bảo mật CVV/CVC là chìa khóa giao dịch cá nhân. Nhân viên ngân hàng chính thống không bao giờ yêu cầu cung cấp các mã này.",
    order_index: 4,
  },
  {
    id: 10,
    package_name: "Gói 2 - An toàn không gian mạng",
    question:
      "Cách nào giúp cha mẹ bảo vệ trẻ em an toàn nhất khi sử dụng Internet tại nhà?",
    option_a: "Cấm hoàn toàn không cho trẻ tiếp cận thiết bị công nghệ",
    option_b: "Để trẻ tự do xem mọi nội dung không cần quan tâm",
    option_c:
      "Đồng hành, thiết lập giới hạn thời gian, bật chế độ kiểm soát phụ huynh và dạy trẻ kỹ năng số",
    option_d: "Giao toàn quyền quản lý mật khẩu ngân hàng cho trẻ",
    correct_answer: "C",
    explanation:
      "Đồng hành cùng con, dùng công cụ kiểm soát nội dung (Parental Control) và giáo dục kỹ năng tự bảo vệ là cách hiệu quả, bền vững nhất.",
    order_index: 5,
  },
];

export const DEMO_SCENARIOS: ScenarioQuestion[] = [
  {
    id: 1,
    package_name: "Gói 1 - Công dân số",
    title: "Hướng dẫn ông bà làm thủ tục hành chính trực tuyến tại nhà",
    content:
      "Ông nội năm nay 72 tuổi cần xin cấp lại giấy xác nhận cư trú nhưng ngại đi lại xa và lo lắng mình lớn tuổi không biết thao tác trên điện thoại. Gia đình bạn sẽ vận dụng các nền tảng chuyển đổi số như thế nào để hỗ trợ ông nhanh gọn, an toàn và giúp ông tự tin hơn với công nghệ?",
    grading_guide:
      "1. Sử dụng ứng dụng VNeID (mức độ 2) hoặc Cổng Dịch vụ công Quốc gia (dichvucong.gov.vn) để nộp hồ sơ trực tuyến ngay tại nhà.\n2. Kiên nhẫn hướng dẫn ông từng bước trực quan (phóng to cỡ chữ, giải thích rõ quy trình tiếp nhận và theo dõi tiến độ hồ sơ online).\n3. Nếu cần hỗ trợ tại chỗ, có thể nhờ Tổ công nghệ số cộng đồng tại khu dân cư đồng hành.\n4. Thông điệp gắn kết gia đình: thế hệ trẻ dẫn dắt thế hệ lớn tuổi tiếp cận tiện ích số an toàn.",
    order_index: 1,
  },
  {
    id: 2,
    package_name: "Gói 1 - Công dân số",
    title: "Xây dựng thói quen quản lý chi tiêu số cho gia đình",
    content:
      "Cửa hàng tạp hóa nhỏ của gia đình vẫn ghi sổ tay và chỉ nhận tiền mặt, đôi khi nhầm lẫn tiền thừa hoặc khó kiểm soát doanh thu cuối tháng. Là thành viên trong gia đình, bạn đề xuất giải pháp chuyển đổi số đơn giản, ít tốn chi phí nào để áp dụng ngay?",
    grading_guide:
      "1. Tạo mã thanh toán VietQR đặt tại quầy giúp khách thanh toán nhanh, tiền về thẳng tài khoản, có thông báo biến động số dư (hoặc loa báo chuyển khoản).\n2. Sử dụng ứng dụng ghi chép sổ thu chi / quản lý bán hàng miễn phí trên điện thoại.\n3. Phân công thành viên rà soát sao kê hằng ngày, kiểm tra giao dịch thực nhận trước khi giao hàng để tránh ảnh chụp chuyển khoản giả.",
    order_index: 2,
  },
  {
    id: 3,
    package_name: "Gói 2 - An toàn không gian mạng",
    title: "Cuộc gọi video giả mạo người thân nhờ chuyển tiền gấp",
    content:
      "Buổi tối, mẹ bạn bất ngờ nhận được cuộc gọi video từ tài khoản mạng xã hội của người bác ở xa. Hình ảnh hơi mờ, âm thanh rè nhưng đúng gương mặt và giọng nói của bác, báo đang gặp tai nạn cần chuyển gấp 15 triệu đồng vào một tài khoản mang tên người lạ. Mẹ bạn rất hoảng hốt và định mở app ngân hàng chuyển ngay. Gia đình bạn sẽ xử lý tình huống này ra sao?",
    grading_guide:
      "1. Lập tức trấn an mẹ, TUYỆT ĐỐI KHÔNG chuyển tiền ngay vào tài khoản người lạ.\n2. Nhận diện dấu hiệu lừa đảo Deepfake: hình ảnh mờ giật, cuộc gọi ngắn, tạo áp lực tâm lý gấp gáp, tài khoản nhận tiền không trùng tên người thân.\n3. Kiểm chứng chéo: gọi lại trực tiếp bằng số điện thoại di động thường của bác hoặc gọi cho người thân sống cùng bác.\n4. Chặn, báo cáo tài khoản giả mạo và nhắc cả gia đình quy ước câu hỏi bí mật nội bộ khi có yêu cầu tài chính khẩn cấp.",
    order_index: 1,
  },
  {
    id: 4,
    package_name: "Gói 2 - An toàn không gian mạng",
    title: "Bảo vệ con nhỏ trước tin nhắn trúng thưởng và link lạ trên mạng",
    content:
      'Con bạn học lớp 6 đang dùng máy tính bảng học trực tuyến thì nhận được tin nhắn từ người lạ gửi đường link "Nhận skin game miễn phí — Chỉ cần đăng nhập tài khoản Facebook của bố mẹ và nhập mã gửi về điện thoại". Con định bấm vào làm thử. Bạn sẽ xử lý và giáo dục con như thế nào?',
    grading_guide:
      '1. Nhẹ nhàng dừng thao tác của con, không bấm vào đường link lạ, không quát mắng để con cởi mở chia sẻ lần sau.\n2. Giải thích cho con hiểu nguyên lý lừa đảo đánh cắp tài khoản (Phishing) và tác hại khi lộ mã OTP.\n3. Thiết lập tài khoản riêng cho trẻ trên thiết bị, bật chế độ kiểm soát phụ huynh (Family Link / Screen Time) và không lưu sẵn mật khẩu ngân hàng trên máy trẻ học.\n4. Thống nhất quy tắc gia đình "3 KHÔNG": Không bấm link lạ — Không chia sẻ thông tin cá nhân — Luôn hỏi bố mẹ trước khi tải ứng dụng mới.',
    order_index: 2,
  },
];

export function groupByPackage<T extends { package_name: string }>(
  items: T[],
): PackageGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.package_name.trim() || "Gói mặc định";
    const list = map.get(key);
    if (list) {
      list.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return Array.from(map.entries()).map(([name, grouped]) => ({
    name,
    items: grouped,
  }));
}

export function normalizeSettings(
  raw: Partial<ContestSettings> | null | undefined,
): ContestSettings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  const sanitized = { ...raw } as Partial<ContestSettings> & {
    admin_password?: unknown;
  };
  delete sanitized.admin_password;

  return {
    ...DEFAULT_SETTINGS,
    ...sanitized,
    id: 1,
    overlay_opacity: clampNumber(
      sanitized.overlay_opacity ?? DEFAULT_SETTINGS.overlay_opacity,
      0,
      85,
    ),
    mcq_duration: clampNumber(
      sanitized.mcq_duration ?? DEFAULT_SETTINGS.mcq_duration,
      5,
      300,
    ),
    scenario_duration: clampNumber(
      sanitized.scenario_duration ?? DEFAULT_SETTINGS.scenario_duration,
      10,
      900,
    ),
    auto_reveal_answer:
      typeof sanitized.auto_reveal_answer === "boolean"
        ? sanitized.auto_reveal_answer
        : DEFAULT_SETTINGS.auto_reveal_answer,
    lock_during_countdown:
      typeof sanitized.lock_during_countdown === "boolean"
        ? sanitized.lock_during_countdown
        : DEFAULT_SETTINGS.lock_during_countdown,
  };
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
