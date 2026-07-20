import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

interface IOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const IOSModal: React.FC<IOSModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer
}) => {
  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Bottom Sheet Card */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="relative w-full max-w-lg bg-[#f2f2f7] dark:bg-[#1c1c1e] rounded-t-[20px] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
          >
            {/* iOS Drag Indicator */}
            <div className="w-full flex justify-center py-2 shrink-0">
              <div className="w-9 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
            </div>

            {/* Modal Header */}
            <div className="px-4 pb-3 flex items-center justify-between shrink-0 border-b border-gray-200/50 dark:border-gray-800/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:scale-105 active:scale-95 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 no-scrollbar">
              {children}
            </div>

            {/* Modal Footer */}
            {footer && (
              <div className="p-4 bg-white/70 dark:bg-black/35 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-800/50 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
