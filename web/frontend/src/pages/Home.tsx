import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: number;
  image_url?: string;
  short_description?: string;
}

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);
};

const HOT_PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Sách Thiết Kế Ý Tưởng Đột Phá',
    price: 350000,
    image_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
    short_description: 'Thiết kế sáng tạo',
  },
  {
    id: 2,
    name: 'Thiết Bị Cảm Biến Thông Minh IoT',
    price: 1250000,
    image_url: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400',
    short_description: 'Công nghệ tiên tiến',
  },
];

const AI_RECOMMENDS: Product[] = [
  {
    id: 3,
    name: 'Artbook - Andrew Martin Interior',
    price: 1730000,
    image_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
  },
  {
    id: 4,
    name: 'Sách Kyoto Gardens Landscape',
    price: 600000,
    image_url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400',
  },
];

export default function Home() {
  const [hotProducts, setHotProducts] = useState<Product[]>(HOT_PRODUCTS);
  const [aiRecommends, setAiRecommends] = useState<Product[]>(AI_RECOMMENDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching products from /api/products/...');
        
        // Fetch từ Vite proxy → product-service
        const response = await fetch('/api/products/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok && data.products) {
          const products = data.products;
          console.log('Fetched products:', products.length);
          
          if (products.length > 0) {
            setHotProducts(products.slice(0, 2));
            setAiRecommends(products.slice(2, 6));
            console.log('Updated state with API data');
          } else {
            setError('No products found in API');
            console.log('No products in API response');
          }
        } else {
          setError(`API Error: ${response.status}`);
          console.log('API response not ok');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('Fetch error:', errorMsg);
        setError(errorMsg);
        console.log('Using fallback data due to error');
        setHotProducts(HOT_PRODUCTS);
        setAiRecommends(AI_RECOMMENDS);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* HERO SECTION */}
      <section className="hero-section">
        <h1>Thế giới mua sắm trực tuyến</h1>
        <p>
          UniqueShop là nền tảng mua sắm thông minh thế hệ mới, được trợ lực bởi trợ lý tư vấn AI thông minh.
        </p>
        <div className="hero-buttons">
          <Link to="/cart" className="btn btn-primary">
            Khám Phá Cửa Hàng
          </Link>
          <button className="btn btn-secondary">
            Trò chuyện với AI <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* SẢN PHẨM ĐANG HOT */}
      <section className="section">
        <div className="section-header">
          <h2>Sản Phẩm Đang Hot</h2>
          <a href="#">Xem tất cả</a>
        </div>
        <div className="product-grid">
          {hotProducts.map(p => (
            <Link
              key={p.id}
              to={`/product/${p.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="product-card">
                <div className="product-image">
                  <img 
                    src={p.image_url || 'https://via.placeholder.com/400x300?text=No+Image'} 
                    alt={p.name} 
                  />
                  <span className="product-tag">HOT ★</span>
                </div>
                <div className="product-content">
                  <h3 className="product-title">{p.name}</h3>
                  <p className="product-price">{formatPrice(p.price || 0)}</p>
                  {p.short_description && (
                    <p className="product-meta">{p.short_description}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* GỢI Ý DÀNH RIÊNG CHO BẠN (AI BOX) */}
      <section className="section">
        <div className="ai-box">
          <div className="ai-box-header">
            <div>
              <h2 className="ai-box-title">Gợi Ý Dành Riêng Cho Bạn</h2>
              <p className="ai-box-subtitle">Dựa trên sở thích mua sắm và lịch sử hoạt động của bạn.</p>
            </div>
            <button className="ai-box-btn">
              <Sparkles size={14} /> Xem báo cáo đề xuất
            </button>
          </div>

          <div className="ai-grid">
            {aiRecommends.map((p, idx) => (
              <Link
                key={p.id}
                to={`/product/${p.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="ai-card">
                  <div className="ai-card-image">
                    <img 
                      src={p.image_url || 'https://via.placeholder.com/400x300?text=No+Image'} 
                      alt={p.name} 
                    />
                  </div>
                  <h3 className="ai-card-title">{p.name}</h3>
                  <div className="ai-card-footer">
                    <p className="ai-card-price">{formatPrice(p.price || 0)}</p>
                    <span className="ai-card-fit">AI: {85 + idx * 5}%</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}