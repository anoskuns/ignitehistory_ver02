import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../services/firebase.config';
import { ref, set, onValue, update } from 'firebase/database';
import toast from 'react-hot-toast';
import { propertiesData } from '../data/properties';
import { questionsData } from '../data/questions';

const MONEY_DENOMINATIONS = [1, 2, 50, 100, 200];
const TAX_RATE = 0.15;

const AdminPage = () => {
  const [roomId, setRoomId] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [timerInput, setTimerInput] = useState(30);
  const [timeLeft, setTimeLeft] = useState(null);

  // =====================================================
  // TẠO PHÒNG
  // =====================================================

  const handleCreateRoom = async () => {
    setIsCreating(true);
    const newRoomId = Math.floor(10000 + Math.random() * 90000).toString();
    try {
      await set(ref(db, `rooms/${newRoomId}`), {
        status: 'waiting',
        timer: { isRunning: false, timeLeft: 30 * 60, endTime: 0 },
        pendingRequest: null,
        players: {}
      });
      setRoomId(newRoomId);
      toast.success(`Đã tạo phòng: ${newRoomId}`);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tạo phòng!');
    } finally {
      setIsCreating(false);
    }
  };

  // =====================================================
  // FIREBASE ROOM
  // =====================================================

  useEffect(() => {
    if (!roomId) return;
    const roomRef = ref(db, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      setRoomData(snapshot.exists() ? snapshot.val() : null);
    });
    return () => unsubscribe();
  }, [roomId]);

  // =====================================================
  // TIMER
  // =====================================================

  useEffect(() => {
    let interval;
    if (roomData?.timer?.isRunning) {
      interval = setInterval(() => {
        const remain = Math.max(0, Math.floor((roomData.timer.endTime - Date.now()) / 1000));
        setTimeLeft(remain);
        if (remain <= 0) clearInterval(interval);
      }, 1000);
    } else if (roomData?.timer) {
      setTimeLeft(roomData.timer.timeLeft);
    }
    return () => clearInterval(interval);
  }, [roomData?.timer]);

  // =====================================================
  // SET TIMER
  // =====================================================

  const handleSetTimer = async () => {
    const minutes = Number(timerInput);
    if (!minutes || minutes <= 0) { toast.error('Nhập số phút hợp lệ!'); return; }
    try {
      await update(ref(db, `rooms/${roomId}/timer`), {
        isRunning: false, timeLeft: minutes * 60, endTime: 0
      });
      toast.success(`Đã đặt ${minutes} phút!`);
    } catch { toast.error('Không thể đặt thời gian!'); }
  };

  // =====================================================
  // START / PAUSE
  // =====================================================

  const toggleTimer = async () => {
    const timer = roomData?.timer;
    if (!timer) return;
    try {
      if (timer.isRunning) {
        const remain = Math.max(0, Math.floor((timer.endTime - Date.now()) / 1000));
        await update(ref(db, `rooms/${roomId}/timer`), { isRunning: false, timeLeft: remain });
        toast('Đã tạm dừng trò chơi!', { icon: '⏸️' });
      } else {
        await update(ref(db, `rooms/${roomId}/timer`), {
          isRunning: true, endTime: Date.now() + timer.timeLeft * 1000
        });
        toast('Trò chơi bắt đầu!', { icon: '▶️' });
      }
    } catch { toast.error('Không thể điều khiển timer!'); }
  };

  // =====================================================
  // TÍNH GIÁ TRỊ
  // =====================================================

  const calculateAssetValue = (player) => {
    if (!player?.properties || Array.isArray(player.properties)) return 0;
    let total = 0;
    Object.entries(player.properties).forEach(([propertyName, rawLevel]) => {
      const property = propertiesData.find((p) => p.name === propertyName);
      if (!property) return;
      const level = Number(rawLevel) || 0;
      if (property.type === 'station' || property.type === 'service') {
        total += property.price; return;
      }
      total += property.price;
      for (let i = 1; i <= level; i++) total += property.levels?.[i]?.upgradeCost || 0;
    });
    return total;
  };

  const calculateSaleValue = (player) => {
    if (!player?.properties || Array.isArray(player.properties)) return 0;
    let total = 0;
    Object.entries(player.properties).forEach(([propertyName, rawLevel]) => {
      const property = propertiesData.find((p) => p.name === propertyName);
      if (!property) return;
      const level = Number(rawLevel) || 0;
      if (property.type === 'station' || property.type === 'service') {
        total += property.mortgage; return;
      }
      total += property.mortgage;
      for (let i = 1; i <= level; i++) total += property.levels?.[i]?.sellValue || 0;
    });
    return total;
  };

  const calculateTotalWealth = (player) =>
    (Number(player?.money) || 0) + calculateAssetValue(player);

  // =====================================================
  // STATS TOÀN PHÒNG
  // =====================================================

  const roomStats = useMemo(() => {
    const players = roomData?.players || {};
    let totalCash = 0, totalAssets = 0, totalSaleValue = 0;
    Object.values(players).forEach((player) => {
      totalCash += Number(player.money) || 0;
      totalAssets += calculateAssetValue(player);
      totalSaleValue += calculateSaleValue(player);
    });
    return { totalCash, totalAssets, totalWealth: totalCash + totalAssets, totalSaleValue };
  }, [roomData]);

  // =====================================================
  // CỘNG / TRỪ TIỀN
  // =====================================================

  const adjustMoney = async (playerId, amount) => {
    const player = roomData?.players?.[playerId];
    if (!player) return;
    const newMoney = Math.max(0, (Number(player.money) || 0) + amount);
    try {
      await update(ref(db, `rooms/${roomId}/players/${playerId}`), { money: newMoney });
      toast.success(`${amount > 0 ? '+' : ''}${amount} Quan`);
    } catch { toast.error('Không thể cập nhật tiền!'); }
  };

  // =====================================================
  // THU THUẾ 15%
  // =====================================================

  const taxPlayer = async (playerId) => {
    const player = roomData?.players?.[playerId];
    if (!player) return;
    const currentMoney = Number(player.money) || 0;
    if (currentMoney <= 0) { toast.error('Người chơi không có tiền!'); return; }
    const taxAmount = Math.floor(currentMoney * TAX_RATE);
    if (taxAmount <= 0) { toast.error('Số tiền thuế quá nhỏ!'); return; }
    try {
      await update(ref(db, `rooms/${roomId}/players/${playerId}`), {
        money: currentMoney - taxAmount
      });
      toast.success(`🏛️ Thu ${taxAmount} Quan thuế (15%) từ ${player.name}!`);
    } catch { toast.error('Không thể thu thuế!'); }
  };

  // =====================================================
  // ĐÓNG BĂNG
  // =====================================================

  const toggleFreeze = async (playerId) => {
    const player = roomData?.players?.[playerId];
    if (!player) return;
    const next = !Boolean(player.isFrozen);
    await update(ref(db, `rooms/${roomId}/players/${playerId}`), { isFrozen: next });
    toast(next ? '❄️ Đã đóng băng người chơi!' : '🔓 Đã thả người chơi!');
  };

  // =====================================================
  // XÓA NGƯỜI CHƠI
  // =====================================================

  const deletePlayer = async (playerId) => {
    const player = roomData?.players?.[playerId];
    if (!player) return;
    if (!window.confirm(`Bạn có chắc muốn xóa "${player.name}" khỏi phòng?`)) return;
    try {
      const updates = {};
      updates[`rooms/${roomId}/players/${playerId}`] = null;
      if (roomData?.pendingRequest?.playerId === playerId) {
        updates[`rooms/${roomId}/pendingRequest`] = null;
      }
      await update(ref(db), updates);
      toast.success(`Đã xóa ${player.name}!`);
    } catch (error) {
      console.error(error);
      toast.error('Không thể xóa người chơi!');
    }
  };

  // =====================================================
  // DUYỆT SỚ
  // =====================================================

  const approveRequest = async (isApproved) => {
    const request = roomData?.pendingRequest;
    if (!request) { toast.error('Không có sớ đang chờ!'); return; }

    if (!isApproved) {
      await update(ref(db, `rooms/${roomId}/pendingRequest`), { status: 'rejected' });
      toast.error('Đã bác bỏ sớ!');
      return;
    }

    if (!questionsData || questionsData.length === 0) { toast.error('Chưa có câu hỏi!'); return; }

    const randomQuestion = questionsData[Math.floor(Math.random() * questionsData.length)];
    await update(ref(db), {
      [`rooms/${roomId}/pendingRequest/status`]: 'approved',
      [`rooms/${roomId}/pendingRequest/questionId`]: randomQuestion.id
    });
    toast.success('Đã duyệt sớ và phát câu hỏi!');
  };

  // =====================================================
  // FORMAT
  // =====================================================

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '00:00';
    if (seconds <= 0) return 'HẾT GIỜ!';
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-stone-100 p-4 md:p-8 font-sans text-gray-800">

      {!roomId ? (
        <div className="min-h-[80vh] flex items-center justify-center">
          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="bg-red-700 hover:bg-red-800 text-white px-8 py-4 rounded-xl font-black text-2xl shadow-xl disabled:bg-gray-500"
          >
            {isCreating ? 'Đang thiết triều...' : '🏯 Tạo Phòng Mới'}
          </button>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-6">

          {/* HEADER */}
          <div className="bg-white p-6 rounded-xl shadow-lg border-t-8 border-red-700">
            <div className="flex flex-col lg:flex-row justify-between gap-6">
              <div>
                <p className="text-sm font-bold text-gray-500">MÃ PHÒNG</p>
                <p className="text-5xl font-black text-red-600 tracking-widest">{roomId}</p>
              </div>
              <div className="text-right">
                <div className="flex flex-wrap justify-end gap-2 mb-3">
                  <input
                    type="number" min="1" value={timerInput}
                    onChange={(e) => setTimerInput(e.target.value)}
                    className="border p-2 w-20 rounded text-center"
                  />
                  <span className="font-bold self-center">phút</span>
                  <button onClick={handleSetTimer} className="bg-blue-600 text-white px-3 py-2 rounded font-bold">
                    Set giờ
                  </button>
                  <button
                    onClick={toggleTimer}
                    className={`text-white px-4 py-2 rounded font-bold ${roomData?.timer?.isRunning ? 'bg-red-500' : 'bg-green-600'}`}
                  >
                    {roomData?.timer?.isRunning ? '⏸ Tạm dừng' : '▶ Bắt đầu'}
                  </button>
                </div>
                <div className="text-5xl font-black">⏳ {formatTime(timeLeft)}</div>
              </div>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl shadow border-l-4 border-amber-500">
              <p className="text-gray-500 font-bold">💰 Tổng tiền mặt</p>
              <p className="text-3xl font-black text-amber-600">{roomStats.totalCash} Quan</p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow border-l-4 border-green-600">
              <p className="text-gray-500 font-bold">🏰 Giá trị đất & công trình</p>
              <p className="text-3xl font-black text-green-700">{roomStats.totalAssets} Quan</p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow border-l-4 border-blue-600">
              <p className="text-gray-500 font-bold">📊 Tổng tài sản</p>
              <p className="text-3xl font-black text-blue-700">{roomStats.totalWealth} Quan</p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow border-l-4 border-red-600">
              <p className="text-gray-500 font-bold">🏦 Giá trị có thể bán</p>
              <p className="text-3xl font-black text-red-700">{roomStats.totalSaleValue} Quan</p>
            </div>
          </div>

          {/* SỚ ĐANG CHỜ */}
          {roomData?.pendingRequest?.status === 'pending' && (
            <div className="bg-yellow-100 border-4 border-yellow-500 p-6 rounded-xl shadow-lg">
              <h2 className="text-2xl font-black text-yellow-800 mb-3">📜 CÓ SỚ TẤU ĐANG CHỜ!</h2>
              <p className="text-lg">
                Người chơi: <strong className="text-red-600">
                  {roomData.players?.[roomData.pendingRequest.playerId]?.name}
                </strong>
              </p>
              <p>Yêu cầu: <strong>{roomData.pendingRequest.type === 'buy' ? 'Mua đất' : 'Nâng cấp'}</strong></p>
              <p>Địa danh: <strong>{roomData.pendingRequest.property}</strong></p>
              <p>Chi phí: <strong className="text-amber-700">{roomData.pendingRequest.cost} Quan</strong></p>
              <div className="flex gap-3 mt-5">
                <button onClick={() => approveRequest(true)} className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold">
                  ✅ Duyệt - Phát câu hỏi
                </button>
                <button onClick={() => approveRequest(false)} className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold">
                  ❌ Bác bỏ
                </button>
              </div>
            </div>
          )}

          {/* DANH SÁCH NGƯỜI CHƠI */}
          <div className="bg-white p-6 rounded-xl shadow border-t-4 border-blue-600 overflow-x-auto">
            <h2 className="text-2xl font-black mb-5">👑 Danh Sách Dân Chúng</h2>

            <table className="w-full min-w-225 border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-3 border">Trạng thái</th>
                  <th className="p-3 border">Tên</th>
                  <th className="p-3 border">Tiền mặt</th>
                  <th className="p-3 border">Tài sản</th>
                  <th className="p-3 border">Tổng tài sản</th>
                  <th className="p-3 border">Cộng / Trừ / Thuế</th>
                  <th className="p-3 border">Cơ nghiệp</th>
                  <th className="p-3 border">Quản lý</th>
                </tr>
              </thead>

              <tbody>
                {roomData?.players && Object.entries(roomData.players).length > 0 ? (
                  Object.entries(roomData.players).map(([pId, info]) => {
                    const assetValue = calculateAssetValue(info);
                    const totalWealth = calculateTotalWealth(info);
                    const currentMoney = Number(info.money) || 0;
                    const taxAmount = Math.floor(currentMoney * TAX_RATE);

                    return (
                      <tr key={pId} className="hover:bg-gray-50">

                        {/* STATUS */}
                        <td className="p-3 border text-center">
                          <button
                            onClick={() => toggleFreeze(pId)}
                            className={`px-3 py-2 rounded text-white font-bold ${info.isFrozen ? 'bg-blue-500' : 'bg-green-500'}`}
                          >
                            {info.isFrozen ? '❄️ Đi đày' : '🟢 Tự do'}
                          </button>
                        </td>

                        {/* NAME */}
                        <td className="p-3 border font-black">{info.name}</td>

                        {/* MONEY */}
                        <td className="p-3 border">
                          <span className="text-xl font-black text-amber-600">{info.money} Quan</span>
                        </td>

                        {/* ASSET */}
                        <td className="p-3 border">
                          <span className="font-bold text-green-700">{assetValue} Quan</span>
                        </td>

                        {/* TOTAL */}
                        <td className="p-3 border">
                          <span className="font-black text-blue-700 text-xl">{totalWealth} Quan</span>
                        </td>

                        {/* CỘNG / TRỪ / THUẾ — gộp chung 1 cột */}
                        <td className="p-3 border">
                          <div className="grid grid-cols-2 gap-1 min-w-36">
                            {MONEY_DENOMINATIONS.map((amount) => (
                              <React.Fragment key={amount}>
                                <button
                                  onClick={() => adjustMoney(pId, amount)}
                                  className="bg-green-100 text-green-700 px-2 py-1 rounded font-bold hover:bg-green-200 text-sm"
                                >
                                  +{amount}
                                </button>
                                <button
                                  onClick={() => adjustMoney(pId, -amount)}
                                  className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold hover:bg-red-200 text-sm"
                                >
                                  -{amount}
                                </button>
                              </React.Fragment>
                            ))}

                            {/* ✅ NÚT THUẾ 15% — nằm cuối cùng trong cột Cộng/Trừ */}
                            <button
                              onClick={() => taxPlayer(pId)}
                              disabled={currentMoney <= 0}
                              title={`Thu thuế 15% = ${taxAmount} Quan`}
                              className="col-span-2 mt-1 bg-purple-100 text-purple-700 px-2 py-1 rounded font-bold hover:bg-purple-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                            >
                              🏛️ Thuế 15% (-{taxAmount} Quan)
                            </button>
                          </div>
                        </td>

                        {/* PROPERTIES */}
                        <td className="p-3 border">
                          {info.properties &&
                          !Array.isArray(info.properties) &&
                          Object.keys(info.properties).length > 0 ? (
                            Object.entries(info.properties).map(([propertyName, level]) => (
                              <span
                                key={propertyName}
                                className="inline-block bg-stone-200 px-2 py-1 rounded mr-1 mb-1 text-sm border"
                              >
                                {propertyName}{' '}
                                {propertiesData.find((p) => p.name === propertyName)?.type === 'property'
                                  ? `(Cấp ${level})`
                                  : '(Sở hữu)'}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 italic">Vô sản</span>
                          )}
                        </td>

                        {/* DELETE */}
                        <td className="p-3 border text-center">
                          <button
                            onClick={() => deletePlayer(pId)}
                            className="bg-red-700 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-800"
                          >
                            🗑️ Xóa
                          </button>
                        </td>

                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-gray-500 italic">
                      Chưa có người chơi...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
};

export default AdminPage;