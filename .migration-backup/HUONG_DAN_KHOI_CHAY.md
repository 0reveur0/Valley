# 📚 Valley — Hướng dẫn khởi chạy đầy đủ

> Dự án **Valley** là nền tảng chia sẻ tài liệu học thuật dành cho sinh viên và giảng viên.
> Tài liệu này hướng dẫn bạn cài đặt từ đầu trên máy tính cá nhân (**localhost**) và deploy lên **Vercel + Neon PostgreSQL** miễn phí.

---

## 📋 Mục lục

1. [Cấu hình file môi trường (.env)](#-phần-1-cấu-hình-file-môi-trường-env)
2. [Chạy thử trên máy tính (Localhost)](#-phần-2-chạy-thử-trên-localhost)
3. [Deploy lên Vercel + Neon PostgreSQL](#-phần-3-deploy-lên-vercel--neon-postgresql)

---

## 🔑 Phần 1: Cấu hình File Môi Trường (.env)

### Tạo file `.env`

Tạo một file tên là **`.env`** trong thư mục gốc của dự án (`/`). Copy toàn bộ nội dung mẫu dưới đây vào:

```env
# ============================================================
#  VALLEY — FILE CẤU HÌNH MÔI TRƯỜNG (.env)
#  Đừng commit file này lên GitHub! (đã có trong .gitignore)
# ============================================================

# --------------------------------------------------
# 1. DATABASE — Chuỗi kết nối PostgreSQL
# --------------------------------------------------
# Lấy từ: Neon.tech / Supabase / Railway (xem Phần 3)
# Dạng: postgres://user:password@host:5432/database?sslmode=require
DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"

# --------------------------------------------------
# 2. SESSION SECRET — Khóa bí mật ký cookie phiên đăng nhập
# --------------------------------------------------
# Tạo ngẫu nhiên bằng lệnh: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Quan trọng: PHẢI đặt giá trị bí mật mạnh trên môi trường production!
SESSION_SECRET="thay-bang-mot-chuoi-bi-mat-dai-va-ngau-nhien"

# --------------------------------------------------
# 3. CLOUDINARY — Lưu trữ file PDF
# --------------------------------------------------
# Đăng ký miễn phí tại: https://cloudinary.com
# Vào Dashboard > Settings để lấy các giá trị này
CLOUDINARY_CLOUD_NAME="ten-cloud-cua-ban"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="abc123xyz456secretkey"

# --------------------------------------------------
# 4. GOOGLE GEMINI AI — Kiểm duyệt tài liệu tự động
# --------------------------------------------------
# Lấy API key miễn phí tại: https://aistudio.google.com/app/apikey
# Nếu không có, hệ thống sẽ đặt tài liệu ở trạng thái "Pending" (chờ admin duyệt thủ công)
GEMINI_API_KEY="AIzaSy..."

# --------------------------------------------------
# 5. PORT — Cổng chạy API server (mặc định: 8080)
# --------------------------------------------------
# Thường không cần thay đổi khi chạy local
PORT=8080
```

### Giải thích từng biến

| Biến | Bắt buộc? | Giải thích | Lấy ở đâu |
|------|-----------|------------|-----------|
| `DATABASE_URL` | ✅ Bắt buộc | Địa chỉ kết nối tới cơ sở dữ liệu PostgreSQL | Neon.tech / Supabase |
| `SESSION_SECRET` | ✅ Bắt buộc (Production) | Chuỗi bí mật để mã hoá cookie đăng nhập, bảo vệ phiên người dùng | Tự tạo ngẫu nhiên |
| `CLOUDINARY_CLOUD_NAME` | ⚠️ Tuỳ chọn | Tên cloud trên Cloudinary để lưu file PDF | cloudinary.com/console |
| `CLOUDINARY_API_KEY` | ⚠️ Tuỳ chọn | Khoá API Cloudinary | cloudinary.com/console |
| `CLOUDINARY_API_SECRET` | ⚠️ Tuỳ chọn | Khoá bí mật Cloudinary | cloudinary.com/console |
| `GEMINI_API_KEY` | ⚠️ Tuỳ chọn | API của Google Gemini để AI kiểm duyệt nội dung tài liệu | aistudio.google.com |
| `PORT` | ❌ Không bắt buộc | Cổng chạy server (mặc định 8080) | Không cần thay |

> **Lưu ý:** Nếu **không có** Cloudinary và Gemini, dự án vẫn chạy được. Upload sẽ dùng URL giả (dev mode) và tài liệu sẽ ở trạng thái "Pending" thay vì được AI duyệt tự động.

---

## 💻 Phần 2: Chạy thử trên Localhost

### Yêu cầu trước khi bắt đầu

Đảm bảo máy bạn đã cài:
- **Node.js v18 trở lên** — Kiểm tra: `node -v`
- **pnpm v9 trở lên** — Cài bằng: `npm install -g pnpm`
- **PostgreSQL** — Hoặc dùng database miễn phí trên Neon.tech (xem Phần 3)

### Bước 1: Tải mã nguồn về máy

```bash
# Clone từ GitHub (thay bằng URL repo của bạn)
git clone https://github.com/username/valley.git

# Vào thư mục dự án
cd valley
```

### Bước 2: Cài đặt tất cả thư viện

Dự án dùng **pnpm workspaces** nên chỉ cần chạy 1 lệnh từ thư mục gốc:

```bash
pnpm install
```

> Lệnh này sẽ cài tất cả thư viện cho frontend, backend và các package dùng chung.

### Bước 3: Tạo file `.env`

```bash
# Copy file mẫu
cp .env.example .env

# Mở file và điền thông tin của bạn (xem Phần 1)
# Trên macOS/Linux:
nano .env

# Trên Windows:
notepad .env
```

Điều quan trọng nhất là phải có `DATABASE_URL` hợp lệ trước khi sang bước tiếp theo.

### Bước 4: Đồng bộ cấu trúc Database

Lệnh này sẽ tạo tất cả các bảng cần thiết trong cơ sở dữ liệu của bạn (tương đương `prisma db push` nhưng dùng **Drizzle ORM**):

```bash
pnpm --filter @workspace/db run push
```

Nếu thành công, bạn sẽ thấy:
```
[✓] Pulling schema from database...
[✓] Changes applied
```

### Bước 5: Khởi chạy dự án

Mở **2 cửa sổ terminal** và chạy 2 lệnh song song:

**Terminal 1 — Khởi chạy API server (Backend):**
```bash
pnpm --filter @workspace/api-server run dev
```
Server sẽ khởi động tại `http://localhost:8080`

**Terminal 2 — Khởi chạy giao diện web (Frontend):**
```bash
pnpm --filter @workspace/valley run dev
```
Giao diện sẽ khởi động tại `http://localhost:5173` (hoặc cổng khác tuỳ Vite)

### Bước 6: Mở trình duyệt

Truy cập địa chỉ:
```
http://localhost:5173
```

Bạn sẽ thấy trang chủ Valley. Đăng ký tài khoản mới để bắt đầu trải nghiệm!

### 🔧 Lệnh hữu ích khác

```bash
# Kiểm tra lỗi TypeScript toàn bộ dự án
pnpm run typecheck

# Build toàn bộ dự án (kiểm tra trước khi deploy)
pnpm run build

# Cập nhật schema database sau khi thay đổi cấu trúc bảng
pnpm --filter @workspace/db run push
```

---

## 🚀 Phần 3: Deploy lên Vercel + Neon PostgreSQL

### Tổng quan kiến trúc deploy

```
                    ┌─────────────────────┐
Người dùng ──────► │   Vercel (Frontend)  │
                    │   React + Vite       │
                    └──────────┬──────────┘
                               │ gọi API
                    ┌──────────▼──────────┐
                    │  Vercel (API Server) │
                    │   Express.js         │
                    └──────────┬──────────┘
                               │ kết nối DB
                    ┌──────────▼──────────┐
                    │   Neon PostgreSQL    │
                    │   (miễn phí)         │
                    └─────────────────────┘
```

---

### 📦 Bước 1: Tạo Database PostgreSQL miễn phí trên Neon

1. Truy cập **https://neon.tech** và đăng ký tài khoản miễn phí (có thể dùng Google)

2. Sau khi đăng nhập, nhấn **"New Project"**

3. Điền thông tin:
   - **Project name:** `valley`
   - **Database name:** `valley`
   - **Region:** chọn vùng gần nhất (Singapore cho người Việt Nam)

4. Nhấn **"Create Project"**

5. Neon sẽ hiện ra **Connection String**. Copy chuỗi dạng:
   ```
   postgres://username:password@ep-xxx.ap-southeast-1.aws.neon.tech/valley?sslmode=require
   ```

6. Đây chính là giá trị `DATABASE_URL` bạn sẽ dùng trên Vercel!

> **Lưu ý:** Gói miễn phí của Neon cho phép 1 project, 3GB storage, đủ dùng cho giai đoạn đầu.

---

### 🐙 Bước 2: Đẩy code lên GitHub

Nếu chưa có repo GitHub, tạo mới:

1. Vào **https://github.com** → **"New repository"**
2. Đặt tên repo, chọn **Private** hoặc **Public**
3. Nhấn **"Create repository"**

Sau đó đẩy code lên:

```bash
# Khởi tạo git (nếu chưa có)
git init
git add .
git commit -m "first commit: Valley project"

# Kết nối với GitHub (thay bằng URL repo của bạn)
git remote add origin https://github.com/username/valley.git
git branch -M main
git push -u origin main
```

> **Quan trọng:** Đảm bảo file `.env` có trong `.gitignore` để **không bao giờ** đẩy thông tin bí mật lên GitHub!

---

### ▲ Bước 3: Deploy lên Vercel

#### 3.1. Kết nối GitHub với Vercel

1. Vào **https://vercel.com** và đăng nhập bằng tài khoản GitHub

2. Nhấn **"Add New Project"** → **"Import Git Repository"**

3. Chọn repo `valley` vừa tạo → nhấn **"Import"**

#### 3.2. Cấu hình Build Settings

Vercel sẽ hỏi cách build dự án. Điền như sau:

| Trường | Giá trị |
|--------|---------|
| **Framework Preset** | `Other` |
| **Root Directory** | `artifacts/valley` |
| **Build Command** | `cd ../.. && pnpm install && pnpm --filter @workspace/db run push && pnpm --filter @workspace/valley run build` |
| **Output Directory** | `dist` |
| **Install Command** | *(để trống)* |

#### 3.3. Thêm biến môi trường (Environment Variables)

Đây là bước **cực kỳ quan trọng**. Không có bước này, dự án sẽ bị lỗi ngay sau khi deploy.

1. Trong giao diện Vercel, tìm mục **"Environment Variables"**

2. Nhấn **"Add"** và lần lượt thêm từng biến:

```
DATABASE_URL        = postgres://user:pass@host/valley?sslmode=require
SESSION_SECRET      = [chuỗi bí mật dài, ngẫu nhiên]
CLOUDINARY_CLOUD_NAME = [tên cloud của bạn]
CLOUDINARY_API_KEY  = [API key]
CLOUDINARY_API_SECRET = [API secret]
GEMINI_API_KEY      = [AI key]
```

> **Mẹo nhanh:** Copy từng dòng trong file `.env` local của bạn và paste vào đây. Chọn **"All Environments"** để áp dụng cho cả Production, Preview và Development.

3. Nhấn **"Deploy"** và chờ khoảng 1-2 phút

#### 3.4. Deploy API Server

Dự án Valley có 2 phần: **frontend** (React) và **API server** (Express). Bạn cần deploy API server riêng.

Tạo thêm 1 project Vercel mới:

1. **"Add New Project"** → Import cùng repo `valley`
2. Lần này, **Root Directory** = `artifacts/api-server`
3. **Build Command** = `cd ../.. && pnpm install && pnpm --filter @workspace/api-server run build`
4. **Output Directory** = `dist`
5. Thêm **tất cả các biến môi trường** như trên (đặc biệt `DATABASE_URL` và `SESSION_SECRET`)
6. Deploy!

Sau khi API server deploy xong, bạn nhận được URL dạng `https://valley-api.vercel.app`. Cập nhật biến môi trường của frontend:

```
VITE_API_URL = https://valley-api.vercel.app
```

---

### 🌐 Bước 4: Lấy tên miền miễn phí `.vercel.app`

Sau khi deploy thành công:

1. Vercel tự động cấp tên miền miễn phí dạng:
   ```
   https://valley-abc123.vercel.app
   ```

2. Bạn có thể đổi thành tên đẹp hơn:
   - Vào **Project Settings** → **Domains**
   - Nhấn **"Edit"** và đổi thành `valley-cua-ban.vercel.app`
   - Nhấn **"Save"**

3. Chia sẻ link này để bạn bè truy cập!

> **Nếu muốn tên miền riêng** (ví dụ: `valley.vn`): Mua tên miền tại các nhà cung cấp như Tên.vn hoặc Namecheap, sau đó thêm vào Vercel qua **Project Settings → Domains → Add Domain**.

---

### ✅ Kiểm tra sau khi deploy

Sau khi deploy xong, hãy kiểm tra các tính năng sau:

- [ ] Trang chủ hiển thị đúng
- [ ] Đăng ký tài khoản thành công (nhận 10 điểm)
- [ ] Đăng nhập / Đăng xuất hoạt động
- [ ] Upload tài liệu PDF
- [ ] Tải xuống tài liệu (trừ điểm)
- [ ] Trang Admin (/admin) hoạt động
- [ ] Link giới thiệu hiển thị đúng domain Vercel

---

## 🆘 Xử lý lỗi thường gặp

### Lỗi: "Cannot connect to database"
**Nguyên nhân:** `DATABASE_URL` sai hoặc chưa được thêm vào Vercel.
**Cách sửa:** Kiểm tra lại chuỗi kết nối, đảm bảo có `?sslmode=require` ở cuối.

### Lỗi: "Session secret not set"
**Nguyên nhân:** `SESSION_SECRET` chưa được thêm vào Vercel.
**Cách sửa:** Thêm biến `SESSION_SECRET` vào Environment Variables trên Vercel.

### Lỗi: Trang web deploy nhưng API không hoạt động (404)
**Nguyên nhân:** Chưa deploy API server, hoặc `VITE_API_URL` chưa đúng.
**Cách sửa:** Deploy `artifacts/api-server` riêng và cập nhật URL API cho frontend.

### Lỗi: Upload PDF thất bại
**Nguyên nhân:** Chưa cấu hình Cloudinary.
**Cách sửa:** Đăng ký Cloudinary miễn phí và thêm 3 biến `CLOUDINARY_*` vào Vercel.

---

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy kiểm tra:
1. **Vercel Logs:** Project → Functions → Xem logs lỗi chi tiết
2. **Neon Dashboard:** Kiểm tra database có đang hoạt động không
3. **Vercel Environment Variables:** Đảm bảo tất cả biến đã được thêm đúng

---

*Tài liệu này được viết cho dự án Valley phiên bản Replit pnpm workspace stack.*
*Stack: React + Vite (Frontend) · Express.js (API) · Drizzle ORM · PostgreSQL · Tailwind CSS v4*
