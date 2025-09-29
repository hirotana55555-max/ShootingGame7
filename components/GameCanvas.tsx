// components/GameCanvas.tsx
'use client';

import { useEffect, useRef } from 'react';
import { startGame, stopGame } from '../game/core/main.js'; // 変更点

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isGameInitialized = useRef(false); //

  useEffect(() => {
    // ★ すでに初期化済みなら、何もしない
    if (isGameInitialized.current) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    startGame(canvas);
    isGameInitialized.current = true; // ★ 初期化が完了したことを記録

    // コンポーネントが不要になった時にゲームを停止
    return () => {
      stopGame();
      isGameInitialized.current = false; // ★ クリーンアップ時にフラグをリセット
    };
  }, []); // 依存配列は空のまま

  return <canvas ref={canvasRef} width={360} height={580} style={{ border: '1px solid white' }} />;
}
