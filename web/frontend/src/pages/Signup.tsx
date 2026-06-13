// Signup form
import React from 'react';
import { Link } from 'react-router-dom';

export default function Signup() {
  return (
    <div className="form-container">
      <h2>Đăng Ký Hệ Thống</h2>
      <form className="form-group" onSubmit={e => e.preventDefault()}>
        <div className="form-group">
          <label>Tên tài khoản</label>
          <input type="text" placeholder="Nhập tên tài khoản" />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" placeholder="Nhập email của bạn" />
        </div>
        <div className="form-group">
          <label>Mật khẩu</label>
          <input type="password" placeholder="••••••••" />
        </div>
        <div className="form-group">
          <label>Xác nhận mật khẩu</label>
          <input type="password" placeholder="••••••••" />
        </div>
        <button type="submit" className="form-submit">
          Đăng Ký
        </button>
      </form>
      <p className="form-footer">
        Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
      </p>
    </div>
  );
}