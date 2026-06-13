import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Heart } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: number | string;
  image_url?: string;
  description?: string;
  short_description?: string;
  rating_average?: number;
  category?: { id: number; name: string };
  stock: number;
}

const formatPrice = (price: number | string): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(numPrice);
};

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching product ${id}...`);

        const response = await fetch(`/api/products/${id}/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Product not found: ${response.status}`);
        }

        const data = await response.json();
        console.log('Product fetched:', data);
        
        // Handle both old format (category as string) and new format (category as object)
        if (data.category && typeof data.category === 'string') {
          data.category = { id: 0, name: data.category };
        }
        
        setProduct(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Fetch error:', msg);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p style={{ fontSize: '18px' }}>Đang tải sản phẩm...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/store')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '10px 16px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--primary)',
            fontSize: '16px',
            marginBottom: '2rem',
          }}
        >
          <ArrowLeft size={20} /> Quay lại cửa hàng
        </button>
        <div style={{ backgroundColor: '#fee', padding: '1rem', borderRadius: '8px', color: '#c33' }}>
          <h3>Lỗi tải sản phẩm</h3>
          <p>{error || 'Sản phẩm không tồn tại'}</p>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    console.log(`Added ${quantity} x ${product.name} to cart`);
    // TODO: Implement cart functionality
    alert(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`);
  };

  return (
    <div style={{ padding: '2rem 0', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/store')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '10px 16px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--primary)',
          fontSize: '16px',
          marginBottom: '2rem',
        }}
      >
        <ArrowLeft size={20} /> Quay lại cửa hàng
      </button>

      {/* Product Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Image Section */}
        <div>
          <img
            src={product.image_url || 'https://via.placeholder.com/500x500?text=No+Image'}
            alt={product.name}
            style={{
              width: '100%',
              borderRadius: '12px',
              backgroundColor: 'var(--light)',
              objectFit: 'cover',
              aspectRatio: '1 / 1',
            }}
          />
        </div>

        {/* Info Section */}
        <div>
          {product.category && (
            <span style={{
              display: 'inline-block',
              backgroundColor: 'var(--primary)',
              color: 'var(--dark)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '1rem',
            }}>
              {product.category.name}
            </span>
          )}

          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem', lineHeight: '1.2' }}>
            {product.name}
          </h1>

          {/* Rating */}
          {product.rating_average && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '18px' }}>★★★★★</span>
              <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
                {product.rating_average.toFixed(1)} / 5
              </span>
            </div>
          )}

          {/* Price */}
          <div style={{
            backgroundColor: 'var(--secondary)',
            padding: '1.5rem',
            borderRadius: '12px',
            marginBottom: '2rem',
          }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Giá bán
            </p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)' }}>
              {formatPrice(product.price)}
            </p>
          </div>

          {/* Stock Status */}
          <div style={{ marginBottom: '2rem' }}>
            <p style={{
              fontSize: '16px',
              fontWeight: '600',
              color: product.stock > 0 ? '#28a745' : '#dc3545',
            }}>
              {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : 'Hết hàng'}
            </p>
          </div>

          {/* Quantity Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <label style={{ fontSize: '16px', fontWeight: '600' }}>Số lượng:</label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}>
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '18px',
                }}
              >
                −
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: '60px',
                  textAlign: 'center',
                  border: 'none',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                }}
                min="1"
                max={product.stock}
              />
              <button
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '18px',
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Add to Cart & Wishlist */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              style={{
                flex: 1,
                padding: '14px 20px',
                fontSize: '18px',
                fontWeight: '600',
                backgroundColor: product.stock === 0 ? '#ccc' : 'var(--primary)',
                color: product.stock === 0 ? '#666' : 'var(--dark)',
                border: 'none',
                borderRadius: '8px',
                cursor: product.stock === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <ShoppingCart size={20} /> Thêm vào giỏ
            </button>
            <button
              onClick={() => setIsLiked(!isLiked)}
              style={{
                padding: '14px 20px',
                fontSize: '16px',
                backgroundColor: isLiked ? 'var(--primary)' : 'var(--light)',
                color: isLiked ? 'white' : 'var(--dark)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>

      {/* Description */}
      {(product.description || product.short_description) && (
        <div style={{ marginTop: '4rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>Chi tiết sản phẩm</h2>
          <div style={{
            fontSize: '16px',
            lineHeight: '1.8',
            color: 'var(--text-color)',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          }}>
            {product.description || product.short_description}
          </div>
        </div>
      )}
    </div>
  );
}
