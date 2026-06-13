import { useEffect, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  slug: string;
  children?: Category[];
}

interface Product {
  id: number;
  name: string;
  price: number | string;
  image_url?: string;
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
  }).format(numPrice || 0);
};

export default function Store() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'rating'>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 12;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/products/', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.status}`);
        }

        const data = await response.json();

        if (Array.isArray(data.products)) {
          setProducts(data.products);
          setFilteredProducts(data.products);
        } else {
          setProducts([]);
          setFilteredProducts([]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const sampleCategories: Category[] = [
      { id: 1, name: 'Sach', slug: 'books' },
      { id: 2, name: 'Dien tu', slug: 'electronics' },
      { id: 3, name: 'Thoi trang', slug: 'fashion' },
    ];

    setCategories(sampleCategories);
  }, []);

  useEffect(() => {
    let result = [...products];

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((product) => product.name.toLowerCase().includes(query));
    }

    if (selectedCategory) {
      result = result.filter((product) => product.category?.id === selectedCategory);
    }

    switch (sortBy) {
      case 'price_asc':
        result.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        break;
      case 'price_desc':
        result.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        break;
      case 'rating':
        result.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
        break;
      case 'newest':
      default:
        result.sort((a, b) => (b.id || 0) - (a.id || 0));
        break;
    }

    setFilteredProducts(result);
    setCurrentPage(1);
  }, [products, searchQuery, selectedCategory, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIdx, startIdx + itemsPerPage);

  const toggleCategory = (catId: number) => {
    const nextExpanded = new Set(expandedCategories);

    if (nextExpanded.has(catId)) {
      nextExpanded.delete(catId);
    } else {
      nextExpanded.add(catId);
    }

    setExpandedCategories(nextExpanded);
  };

  const renderCategories = (cats: Category[], level = 0) =>
    cats.map((cat) => (
      <div key={cat.id}>
        <div
          className="category-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            padding: '10px',
            paddingLeft: `${10 + level * 16}px`,
            borderLeft: level > 0 ? '1px solid var(--border-color)' : 'none',
            marginLeft: level > 0 ? '8px' : '0',
            backgroundColor: selectedCategory === cat.id ? 'var(--secondary)' : 'transparent',
            borderRadius: '6px',
          }}
          onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
        >
          {cat.children && cat.children.length > 0 && (
            <ChevronDown
              size={16}
              style={{
                transform: expandedCategories.has(cat.id) ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 0.2s',
              }}
              onClick={(event) => {
                event.stopPropagation();
                toggleCategory(cat.id);
              }}
            />
          )}
          <span style={{ fontSize: level === 0 ? '16px' : '14px', fontWeight: level === 0 ? '600' : '500' }}>
            {cat.name}
          </span>
        </div>

        {cat.children && expandedCategories.has(cat.id) && renderCategories(cat.children, level + 1)}
      </div>
    ));

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '250px 1fr',
        gap: '2rem',
        padding: '2rem 0',
        maxWidth: '1400px',
        margin: '0 auto',
      }}
    >
      <aside
        style={{
          borderRight: '1px solid var(--border-color)',
          paddingRight: '1.5rem',
          maxHeight: 'fit-content',
          position: 'sticky',
          top: '100px',
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '1.5rem' }}>Danh muc</h3>

        <div
          className="category-item"
          style={{
            padding: '10px',
            cursor: 'pointer',
            backgroundColor: selectedCategory === null ? 'var(--secondary)' : 'transparent',
            borderRadius: '6px',
            marginBottom: '0.5rem',
          }}
          onClick={() => setSelectedCategory(null)}
        >
          Tat ca san pham
        </div>

        {renderCategories(categories)}
      </aside>

      <section>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                }}
              />
              <input
                type="text"
                placeholder="Tim kiem san pham..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
              style={{
                padding: '10px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <option value="newest">Moi nhat</option>
              <option value="price_asc">Gia: Thap den cao</option>
              <option value="price_desc">Gia: Cao den thap</option>
              <option value="rating">Danh gia cao nhat</option>
            </select>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fee', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', color: '#c33' }}>
            Loi: {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            Dang tai san pham...
          </div>
        )}

        {!loading && paginatedProducts.length > 0 && (
          <>
            <div className="product-grid" style={{ marginBottom: '2rem' }}>
              {paginatedProducts.map((product) => (
                <a key={product.id} href={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="product-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
                    <div className="product-image">
                      <img
                        src={product.image_url || 'https://via.placeholder.com/400x300?text=No+Image'}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {product.category && (
                        <span
                          className="product-badge"
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: 'var(--primary)',
                            color: 'var(--dark)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          {product.category.name}
                        </span>
                      )}
                    </div>
                    <div className="product-info" style={{ padding: '1rem' }}>
                      <h4 className="product-title" style={{ fontSize: '16px', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {product.name}
                      </h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="product-price" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>
                          {formatPrice(product.price)}
                        </span>
                        {product.rating_average !== undefined && (
                          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                            {product.rating_average.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
                {currentPage > 1 && (
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: 'white',
                      fontSize: '16px',
                    }}
                  >
                    Truoc
                  </button>
                )}

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: currentPage === page ? 'var(--primary)' : 'white',
                      color: currentPage === page ? 'var(--dark)' : 'inherit',
                      fontWeight: currentPage === page ? '600' : 'normal',
                      fontSize: '16px',
                    }}
                  >
                    {page}
                  </button>
                ))}

                {currentPage < totalPages && (
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: 'white',
                      fontSize: '16px',
                    }}
                  >
                    Tiep
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {!loading && filteredProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '0.5rem' }}>Khong tim thay san pham nao!</h3>
            <p>Vui long thu tim kiem voi tu khoa khac.</p>
          </div>
        )}
      </section>
    </div>
  );
}
