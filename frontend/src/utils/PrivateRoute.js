// import React from 'react';
// import { Navigate } from 'react-router-dom';
// import { checkRole } from './auth';

// const PrivateRoute = ({ roles, children }) => {
//   if (!checkRole(roles)) {
//     return <Navigate to="/login" replace />;
//   }
//   return children;
// };

// export default PrivateRoute;

// src/utils/PrivateRoute.js (Hoặc vị trí file của bạn)

import React from "react";
import { Navigate } from "react-router-dom";
import MainLayout from "../components/MainLayout"; // ✅ BƯỚC 1: Import MainLayout

const PrivateRoute = ({ children, roles }) => {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");

  // Kiểm tra đã đăng nhập chưa
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Kiểm tra có đúng vai trò (quyền) để truy cập không
  if (roles && !roles.includes(userRole)) {
    // Nếu sai quyền, quay về trang an toàn (ví dụ: dashboard)
    return <Navigate to="/" replace />;
  }

  // ✅ BƯỚC 2: Nếu mọi thứ OK, hiển thị trang (`children`) bên trong MainLayout
  return <MainLayout>{children}</MainLayout>;
};

export default PrivateRoute;
