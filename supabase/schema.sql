-- ============================================================================
-- SCHEMA SUPABASE: GAMESHOW "CUỘC THI GIA ĐÌNH CHUYỂN ĐỔI SỐ"
-- Hướng dẫn: Copy toàn bộ nội dung file này và chạy 1 lần trong Supabase SQL Editor
-- ============================================================================

-- 1. BẢNG CẤU HÌNH GIAO DIỆN & LUẬT CHƠI (CHỈ 1 DÒNG DUY NHẤT id = 1)
create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),

  -- Nhận diện sự kiện
  org_name text not null default 'BAN TỔ CHỨC NGÀY HỘI CHUYỂN ĐỔI SỐ',
  contest_title text not null default 'CUỘC THI GIA ĐÌNH CHUYỂN ĐỔI SỐ',
  slogan text not null default 'Mỗi gia đình một hạt nhân số — Chung tay kiến tạo tương lai',
  logo_url text,
  background_mode text not null default 'gradient' check (background_mode in ('gradient', 'image')),
  background_url text,
  overlay_opacity integer not null default 45 check (overlay_opacity >= 0 and overlay_opacity <= 85),

  -- Màu sắc (mặc định Xanh Công Nghệ Neon)
  bg_color text not null default '#061326',
  card_color text not null default '#0e2444',
  text_color text not null default '#f8fafc',
  slogan_color text not null default '#fbbf24',
  accent_color text not null default '#38bdf8',

  -- Font chữ (hỗ trợ tiếng Việt)
  heading_font text not null default 'Be Vietnam Pro',
  body_font text not null default 'Lexend',

  -- Cỡ chữ (px) & Độ đậm (font-weight)
  title_size integer not null default 54,
  title_weight integer not null default 800,
  slogan_size integer not null default 24,
  slogan_weight integer not null default 600,
  question_size integer not null default 34,
  question_weight integer not null default 700,
  option_size integer not null default 26,
  option_weight integer not null default 600,
  timer_size integer not null default 52,
  timer_weight integer not null default 800,

  -- Luật chơi & Bảo mật Admin
  mcq_duration integer not null default 15 check (mcq_duration >= 5 and mcq_duration <= 300),
  scenario_duration integer not null default 120 check (scenario_duration >= 10 and scenario_duration <= 900),
  auto_reveal_answer boolean not null default true,
  lock_during_countdown boolean not null default true,
  admin_password text not null default 'admin123',

  updated_at timestamptz not null default now()
);

-- Bổ sung cột mới an toàn cho cơ sở dữ liệu đã tạo trước đó
alter table public.settings add column if not exists lock_during_countdown boolean not null default true;
alter table public.settings add column if not exists admin_password text not null default 'admin123';

-- 2. BẢNG CÂU HỎI TRẮC NGHIỆM (PHẦN 1)
create table if not exists public.mcqs (
  id bigint generated always as identity primary key,
  package_name text not null,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer text not null check (correct_answer in ('A', 'B', 'C', 'D')),
  explanation text not null default '',
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_mcqs_package_order on public.mcqs (package_name, order_index, id);

-- 3. BẢNG CÂU HỎI TÌNH HUỐNG (PHẦN 2)
create table if not exists public.scenarios (
  id bigint generated always as identity primary key,
  package_name text not null,
  title text not null,
  content text not null,
  grading_guide text not null default '',
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_scenarios_package_order on public.scenarios (package_name, order_index, id);

-- 4. CẤP QUYỀN BẢNG/SEQUENCE, MỞ POLICY CÔNG KHAI & TẮT RLS CHO BẢN DEMO
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.settings, public.mcqs, public.scenarios to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Tạo sẵn policy công khai phòng trường hợp RLS được bật lại trên Dashboard
drop policy if exists "Public full access settings" on public.settings;
drop policy if exists "Public full access mcqs" on public.mcqs;
drop policy if exists "Public full access scenarios" on public.scenarios;

create policy "Public full access settings"
on public.settings for all to anon, authenticated
using (true) with check (true);

create policy "Public full access mcqs"
on public.mcqs for all to anon, authenticated
using (true) with check (true);

create policy "Public full access scenarios"
on public.scenarios for all to anon, authenticated
using (true) with check (true);

alter table public.settings disable row level security;
alter table public.mcqs disable row level security;
alter table public.scenarios disable row level security;

notify pgrst, 'reload schema';

-- 5. CẤU HÌNH SUPABASE REALTIME CHO SETTINGS, MCQS VÀ SCENARIOS
alter table public.settings replica identity full;
alter table public.mcqs replica identity full;
alter table public.scenarios replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'settings'
  ) then
    alter publication supabase_realtime add table public.settings;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mcqs'
  ) then
    alter publication supabase_realtime add table public.mcqs;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'scenarios'
  ) then
    alter publication supabase_realtime add table public.scenarios;
  end if;
end $$;

-- 6. TẠO STORAGE BUCKET `contest-assets` VÀ MỞ POLICY CÔNG KHAI CHO LOGO / HÌNH NỀN
insert into storage.buckets (id, name, public)
values ('contest-assets', 'contest-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read contest-assets" on storage.objects;
drop policy if exists "Public insert contest-assets" on storage.objects;
drop policy if exists "Public update contest-assets" on storage.objects;
drop policy if exists "Public delete contest-assets" on storage.objects;

create policy "Public read contest-assets"
on storage.objects for select
using (bucket_id = 'contest-assets');

create policy "Public insert contest-assets"
on storage.objects for insert
with check (bucket_id = 'contest-assets');

create policy "Public update contest-assets"
on storage.objects for update
using (bucket_id = 'contest-assets');

create policy "Public delete contest-assets"
on storage.objects for delete
using (bucket_id = 'contest-assets');

-- 7. DỮ LIỆU MẪU BAN ĐẦU
insert into public.settings (id)
values (1)
on conflict (id) do nothing;

-- Chỉ thêm dữ liệu câu hỏi mẫu khi bảng đang trống
insert into public.mcqs (package_name, question, option_a, option_b, option_c, option_d, correct_answer, explanation, order_index)
select * from (
  values
    (
      'Gói 1 - Công dân số',
      'Ứng dụng định danh điện tử quốc gia do Bộ Công an phát triển giúp công dân tích hợp CCCD, BHYT, GPLX là gì?',
      'VNeID',
      'VssID',
      'PC-Covid',
      'eTax Mobile',
      'A',
      'VNeID là ứng dụng định danh điện tử quốc gia chính thức do Trung tâm Dữ liệu quốc gia về dân cư (Bộ Công an) phát triển.',
      1
    ),
    (
      'Gói 1 - Công dân số',
      'Cổng Dịch vụ công Quốc gia có địa chỉ truy cập chính thức là gì?',
      'dichvucong.vn',
      'dichvucong.gov.vn',
      'congdan.gov.vn',
      'chinhphu.org.vn',
      'B',
      'Địa chỉ chính thức của Cổng Dịch vụ công Quốc gia là https://dichvucong.gov.vn (tên miền .gov.vn của cơ quan nhà nước).',
      2
    ),
    (
      'Gói 1 - Công dân số',
      'Ngày Chuyển đổi số quốc gia của Việt Nam được tổ chức vào ngày nào hằng năm?',
      'Ngày 02 tháng 9',
      'Ngày 10 tháng 10',
      'Ngày 15 tháng 10',
      'Ngày 20 tháng 11',
      'B',
      'Thủ tướng Chính phủ quyết định lấy ngày 10/10 hằng năm là Ngày Chuyển đổi số quốc gia (số 1 và số 0 là hai chữ số của hệ nhị phân).',
      3
    ),
    (
      'Gói 1 - Công dân số',
      'Lợi ích nổi bật nhất khi sử dụng thanh toán không dùng tiền mặt (VietQR, ví điện tử) trong gia đình là gì?',
      'Bắt buộc phải có thẻ tín dụng quốc tế mới dùng được',
      'Nhanh chóng, minh bạch, dễ quản lý chi tiêu và hạn chế rủi ro tiền giả',
      'Không cần kết nối Internet hay điện thoại thông minh',
      'Miễn toàn bộ tiền điện, tiền nước hằng tháng',
      'B',
      'Thanh toán số qua mã VietQR, Mobile Banking giúp giao dịch nhanh gọn, có sao kê rõ ràng, an toàn và thuận tiện cho mọi thành viên gia đình.',
      4
    ),
    (
      'Gói 1 - Công dân số',
      'Tài khoản định danh điện tử mức độ 2 trên VNeID được đăng ký bằng cách nào?',
      'Tự đăng ký hoàn toàn qua tin nhắn SMS',
      'Nhờ người thân gửi ảnh chụp CCCD qua mạng xã hội',
      'Đến trực tiếp Công an xã/phường/thị trấn để thu nhận thông tin sinh trắc học',
      'Gọi điện cho tổng đài để cấp tự động',
      'C',
      'Định danh điện tử mức độ 2 yêu cầu xác thực trực tiếp ảnh chân dung và vân tay tại cơ quan Công an để đảm bảo giá trị pháp lý tương đương thẻ CCCD gắn chip.',
      5
    ),
    (
      'Gói 2 - An toàn không gian mạng',
      'Khi nhận được cuộc gọi tự xưng là cán bộ Công an yêu cầu tải ứng dụng lạ qua đường link ngoài CH Play/App Store để "cập nhật VNeID", bạn nên làm gì?',
      'Làm theo ngay để tránh bị khóa tài khoản',
      'Đọc mã OTP cho người gọi để họ hỗ trợ nhanh',
      'Tuyệt đối không cài đặt, ngắt máy và liên hệ trực tiếp Công an địa phương để xác minh',
      'Chuyển thử một khoản tiền nhỏ để kiểm tra',
      'C',
      'Cơ quan Công an không bao giờ yêu cầu cài ứng dụng qua link lạ hay cung cấp mã OTP qua điện thoại. Đây là thủ đoạn lừa đảo chiếm quyền điều khiển điện thoại phổ biến.',
      1
    ),
    (
      'Gói 2 - An toàn không gian mạng',
      'Nguyên tắc đặt mật khẩu an toàn cho tài khoản ngân hàng số và mạng xã hội của gia đình là gì?',
      'Dùng ngày sinh hoặc số điện thoại cho dễ nhớ',
      'Dùng chung một mật khẩu "12345678" cho tất cả tài khoản',
      'Kết hợp chữ hoa, chữ thường, chữ số, ký tự đặc biệt và bật xác thực 2 lớp (2FA)',
      'Ghi mật khẩu công khai lên trang cá nhân Facebook',
      'C',
      'Mật khẩu mạnh kết hợp xác thực hai yếu tố (2FA) giúp giảm thiểu tối đa nguy cơ bị đánh cắp tài khoản.',
      2
    ),
    (
      'Gói 2 - An toàn không gian mạng',
      'Thủ đoạn lừa đảo sử dụng trí tuệ nhân tạo (AI) giả mạo khuôn mặt và giọng nói người thân qua video call để vay tiền gấp gọi là gì?',
      'Deepfake',
      'Blockchain',
      'Cloud Computing',
      'Big Data',
      'A',
      'Deepfake là công nghệ AI ghép khuôn mặt và giọng nói giả. Khi gặp cuộc gọi video chập chờn hỏi vay tiền gấp, cần gọi lại bằng số điện thoại thường để kiểm chứng.',
      3
    ),
    (
      'Gói 2 - An toàn không gian mạng',
      'Thông tin nào sau đây TUYỆT ĐỐI KHÔNG được chia sẻ cho bất kỳ ai kể cả nhân viên ngân hàng?',
      'Tên ngân hàng bạn đang mở tài khoản',
      'Mã OTP, mật khẩu đăng nhập và số CVV/CVC mặt sau thẻ',
      'Mã QR nhận tiền công khai tại cửa hàng',
      'Tên chủ tài khoản khi nhận chuyển khoản',
      'B',
      'Mã OTP, mật khẩu và mã bảo mật CVV/CVC là chìa khóa giao dịch cá nhân. Nhân viên ngân hàng chính thống không bao giờ yêu cầu cung cấp các mã này.',
      4
    ),
    (
      'Gói 2 - An toàn không gian mạng',
      'Cách nào giúp cha mẹ bảo vệ trẻ em an toàn nhất khi sử dụng Internet tại nhà?',
      'Cấm hoàn toàn không cho trẻ tiếp cận thiết bị công nghệ',
      'Để trẻ tự do xem mọi nội dung không cần quan tâm',
      'Đồng hành, thiết lập giới hạn thời gian, bật chế độ kiểm soát phụ huynh và dạy trẻ kỹ năng số',
      'Giao toàn quyền quản lý mật khẩu ngân hàng cho trẻ',
      'C',
      'Đồng hành cùng con, dùng công cụ kiểm soát nội dung (Parental Control) và giáo dục kỹ năng tự bảo vệ là cách hiệu quả, bền vững nhất.',
      5
    )
) as seed(package_name, question, option_a, option_b, option_c, option_d, correct_answer, explanation, order_index)
where not exists (select 1 from public.mcqs limit 1);

insert into public.scenarios (package_name, title, content, grading_guide, order_index)
select * from (
  values
    (
      'Gói 1 - Công dân số',
      'Hướng dẫn ông bà làm thủ tục hành chính trực tuyến tại nhà',
      'Ông nội năm nay 72 tuổi cần xin cấp lại giấy xác nhận cư trú nhưng ngại đi lại xa và lo lắng mình lớn tuổi không biết thao tác trên điện thoại. Gia đình bạn sẽ vận dụng các nền tảng chuyển đổi số như thế nào để hỗ trợ ông nhanh gọn, an toàn và giúp ông tự tin hơn với công nghệ?',
      E'1. Sử dụng ứng dụng VNeID (mức độ 2) hoặc Cổng Dịch vụ công Quốc gia (dichvucong.gov.vn) để nộp hồ sơ trực tuyến ngay tại nhà.\n2. Kiên nhẫn hướng dẫn ông từng bước trực quan (phóng to cỡ chữ, giải thích rõ quy trình tiếp nhận và theo dõi tiến độ hồ sơ online).\n3. Nếu cần hỗ trợ tại chỗ, có thể nhờ Tổ công nghệ số cộng đồng tại khu dân cư đồng hành.\n4. Thông điệp gắn kết gia đình: thế hệ trẻ dẫn dắt thế hệ lớn tuổi tiếp cận tiện ích số an toàn.',
      1
    ),
    (
      'Gói 1 - Công dân số',
      'Xây dựng thói quen quản lý chi tiêu số cho gia đình',
      'Cửa hàng tạp hóa nhỏ của gia đình vẫn ghi sổ tay và chỉ nhận tiền mặt, đôi khi nhầm lẫn tiền thừa hoặc khó kiểm soát doanh thu cuối tháng. Là thành viên trong gia đình, bạn đề xuất giải pháp chuyển đổi số đơn giản, ít tốn chi phí nào để áp dụng ngay?',
      E'1. Tạo mã thanh toán VietQR đặt tại quầy giúp khách thanh toán nhanh, tiền về thẳng tài khoản, có thông báo biến động số dư (hoặc loa báo chuyển khoản).\n2. Sử dụng ứng dụng ghi chép sổ thu chi / quản lý bán hàng miễn phí trên điện thoại.\n3. Phân công thành viên rà soát sao kê hằng ngày, kiểm tra giao dịch thực nhận trước khi giao hàng để tránh ảnh chụp chuyển khoản giả.',
      2
    ),
    (
      'Gói 2 - An toàn không gian mạng',
      'Cuộc gọi video giả mạo người thân nhờ chuyển tiền gấp',
      'Buổi tối, mẹ bạn bất ngờ nhận được cuộc gọi video từ tài khoản mạng xã hội của người bác ở xa. Hình ảnh hơi mờ, âm thanh rè nhưng đúng gương mặt và giọng nói của bác, báo đang gặp tai nạn cần chuyển gấp 15 triệu đồng vào một tài khoản mang tên người lạ. Mẹ bạn rất hoảng hốt và định mở app ngân hàng chuyển ngay. Gia đình bạn sẽ xử lý tình huống này ra sao?',
      E'1. Lập tức trấn an mẹ, TUYỆT ĐỐI KHÔNG chuyển tiền ngay vào tài khoản người lạ.\n2. Nhận diện dấu hiệu lừa đảo Deepfake: hình ảnh mờ giật, cuộc gọi ngắn, tạo áp lực tâm lý gấp gáp, tài khoản nhận tiền không trùng tên người thân.\n3. Kiểm chứng chéo: gọi lại trực tiếp bằng số điện thoại di động thường của bác hoặc gọi cho người thân sống cùng bác.\n4. Chặn, báo cáo tài khoản giả mạo và nhắc cả gia đình quy ước câu hỏi bí mật nội bộ khi có yêu cầu tài chính khẩn cấp.',
      1
    ),
    (
      'Gói 2 - An toàn không gian mạng',
      'Bảo vệ con nhỏ trước tin nhắn trúng thưởng và link lạ trên mạng',
      'Con bạn học lớp 6 đang dùng máy tính bảng học trực tuyến thì nhận được tin nhắn từ người lạ gửi đường link "Nhận skin game miễn phí — Chỉ cần đăng nhập tài khoản Facebook của bố mẹ và nhập mã gửi về điện thoại". Con định bấm vào làm thử. Bạn sẽ xử lý và giáo dục con như thế nào?',
      E'1. Nhẹ nhàng dừng thao tác của con, không bấm vào đường link lạ, không quát mắng để con cởi mở chia sẻ lần sau.\n2. Giải thích cho con hiểu nguyên lý lừa đảo đánh cắp tài khoản (Phishing) và tác hại khi lộ mã OTP.\n3. Thiết lập tài khoản riêng cho trẻ trên thiết bị, bật chế độ kiểm soát phụ huynh (Family Link / Screen Time) và không lưu sẵn mật khẩu ngân hàng trên máy trẻ học.\n4. Thống nhất quy tắc gia đình "3 KHÔNG": Không bấm link lạ — Không chia sẻ thông tin cá nhân — Luôn hỏi bố mẹ trước khi tải ứng dụng mới.',
      2
    )
) as seed(package_name, title, content, grading_guide, order_index)
where not exists (select 1 from public.scenarios limit 1);
