// Gộp code Login để bạn tiện xem cấu trúc Form
import React from 'react';
import { Link } from 'react-router-dom';

export default function Login() {
  return (
    <div className="form-container">
      <h2>Đăng Nhập Hệ Thống</h2>
      <form className="form-group" onSubmit={e => e.preventDefault()}>
        <div className="form-group">
          <label>Tên tài khoản / Email</label>
          <input type="text" defaultValue="anhle" />
        </div>
        <div className="form-group">
          <label>Mật khẩu</label>
          <input type="password" placeholder="••••••••" />
        </div>
        <button type="submit" className="form-submit">
          Đăng Nhập
        </button>
      </form>
      <p className="form-footer">
        Chưa có tài khoản? <Link to="/signup">Đăng ký ngay</Link>
      </p>
    </div>
  );
}