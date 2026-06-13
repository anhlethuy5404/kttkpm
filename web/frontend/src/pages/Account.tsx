import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, MapPin, Phone, Mail } from 'lucide-react';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

export default function Account() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    id: 1,
    username: 'anhle',
    email: 'anhle@example.com',
    first_name: 'Anh',
    last_name: 'Lê',
    phone: '0123456789',
    address: '123 Đường A, Phường B',
    city: 'Hà Nội',
    country: 'Việt Nam',
  });

  const [formData, setFormData] = useState(profile);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      console.log('Saving profile:', formData);
      // TODO: Implement API call to save profile
      setProfile(formData);
      setIsEditing(false);
      alert('Cập nhật thông tin thành công!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Lỗi khi cập nhật thông tin');
    }
  };

  const handleLogout = () => {
    if (confirm('Bạn chắc chắn muốn đăng xuất?')) {
      // TODO: Implement logout
      navigate('/');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Hồ Sơ Cá Nhân</h1>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '10px 16px',
            backgroundColor: '#f5f5f5',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#c33',
          }}
        >
          <LogOut size={18} /> Đăng Xuất
        </button>
      </div>

      {/* Profile Card */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '48px',
            fontWeight: '700',
          }}>
            {profile.first_name?.charAt(0)}
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              {profile.first_name} {profile.last_name}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '0.5rem' }}>
              <Mail size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              {profile.email}
            </p>
            {profile.phone && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
                <Phone size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                {profile.phone}
              </p>
            )}
          </div>
        </div>

        {!isEditing ? (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
              marginBottom: '2rem',
              paddingBottom: '2rem',
              borderBottom: '1px solid var(--border-color)',
            }}>
              <div>
                <label style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  Tên Đăng Nhập
                </label>
                <p style={{ fontSize: '16px', marginTop: '0.5rem' }}>{profile.username}</p>
              </div>
              <div>
                <label style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  Số Điện Thoại
                </label>
                <p style={{ fontSize: '16px', marginTop: '0.5rem' }}>{profile.phone || 'Chưa cập nhật'}</p>
              </div>
              <div>
                <label style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  Địa Chỉ
                </label>
                <p style={{ fontSize: '16px', marginTop: '0.5rem' }}>{profile.address || 'Chưa cập nhật'}</p>
              </div>
              <div>
                <label style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  Thành Phố
                </label>
                <p style={{ fontSize: '16px', marginTop: '0.5rem' }}>{profile.city || 'Chưa cập nhật'}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setIsEditing(true);
                setFormData(profile);
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: 'var(--primary)',
                color: 'var(--dark)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Chỉnh Sửa Thông Tin
            </button>
          </div>
        ) : (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '16px', fontWeight: '600' }}>
                  Họ
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '16px', fontWeight: '600' }}>
                  Tên
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '16px', fontWeight: '600' }}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '16px', fontWeight: '600' }}>
                  Số Điện Thoại
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '16px', fontWeight: '600' }}>
                  Địa Chỉ
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '16px', fontWeight: '600' }}>
                  Thành Phố
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '16px', fontWeight: '600' }}>
                  Quốc Gia
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleSave}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'var(--primary)',
                  color: 'var(--dark)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Lưu Thay Đổi
              </button>
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#f5f5f5',
                  color: 'var(--dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '1.5rem',
      }}>
        <div style={{
          backgroundColor: 'var(--light)',
          padding: '1.5rem',
          borderRadius: '12px',
          textAlign: 'center',
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '0.5rem' }}>
            Đơn Hàng
          </p>
          <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)' }}>12</p>
        </div>
        <div style={{
          backgroundColor: 'var(--light)',
          padding: '1.5rem',
          borderRadius: '12px',
          textAlign: 'center',
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '0.5rem' }}>
            Yêu Thích
          </p>
          <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)' }}>8</p>
        </div>
        <div style={{
          backgroundColor: 'var(--light)',
          padding: '1.5rem',
          borderRadius: '12px',
          textAlign: 'center',
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '0.5rem' }}>
            Tổng Chi Tiêu
          </p>
          <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)' }}>24.5M</p>
        </div>
      </div>
    </div>
  );
}
