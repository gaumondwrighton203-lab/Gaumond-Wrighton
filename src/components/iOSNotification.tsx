import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, ChevronRight, X } from 'lucide-react';

interface IOSNotificationProps {
  show: boolean;
  onClose: () => void;
  onAction: () => void;
  dayOfMonth: number;
}

export const IOSNotification: React.FC<IOSNotificationProps> = ({
  show,
  onClose,
  onAction,
  dayOfMonth
}) => {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
  }, [show]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -80, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto"
        >
          <div className="bg-white/80 dark:bg-[#1c1c1e]/85 backdrop-blur-xl rounded-[24px] shadow-2xl border border-black/[0.05] dark:border-white/[0.08] p-4 text-black dark:text-white relative">
            <div className="flex items-start gap-3">
              {/* iOS Icon */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ios-blue to-ios-indigo flex items-center justify-center text-white shadow-md shadow-ios-blue/20 shrink-0">
                <Bell className="w-5 h-5" />
              </div>

              {/* Notification Content */}
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold tracking-wider text-ios-blue uppercase">
                    Напоминание
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    сейчас
                  </span>
                </div>
                <h4 className="text-[14px] font-semibold mt-0.5 text-gray-900 dark:text-white leading-tight">
                  Пора передать показания!
                </h4>
                <p className="text-[13px] text-gray-600 dark:text-gray-300 mt-1 leading-snug">
                  Сегодня {dayOfMonth}-е число месяца. Самое время зафиксировать воду и электричество и отправить арендодателю.
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-6 h-6 rounded-full bg-black/[0.05] dark:bg-white/[0.1] flex items-center justify-center shrink-0 text-gray-500 dark:text-gray-400 hover:scale-105 active:scale-95 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="mt-3 pt-3 border-t border-black/[0.05] dark:border-white/[0.08] flex gap-2">
              <button
                onClick={() => {
                  onAction();
                  onClose();
                }}
                className="flex-1 py-2 rounded-xl bg-ios-blue text-white text-[13px] font-semibold flex items-center justify-center gap-1 hover:bg-ios-blue/90 active:scale-98 transition-all"
              >
                <span>Ввести показания</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 text-[13px] font-medium hover:bg-black/[0.08] dark:hover:bg-white/[0.1] active:scale-98 transition-all"
              >
                Отложить
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
