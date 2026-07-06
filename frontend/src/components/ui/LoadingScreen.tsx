/**
 * tugical Admin Dashboard ローディングスクリーン
 * 
 * 機能:
 * - アプリ初期化時のローディング表示
 * - ページ遷移時のローディング表示
 * - tugicalブランドデザイン準拠
 * - Framer Motion アニメーション
 * 
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */

import React from 'react';
import { motion } from 'framer-motion';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

/**
 * ローディングスクリーンコンポーネント
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = '読み込み中...',
  fullScreen = true,
}) => {
  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-gradient-tugical'
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClasses}>
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* tugicalロゴ */}
        <motion.div
          className="mb-6"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <h1 className="text-5xl font-bold text-primary-600 mb-2">tugical</h1>
          <p className="text-sm text-gray-600">次の時間が、もっと自由になる。</p>
        </motion.div>

        {/* ローディングスピナー */}
        <motion.div
          className="w-12 h-12 mx-auto mb-4"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <div className="w-full h-full border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
        </motion.div>

        {/* メッセージ */}
        <motion.p
          className="text-gray-600 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {message}
        </motion.p>

        {/* ドット アニメーション */}
        <motion.div
          className="flex justify-center space-x-1 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-primary-500 rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoadingScreen; 