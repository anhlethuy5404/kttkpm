import os
import csv
import glob
import random
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils.text import slugify
from catalog.models import Category, Product, Book, Electronics, Fashion

class Command(BaseCommand):
    help = 'Seeds catalog products from all CSV files with dynamic column mapping'

    def get_val(self, row, keys, default=''):
        """Helper to flexibly extract values from CSV rows with varying column names"""
        for k in keys:
            for row_key in row.keys():
                if row_key and str(row_key).strip().lower() == k.lower():
                    val = row[row_key]
                    if val and str(val).strip() != '<PAD>':
                        return val
        return default

    def handle(self, *args, **options):
        # Paths
        data_dir = os.path.join(settings.BASE_DIR, '..', 'data')
        if not os.path.exists(data_dir):
            data_dir = os.path.join(settings.BASE_DIR, 'data')
            
        if not os.path.exists(data_dir):
            self.stdout.write(self.style.ERROR(f"Data directory not found at {data_dir}"))
            return

        self.stdout.write(self.style.WARNING(f"Reading all CSV files from {data_dir}..."))

        # Clear existing data to avoid conflicts
        Book.objects.all().delete()
        Electronics.objects.all().delete()
        Fashion.objects.all().delete()
        Product.objects.all().delete()
        Category.objects.all().delete()

        self.stdout.write("Cleared existing catalog data.")

        products_to_create = []
        books_to_create = []
        elec_details_to_create = []
        seen_ids = set()

        BRANDS = ["Asus", "Dell", "HP", "Lenovo", "Logitech", "Kingston", "Gigabyte", "Intel", "AMD", "Sony", "Apple", "Samsung", "Corsair", "Sandisk", "Crucial", "Western Digital", "WD", "TP-Link", "Xiaomi", "Canon", "Brother", "Epson"]
        
        def parse_brand(name):
            name_lower = name.lower()
            for b in BRANDS:
                if b.lower() in name_lower:
                    return b
            return "Khác"

        def clean_category_name(folder_name):
            mapping = {
                'laptop': 'Laptop',
                'chromebooks': 'Chromebook',
                'laptop-2-trong-1': 'Laptop 2 Trong 1',
                'laptop-truyen-thong': 'Laptop Truyền Thống',
                'macbook-imac': 'Macbook - iMac',
                'linh-kien-may-tinh-phu-kien-may-tinh': 'Linh Kiện Máy Tính',
                'pc-may-tinh-bo': 'PC - Máy Tính Bộ',
                'thiet-bi-luu-tru': 'Thiết Bị Lưu Trữ',
                'thiet-bi-mang': 'Thiết Bị Mạng',
                'thiet-bi-van-phong-thiet-bi-ngoai-vi': 'Thiết Bị Ngoại Vi & Văn Phòng'
            }
            if folder_name in mapping:
                return mapping[folder_name]
            return folder_name.replace('-', ' ').strip().title()

        # Only process files starting with 'product' and ending with '.csv' in the data directory
        csv_files = glob.glob(os.path.join(data_dir, 'product*.csv'))
        for csv_path in csv_files:
            self.stdout.write(f"Processing {csv_path}...")
            
            is_electronics = 'laptop-may-vi-tinh-linh-kien' in csv_path

            with open(csv_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    try:
                        # 1. Parse ID
                        product_id_str = self.get_val(row, ['id', 'product_id', 'item_id', 'sku', 'mã'])
                        if not product_id_str:
                            continue
                        product_id = int(float(product_id_str))
                        
                        if product_id in seen_ids:
                            continue
                        
                        # 2. Parse Category
                        parent_cat = None
                        if is_electronics:
                            # Use folder structure for electronics
                            rel_path = os.path.relpath(os.path.dirname(csv_path), os.path.join(data_dir, 'laptop-may-vi-tinh-linh-kien'))
                            path_parts = rel_path.split(os.sep)
                            for part in path_parts:
                                if part == '.' or not part:
                                    continue
                                cat_name = clean_category_name(part)
                                slug = slugify(cat_name)
                                cat, _ = Category.objects.get_or_create(
                                    name=cat_name, slug=slug, parent=parent_cat
                                )
                                parent_cat = cat
                        else:
                            # Books or general products: use row columns
                            cat_levels = []
                            for col in ['cat_level_1', 'cat_level_2', 'cat_level_3', 'cat_level_4', 'cat_level_5', 'category', 'danh_muc']:
                                val = self.get_val(row, [col])
                                if val:
                                    cat_levels.append(str(val).replace('-', ' ').strip().title())
                                    
                            if not cat_levels:
                                cat_levels = ['Chưa Phân Loại']

                            for cat_name in cat_levels:
                                slug = slugify(cat_name)
                                cat, _ = Category.objects.get_or_create(
                                    name=cat_name, slug=slug, parent=parent_cat
                                )
                                parent_cat = cat

                        category = parent_cat
                        cat_id = category.id if category else None

                        seen_ids.add(product_id)

                        # 3. Parse Core Fields
                        name = self.get_val(row, ['name', 'title', 'product_name', 'tên'], f"Sản phẩm {product_id}")[:255]
                        
                        price_str = self.get_val(row, ['price', 'gia', 'cost', 'giá', 'sale_price'], '0')
                        try:
                            price = float(str(price_str).replace(',', '').replace('đ', '').replace(' ', '').strip())
                        except ValueError:
                            price = 0.0
                            
                        rating_str = self.get_val(row, ['rating_average', 'rating', 'stars', 'đánh_giá'], '0')
                        try:
                            rating = float(rating_str)
                        except ValueError:
                            rating = 0.0

                        image_url = self.get_val(row, ['image_base_url', 'image_url', 'image', 'img', 'thumbnail_url', 'ảnh'], '')
                        image_url = str(image_url).split(',')[0].strip() if image_url else ''
                        
                        desc = self.get_val(row, ['description', 'short_description', 'desc', 'chi_tiet', 'mô_tả', 'content'], '')

                        prod = Product(
                            id=product_id,
                            name=name,
                            price=price,
                            stock=random.randint(5, 50),
                            description=desc,
                            image_url=image_url,
                            rating_average=rating,
                            category=category
                        )
                        products_to_create.append(prod)

                        # 4. Parse Specific Details
                        if is_electronics:
                            brand = parse_brand(name)
                            elec_detail = Electronics(
                                product=prod,
                                brand=brand,
                                warranty=random.choice([12, 24, 36])
                            )
                            elec_details_to_create.append(elec_detail)
                        else:
                            author = "Đang cập nhật"
                            publisher = "NXB Tổng hợp"
                            if 'Tác giả' in desc:
                                try:
                                    part = desc.split('Tác giả')[1].replace(':', '').strip()
                                    author = part.split('\n')[0].split(',')[0].split('.')[0].strip()
                                except:
                                    pass
                            if 'Nhà xuất bản' in desc:
                                try:
                                    part = desc.split('Nhà xuất bản')[1].replace(':', '').strip()
                                    publisher = part.split('\n')[0].split(',')[0].strip()
                                except:
                                    pass

                            book = Book(
                                product=prod,
                                author=author[:255] if author else "Đang cập nhật",
                                publisher=publisher[:255] if publisher else "NXB Tổng hợp",
                                isbn=f"9786043{random.randint(100000, 999999)}"
                            )
                            books_to_create.append(book)

                    except Exception:
                        # Ignore malformed rows
                        continue

        self.stdout.write(f"Parsed {len(products_to_create)} total products from CSVs. Inserting...")
        Product.objects.bulk_create(products_to_create, batch_size=1000)
        Book.objects.bulk_create(books_to_create, batch_size=1000)
        Electronics.objects.bulk_create(elec_details_to_create, batch_size=1000)
        
        self.stdout.write(f"Successfully imported {Book.objects.count()} books and {Electronics.objects.count()} electronics.")

        # 3. Seed Mock Fashion items
        self.stdout.write("Seeding mock Fashion...")
        fashion_cat, _ = Category.objects.get_or_create(name="Thời Trang", slug="thoi-trang")
        fashion_items = [
            ("Áo Thun Polo Nam Cotton", 350000, "L", "Navy Blue", "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500"),
            ("Quần Jean Slimfit Nam Cổ Điển", 550000, "32", "Light Blue", "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500"),
            ("Giày Sneaker Thể Thao Unisex", 1250000, "41", "White/Black", "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500"),
            ("Váy Hoa Nhí Vintage Dáng Dài", 420000, "M", "Floral Green", "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500"),
            ("Balo Thời Trang Chống Nước", 299000, "Free Size", "Matte Black", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500"),
        ]

        fashion_id_start = 910000001
        for name, price, size, color, img in fashion_items:
            prod = Product.objects.create(
                id=fashion_id_start,
                name=name,
                price=price,
                stock=random.randint(10, 50),
                description=f"Sản phẩm {name} được dệt từ chất liệu cao cấp, thoáng mát, mang lại cảm giác thoải mái khi vận động. Phù hợp cho nhiều lứa tuổi và phong cách thời trang năng động.",
                image_url=img,
                rating_average=random.choice([4.2, 4.4, 4.6, 4.9]),
                category=fashion_cat
            )
            Fashion.objects.create(product=prod, size=size, color=color)
            fashion_id_start += 1

        # 4. Seed Users
        self.stdout.write("Seeding default users...")
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Create Superuser (Admin)
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
            self.stdout.write(self.style.SUCCESS("Superuser 'admin' created (password: admin123)."))
        else:
            self.stdout.write("Superuser 'admin' already exists.")

        # Create Regular User
        if not User.objects.filter(username='user').exists():
            User.objects.create_user('user', 'user@example.com', 'user123')
            self.stdout.write(self.style.SUCCESS("Regular user 'user' created (password: user123)."))
        else:
            self.stdout.write("Regular user 'user' already exists.")

        self.stdout.write(self.style.SUCCESS("Database seeding completed successfully!"))
