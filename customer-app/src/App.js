import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import OrderHistory from './pages/OrderHistory';
import OrderDetail from './pages/OrderDetail';
import './App.css';

function App() {
  const [cartCount, setCartCount] = useState(0);

  const handleCartUpdate = (countChange = 1) => {
    setCartCount((prev) => Math.max(0, prev + countChange));
  };

  useEffect(() => {
    // Có thể load cart count thực tế từ API nếu cần
  }, []);

  return (
    <div className="App">
      <Header cartCount={cartCount} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home onCartUpdate={handleCartUpdate} />} />
          <Route path="/products" element={<ProductList onCartUpdate={handleCartUpdate} />} />
          <Route path="/products/:id" element={<ProductDetail onCartUpdate={handleCartUpdate} />} />
          <Route path="/cart" element={<Cart onCartUpdate={handleCartUpdate} />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/orders" element={<OrderHistory />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
