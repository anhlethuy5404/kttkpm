import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ShoppingCart, User, MessageCircle, X, Send, Sparkles } from 'lucide-react';
import Home from './pages/Home';
import Store from './pages/Store';
import ProductDetail from './pages/ProductDetail';
import Account from './pages/Account';
import Orders from './pages/Orders';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';

export default function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [cartCount, setCartCount] = useState(2);

  return (
    <Router>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* HEADER */}
        <header>
          <div className="container">
            <Link to="/" className="logo">
              UniqueShop <span className="logo-dot">●</span>
            </Link>
            <nav>
              <Link to="/">Trang Chủ</Link>
              <Link to="/store">Cửa Hàng</Link>
              <button className="ai-button" onClick={() => setIsChatOpen(true)}>
                <Sparkles size={16} /> Gợi Ý AI
              </button>
              <Link to="/cart" className="cart-link">
                <ShoppingCart size={20} />
                Giỏ Hàng
                {cartCount > 0 && (
                  <span className="cart-badge">{cartCount}</span>
                )}
              </Link>
              <Link to="/account">
                <User size={20} /> Xin chào, anhle
              </Link>
            </nav>
          </div>
        </header>

        {/* MAIN ROUTER BODY */}
        <main style={{ flexGrow: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/store" element={<Store />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/account" element={<Account />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
          </Routes>
        </main>

        {/* AI CHATBOX WIDGET */}
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 50 }}>
          {!isChatOpen ? (
            <button 
              onClick={() => setIsChatOpen(true)}
              style={{
                background: 'var(--dark)',
                color: 'white',
                padding: '1rem',
                borderRadius: '50%',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--dark)'}
            >
              <MessageCircle size={24} />
            </button>
          ) : (
            <div className="chat-box">
              <div className="chat-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={18} style={{ color: 'var(--primary)' }} />
                  <span>Trợ lý tư vấn AI</span>
                </div>
                <button className="chat-close" onClick={() => setIsChatOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="chat-messages">
                <div style={{ background: 'white', border: '1px solid rgba(170, 100, 50, 0.25)', padding: '0.75rem', borderRadius: '0.75rem', maxWidth: '85%', fontSize: '0.75rem' }}>
                  Xin chào <b>anhle</b>! Mình có thể gợi ý gì về sách Kiến Trúc hay Thiết Bị cho bạn hôm nay?
                </div>
              </div>
              <div className="chat-input-group">
                <input type="text" placeholder="Hỏi AI sản phẩm phù hợp..." />
                <button><Send size={14} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Router>
  );
}