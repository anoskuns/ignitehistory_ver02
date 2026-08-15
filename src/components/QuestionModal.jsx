import React, { useState, useEffect } from 'react';

const QuestionModal = ({ isOpen, questionData, onAnswer }) => {
  const [timeLeft, setTimeLeft] = useState(15);

  // Hiệu ứng đếm ngược thời gian
  useEffect(() => {
    if (!isOpen) return; // Nếu modal không mở thì không đếm

    setTimeLeft(15); // Reset lại 15 giây mỗi lần mở
    
    // Tạo bộ đếm giảm 1 mỗi giây
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          onAnswer(-1); // Truyền -1 nghĩa là HẾT GIỜ (Sai)
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    // Dọn dẹp bộ đếm khi đóng modal
    return () => clearInterval(timer);
  }, [isOpen, questionData]); // Chạy lại khi trạng thái mở hoặc câu hỏi thay đổi

  // Nếu không mở Modal thì không hiển thị gì cả
  if (!isOpen || !questionData) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl relative border-4 border-amber-600">
        
        {/* Đồng hồ */}
        <div className={`absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center font-black text-xl text-white shadow-lg border-2 border-white ${timeLeft <= 5 ? 'bg-red-600 animate-pulse' : 'bg-blue-600'}`}>
          {timeLeft}
        </div>

        <h3 className="text-xl font-bold text-center mt-4 mb-6 text-gray-800">
          {questionData.question}
        </h3>

        <div className="space-y-3">
          {questionData.options.map((option, index) => (
            <button
              key={index}
              onClick={() => onAnswer(index)} // Truyền số thứ tự của đáp án người chơi chọn
              className="w-full p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded font-semibold text-amber-900 transition text-left"
            >
              {String.fromCharCode(65 + index)}. {option}
            </button>
          ))}
        </div>
        
      </div>
    </div>
  );
};

export default QuestionModal;