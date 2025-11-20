import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./nhanvien/Login";
import ProductManagement from "./ProductManagement";
import EmployeeManagement from "./EmployeeManagement";
import RevenueReport from "./reports/RevenueReport";
import InventoryReport from "./reports/InventoryReport";
import EmployeePerformanceReport from "./reports/EmployeePerformanceReport";
import PrivateRoute from "../utils/PrivateRoute";
import Hoadonban from "./Hoadonban";
import Dashboard from "./Dashboard";
import Pos from "./nhanvien/Pos";
import MyOrders from "./nhanvien/MyOrders";

// function App() {
//   return (
//     <Router>
//       <Routes>
//         <Route path="/login" element={<Login />} />

//         {/* Dashboard */}
//         <Route
//           path="/dashboard"
//           element={
//             <PrivateRoute
//               roles={["quan_ly", "thu_ngan", "nhan_vien_kho", "nhan_vien"]}
//             >
//               <Dashboard />
//             </PrivateRoute>
//           }
//         />

//         {/* POS cho thu ngân */}
//         <Route
//           path="/pos"
//           element={
//             <PrivateRoute roles={["thu_ngan"]}>
//               <Pos />
//             </PrivateRoute>
//           }
//         />

//         {/* Đơn của tôi */}
//         <Route
//           path="/pos/orders"
//           element={
//             <PrivateRoute roles={["thu_ngan"]}>
//               <MyOrders />
//             </PrivateRoute>
//           }
//         />

//         {/* Báo cáo (quản lý) */}
//         <Route
//           path="/baocao"
//           element={
//             <PrivateRoute roles={["quan_ly"]}>
//               <RevenueReport />
//             </PrivateRoute>
//           }
//         />
//         <Route
//           path="/baocao/doanhthu"
//           element={
//             <PrivateRoute roles={["quan_ly"]}>
//               <RevenueReport />
//             </PrivateRoute>
//           }
//         />
//         <Route
//           path="/baocao/tonkho"
//           element={
//             <PrivateRoute roles={["quan_ly"]}>
//               <InventoryReport />
//             </PrivateRoute>
//           }
//         />
//         <Route
//           path="/baocao/hieusuatnhanvien"
//           element={
//             <PrivateRoute roles={["quan_ly"]}>
//               <EmployeePerformanceReport />
//             </PrivateRoute>
//           }
//         />

//         {/* Quản lý sản phẩm / nhân viên / hóa đơn (quản lý) */}
//         <Route
//           path="/sanpham"
//           element={
//             <PrivateRoute roles={["quan_ly"]}>
//               <ProductManagement />
//             </PrivateRoute>
//           }
//         />
//         <Route
//           path="/nhanvien"
//           element={
//             <PrivateRoute roles={["quan_ly"]}>
//               <EmployeeManagement />
//             </PrivateRoute>
//           }
//         />
//         <Route
//           path="/hoadonban"
//           element={
//             <PrivateRoute roles={["quan_ly"]}>
//               <Hoadonban />
//             </PrivateRoute>
//           }
//         />

//         {/* Mặc định */}
//         <Route path="*" element={<Login />} />
//       </Routes>
//     </Router>
//   );
// }

// export default App;

function App() {
  return (
    <Router>
      <Routes>
        {/* Route cho trang Đăng nhập và trang mặc định */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />

        {/* --- TẤT CẢ CÁC TRANG BÊN TRONG ĐỀU DÙNG CHUNG LAYOUT --- */}

        {/* Dashboard (dành cho mọi vai trò sau khi đăng nhập) */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute roles={["quan_ly", "thu_ngan", "nhan_vien_kho"]}>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* POS & Đơn hàng (giờ đã có Sidebar) */}
        <Route
          path="/pos"
          element={
            <PrivateRoute roles={["thu_ngan"]}>
              <Pos />
            </PrivateRoute>
          }
        />
        <Route
          path="/pos/orders"
          element={
            <PrivateRoute roles={["thu_ngan"]}>
              <MyOrders />
            </PrivateRoute>
          }
        />

        {/* Các trang của Quản lý */}
        <Route
          path="/sanpham"
          element={
            <PrivateRoute roles={["quan_ly"]}>
              <ProductManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/nhanvien"
          element={
            <PrivateRoute roles={["quan_ly"]}>
              <EmployeeManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/hoadonban"
          element={
            <PrivateRoute roles={["quan_ly"]}>
              <Hoadonban />
            </PrivateRoute>
          }
        />
        <Route
          path="/baocao/doanhthu"
          element={
            <PrivateRoute roles={["quan_ly"]}>
              <RevenueReport />
            </PrivateRoute>
          }
        />
        <Route
          path="/baocao/tonkho"
          element={
            <PrivateRoute roles={["quan_ly"]}>
              <InventoryReport />
            </PrivateRoute>
          }
        />
        <Route
          path="/baocao/hieusuatnhanvien"
          element={
            <PrivateRoute roles={["quan_ly"]}>
              <EmployeePerformanceReport />
            </PrivateRoute>
          }
        />

        {/* Route bắt lỗi, chuyển về trang dashboard nếu đã đăng nhập */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
