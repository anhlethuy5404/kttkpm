import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

export default function Cart() {
  return (
    <div className="cart-container">
      <h2>Giỏ Hàng Của Bạn</h2>
      <div className="cart-layout">
        <div className="cart-items">
          <div className="cart-item">
            <div className="cart-item-image">
              <img src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200" alt="Sách Thiết Kế" />
            </div>
            <div className="cart-item-info">
              <h3 className="cart-item-title">Sách Thiết Kế Ý Tưởng Đột Phá</h3>
              <p className="cart-item-price">350.000 đ</p>
            </div>
            <button className="cart-item-delete"><Trash2 size={18} /></button>
          </div>
        </div>
        
        {/* HÓA ĐƠN TẠM TÍNH */}
        <div className="cart-summary">
          <h3 className="summary-title">Tóm tắt đơn hàng</h3>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <div className="summary-row"><span>Tạm tính</span><span>350.000 đ</span></div>
            <div className="summary-row"><span>Phí vận chuyển</span><span>Miễn phí</span></div>
          </div>
          <div className="summary-total"><span>Tổng cộng</span><span>350.000 đ</span></div>
          <Link to="/checkout" className="checkout-btn">
            Tiến Hành Thanh Toán
          </Link>
        </div>
      </div>
    </div>
  );
}