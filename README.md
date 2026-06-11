# 🛍️ E-Commerce Platform - AI Recommendation System (Tiki Context)

Dự án này là một hệ thống Website Thương mại Điện tử hoàn chỉnh, tích hợp **Hệ khuyến nghị tuần tự (Sequential Recommendation)** và **Mô hình dự đoán xác suất mua hàng Deep Learning (LSTM/GRU)**. Dự án được triển khai bằng **Django** ở phần Web và **PyTorch** ở phần học máy, mô phỏng lại luồng tương tác thực tế từ hành vi người dùng trên nền tảng Tiki.

---

## 📂 1. Cấu trúc Thư mục Toàn Dự án

Dự án được chia thành 3 phân vùng chính:
*   `data/`: Thư mục lưu trữ toàn bộ dữ liệu sản phẩm gốc từ crawling và mô hình hóa.
*   `trainmodel/`: Chứa mã nguồn thiết kế mô hình PyTorch, sinh dữ liệu chuỗi hành vi giả lập, huấn luyện mô hình và xuất ra các file checkpoint trọng số `.pt`.
*   `web/`: Hệ thống các Microservices Django và API Gateway (Nginx).

```text
Dự án (Thư mục gốc)
├── data/                      # Dữ liệu sản phẩm gốc
│   ├── product.csv            # Dữ liệu Sách (Tiki)
│   └── laptop-may-vi-tinh-linh-kien/ # Dữ liệu đồ điện tử chia theo thư mục con
├── trainmodel/                # Module Huấn luyện Mô hình AI (PyTorch)
│   ├── checkpoints/           # Lưu checkpoint trọng số huấn luyện tốt nhất
│   ├── data/                  # Tập dữ liệu huấn luyện và script sinh session
│   ├── models/                # Định nghĩa mạng LSTM/GRU
│   ├── train/                 # Trình huấn luyện mô hình
│   ├── main_purchase_seq.py   # Entrypoint train mô hình dự đoán mua hàng (LSTM)
│   └── main_sequential.py     # Entrypoint train mô hình khuyến nghị sản phẩm tiếp theo
├── web/                       # Hệ thống mã nguồn Web E-Shop
│   ├── ai/                    # Tích hợp AI (RecommendationEngine, LSTM, Neo4j Graph)
│   ├── catalog/               # Quản lý danh mục phân cấp và sản phẩm
│   ├── behavior/              # Log hành vi người dùng thời gian thực
│   ├── gateway/               # API Gateway Nginx (Dockerfile & nginx.conf)
│   ├── ecom_project/          # Cài đặt cấu hình dự án Django
│   ├── Dockerfile             # Dockerfile dùng chung duy nhất cho các python services
│   ├── entrypoint.py          # Script khởi chạy và cấu hình kết nối PostgreSQL
│   └── manage.py              # Script quản lý Django CLI
├── docker-compose.yml         # Khởi chạy toàn bộ 10 containers của hệ thống
├── .dockerignore              # Bỏ qua tệp tin rác khi build image
└── README.md                  # Hướng dẫn này
```

---

## 💾 2. Hướng dẫn Tải và Thiết lập Dữ liệu

Dự án yêu cầu các file dữ liệu sản phẩm gốc để nạp vào cơ sở dữ liệu.

1.  **Tải thư mục dữ liệu:**
    *   Tải thư mục `data/` từ liên kết tạm thời sau (hãy thay thế bằng link thực tế của bạn sau khi upload): 
        🔗 [Liên kết tải dữ liệu (Tạm thời)](https://drive.google.com/file/d/1M2-aYVt9aotjhl-Yn1LgMrKXDRnsnvjF/view?usp=sharing)
2.  **Giải nén và cấu hình đường dẫn:**
    *   Giải nén file tải về và đặt thư mục `data` vào **ngay thư mục gốc** của dự án (ngang hàng với `web/` và `trainmodel/`).
    *   Đảm bảo cấu trúc file bên trong như sau:
        *   `data/product.csv` (Chứa ~7,900 dòng sản phẩm sách).
        *   `data/laptop-may-vi-tinh-linh-kien/...` (Chứa các thư mục con và file csv sản phẩm điện tử).

---

## 🧠 3. Hướng dẫn Huấn luyện Mô hình AI (PyTorch)

Mô hình LSTM được huấn luyện để dự đoán xác suất mua hàng dựa trên chuỗi lịch sử hành vi (ví dụ: `view -> click -> view -> add_to_cart -> BUY`).

### 3.1 Khởi tạo môi trường huấn luyện
Di chuyển vào thư mục `trainmodel/` và chọn một trong hai phương pháp tạo môi trường ảo dưới đây:

#### Lựa chọn A: Sử dụng module `venv` mặc định của Python (Khuyên dùng, không cần cài đặt thêm)
*   **Trên Windows (PowerShell):**
    ```bash
    cd trainmodel
    python -m venv venv
    .\venv\Scripts\Activate.ps1
    ```
*   **Trên macOS/Linux:**
    ```bash
    cd trainmodel
    python3 -m venv venv
    source venv/bin/activate
    ```

#### Lựa chọn B: Sử dụng Conda (Nếu bạn đã cài sẵn Anaconda/Miniconda)
```bash
cd trainmodel
conda create -n django_ai python=3.10 -y
conda activate django_ai
```

Sau khi kích hoạt môi trường ảo (bằng một trong hai cách trên), tiến hành cài đặt các thư viện:
```bash
# Cài đặt các thư viện cơ bản
pip install pandas numpy scikit-learn tqdm matplotlib tabulate

# Cài đặt PyTorch CPU (khuyên dùng cho máy tính không có GPU chuyên dụng)
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

### 3.2 Sinh dữ liệu tương tác giả lập (Behavior Session Generator)
Nếu thư mục `trainmodel/data/sequential/` chưa có dữ liệu huấn luyện giả lập, bạn chạy script sinh dữ liệu chuỗi hành vi:
```bash
python data/sequential_generator.py
```

### 3.3 Huấn luyện Mô hình Dự đoán Mua hàng (Purchase Prediction)
Chạy lệnh sau để huấn luyện mô hình LSTM nhận diện chuỗi hành vi và dự đoán xác suất mua hàng:
```bash
# Thiết lập biến môi trường OpenMP nếu chạy trên Windows để tránh lỗi crash thư viện
$env:KMP_DUPLICATE_LIB_OK="TRUE"

# Chạy huấn luyện mô hình
python main_purchase_seq.py --model lstm --epochs 15 --batch-size 128
```
*   **Kết quả đầu ra:** File checkpoint tốt nhất sẽ tự động được lưu tại `trainmodel/checkpoints/best_purchase_lstm.pt`. File này được ứng dụng Web Django trực tiếp gọi lên để chạy suy diễn (inference).

---

## 🌐 4. Hướng dẫn Cài đặt & Chạy ứng dụng Web Django

Ứng dụng Web Django được thiết kế theo phong cách giao diện hiện đại **Steep (Daylight Editorial analytics)**. Dự án đã được nạp sẵn dữ liệu và tính toán vector nhúng sản phẩm trong file `web/db.sqlite3`.

### Cách 4.1: Chạy trực tiếp trên máy cục bộ (Local Run)

1.  **Di chuyển vào thư mục web và kích hoạt môi trường:**
    *   **Nếu dùng venv (Lựa chọn A):**
        *   *Trên Windows (PowerShell):*
            ```bash
            cd web
            ..\trainmodel\venv\Scripts\Activate.ps1
            ```
        *   *Trên macOS/Linux:*
            ```bash
            cd web
            source ../trainmodel/venv/bin/activate
            ```
        *(Hoặc bạn có thể tự tạo một venv riêng biệt trong thư mục `web/` bằng cách chạy `python -m venv venv` ngay tại thư mục `web/` và kích hoạt).*
    *   **Nếu dùng Conda (Lựa chọn B):**
        ```bash
        cd web
        conda activate django_ai
        ```

2.  **Cài đặt các gói thư viện web phụ thuộc:**
    ```bash
    pip install -r requirements.txt
    ```
    *Lưu ý: requirements.txt tự động tải SentenceTransformers và PyTorch CPU.*

3.  **Khởi tạo Database & Nạp dữ liệu sản phẩm (Nếu dùng DB trống):**
    *Nếu bạn sử dụng file `db.sqlite3` có sẵn đi kèm dự án, bạn có thể bỏ qua bước này.*
    ```bash
    # Chạy migrations thiết lập bảng
    python manage.py migrate
    
    # Nạp sản phẩm phân cấp danh mục & dọn dẹp ảnh lỗi
    python manage.py seed_products
    
    # Sinh vector nhúng (Product Embeddings) phục vụ tìm kiếm ngữ nghĩa và gợi ý AI
    python manage.py generate_embeddings
    ```

4.  **Chạy server phát triển cục bộ:**
    ```bash
    # Bật cờ bỏ qua xung đột OpenMP của PyTorch trên Windows
    $env:KMP_DUPLICATE_LIB_OK="TRUE"
    
    # Chạy server
    python manage.py runserver 0.0.0.0:8000
    ```
    *   Truy cập trang web storefront tại: `http://127.0.0.1:8000/`

---

### Cách 4.2: Triển khai bằng Docker Compose (Kiến trúc Microservices - Khuyên dùng)

Dự án đã được phân rã thành **10 dịch vụ container** độc lập giao tiếp qua API Gateway (Nginx), sử dụng PostgreSQL làm CSDL quan hệ trung tâm và Neo4j làm Graph Database lưu trữ đồ thị tri thức. 

Để khởi chạy hệ thống, hãy đảm bảo bạn đã bật **Docker Desktop**, sau đó mở Terminal tại thư mục gốc của dự án và chạy các bước sau:

#### Bước 1: Khởi động toàn bộ các dịch vụ
```bash
# Tự động build image dùng chung và khởi chạy 10 container ở chế độ background
docker-compose up -d --build
```
*Hệ thống sẽ chạy 10 container:*
1.  `ecom_postgres_db`: Cơ sở dữ liệu quan hệ PostgreSQL (cổng `5432`)
2.  `ecom_neo4j_db`: Graph Database Neo4j (cổng UI `7474`, cổng kết nối `7687`)
3.  `ecom_user_service`: Service quản lý User, Auth & Behavior (cổng `8000`)
4.  `ecom_product_service`: Service quản lý Danh mục & Sản phẩm (cổng `8001`)
5.  `ecom_cart_service`: Service Giỏ hàng (cổng `8002`)
6.  `ecom_order_service`: Service Đơn hàng (cổng `8003`)
7.  `ecom_payment_service`: Service Thanh toán (cổng `8004`)
8.  `ecom_shipping_service`: Service Vận chuyển (cổng `8005`)
9.  `ecom_ai_service`: Service Khuyến nghị AI & Chatbot (cổng `8006`)
10. `ecom_api_gateway`: API Gateway Nginx (cổng chính `80`)

#### Bước 2: Nạp dữ liệu sản phẩm (Chỉ cần chạy lần đầu tiên)
Do PostgreSQL khởi động với CSDL trống, bạn cần nạp dữ liệu từ thư mục `data` vào PostgreSQL:
```bash
docker-compose exec product-service python manage.py seed_products
```

#### Bước 3: Đồng bộ Đồ thị tri thức & Sinh Vector nhúng
Tính toán độ tương đồng giữa các sản phẩm và đồng bộ hóa danh sách sản phẩm cùng mối quan hệ tương quan `:SIMILAR` sang Neo4j:
```bash
docker-compose exec ai-service python manage.py generate_embeddings
```
*Lệnh này sẽ hiển thị thanh tiến trình Node Sync và Edge Sync trực quan trên màn hình.*

#### Bước 4: Nghiệm thu các cổng dịch vụ
*   **Website Storefront**: Truy cập thông qua API Gateway tại địa chỉ: `http://localhost/`
*   **Trang quản trị Neo4j Browser**: Truy cập tại `http://localhost:7474/`
    *   *Username*: `neo4j`
    *   *Password*: `password123`
    *   *Truy vấn kiểm tra đồ thị*: Gõ câu lệnh Cypher `MATCH (n) RETURN n LIMIT 100` để xem trực quan hóa các node User, Product và các quan hệ kết nối.
*   **Theo dõi log hệ thống**: `docker-compose logs -f`
*   **Dừng hệ thống container**: `docker-compose down`

---

## 🚀 5. Các tính năng AI nổi bật đã được tích hợp

1.  **Trực quan hóa Phân cấp Danh mục:** Danh mục sản phẩm tổ chức dạng cây phân cấp đa tầng (cha - con). Sidebar giao diện lọc sản phẩm đệ quy thông minh và có đường gióng căn lề tinh tế.
2.  **Hệ thống Khuyến nghị Phân tầng (Retrieval & Re-ranking):**
    *   **Retrieval:** Lọc nhanh Top 100 sản phẩm ứng viên có độ tương đồng cao nhất với vector sở thích người dùng bằng phép nhân ma trận đồng thời trong RAM (Numpy Dot Product) chỉ dưới **10ms**.
    *   **Re-ranking:** Đưa 100 sản phẩm ứng viên qua mô hình PyTorch LSTM để dự đoán xác suất mua hàng và tính toán xếp hạng kết hợp chỉ mất dưới **200ms**.
3.  **Trợ lý Chatbot Assistant thông minh:** Chatbot góc phải màn hình cho phép người dùng nhập yêu cầu ngôn ngữ tự nhiên (ví dụ: *"tôi muốn mua sách nghệ thuật"*). Hệ thống tự động mã hóa câu hỏi thành vector nhúng và tìm kiếm ngữ nghĩa sản phẩm phù hợp tức thì.
