import React, { useState, useEffect } from 'react';
import { ChevronDown, Package, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  order_number: string;
  created_at: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  shipping_address?: string;
}

const formatPrice = (price: number | string): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(numPrice);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getStatusInfo = (status: Order['status']): { label: string; color: string; icon: React.ReactNode } => {
  switch (status) {
    case 'pending':
      return { label: 'Chờ Xác Nhận', color: '#FFA500', icon: <Clock size={18} /> };
    case 'processing':
      return { label: 'Đang Xử Lý', color: '#0066cc', icon: <Package size={18} /> };
    case 'shipped':
      return { label: 'Đã Gửi', color: '#9400D3', icon: <Package size={18} /> };
    case 'delivered':
      return { label: 'Đã Giao', color: '#00AA00', icon: <CheckCircle size={18} /> };
    case 'cancelled':
      return { label: 'Đã Hủy', color: '#cc0000', icon: <AlertCircle size={18} /> };
    default:
      return { label: 'Không Xác Định', color: '#999', icon: <AlertCircle size={18} /> };
  }
};

// Sample orders data
const SAMPLE_ORDERS: Order[] = [
  {
    id: 1,
    order_number: 'ORD-2024-001',
    created_at: '2024-01-15',
    total: 1500000,
    status: 'delivered',
    items: [
      { id: 1, product_name: 'Sách Thiết Kế Ý Tưởng Đột Phá', quantity: 1, price: 350000 },
      { id: 2, product_name: 'Thiết Bị Cảm Biến Thông Minh IoT', quantity: 1, price: 1250000 },
    ],
    shipping_address: '123 Đường A, Hà Nội',
  },
  {
    id: 2,
    order_number: 'ORD-2024-002',
    created_at: '2024-01-10',
    total: 1730000,
    status: 'shipped',
    items: [
      { id: 3, product_name: 'Artbook - Andrew Martin Interior', quantity: 1, price: 1730000 },
    ],
    shipping_address: '456 Đường B, TP.HCM',
  },
  {
    id: 3,
    order_number: 'ORD-2024-003',
    created_at: '2024-01-05',
    total: 600000,
    status: 'processing',
    items: [
      { id: 4, product_name: 'Sách Kyoto Gardens Landscape', quantity: 1, price: 600000 },
    ],
    shipping_address: '789 Đường C, Đà Nẵng',
  },
];

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>(SAMPLE_ORDERS);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | Order['status']>('all');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        console.log('Fetching orders...');
        // TODO: Implement API call to fetch user orders
        // const response = await fetch('/api/orders/', {
        //   method: 'GET',
        //   headers: { 'Content-Type': 'application/json' },
        // });
        // const data = await response.json();
        // setOrders(data.orders);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  const statusOptions: Array<'all' | Order['status']> = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  const statusLabels = {
    all: 'Tất Cả',
    pending: 'Chờ Xác Nhận',
    processing: 'Đang Xử Lý',
    shipped: 'Đã Gửi',
    delivered: 'Đã Giao',
    cancelled: 'Đã Hủy',
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p style={{ fontSize: '18px' }}>Đang tải đơn hàng...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem' }}>Lịch Sử Đơn Hàng</h1>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
      }}>
        {statusOptions.map(status => (
          <button
            key={status}
            onClick={() => setFilter(status as any)}
            style={{
              padding: '8px 16px',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              backgroundColor: filter === status ? 'var(--primary)' : 'white',
              color: filter === status ? 'var(--dark)' : 'var(--text-color)',
              fontWeight: filter === status ? '600' : '500',
              cursor: 'pointer',
              fontSize: '16px',
              whiteSpace: 'nowrap',
            }}
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredOrders.length > 0 ? (
          filteredOrders.map(order => {
            const statusInfo = getStatusInfo(order.status);
            const isExpanded = expandedOrder === order.id;

            return (
              <div
                key={order.id}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  backgroundColor: 'white',
                }}
              >
                {/* Order Header */}
                <div
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  style={{
                    padding: '1.5rem',
                    cursor: 'pointer',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto auto',
                    gap: '2rem',
                    alignItems: 'center',
                    backgroundColor: isExpanded ? 'var(--light)' : 'white',
                  }}
                >
                  <div>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Mã đơn hàng
                    </p>
                    <p style={{ fontSize: '16px', fontWeight: '600' }}>
                      {order.order_number}
                    </p>
                  </div>

                  <div>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Ngày
                    </p>
                    <p style={{ fontSize: '16px', fontWeight: '600' }}>
                      {formatDate(order.created_at)}
                    </p>
                  </div>

                  <div>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Tổng Tiền
                    </p>
                    <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary)' }}>
                      {formatPrice(order.total)}
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: `${statusInfo.color}15`,
                      color: statusInfo.color,
                      fontWeight: '600',
                      fontSize: '14px',
                    }}
                  >
                    {statusInfo.icon}
                    {statusInfo.label}
                  </div>

                  <ChevronDown
                    size={20}
                    style={{
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                      cursor: 'pointer',
                    }}
                  />
                </div>

                {/* Order Details (Expanded) */}
                {isExpanded && (
                  <div style={{
                    padding: '1.5rem',
                    borderTop: '1px solid var(--border-color)',
                    backgroundColor: 'var(--light)',
                  }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '1rem' }}>
                      Chi tiết đơn hàng
                    </h3>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                      }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                            <th style={{ textAlign: 'left', padding: '12px', fontSize: '14px', fontWeight: '600' }}>
                              Sản Phẩm
                            </th>
                            <th style={{ textAlign: 'center', padding: '12px', fontSize: '14px', fontWeight: '600' }}>
                              Số Lượng
                            </th>
                            <th style={{ textAlign: 'right', padding: '12px', fontSize: '14px', fontWeight: '600' }}>
                              Giá
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '12px', fontSize: '16px' }}>
                                {item.product_name}
                              </td>
                              <td style={{ textAlign: 'center', padding: '12px', fontSize: '16px' }}>
                                {item.quantity}
                              </td>
                              <td style={{ textAlign: 'right', padding: '12px', fontSize: '16px', fontWeight: '600' }}>
                                {formatPrice(item.price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {order.shipping_address && (
                      <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '8px' }}>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '0.5rem' }}>
                          Địa chỉ giao hàng
                        </p>
                        <p style={{ fontSize: '16px' }}>
                          {order.shipping_address}
                        </p>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button style={{
                        padding: '10px 16px',
                        backgroundColor: 'var(--primary)',
                        color: 'var(--dark)',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}>
                        Xem Chi Tiết
                      </button>
                      {order.status === 'delivered' && (
                        <button style={{
                          padding: '10px 16px',
                          backgroundColor: 'white',
                          color: 'var(--primary)',
                          border: '1px solid var(--primary)',
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}>
                          Đánh Giá
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            backgroundColor: 'var(--light)',
            borderRadius: '12px',
            color: 'var(--text-secondary)',
          }}>
            <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '0.5rem' }}>
              Không có đơn hàng
            </h3>
            <p style={{ fontSize: '16px' }}>
              Bạn chưa có đơn hàng nào ở trạng thái này.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
