import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase.config';
import { ref, onValue, update, set } from 'firebase/database';
import toast from 'react-hot-toast';
import { propertiesData } from '../data/properties';
import { questionsData } from '../data/questions';
import QuestionModal from '../components/QuestionModal';

const PENALTY_MIN = 5;
const PENALTY_MAX = 50;

const PlayerPage = () => {
  const navigate = useNavigate();

  const roomId = localStorage.getItem('ignite_roomId');
  const playerId = localStorage.getItem('ignite_playerId');

  const [roomData, setRoomData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [targetPlayerId, setTargetPlayerId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);

  const [handledRequestId, setHandledRequestId] = useState(null);

  // =====================================================
  // KẾT QUẢ TRẢ LỜI
  // =====================================================

  const [answerResult, setAnswerResult] = useState(null);

  /*
    answerResult có dạng:

    {
      isCorrect: true/false,
      penalty: 0 hoặc 5-50,
      explanation: "...",
      correctAnswer: "...",
      selectedAnswer: "..."
    }
  */

  // =====================================================
  // FIREBASE LẮNG NGHE DATA & RANDOM CÂU HỎI
  // =====================================================

  useEffect(() => {
    if (!roomId || !playerId) {
      navigate('/');
      return;
    }

    const roomRef = ref(db, `rooms/${roomId}`);

    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        toast.error('Phòng không tồn tại!');
        navigate('/');
        return;
      }

      if (!data.players || !data.players[playerId]) {
        toast.error('Bạn đã bị xóa khỏi phòng!');

        localStorage.removeItem('ignite_roomId');
        localStorage.removeItem('ignite_playerId');

        navigate('/');
        return;
      }

      setRoomData(data);

      // =====================================================
      // XỬ LÝ REQUEST
      // =====================================================

      const request = data.pendingRequest;

      if (!request || request.playerId !== playerId) {
        return;
      }

      // =====================================================
      // ADMIN ĐÃ DUYỆT
      // =====================================================

      if (request.status === 'approved') {
        const requestId = String(
          request.timestamp ||
          request.createdAt ||
          request.id ||
          ''
        );

        // Không xử lý lại request cũ
        if (handledRequestId === requestId) {
          return;
        }

        // ===================================================
        // NẾU FIREBASE ĐÃ CÓ QUESTION ID
        // ===================================================

        if (
          request.questionId !== null &&
          request.questionId !== undefined
        ) {
          const existingQuestion = questionsData.find(
            (question) =>
              String(question.id) ===
              String(request.questionId)
          );

          if (!existingQuestion) {
            console.error(
              'Không tìm thấy questionId:',
              request.questionId
            );

            toast.error('Không tìm thấy câu hỏi!');
            return;
          }

          console.log(
            '📖 Sử dụng câu hỏi đã lưu:',
            existingQuestion.id
          );

          setCurrentQuestion(existingQuestion);
          setHandledRequestId(requestId);
          setIsModalOpen(true);

          update(
            ref(
              db,
              `rooms/${roomId}/pendingRequest`
            ),
            {
              status: 'answering'
            }
          );

          toast.success(
            '👑 Triều đình đã duyệt! Hãy trả lời câu hỏi.'
          );

          return;
        }

        // ===================================================
        // RANDOM CÂU HỎI
        // ===================================================

        if (
          !questionsData ||
          questionsData.length === 0
        ) {
          toast.error(
            '❌ Bộ câu hỏi đang trống!'
          );
          return;
        }

        const randomIndex = Math.floor(
          Math.random() *
          questionsData.length
        );

        const randomQuestion =
          questionsData[randomIndex];

        if (!randomQuestion) {
          toast.error(
            '❌ Không bốc được câu hỏi!'
          );
          return;
        }

        console.log(
          '🎲 RANDOM CÂU HỎI:',
          {
            index: randomIndex,
            id: randomQuestion.id,
            question:
              randomQuestion.question
          }
        );

        // ===================================================
        // LƯU QUESTION ID VÀO FIREBASE
        // ===================================================

        update(
          ref(
            db,
            `rooms/${roomId}/pendingRequest`
          ),
          {
            questionId: randomQuestion.id,
            status: 'answering'
          }
        )
          .then(() => {
            console.log(
              '✅ Đã lưu questionId:',
              randomQuestion.id
            );
          })
          .catch((error) => {
            console.error(
              '❌ Không thể lưu questionId:',
              error
            );
          });

        // ===================================================
        // HIỆN CÂU HỎI
        // ===================================================

        setCurrentQuestion(randomQuestion);
        setHandledRequestId(requestId);
        setIsModalOpen(true);

        toast.success(
          '👑 Triều đình đã duyệt! Hãy trả lời câu hỏi.'
        );
      }

      // =====================================================
      // ADMIN TỪ CHỐI
      // =====================================================

      if (request.status === 'rejected') {
        toast.error(
          '📜 Sớ tấu đã bị bác bỏ!'
        );

        setSelectedProperty('');

        setCurrentQuestion(null);
        setIsModalOpen(false);
        setAnswerResult(null);
        setHandledRequestId(null);

        set(
          ref(
            db,
            `rooms/${roomId}/pendingRequest`
          ),
          null
        );
      }
    });

    return () => unsubscribe();

  }, [
    roomId,
    playerId,
    navigate,
    handledRequestId
  ]);

  // =====================================================
  // TIMER
  // =====================================================

  useEffect(() => {
    let interval;

    if (roomData?.timer?.isRunning) {
      interval = setInterval(() => {
        const remain = Math.max(
          0,
          Math.floor(
            (
              roomData.timer.endTime -
              Date.now()
            ) / 1000
          )
        );

        setTimeLeft(remain);
      }, 1000);

    } else if (roomData?.timer) {
      setTimeLeft(
        roomData.timer.timeLeft
      );
    }

    return () =>
      clearInterval(interval);

  }, [roomData?.timer]);

  // =====================================================
  // MY INFO
  // =====================================================

  const myInfo =
    roomData?.players?.[playerId] ??
    null;

  const isFrozen =
    Boolean(myInfo?.isFrozen);

  const myProperties = useMemo(() => {
    if (
      !myInfo?.properties ||
      Array.isArray(myInfo.properties)
    ) {
      return {};
    }

    return myInfo.properties;
  }, [myInfo?.properties]);

  const myAssetValue = useMemo(() => {
    let total = 0;

    Object.entries(myProperties).forEach(
      ([propertyName, rawLevel]) => {

        const property =
          propertiesData.find(
            (p) =>
              p.name === propertyName
          );

        if (!property) return;

        const level =
          Number(rawLevel) || 0;

        if (
          property.type === 'station' ||
          property.type === 'service'
        ) {
          total += property.price;
          return;
        }

        total += property.price;

        for (
          let i = 1;
          i <= level;
          i++
        ) {
          total +=
            property.levels?.[i]
              ?.upgradeCost || 0;
        }
      }
    );

    return total;

  }, [myProperties]);

  const totalWealth =
    (Number(myInfo?.money) || 0) +
    myAssetValue;

  const sellableAssets = useMemo(() => {

    return Object.entries(myProperties)
      .map(
        ([propertyName, rawLevel]) => {

          const property =
            propertiesData.find(
              (p) =>
                p.name === propertyName
            );

          if (!property) return null;

          const level =
            Number(rawLevel) || 0;

          if (
            property.type === 'station' ||
            property.type === 'service'
          ) {
            return {
              property,
              level,
              sellAmount:
                property.mortgage,
              action: 'sell'
            };
          }

          if (level === 0) {
            return {
              property,
              level,
              sellAmount:
                property.mortgage,
              action: 'sell-land'
            };
          }

          const levelInfo =
            property.levels[level];

          return {
            property,
            level,
            sellAmount:
              levelInfo.sellValue,
            action: 'sell-building'
          };
        }
      )
      .filter(Boolean);

  }, [myProperties]);

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================

  const getOwnerId = (propertyName) => {

    if (!roomData?.players) {
      return null;
    }

    const entry =
      Object.entries(roomData.players)
        .find(
          ([, player]) =>
            player.properties &&
            !Array.isArray(
              player.properties
            ) &&
            Object.prototype.hasOwnProperty.call(
              player.properties,
              propertyName
            )
        );

    return entry ? entry[0] : null;
  };

  const isOwnedByOther = (
    propertyName
  ) => {

    const ownerId =
      getOwnerId(propertyName);

    return (
      ownerId &&
      ownerId !== playerId
    );
  };

  const getPropertyAction = (
    property,
    level
  ) => {

    if (
      property.type === 'property'
    ) {

      if (level === 0) {
        return {
          type: 'buy',
          label: 'Mua đất',
          cost: property.price
        };
      }

      if (level < 3) {

        const nextLevel =
          level + 1;

        const next =
          property.levels[
            nextLevel
          ];

        return {
          type:
            `upgrade${nextLevel}`,
          label:
            `Nâng cấp → ${next.name}`,
          cost:
            next.upgradeCost
        };
      }

      return {
        type: 'max',
        label:
          'Đã đạt cấp tối đa',
        cost: 0
      };
    }

    return {
      type: 'buy',
      label: 'Mua',
      cost: property.price
    };
  };

  const formatTimer = (
    seconds
  ) => {

    if (
      seconds === null ||
      seconds === undefined
    ) {
      return '0:00';
    }

    if (seconds <= 0) {
      return '0:00';
    }

    return `${Math.floor(
      seconds / 60
    )}:${String(
      seconds % 60
    ).padStart(2, '0')}`;
  };

  // =====================================================
  // TRÌNH TẤU
  // =====================================================

  const handleRequestAction =
    async () => {

      if (isFrozen) {
        toast.error(
          '❄️ Ngài đang bị đóng băng!'
        );
        return;
      }

      if (
        !roomData?.timer?.isRunning
      ) {
        toast.error(
          '⏸️ Trò chơi chưa bắt đầu!'
        );
        return;
      }

      if (
        roomData.pendingRequest
      ) {
        toast.error(
          '📜 Hiện đang có một sớ được xử lý!'
        );
        return;
      }

      if (!selectedProperty) {
        toast.error(
          'Vui lòng chọn địa danh!'
        );
        return;
      }

      const property =
        propertiesData.find(
          (p) =>
            p.name ===
            selectedProperty
        );

      if (!property) {
        toast.error(
          'Không tìm thấy địa danh!'
        );
        return;
      }

      const level =
        Number(
          myProperties[
            selectedProperty
          ]
        ) || 0;

      if (
        level === 0 &&
        isOwnedByOther(
          selectedProperty
        )
      ) {
        toast.error(
          '🏰 Địa danh này đã có chủ!'
        );
        return;
      }

      const action =
        getPropertyAction(
          property,
          level
        );

      if (
        action.type === 'max'
      ) {
        toast.error(
          'Địa danh đã đạt cấp tối đa!'
        );
        return;
      }

      const cost =
        Number(action.cost) || 0;

      const money =
        Number(myInfo.money) || 0;

      if (money < cost) {
        toast.error(
          `💰 Cần ${cost} Quan! Ngân khố hiện tại: ${money} Quan.`
        );
        return;
      }

      const request = {
        playerId,
        property:
          selectedProperty,
        type:
          action.type,
        cost,
        status:
          'pending',

        // Chưa có câu hỏi
        questionId:
          null,

        createdAt:
          Date.now()
      };

      try {

        await update(
          ref(db),
          {
            [`rooms/${roomId}/pendingRequest`]:
              request
          }
        );

        toast.success(
          '📜 Gửi tấu thành công! Đang chờ Triều đình phê duyệt.',
          {
            duration: 5000
          }
        );

      } catch (error) {

        console.error(error);

        toast.error(
          '❌ Gửi tấu thất bại!'
        );
      }
    };

  // =====================================================
  // TRẢ LỜI CÂU HỎI
  // =====================================================

  const handleAnswer = async (
    selectedIndex
  ) => {

    if (
      !currentQuestion ||
      !roomData?.pendingRequest
    ) {
      return;
    }

    const request =
      roomData.pendingRequest;

    if (
      request.playerId !== playerId
    ) {
      return;
    }

    // Đóng cửa sổ câu hỏi
    setIsModalOpen(false);

    const money =
      Number(myInfo.money) || 0;

    // ===================================================
    // KIỂM TRA ĐÚNG / SAI
    // ===================================================

    const isCorrect =
      selectedIndex ===
      currentQuestion.correctAnswer;

    // ===================================================
    // CÂU TRẢ LỜI CỦA NGƯỜI CHƠI
    // ===================================================

    const selectedAnswer =
      currentQuestion.options?.[
        selectedIndex
      ] ?? 'Không xác định';

    const correctAnswer =
      currentQuestion.options?.[
        currentQuestion.correctAnswer
      ] ?? 'Không xác định';

    // ===================================================
    // NẾU SAI → RANDOM 5-50 QUAN
    // ===================================================

    if (!isCorrect) {

      const penalty =
        Math.floor(
          Math.random() *
          (
            PENALTY_MAX -
            PENALTY_MIN +
            1
          )
        ) +
        PENALTY_MIN;

      const newMoney =
        Math.max(
          0,
          money - penalty
        );

      try {

        await update(
          ref(db),
          {
            [`rooms/${roomId}/players/${playerId}/money`]:
              newMoney
          }
        );

        // =================================================
        // HIỆN KẾT QUẢ
        // =================================================

        setAnswerResult({
          isCorrect: false,
          penalty,
          explanation:
            currentQuestion.explanation ||
            'Không có phần giải thích cho câu hỏi này.',
          correctAnswer,
          selectedAnswer
        });

      } catch (error) {

        console.error(error);

        toast.error(
          'Không thể xử lý kết quả!'
        );
      }

      return;
    }

    // ===================================================
    // NẾU ĐÚNG
    // ===================================================

    const property =
      propertiesData.find(
        (p) =>
          p.name ===
          request.property
      );

    if (!property) {

      toast.error(
        'Không tìm thấy địa danh!'
      );

      return;
    }

    // ===================================================
    // HIỆN KẾT QUẢ ĐÚNG TRƯỚC
    // ===================================================

    setAnswerResult({
      isCorrect: true,
      penalty: 0,
      explanation:
        currentQuestion.explanation ||
        'Chính xác! Bạn đã trả lời đúng.',
      correctAnswer,
      selectedAnswer
    });

    /*
      Chưa thực hiện mua/nâng cấp ngay.

      Việc mua/nâng cấp sẽ được thực hiện
      khi người chơi bấm "Tiếp tục".
    */
  };

  // =====================================================
  // TIẾP TỤC SAU KHI XEM KẾT QUẢ
  // =====================================================

  const handleContinueAfterResult =
    async () => {

      if (!answerResult) {
        return;
      }

      // ===================================================
      // SAI
      // ===================================================

      if (!answerResult.isCorrect) {

        try {

          await set(
            ref(
              db,
              `rooms/${roomId}/pendingRequest`
            ),
            null
          );

        } catch (error) {

          console.error(error);

          toast.error(
            'Không thể kết thúc lượt!'
          );

          return;
        }

        toast.error(
          `❌ Trả lời sai! Bạn bị trừ ${answerResult.penalty} Quan.`,
          {
            duration: 4000
          }
        );

        setAnswerResult(null);
        setCurrentQuestion(null);
        setHandledRequestId(null);
        setSelectedProperty('');

        return;
      }

      // ===================================================
      // ĐÚNG
      // ===================================================

      const request =
        roomData?.pendingRequest;

      if (!request) {
        setAnswerResult(null);
        return;
      }

      const property =
        propertiesData.find(
          (p) =>
            p.name ===
            request.property
        );

      if (!property) {

        toast.error(
          'Không tìm thấy địa danh!'
        );

        return;
      }

      const currentLevel =
        Number(
          myProperties[
            request.property
          ]
        ) || 0;

      const action =
        getPropertyAction(
          property,
          currentLevel
        );

      const cost =
        Number(action.cost) || 0;

      const money =
        Number(myInfo.money) || 0;

      if (money < cost) {

        toast.error(
          'Ngân khố không đủ để thực hiện giao dịch!'
        );

        return;
      }

      // Mua đất → level 0
      // Nâng cấp → +1
      const newLevel =
        action.type === 'buy'
          ? 0
          : currentLevel + 1;

      try {

        await update(
          ref(db),
          {
            [`rooms/${roomId}/players/${playerId}/money`]:
              money - cost,

            [`rooms/${roomId}/players/${playerId}/properties/${request.property}`]:
              newLevel
          }
        );

        await set(
          ref(
            db,
            `rooms/${roomId}/pendingRequest`
          ),
          null
        );

        toast.success(
          `🎉 Chính xác! ${property.name} đã được ${
            currentLevel === 0
              ? 'sở hữu'
              : 'nâng cấp'
          }.`,
          {
            duration: 5000
          }
        );

      } catch (error) {

        console.error(error);

        toast.error(
          'Không thể hoàn tất giao dịch!'
        );

        return;
      }

      setAnswerResult(null);
      setCurrentQuestion(null);
      setHandledRequestId(null);
      setSelectedProperty('');
    };

  // =====================================================
  // BÁN TÀI SẢN
  // =====================================================

  const handleSellAsset = async (
    propertyName
  ) => {

    if (isFrozen) {
      toast.error(
        '❄️ Ngài đang bị đóng băng!'
      );
      return;
    }

    if (
      !roomData?.timer?.isRunning
    ) {
      toast.error(
        '⏸️ Trò chơi chưa bắt đầu!'
      );
      return;
    }

    const property =
      propertiesData.find(
        (p) =>
          p.name === propertyName
      );

    if (!property) {
      toast.error(
        'Không tìm thấy tài sản!'
      );
      return;
    }

    const currentLevel =
      Number(
        myProperties[propertyName]
      ) || 0;

    const money =
      Number(myInfo.money) || 0;

    let sellAmount = 0;
    let message = '';

    if (
      property.type === 'station' ||
      property.type === 'service'
    ) {

      sellAmount =
        property.mortgage;

      message =
        `Đã bán ${property.name}`;

    } else if (
      currentLevel === 0
    ) {

      sellAmount =
        property.mortgage;

      message =
        `Đã bán đất ${property.name}`;

    } else {

      sellAmount =
        property.levels[
          currentLevel
        ]?.sellValue || 0;

      message =
        `Đã bán công trình Cấp ${currentLevel} của ${property.name}`;
    }

    if (sellAmount <= 0) {

      toast.error(
        'Tài sản này không có giá bán hợp lệ!'
      );

      return;
    }

    if (
      property.type === 'property'
    ) {

      if (
        currentLevel === 0
      ) {

        if (
          !window.confirm(
            `Bán ${property.name} với giá ${sellAmount} Quan?`
          )
        ) {
          return;
        }

        try {

          await update(
            ref(db),
            {
              [`rooms/${roomId}/players/${playerId}/money`]:
                money + sellAmount,

              [`rooms/${roomId}/players/${playerId}/properties/${propertyName}`]:
                null
            }
          );

          toast.success(
            `💰 ${message}: +${sellAmount} Quan`
          );

        } catch {

          toast.error(
            'Không thể bán tài sản!'
          );
        }

        return;
      }

      if (
        !window.confirm(
          `Bán công trình Cấp ${currentLevel} của ${property.name} với giá ${sellAmount} Quan?`
        )
      ) {
        return;
      }

      try {

        await update(
          ref(db),
          {
            [`rooms/${roomId}/players/${playerId}/money`]:
              money + sellAmount,

            [`rooms/${roomId}/players/${playerId}/properties/${propertyName}`]:
              currentLevel - 1
          }
        );

        toast.success(
          `💰 ${message}: +${sellAmount} Quan`
        );

      } catch {

        toast.error(
          'Không thể bán công trình!'
        );
      }

      return;
    }

    if (
      !window.confirm(
        `Bán ${property.name} với giá ${sellAmount} Quan?`
      )
    ) {
      return;
    }

    try {

      await update(
        ref(db),
        {
          [`rooms/${roomId}/players/${playerId}/money`]:
            money + sellAmount,

          [`rooms/${roomId}/players/${playerId}/properties/${propertyName}`]:
            null
        }
      );

      toast.success(
        `💰 Đã bán ${property.name}: +${sellAmount} Quan`
      );

    } catch {

      toast.error(
        'Không thể bán tài sản!'
      );
    }
  };

  // =====================================================
  // CHUYỂN TIỀN
  // =====================================================

  const handleTransfer = async () => {

    const amount =
      parseInt(
        transferAmount,
        10
      );

    if (
      !targetPlayerId ||
      isNaN(amount) ||
      amount <= 0
    ) {

      toast.error(
        'Nhập số Quan hợp lệ!'
      );

      return;
    }

    const money =
      Number(myInfo.money) || 0;

    if (amount > money) {

      toast.error(
        'Không đủ Quan!'
      );

      return;
    }

    const target =
      roomData.players[
        targetPlayerId
      ];

    if (!target) {

      toast.error(
        'Không tìm thấy người nhận!'
      );

      return;
    }

    try {

      await update(
        ref(db),
        {
          [`rooms/${roomId}/players/${playerId}/money`]:
            money - amount,

          [`rooms/${roomId}/players/${targetPlayerId}/money`]:
            (Number(target.money) || 0) +
            amount
        }
      );

      toast.success(
        `💰 Đã chuyển ${amount} Quan cho ${target.name}!`
      );

      setTransferAmount('');
      setTargetPlayerId('');

    } catch {

      toast.error(
        'Không thể chuyển tiền!'
      );
    }
  };

  // =====================================================
  // CONDITIONAL RETURNS
  // =====================================================

  if (!roomData) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">

        <div className="bg-white p-8 rounded-xl shadow text-center">

          <div className="text-4xl">
            🏯
          </div>

          <p className="font-bold mt-3">
            Đang vào triều...
          </p>

        </div>

      </div>
    );
  }

  if (!myInfo) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">

        <div className="bg-white p-8 rounded-xl shadow text-center">

          <div className="text-4xl">
            🏯
          </div>

          <p className="font-bold mt-3">
            Đang vào triều...
          </p>

        </div>

      </div>
    );
  }

  if (timeLeft === 0) {

    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-6">

        <div className="bg-yellow-100 p-8 rounded-xl shadow-2xl border-8 border-yellow-500 text-center max-w-md w-full">

          <h1 className="text-5xl font-black text-red-700 mb-4">
            HẾT GIỜ!
          </h1>

          <p className="text-xl font-bold">
            Trò chơi đã kết thúc.
          </p>

          <div className="bg-white p-5 rounded-lg mt-5">

            <p>
              Tiền mặt
            </p>

            <p className="text-4xl font-black text-amber-600">
              {myInfo.money} Quan
            </p>

            <p className="mt-4">
              Tổng tài sản
            </p>

            <p className="text-3xl font-black text-blue-700">
              {totalWealth} Quan
            </p>

          </div>

        </div>

      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      className={`min-h-screen bg-stone-100 pb-10 ${
        isFrozen
          ? 'grayscale'
          : ''
      }`}
    >

      {/* HEADER */}

      <div className="bg-red-800 text-white p-6 rounded-b-3xl shadow-lg">

        <div className="flex justify-between items-start">

          <div>

            <p className="text-sm text-red-200">
              ĐẠI NHÂN
            </p>

            <h2 className="text-2xl font-black">
              {myInfo.name}
            </h2>

            <p className="text-4xl font-black text-yellow-400 mt-2">
              {myInfo.money}
              <span className="text-xl">
                {' '}Quan
              </span>
            </p>

          </div>

          <div className="text-right">

            <div className="bg-white text-red-800 px-3 py-1 rounded-full font-bold text-sm">
              PHÒNG {roomId}
            </div>

            <div className="text-yellow-300 font-black text-xl mt-2">
              ⏳ {formatTimer(timeLeft)}
            </div>

          </div>

        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">

          <div className="bg-black/20 p-3 rounded-lg">

            <p className="text-xs text-red-200">
              GIÁ TRỊ TÀI SẢN
            </p>

            <p className="text-2xl font-black text-green-300">
              {myAssetValue} Quan
            </p>

          </div>

          <div className="bg-black/20 p-3 rounded-lg">

            <p className="text-xs text-red-200">
              TỔNG TÀI SẢN
            </p>

            <p className="text-2xl font-black text-yellow-300">
              {totalWealth} Quan
            </p>

          </div>

        </div>

        {!roomData?.timer?.isRunning &&
          timeLeft > 0 && (

            <div className="mt-3 bg-black/20 p-3 rounded text-center font-bold text-yellow-200">
              ⏸️ TRÒ CHƠI ĐANG TẠM DỪNG
            </div>

          )}

        {isFrozen && (

          <div className="mt-3 bg-blue-900/50 p-3 rounded text-center font-bold text-blue-200">
            ❄️ NGÀI ĐANG BỊ ĐÓNG BĂNG
          </div>

        )}

      </div>

      {/* CONTENT */}

      <div className="max-w-3xl mx-auto p-4 space-y-6">

        {/* MUA / NÂNG CẤP */}

        <div className="bg-white p-5 rounded-xl shadow border-t-4 border-blue-600">

          <h3 className="font-black text-xl text-blue-800 mb-4">
            🗺️ Khai Hoang / Nâng Cấp
          </h3>

          <select
            value={
              selectedProperty
            }
            onChange={(e) =>
              setSelectedProperty(
                e.target.value
              )
            }
            disabled={
              isFrozen ||
              !roomData?.timer?.isRunning ||
              Boolean(
                roomData.pendingRequest
              )
            }
            className="w-full p-3 border rounded-lg bg-stone-50 disabled:bg-gray-200"
          >

            <option value="">
              -- Chọn địa danh --
            </option>

            {propertiesData.map(
              (property) => {

                const level =
                  Number(
                    myProperties[
                      property.name
                    ]
                  ) || 0;

                const otherOwner =
                  isOwnedByOther(
                    property.name
                  );

                const action =
                  getPropertyAction(
                    property,
                    level
                  );

                if (
                  otherOwner &&
                  level === 0
                ) {

                  return (
                    <option
                      key={
                        property.id
                      }
                      value={
                        property.name
                      }
                      disabled
                    >
                      {property.name}
                      {' '} - ĐÃ CÓ CHỦ
                    </option>
                  );
                }

                return (
                  <option
                    key={
                      property.id
                    }
                    value={
                      property.name
                    }
                    disabled={
                      action.type ===
                      'max'
                    }
                  >
                    {property.name}
                    {' '} - {
                      action.label
                    }

                    {action.cost > 0
                      ? ` - ${action.cost} Quan`
                      : ''}
                  </option>
                );
              }
            )}

          </select>

          <button
            onClick={
              handleRequestAction
            }
            disabled={
              isFrozen ||
              !roomData?.timer?.isRunning ||
              Boolean(
                roomData.pendingRequest
              )
            }
            className="w-full mt-3 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {roomData.pendingRequest
              ? '📜 Đang có sớ được xử lý...'
              : '📜 Trình Tấu Yêu Cầu'}
          </button>

          {roomData?.pendingRequest
            ?.playerId === playerId && (

            <div className="mt-4">

              {roomData.pendingRequest
                .status ===
                'pending' && (

                <div className="bg-yellow-50 border-2 border-yellow-300 p-4 rounded-lg text-center">

                  <div className="text-3xl">
                    📜
                  </div>

                  <p className="font-black text-yellow-800">
                    ĐÃ GỬI TẤU THÀNH CÔNG
                  </p>

                  <p className="text-sm">
                    Đang chờ Triều đình phê duyệt...
                  </p>

                </div>
              )}

              {roomData.pendingRequest
                .status ===
                'answering' && (

                <div className="bg-blue-50 border-2 border-blue-300 p-4 rounded-lg text-center">

                  <div className="text-3xl">
                    📝
                  </div>

                  <p className="font-black text-blue-800">
                    HÃY TRẢ LỜI CÂU HỎI
                  </p>

                </div>
              )}

            </div>
          )}

        </div>

        {/* BÁN TÀI SẢN */}

        <div className="bg-white p-5 rounded-xl shadow border-t-4 border-red-600">

          <h3 className="font-black text-xl text-red-800 mb-4">
            🏦 Bán / Cầm Cố Tài Sản
          </h3>

          {sellableAssets.length === 0 ? (

            <p className="text-gray-500 italic">
              Chưa có tài sản để bán.
            </p>

          ) : (

            <div className="space-y-3">

              {sellableAssets.map(
                ({
                  property,
                  level,
                  sellAmount,
                  action
                }) => (

                  <div
                    key={
                      property.id
                    }
                    className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >

                    <div>

                      <p className="font-black text-gray-800">
                        {property.name}
                      </p>

                      <p className="text-sm text-gray-500">

                        {property.type ===
                        'property'
                          ? `Cấp ${level}`
                          : 'Sở hữu'}

                      </p>

                    </div>

                    <div className="flex items-center gap-3">

                      <span className="font-black text-green-700">
                        +{sellAmount} Quan
                      </span>

                      <button
                        onClick={() =>
                          handleSellAsset(
                            property.name
                          )
                        }
                        disabled={
                          isFrozen ||
                          !roomData?.timer?.isRunning
                        }
                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 disabled:bg-gray-400"
                      >
                        {action ===
                        'sell-building'
                          ? `Bán Cấp ${level}`
                          : 'Bán'}
                      </button>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

          <p className="text-xs text-gray-500 mt-4">
            💡 Cấp 1–3: bán công trình và giảm xuống 1 cấp. Cấp 0: bán đất và mất quyền sở hữu.
          </p>

        </div>

        {/* CHUYỂN TIỀN */}

        <div className="bg-white p-5 rounded-xl shadow border-t-4 border-amber-500">

          <h3 className="font-black text-xl text-amber-800 mb-4">
            💰 Chuyển Tiền
          </h3>

          <select
            value={
              targetPlayerId
            }
            onChange={(e) =>
              setTargetPlayerId(
                e.target.value
              )
            }
            disabled={
              isFrozen ||
              !roomData?.timer?.isRunning
            }
            className="w-full p-3 border rounded-lg mb-3"
          >

            <option value="">
              -- Chọn người nhận --
            </option>

            {Object.entries(
              roomData.players
            )
              .filter(
                ([id]) =>
                  id !== playerId
              )
              .map(
                ([id, player]) => (

                  <option
                    key={id}
                    value={id}
                  >
                    {player.name}
                  </option>

                )
              )}

          </select>

          <input
            type="number"
            min="1"
            placeholder="Nhập số Quan..."
            value={
              transferAmount
            }
            onChange={(e) =>
              setTransferAmount(
                e.target.value
              )
            }
            disabled={
              isFrozen ||
              !roomData?.timer?.isRunning
            }
            className="w-full p-3 border rounded-lg mb-3"
          />

          <button
            onClick={
              handleTransfer
            }
            disabled={
              isFrozen ||
              !roomData?.timer?.isRunning
            }
            className="w-full bg-amber-600 text-white font-bold py-3 rounded-lg hover:bg-amber-700 disabled:bg-gray-400"
          >
            💰 Chuyển ngay
          </button>

        </div>

        {/* CƠ NGHIỆP */}

        <div className="bg-white p-5 rounded-xl shadow border-t-4 border-green-600">

          <h3 className="font-black text-xl text-green-800 mb-4">
            🏰 Cơ Nghiệp
          </h3>

          {Object.keys(
            myProperties
          ).length === 0 ? (

            <p className="text-gray-500 italic">
              Chưa có tấc đất cắm dùi.
            </p>

          ) : (

            <div className="space-y-2">

              {Object.entries(
                myProperties
              ).map(
                ([propertyName, level]) => {

                  const property =
                    propertiesData.find(
                      (p) =>
                        p.name ===
                        propertyName
                    );

                  return (

                    <div
                      key={
                        propertyName
                      }
                      className="flex justify-between items-center bg-green-50 p-3 rounded-lg border border-green-200"
                    >

                      <div>

                        <p className="font-bold text-green-800">
                          {propertyName}
                        </p>

                        <p className="text-xs text-gray-500">

                          {property?.type ===
                          'property'
                            ? `Phí thông hành: ${
                                property
                                  .levels?.[
                                  level
                                ]
                                  ?.passageFee ??
                                0
                              } Quan`
                            : 'Tài sản đặc biệt'}

                        </p>

                      </div>

                      <span className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-bold">

                        {property?.type ===
                        'property'
                          ? `Cấp ${level}`
                          : 'Sở hữu'}

                      </span>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>

      </div>

      {/* =====================================================
          QUESTION MODAL
          ===================================================== */}

      <QuestionModal
        isOpen={
          isModalOpen &&
          !answerResult
        }
        questionData={
          currentQuestion
        }
        onAnswer={
          handleAnswer
        }
      />

      {/* =====================================================
          KẾT QUẢ TRẢ LỜI
          ===================================================== */}

      {answerResult && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">

          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">

            {/* HEADER */}

            <div
              className={`p-6 text-center ${
                answerResult.isCorrect
                  ? 'bg-green-600'
                  : 'bg-red-600'
              } text-white`}
            >

              <div className="text-6xl mb-3">

                {answerResult.isCorrect
                  ? '🎉'
                  : '😢'}

              </div>

              <h2 className="text-3xl font-black">

                {answerResult.isCorrect
                  ? 'TRẢ LỜI CHÍNH XÁC!'
                  : 'TRẢ LỜI SAI!'}

              </h2>

              {answerResult.isCorrect ? (

                <p className="mt-2 text-green-100 font-bold">
                  Ngài đã vượt qua thử thách!
                </p>

              ) : (

                <p className="mt-2 text-red-100 font-bold">
                  Rất tiếc! Ngài đã bị trừ Quan.
                </p>

              )}

            </div>

            {/* BODY */}

            <div className="p-6">

              {/* SỐ QUAN BỊ TRỪ */}

              {!answerResult.isCorrect && (

                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-5 text-center">

                  <p className="text-sm text-red-600 font-bold uppercase">
                    Hình phạt
                  </p>

                  <p className="text-4xl font-black text-red-700 mt-1">
                    -{answerResult.penalty} Quan
                  </p>

                  <p className="text-xs text-red-500 mt-1">
                    Mức phạt ngẫu nhiên từ 5–50 Quan
                  </p>

                </div>

              )}

              {/* ĐÁP ÁN */}

              {!answerResult.isCorrect && (

                <div className="space-y-3 mb-5">

                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">

                    <p className="text-xs text-red-500 font-bold">
                      CÂU TRẢ LỜI CỦA NGÀI
                    </p>

                    <p className="font-bold text-red-800 mt-1">
                      ❌ {answerResult.selectedAnswer}
                    </p>

                  </div>

                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">

                    <p className="text-xs text-green-600 font-bold">
                      ĐÁP ÁN ĐÚNG
                    </p>

                    <p className="font-bold text-green-800 mt-1">
                      ✅ {answerResult.correctAnswer}
                    </p>

                  </div>

                </div>

              )}

              {/* GIẢI THÍCH */}

              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">

                <div className="flex items-center gap-2 mb-2">

                  <span className="text-2xl">
                    📖
                  </span>

                  <h3 className="font-black text-amber-800">
                    GIẢI THÍCH
                  </h3>

                </div>

                <p className="text-gray-700 leading-relaxed">

                  {answerResult.explanation ||
                    'Không có phần giải thích cho câu hỏi này.'}

                </p>

              </div>

              {/* BUTTON */}

              <button
                onClick={
                  handleContinueAfterResult
                }
                className={`w-full mt-6 py-3 rounded-xl text-white font-black text-lg ${
                  answerResult.isCorrect
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >

                {answerResult.isCorrect
                  ? '🏯 Tiếp tục — Nhận đất / Nâng cấp'
                  : '⚔️ Tiếp tục'}

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default PlayerPage;

