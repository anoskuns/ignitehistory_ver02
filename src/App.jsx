import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import PlayerPage from "./pages/PlayerPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Đường dẫn trang chủ sẽ là màn hình đăng nhập của người chơi */}
        <Route path="/" element={<LoginPage />} />
        
        {/* Màn hình chính của người chơi sau khi đăng nhập */}
        <Route path="/player" element={<PlayerPage />} />
        
        {/* Màn hình dành riêng cho quản trò (Vào bằng cách gõ thêm /admin) */}
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
