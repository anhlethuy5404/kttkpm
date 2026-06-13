import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Checkout() {
  const navigate = useNavigate();
  return (
    <div className="cart-container">
      <h2>Thông Tin Thanh Toán</h2>
      <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.5rem' }}>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={e => e.preventDefault()}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.7rem' }}>Họ và tên</label>
              <input type="text" defaultValue="Lê Tuấn Anh" />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '0.7rem' }}>Số điện thoại</label>
              <input type="text" defaultValue="0987654321" />
            </div>
          </div>
          <div className="form-group">
            <label style={{ fontSize: '0.7rem' }}>Địa chỉ nhận hàng</label>
            <input type="text" placeholder="Số nhà, tên đường, quận/huyện..." />
          </div>
          
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Phương thức thanh toán</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '0.75rem', cursor: 'pointer', fontSize: '0.875rem', transition: 'background-color 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--light)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <input type="radio" name="payment" defaultChecked />
                Thanh toán khi nhận hàng (COD)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '0.75rem', cursor: 'pointer', fontSize: '0.875rem', transition: 'background-color 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--light)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <input type="radio" name="payment" />
                Chuyển khoản qua mã QR ngân hàng (AI tự khớp lệnh)
              </label>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={() => { alert('Đặt hàng thành công!'); navigate('/'); }}
            style={{
              background: 'var(--primary)',
              color: 'var(--dark)',
              fontWeight: 'bold',
              padding: '0.75rem 1rem',
              borderRadius: '0.75rem',
              cursor: 'pointer',
              border: 'none',
              marginTop: '1rem',
              fontSize: '0.875rem',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--primary)';
              e.currentTarget.style.color = 'var(--dark)';
            }}
          >
            Xác Nhận Đặt Hàng (350.000 đ)
          </button>
        </form>
      </div>
    </div>
  );
}