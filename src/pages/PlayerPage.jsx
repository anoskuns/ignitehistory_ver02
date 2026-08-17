import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase.config';
import { ref, onValue, update, set } from 'firebase/database';
import toast from 'react-hot-toast';
import { propertiesData } from '../data/properties';
import { questionsData } from '../data/questions';
import QuestionModal from '../components/QuestionModal';

const PENALTY_MIN = 5;
const PENALTY_MAX = 50;

// ─── Firebase sentinel: level 0 lưu thành -1 vì Firebase xóa node có giá trị 0 ───
const dbToLevel = (raw) => { const n = Number(raw); return n === -1 ? 0 : (n || 0); };
const levelToDb = (level) => (level === 0 ? -1 : level);

// ─── Màu theo region ───
const REGION_COLOR = {
  1: { bg: 'bg-emerald-100', border: 'border-emerald-400', badge: 'bg-emerald-500', text: 'text-emerald-700', label: 'Khu vực 1' },
  2: { bg: 'bg-sky-100',     border: 'border-sky-400',     badge: 'bg-sky-500',     text: 'text-sky-700',     label: 'Khu vực 2' },
  3: { bg: 'bg-violet-100',  border: 'border-violet-400',  badge: 'bg-violet-500',  text: 'text-violet-700',  label: 'Khu vực 3' },
  4: { bg: 'bg-rose-100',    border: 'border-rose-400',    badge: 'bg-rose-500',    text: 'text-rose-700',    label: 'Khu vực 4' },
};

// ─── Level dots hiển thị ───
const LevelDots = ({ level, max = 3 }) => (
  <div className="flex gap-1 mt-1">
    {Array.from({ length: max }).map((_, i) => (
      <div
        key={i}
        className={`w-2.5 h-2.5 rounded-full border ${i < level ? 'bg-amber-400 border-amber-500' : 'bg-gray-200 border-gray-300'}`}
      />
    ))}
  </div>
);

const PlayerPage = () => {
  const navigate = useNavigate();
  const roomId   = localStorage.getItem('ignite_roomId');
  const playerId = localStorage.getItem('ignite_playerId');

  const [roomData,         setRoomData]         = useState(null);
  const [timeLeft,         setTimeLeft]         = useState(null);
  const [targetPlayerId,   setTargetPlayerId]   = useState('');
  const [transferAmount,   setTransferAmount]   = useState('');
  const [isModalOpen,      setIsModalOpen]      = useState(false);
  const [currentQuestion,  setCurrentQuestion]  = useState(null);
  const [handledRequestId, setHandledRequestId] = useState(null);
  const [answerResult,     setAnswerResult]     = useState(null);
  const [activeTab,        setActiveTab]        = useState('map'); // 'map' | 'sell' | 'transfer'

  // ══════════════════════════════════════════════════════
  // FIREBASE LISTENER
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    if (!roomId || !playerId) { navigate('/'); return; }
    const roomRef   = ref(db, `rooms/${roomId}`);
    const unsub     = onValue(roomRef, (snap) => {
      const data = snap.val();
      if (!data) { toast.error('Phòng không tồn tại!'); navigate('/'); return; }
      if (!data.players?.[playerId]) {
        toast.error('Bạn đã bị xóa khỏi phòng!');
        localStorage.removeItem('ignite_roomId');
        localStorage.removeItem('ignite_playerId');
        navigate('/'); return;
      }
      setRoomData(data);

      const req = data.pendingRequest;
      if (!req || req.playerId !== playerId) return;

      // ── APPROVED ──
      if (req.status === 'approved') {
        const reqId = String(req.timestamp || req.createdAt || req.id || '');
        if (handledRequestId === reqId) return;

        let question = null;
        if (req.questionId != null) {
          question = questionsData.find(q => String(q.id) === String(req.questionId));
          if (!question) { toast.error('Không tìm thấy câu hỏi!'); return; }
        } else {
          if (!questionsData?.length) { toast.error('Bộ câu hỏi trống!'); return; }
          question = questionsData[Math.floor(Math.random() * questionsData.length)];
          update(ref(db, `rooms/${roomId}/pendingRequest`), { questionId: question.id });
        }
        update(ref(db, `rooms/${roomId}/pendingRequest`), { status: 'answering' });
        setCurrentQuestion(question);
        setHandledRequestId(reqId);
        setIsModalOpen(true);
        toast.success('👑 Triều đình đã duyệt! Hãy trả lời câu hỏi.');
      }

      // ── REJECTED ──
      if (req.status === 'rejected') {
        toast.error('📜 Sớ tấu đã bị bác bỏ!');
        setCurrentQuestion(null); setIsModalOpen(false);
        setAnswerResult(null);   setHandledRequestId(null);
        set(ref(db, `rooms/${roomId}/pendingRequest`), null);
      }
    });
    return () => unsub();
  }, [roomId, playerId, navigate, handledRequestId]);

  // ══════════════════════════════════════════════════════
  // TIMER
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    let iv;
    if (roomData?.timer?.isRunning) {
      iv = setInterval(() => {
        setTimeLeft(Math.max(0, Math.floor((roomData.timer.endTime - Date.now()) / 1000)));
      }, 1000);
    } else if (roomData?.timer) {
      setTimeLeft(roomData.timer.timeLeft);
    }
    return () => clearInterval(iv);
  }, [roomData?.timer]);

  // ══════════════════════════════════════════════════════
  // DERIVED STATE
  // ══════════════════════════════════════════════════════
  const myInfo   = roomData?.players?.[playerId] ?? null;
  const isFrozen = Boolean(myInfo?.isFrozen);
  const isGameOn = Boolean(roomData?.timer?.isRunning);
  const hasPendingReq = Boolean(roomData?.pendingRequest);

  const myProperties = useMemo(() => {
    if (!myInfo?.properties || Array.isArray(myInfo.properties)) return {};
    const out = {};
    Object.entries(myInfo.properties).forEach(([name, raw]) => { out[name] = dbToLevel(raw); });
    return out;
  }, [myInfo?.properties]);

  const myAssetValue = useMemo(() => {
    let total = 0;
    Object.entries(myProperties).forEach(([name, level]) => {
      const p = propertiesData.find(x => x.name === name);
      if (!p) return;
      if (p.type === 'station' || p.type === 'service') { total += p.price; return; }
      total += p.price;
      for (let i = 1; i <= level; i++) total += p.levels?.[i]?.upgradeCost || 0;
    });
    return total;
  }, [myProperties]);

  const totalWealth = (Number(myInfo?.money) || 0) + myAssetValue;

  // Stats đất / bến / dịch trạm
  const assetStats = useMemo(() => {
    let lands = 0, stations = 0, services = 0;
    Object.keys(myProperties).forEach(name => {
      const p = propertiesData.find(x => x.name === name);
      if (!p) return;
      if (p.type === 'property') lands++;
      else if (p.type === 'station') stations++;
      else if (p.type === 'service') services++;
    });
    return { lands, stations, services };
  }, [myProperties]);

  // ── Helpers ──
  const getOwnerId = (name) => {
    if (!roomData?.players) return null;
    const e = Object.entries(roomData.players).find(([, pl]) =>
      pl.properties && !Array.isArray(pl.properties) &&
      Object.prototype.hasOwnProperty.call(pl.properties, name)
    );
    return e ? e[0] : null;
  };
  const isOwnedByMe    = (name) => Object.prototype.hasOwnProperty.call(myProperties, name);
  const isOwnedByOther = (name) => { const o = getOwnerId(name); return o && o !== playerId; };

  const formatTimer = (s) => {
    if (s == null || s <= 0) return '0:00';
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  // ══════════════════════════════════════════════════════
  // TRÌNH TẤU (mua hoặc nâng cấp) — gọi từ thẻ đất
  // ══════════════════════════════════════════════════════
  const handleRequestAction = async (propertyName, actionType) => {
    if (isFrozen)      { toast.error('❄️ Ngài đang bị đóng băng!');          return; }
    if (!isGameOn)     { toast.error('⏸️ Trò chơi chưa bắt đầu!');           return; }
    if (hasPendingReq) { toast.error('📜 Đang có sớ chờ xử lý!');            return; }

    const property = propertiesData.find(p => p.name === propertyName);
    if (!property) { toast.error('Không tìm thấy địa danh!'); return; }

    const owned = isOwnedByMe(propertyName);
    const level = owned ? myProperties[propertyName] : 0;

    let type, cost;
    if (!owned) {
      // Mua lần đầu
      if (isOwnedByOther(propertyName)) { toast.error('🏰 Địa danh này đã có chủ!'); return; }
      type = 'buy';
      cost = property.type === 'property' ? property.price : property.price;
    } else {
      // Nâng cấp (chỉ dành cho type=property)
      if (property.type !== 'property') { toast.error('Tài sản này không nâng cấp được!'); return; }
      if (level >= 3) { toast.error('Đã đạt cấp tối đa!'); return; }
      const nextLevel = level + 1;
      type = `upgrade${nextLevel}`;
      cost = property.levels[nextLevel].upgradeCost;
    }

    const money = Number(myInfo.money) || 0;
    if (money < cost) { toast.error(`💰 Cần ${cost} Quan! Hiện có: ${money} Quan.`); return; }

    try {
      await update(ref(db), {
        [`rooms/${roomId}/pendingRequest`]: {
          playerId, property: propertyName, type, cost,
          status: 'pending', questionId: null, createdAt: Date.now()
        }
      });
      toast.success('📜 Đã gửi tấu! Đang chờ Triều đình phê duyệt.', { duration: 5000 });
    } catch { toast.error('❌ Gửi tấu thất bại!'); }
  };

  // ══════════════════════════════════════════════════════
  // TRẢ LỜI CÂU HỎI
  // ══════════════════════════════════════════════════════
  const handleAnswer = async (selectedIndex) => {
    if (!currentQuestion || !roomData?.pendingRequest) return;
    const req = roomData.pendingRequest;
    if (req.playerId !== playerId) return;
    setIsModalOpen(false);

    const money         = Number(myInfo.money) || 0;
    const isCorrect     = selectedIndex === currentQuestion.correctAnswer;
    const selectedAnswer = currentQuestion.options?.[selectedIndex] ?? '?';
    const correctAnswer  = currentQuestion.options?.[currentQuestion.correctAnswer] ?? '?';

    if (!isCorrect) {
      const penalty   = Math.floor(Math.random() * (PENALTY_MAX - PENALTY_MIN + 1)) + PENALTY_MIN;
      const newMoney  = Math.max(0, money - penalty);
      try {
        await update(ref(db), { [`rooms/${roomId}/players/${playerId}/money`]: newMoney });
        setAnswerResult({ isCorrect: false, penalty,
          explanation: currentQuestion.explanation || '', correctAnswer, selectedAnswer });
      } catch { toast.error('Không thể xử lý kết quả!'); }
      return;
    }

    setAnswerResult({ isCorrect: true, penalty: 0,
      explanation: currentQuestion.explanation || '', correctAnswer, selectedAnswer });
  };

  // ══════════════════════════════════════════════════════
  // TIẾP TỤC SAU KẾT QUẢ
  // ══════════════════════════════════════════════════════
  const handleContinueAfterResult = async () => {
    if (!answerResult) return;

    if (!answerResult.isCorrect) {
      await set(ref(db, `rooms/${roomId}/pendingRequest`), null).catch(() => {});
      toast.error(`❌ Sai! Bị trừ ${answerResult.penalty} Quan.`, { duration: 4000 });
      setAnswerResult(null); setCurrentQuestion(null); setHandledRequestId(null);
      return;
    }

    const req = roomData?.pendingRequest;
    if (!req) { setAnswerResult(null); return; }

    const property   = propertiesData.find(p => p.name === req.property);
    if (!property) { toast.error('Không tìm thấy địa danh!'); return; }

    const curRaw     = myInfo?.properties?.[req.property];
    const curLevel   = dbToLevel(curRaw);
    const newReal    = req.type === 'buy' ? 0 : curLevel + 1;
    const newDb      = levelToDb(newReal);
    const cost       = Number(req.cost) || 0;
    const money      = Number(myInfo.money) || 0;

    if (money < cost) { toast.error('Ngân khố không đủ!'); return; }

    try {
      await update(ref(db), { [`rooms/${roomId}/players/${playerId}/money`]: money - cost });
      await set(ref(db, `rooms/${roomId}/players/${playerId}/properties/${req.property}`), newDb);
      await set(ref(db, `rooms/${roomId}/pendingRequest`), null);
      const verb = req.type === 'buy'
        ? 'đã được sở hữu'
        : `đã nâng lên ${property.levels?.[newReal]?.name ?? `Cấp ${newReal}`}`;
      toast.success(`🎉 ${property.name} ${verb}!`, { duration: 5000 });
    } catch { toast.error('Không thể hoàn tất giao dịch!'); return; }

    setAnswerResult(null); setCurrentQuestion(null); setHandledRequestId(null);
  };

  // ══════════════════════════════════════════════════════
  // BÁN TÀI SẢN
  // ══════════════════════════════════════════════════════
  const handleSellAsset = async (propertyName) => {
    if (isFrozen)  { toast.error('❄️ Ngài đang bị đóng băng!'); return; }
    if (!isGameOn) { toast.error('⏸️ Trò chơi chưa bắt đầu!'); return; }

    const property = propertiesData.find(p => p.name === propertyName);
    if (!property) { toast.error('Không tìm thấy tài sản!'); return; }

    const level = myProperties[propertyName] ?? 0;
    const money = Number(myInfo.money) || 0;
    let sellAmount, confirmMsg, newLevel;

    if (property.type === 'station' || property.type === 'service') {
      sellAmount = property.mortgage;
      confirmMsg = `Bán ${property.name} với giá ${sellAmount} Quan?`;
      newLevel   = null; // xóa hẳn
    } else if (level === 0) {
      sellAmount = property.mortgage;
      confirmMsg = `Bán đất ${property.name} với giá ${sellAmount} Quan?`;
      newLevel   = null;
    } else {
      sellAmount = property.levels[level]?.sellValue || 0;
      confirmMsg = `Bán công trình Cấp ${level} của ${property.name} với giá ${sellAmount} Quan?\n(Đất sẽ giảm xuống Cấp ${level - 1})`;
      newLevel   = level - 1;
    }

    if (sellAmount <= 0) { toast.error('Không có giá bán hợp lệ!'); return; }
    if (!window.confirm(confirmMsg)) return;

    try {
      await update(ref(db), { [`rooms/${roomId}/players/${playerId}/money`]: money + sellAmount });
      if (newLevel === null) {
        await set(ref(db, `rooms/${roomId}/players/${playerId}/properties/${propertyName}`), null);
      } else {
        await set(ref(db, `rooms/${roomId}/players/${playerId}/properties/${propertyName}`), levelToDb(newLevel));
      }
      toast.success(`💰 +${sellAmount} Quan`);
    } catch { toast.error('Không thể bán tài sản!'); }
  };

  // ══════════════════════════════════════════════════════
  // CHUYỂN TIỀN
  // ══════════════════════════════════════════════════════
  const handleTransfer = async () => {
    const amount = parseInt(transferAmount, 10);
    if (!targetPlayerId || isNaN(amount) || amount <= 0) { toast.error('Nhập số Quan hợp lệ!'); return; }
    const money  = Number(myInfo.money) || 0;
    if (amount > money) { toast.error('Không đủ Quan!'); return; }
    const target = roomData.players[targetPlayerId];
    if (!target) { toast.error('Không tìm thấy người nhận!'); return; }
    try {
      await update(ref(db), {
        [`rooms/${roomId}/players/${playerId}/money`]: money - amount,
        [`rooms/${roomId}/players/${targetPlayerId}/money`]: (Number(target.money) || 0) + amount,
      });
      toast.success(`💰 Đã chuyển ${amount} Quan cho ${target.name}!`);
      setTransferAmount(''); setTargetPlayerId('');
    } catch { toast.error('Không thể chuyển tiền!'); }
  };

  // ══════════════════════════════════════════════════════
  // LOADING / HẾT GIỜ
  // ══════════════════════════════════════════════════════
  if (!roomData || !myInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="bg-white p-8 rounded-xl shadow text-center">
          <div className="text-4xl">🏯</div>
          <p className="font-bold mt-3">Đang vào triều...</p>
        </div>
      </div>
    );
  }

  if (timeLeft === 0) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-6">
        <div className="bg-yellow-100 p-8 rounded-xl shadow-2xl border-8 border-yellow-500 text-center max-w-md w-full">
          <h1 className="text-5xl font-black text-red-700 mb-4">HẾT GIỜ!</h1>
          <p className="text-xl font-bold">Trò chơi đã kết thúc.</p>
          <div className="bg-white p-5 rounded-lg mt-5 space-y-2">
            <p className="text-gray-500">Tiền mặt</p>
            <p className="text-4xl font-black text-amber-600">{myInfo.money} Quan</p>
            <p className="text-gray-500 mt-3">Tổng tài sản</p>
            <p className="text-3xl font-black text-blue-700">{totalWealth} Quan</p>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // RENDER PROPERTY CARD
  // ══════════════════════════════════════════════════════
  const renderPropertyCard = (property) => {
    const owned   = isOwnedByMe(property.name);
    const level   = owned ? myProperties[property.name] : 0;
    const byOther = !owned && isOwnedByOther(property.name);
    const ownerName = byOther
      ? Object.values(roomData.players).find((pl) =>
          pl.properties && Object.prototype.hasOwnProperty.call(pl.properties, property.name)
        )?.name
      : null;

    const isPending = roomData?.pendingRequest?.property === property.name &&
                      roomData?.pendingRequest?.playerId === playerId;
    const canBuy    = !owned && !byOther && isGameOn && !isFrozen && !hasPendingReq;
    const canUpgrade = owned && property.type === 'property' && level < 3 &&
                       isGameOn && !isFrozen && !hasPendingReq;
    const canSell   = owned && isGameOn && !isFrozen;

    // Station / service: chỉ có nút Mua hoặc Sở hữu
    if (property.type === 'station' || property.type === 'service') {
      const icon = property.type === 'station' ? '⚓' : '📮';
      return (
        <div key={property.id}
          className={`rounded-xl border-2 p-3 ${
            owned
              ? 'bg-amber-50 border-amber-400'
              : byOther
                ? 'bg-gray-100 border-gray-300 opacity-60'
                : 'bg-white border-gray-200'
          }`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">{icon}</span>
                <p className="font-black text-sm leading-tight truncate">{property.name}</p>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {owned ? 'Đang sở hữu' : byOther ? `Của: ${ownerName}` : `Giá: ${property.price} Quan`}
              </p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              {owned ? (
                <button
                  onClick={() => handleSellAsset(property.name)}
                  disabled={!canSell}
                  className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold hover:bg-red-200 disabled:opacity-40"
                >Bán</button>
              ) : !byOther ? (
                <button
                  onClick={() => handleRequestAction(property.name, 'buy')}
                  disabled={!canBuy}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded font-bold hover:bg-blue-700 disabled:opacity-40"
                >Mua</button>
              ) : null}
            </div>
          </div>
          {isPending && (
            <div className="mt-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-bold text-center">
              ⏳ Đang chờ duyệt...
            </div>
          )}
        </div>
      );
    }

    // Property (đất)
    const regionColor = REGION_COLOR[property.region] || REGION_COLOR[1];
    const passageFee  = property.levels?.[level]?.passageFee ?? 0;
    const upgradeCost = level < 3 ? property.levels?.[level + 1]?.upgradeCost : null;
    const sellAmt     = level === 0 ? property.mortgage : property.levels?.[level]?.sellValue;

    return (
      <div key={property.id}
        className={`rounded-xl border-2 overflow-hidden ${
          owned
            ? `${regionColor.bg} ${regionColor.border}`
            : byOther
              ? 'bg-gray-100 border-gray-300 opacity-55'
              : 'bg-white border-gray-200 hover:border-gray-400'
        }`}>

        {/* Header */}
        <div className={`px-3 py-2 flex items-center justify-between ${owned ? regionColor.bg : 'bg-gray-50'}`}>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm leading-tight truncate">{property.name}</p>
            {owned && (
              <LevelDots level={level} />
            )}
          </div>
          <div className="text-right shrink-0 ml-2">
            {owned ? (
              <span className={`text-xs font-black px-2 py-0.5 rounded-full text-white ${regionColor.badge}`}>
                {level === 0 ? 'Đã mua' : `Cấp ${level}`}
              </span>
            ) : byOther ? (
              <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                {ownerName}
              </span>
            ) : (
              <span className="text-xs text-gray-400">{property.price} Quan</span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-3 py-2">
          {owned && (
            <p className="text-xs text-gray-500 mb-2">
              Phí thông hành: <span className="font-bold text-gray-700">{passageFee} Quan</span>
            </p>
          )}

          <div className="flex gap-1.5 flex-wrap">
            {/* NÚT MUA */}
            {!owned && !byOther && (
              <button
                onClick={() => handleRequestAction(property.name, 'buy')}
                disabled={!canBuy}
                className="flex-1 min-w-0 text-xs bg-blue-600 text-white px-2 py-1.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                🏯 Mua — {property.price} Quan
              </button>
            )}

            {/* NÚT NÂNG CẤP */}
            {owned && property.type === 'property' && level < 3 && (
              <button
                onClick={() => handleRequestAction(property.name, `upgrade${level + 1}`)}
                disabled={!canUpgrade}
                className={`flex-1 min-w-0 text-xs text-white px-2 py-1.5 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed ${regionColor.badge} hover:opacity-90`}
              >
                ⬆ Nâng cấp — {upgradeCost} Quan
              </button>
            )}

            {/* NÚT BÁN */}
            {owned && (
              <button
                onClick={() => handleSellAsset(property.name)}
                disabled={!canSell}
                className="text-xs bg-red-100 text-red-600 px-2 py-1.5 rounded-lg font-bold hover:bg-red-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Bán {sellAmt}↓
              </button>
            )}

            {owned && level === 3 && (
              <span className="flex-1 text-xs text-center text-amber-600 font-black py-1.5">
                ✨ Tối đa
              </span>
            )}
          </div>

          {/* PENDING INDICATOR */}
          {isPending && (
            <div className="mt-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-bold text-center animate-pulse">
              ⏳ Đang chờ Triều đình duyệt...
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Nhóm properties theo region / type ──
  const landsByRegion = [1, 2, 3, 4].map(r => ({
    region: r,
    color: REGION_COLOR[r],
    items: propertiesData.filter(p => p.type === 'property' && p.region === r),
  }));
  const stations = propertiesData.filter(p => p.type === 'station');
  const services = propertiesData.filter(p => p.type === 'service');

  // ══════════════════════════════════════════════════════
  // RENDER MAIN
  // ══════════════════════════════════════════════════════
  return (
    <div className={`min-h-screen bg-stone-100 pb-12 ${isFrozen ? 'grayscale' : ''}`}>

      {/* ─── HEADER ─── */}
      <div className="bg-red-800 text-white px-5 pt-6 pb-5 rounded-b-3xl shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs text-red-300 font-bold uppercase tracking-widest">Đại Nhân</p>
            <h2 className="text-2xl font-black mt-0.5">{myInfo.name}</h2>
            <p className="text-4xl font-black text-yellow-400 mt-1">
              {myInfo.money}<span className="text-lg ml-1">Quan</span>
            </p>
          </div>
          <div className="text-right">
            <div className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-bold mb-2">
              PHÒNG {roomId}
            </div>
            <div className="text-yellow-300 font-black text-2xl">⏳ {formatTimer(timeLeft)}</div>
          </div>
        </div>

        {/* Wealth row */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-black/20 rounded-xl p-3">
            <p className="text-xs text-red-300">GIÁ TRỊ TÀI SẢN</p>
            <p className="text-xl font-black text-green-300">{myAssetValue} Quan</p>
          </div>
          <div className="bg-black/20 rounded-xl p-3">
            <p className="text-xs text-red-300">TỔNG TÀI SẢN</p>
            <p className="text-xl font-black text-yellow-300">{totalWealth} Quan</p>
          </div>
        </div>

        {/* Asset stats bar */}
        <div className="flex gap-2">
          <div className="flex-1 bg-black/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="text-base">🗺️</span>
            <div>
              <p className="text-xs text-red-300">Đất</p>
              <p className="font-black text-white text-sm">{assetStats.lands} ô</p>
            </div>
          </div>
          <div className="flex-1 bg-black/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="text-base">⚓</span>
            <div>
              <p className="text-xs text-red-300">Bến tàu</p>
              <p className="font-black text-white text-sm">{assetStats.stations}/4</p>
            </div>
          </div>
          <div className="flex-1 bg-black/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="text-base">📮</span>
            <div>
              <p className="text-xs text-red-300">Dịch trạm</p>
              <p className="font-black text-white text-sm">{assetStats.services}/2</p>
            </div>
          </div>
        </div>

        {/* Status banners */}
        {!isGameOn && timeLeft > 0 && (
          <div className="mt-3 bg-black/30 py-2 rounded-lg text-center text-yellow-200 font-bold text-sm">
            ⏸️ TRÒ CHƠI ĐANG TẠM DỪNG
          </div>
        )}
        {isFrozen && (
          <div className="mt-2 bg-blue-900/60 py-2 rounded-lg text-center text-blue-200 font-bold text-sm">
            ❄️ NGÀI ĐANG BỊ ĐÓNG BĂNG
          </div>
        )}
        {hasPendingReq && roomData.pendingRequest.playerId === playerId && (
          <div className="mt-2 bg-yellow-900/40 py-2 rounded-lg text-center text-yellow-200 font-bold text-sm animate-pulse">
            📜 {roomData.pendingRequest.status === 'pending'
              ? 'Đang chờ Triều đình phê duyệt...'
              : 'Hãy trả lời câu hỏi!'}
          </div>
        )}
      </div>

      {/* ─── TAB NAV ─── */}
      <div className="sticky top-0 z-20 bg-stone-100 px-4 pt-3 pb-1">
        <div className="flex bg-white rounded-xl shadow p-1 gap-1">
          {[
            { key: 'map',      label: '🗺️ Bản đồ' },
            { key: 'sell',     label: '🏦 Bán tài sản' },
            { key: 'transfer', label: '💰 Chuyển tiền' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                activeTab === t.key
                  ? 'bg-red-700 text-white shadow'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* ─── CONTENT ─── */}
      <div className="px-4 pt-3 space-y-4 max-w-2xl mx-auto">

        {/* ══ TAB: BẢN ĐỒ ══ */}
        {activeTab === 'map' && (
          <>
            {/* Đất theo khu vực */}
            {landsByRegion.map(({ region, color, items }) => (
              <div key={region}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${color.badge}`} />
                  <p className={`text-xs font-black uppercase tracking-wide ${color.text}`}>{color.label}</p>
                  <div className="flex-1 h-px bg-gray-200" />
                  <p className="text-xs text-gray-400">
                    {items.filter(p => isOwnedByMe(p.name)).length}/{items.length} sở hữu
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {items.map(renderPropertyCard)}
                </div>
              </div>
            ))}

            {/* Bến tàu */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <p className="text-xs font-black uppercase tracking-wide text-amber-700">Bến Tàu</p>
                <div className="flex-1 h-px bg-gray-200" />
                <p className="text-xs text-gray-400">
                  {stations.filter(p => isOwnedByMe(p.name)).length}/{stations.length} sở hữu
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {stations.map(renderPropertyCard)}
              </div>
            </div>

            {/* Dịch trạm */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <p className="text-xs font-black uppercase tracking-wide text-purple-700">Dịch Trạm</p>
                <div className="flex-1 h-px bg-gray-200" />
                <p className="text-xs text-gray-400">
                  {services.filter(p => isOwnedByMe(p.name)).length}/{services.length} sở hữu
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {services.map(renderPropertyCard)}
              </div>
            </div>
          </>
        )}

        {/* ══ TAB: BÁN TÀI SẢN ══ */}
        {activeTab === 'sell' && (
          <div className="bg-white rounded-xl shadow border-t-4 border-red-600 p-5">
            <h3 className="font-black text-lg text-red-800 mb-4">🏦 Bán / Cầm Cố Tài Sản</h3>
            <p className="text-xs text-gray-500 mb-4">
              💡 Cấp 1–3: bán công trình, giảm 1 cấp. Cấp 0: bán đất, mất quyền sở hữu.
            </p>
            {Object.keys(myProperties).length === 0 ? (
              <p className="text-gray-400 italic text-center py-8">Chưa có tài sản để bán.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(myProperties).map(([name, level]) => {
                  const property = propertiesData.find(p => p.name === name);
                  if (!property) return null;
                  let sellAmt;
                  if (property.type === 'station' || property.type === 'service') {
                    sellAmt = property.mortgage;
                  } else if (level === 0) {
                    sellAmt = property.mortgage;
                  } else {
                    sellAmt = property.levels[level]?.sellValue || 0;
                  }
                  return (
                    <div key={name} className="border rounded-xl p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-black text-gray-800">{name}</p>
                        <p className="text-xs text-gray-500">
                          {property.type === 'property' ? `Cấp ${level}` : 'Sở hữu'} · Thu về {sellAmt} Quan
                        </p>
                      </div>
                      <button
                        onClick={() => handleSellAsset(name)}
                        disabled={isFrozen || !isGameOn}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-700 disabled:bg-gray-300 shrink-0"
                      >Bán</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: CHUYỂN TIỀN ══ */}
        {activeTab === 'transfer' && (
          <div className="bg-white rounded-xl shadow border-t-4 border-amber-500 p-5">
            <h3 className="font-black text-lg text-amber-800 mb-4">💰 Chuyển Tiền</h3>
            <select
              value={targetPlayerId}
              onChange={e => setTargetPlayerId(e.target.value)}
              disabled={isFrozen || !isGameOn}
              className="w-full p-3 border rounded-xl mb-3 bg-stone-50 disabled:bg-gray-100"
            >
              <option value="">-- Chọn người nhận --</option>
              {Object.entries(roomData.players)
                .filter(([id]) => id !== playerId)
                .map(([id, pl]) => (
                  <option key={id} value={id}>{pl.name}</option>
                ))}
            </select>
            <input
              type="number" min="1" placeholder="Nhập số Quan..."
              value={transferAmount} onChange={e => setTransferAmount(e.target.value)}
              disabled={isFrozen || !isGameOn}
              className="w-full p-3 border rounded-xl mb-3 bg-stone-50 disabled:bg-gray-100"
            />
            <button
              onClick={handleTransfer}
              disabled={isFrozen || !isGameOn}
              className="w-full bg-amber-600 text-white font-bold py-3 rounded-xl hover:bg-amber-700 disabled:bg-gray-400"
            >💰 Chuyển ngay</button>
          </div>
        )}
      </div>

      {/* ─── QUESTION MODAL ─── */}
      <QuestionModal
        isOpen={isModalOpen && !answerResult}
        questionData={currentQuestion}
        onAnswer={handleAnswer}
      />

      {/* ─── KẾT QUẢ TRẢ LỜI ─── */}
      {answerResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className={`p-6 text-center text-white ${answerResult.isCorrect ? 'bg-green-600' : 'bg-red-600'}`}>
              <div className="text-6xl mb-2">{answerResult.isCorrect ? '🎉' : '😢'}</div>
              <h2 className="text-2xl font-black">{answerResult.isCorrect ? 'TRẢ LỜI CHÍNH XÁC!' : 'TRẢ LỜI SAI!'}</h2>
            </div>
            <div className="p-5 space-y-4">
              {!answerResult.isCorrect && (
                <>
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-center">
                    <p className="text-xs text-red-500 font-bold">HÌNH PHẠT</p>
                    <p className="text-4xl font-black text-red-700">-{answerResult.penalty} Quan</p>
                    <p className="text-xs text-red-400 mt-1">Mức phạt ngẫu nhiên 5–50 Quan</p>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <p className="text-xs text-red-500 font-bold">CÂU TRẢ LỜI CỦA NGÀI</p>
                      <p className="font-bold text-red-800 mt-1">❌ {answerResult.selectedAnswer}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <p className="text-xs text-green-600 font-bold">ĐÁP ÁN ĐÚNG</p>
                      <p className="font-bold text-green-800 mt-1">✅ {answerResult.correctAnswer}</p>
                    </div>
                  </div>
                </>
              )}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📖</span>
                  <h3 className="font-black text-amber-800">GIẢI THÍCH</h3>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">{answerResult.explanation || 'Không có giải thích.'}</p>
              </div>
              <button
                onClick={handleContinueAfterResult}
                className={`w-full py-3 rounded-xl text-white font-black text-lg ${
                  answerResult.isCorrect ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {answerResult.isCorrect ? '🏯 Nhận đất / Nâng cấp' : '⚔️ Tiếp tục'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerPage;