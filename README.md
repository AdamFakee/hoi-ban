# Hội Kèo

Trang tĩnh (HTML/CSS/JS thuần, không build) để đưa lên GitHub Pages.
Có: chồng thẻ ảnh kiểu Tinder, slogan, form nguyện vọng và thời gian gửi vào Google Sheet.

```
index.html          nội dung các section
style.css          màu (biến ở :root), bố cục, animation
script.js          swipe, hiệu ứng, form (CONFIG.SCRIPT_URL ở đầu file)
assets/            ảnh WebP
apps-script/Code.gs  mã dán vào Google Apps Script
```

## 1. Nối form với Google Sheet (miễn phí, ~5 phút)

1. Vào <https://sheets.new> tạo Sheet mới, đặt tên tuỳ ý (ví dụ "Hội Kèo - đăng ký").
2. Menu **Extensions → Apps Script**. Xoá code mẫu, dán toàn bộ nội dung `apps-script/Code.gs`. Bấm **Save**.
3. Bấm **Deploy → New deployment**, biểu tượng bánh răng chọn **Web app**:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
   - Bấm **Deploy**, cho phép quyền khi Google hỏi (lần đầu sẽ có cảnh báo "chưa xác minh": chọn *Advanced → Go to ... (unsafe)*; đây là script của chính bạn).
4. Copy **Web app URL** (dạng `https://script.google.com/macros/s/.../exec`).
5. Mở `script.js`, dán vào dòng đầu: `SCRIPT_URL: 'https://script.google.com/macros/s/.../exec'`.
6. Mở thử URL đó trên trình duyệt: thấy `{"ok":true,"service":"hoi-keo"}` là chạy. Gửi thử form, tab **Đăng ký** trong Sheet sẽ tự tạo và có dòng mới.

Lưu ý:
- Sửa `Code.gs` xong phải **Deploy → Manage deployments → Edit → New version** thì URL cũ mới nhận bản mới.
- Trình duyệt không đọc được phản hồi của Apps Script (CORS), nên trang chỉ biết "gửi đi được" chứ không biết Sheet có ghi thành công không. Hãy tự gửi thử một lần sau khi deploy.
- URL Web app nằm công khai trong mã nguồn. Script đã có honeypot, cắt độ dài, chặn công thức; nếu bị spam nặng thì tạo deployment mới để đổi URL.
- Sheet chứa tên và số điện thoại: đừng đặt Sheet ở chế độ "Anyone with the link".

## 2. Đưa lên GitHub Pages

```bash
cd D:/hoi-ban
git init -b main
git add .
git commit -m "Hội Kèo: bản đầu"
git remote add origin https://github.com/<tai-khoan>/<ten-repo>.git
git push -u origin main
```

Trên GitHub: **Settings → Pages → Source: Deploy from a branch → main / (root)**. Sau ~1 phút trang có tại `https://<tai-khoan>.github.io/<ten-repo>/`.
Mọi đường dẫn đã là tương đối nên chạy được ở cả dạng `/<ten-repo>/`.

## 3. Chỉnh nội dung

- **Màu**: các biến ở đầu `style.css` (`--coral`, `--amber`, `--plum`, `--bg`).
- **Ảnh + slogan trên thẻ**: mỗi `<article class="card">` trong `index.html`. Ảnh ngang thêm class `wide` (hiện nguyên khung, nền mờ); ảnh dọc/vuông bỏ `wide`. Nén ảnh WebP ~1000px, dưới 150KB/tấm.
- **Lựa chọn kèo/khung giờ**: các `.chip` trong form. Nếu đổi giá trị cột, nhớ cập nhật tiêu đề `HEADERS` trong `Code.gs` cho khớp.
- **Xem thử trên máy**: `python -m http.server 8080` trong thư mục này rồi mở `http://localhost:8080`.
