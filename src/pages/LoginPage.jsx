import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from "../services/firebase.config";
import { ref, get, set } from 'firebase/database';

const LoginPage = () => {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate(); // Công cụ giúp chuyển trang

  const handleJoinRoom = async () => {
    if (!name || !roomId) {
      alert("Vui lòng nhập đầy đủ Tên và Mã phòng!");
      return;
    }

    // 1. Kiểm tra xem phòng có tồn tại trên Firebase không (dùng hàm get thay vì onValue vì chỉ cần kiểm tra 1 lần)
    const roomRef = ref(db, `rooms/${roomId}`);
    const snapshot = await get(roomRef);

    if (snapshot.exists()) {
      // 2. Nếu phòng tồn tại, tạo ID ngẫu nhiên cho người chơi này
      const playerId = 'player_' + Math.random().toString(36).substr(2, 9);
      
      // 3. Đưa thông tin người chơi lên Firebase, cấp cho họ 2000 Quan tiền vốn
      const playerRef = ref(db, `rooms/${roomId}/players/${playerId}`);
      await set(playerRef, {
        name: name,
        money: 200,
        properties: []
      });

      // 4. Lưu Mã phòng và Mã người chơi vào bộ nhớ tạm của trình duyệt (để tí nữa trang Player lấy ra dùng)
      localStorage.setItem('ignite_roomId', roomId);
      localStorage.setItem('ignite_playerId', playerId);

      // 5. Chuyển hướng sang trang Player
      navigate('/player');
    } else {
      alert("Mã phòng không tồn tại. Vui lòng kiểm tra lại!");
    }
  };

  return (
    <div className="min-h-screen bg-stone-800 flex items-center justify-center p-4">
      <div className="bg-orange-50 w-full max-w-md p-8 rounded-xl shadow-2xl border-4 border-amber-700 text-center">
        <h1 className="text-4xl font-black text-red-800 mb-2 uppercase">Ignite History</h1>
        <p className="text-stone-600 mb-8 italic">Kiến tạo Giang Sơn</p>

        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="Tên của bạn (VD: Hưng Đạo Vương)" 
            className="w-full p-4 border-2 border-amber-600 rounded text-lg outline-none focus:bg-amber-50"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input 
            type="text" 
            placeholder="Nhập Mã Phòng (VD: 83921)" 
            className="w-full p-4 border-2 border-amber-600 rounded text-lg font-bold text-center tracking-widest outline-none focus:bg-amber-50"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button 
            onClick={handleJoinRoom}
            className="w-full bg-red-700 text-white font-bold text-xl py-4 rounded hover:bg-red-800 transition shadow-lg"
          >
            VÀO PHÒNG
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;