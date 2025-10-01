/**
 * @file /components/GameCanvas.tsx
 * @description ゲームを描画するためのCanvas要素を生成し、ゲームのライフサイクル（開始・停止）を管理するReactコンポーネント。
 *              このコンポーネントが、Reactで構築されたUI（ガワ）と、JavaScriptのECS（エンティティ・コンポーネント・システム）で
 *              構築されたゲームロジックとの「橋渡し」役を担います。
 */

'use client';

import { useEffect, useRef } from 'react';
import { startGame, stopGame } from '../game/core/main.js';

/**
 * GameCanvasコンポーネント
 * @description ゲーム画面となる<canvas>要素をレンダリングし、ゲームの初期化とクリーンアップを行います。
 * @returns {JSX.Element} レンダリングされる<canvas>要素。
 */
export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isGameInitialized = useRef(false);

  useEffect(() => {
    if (isGameInitialized.current) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // ★★★ 改変箇所 1: ここから ★★★
    // 1. canvas要素をフォーカス可能にする
    canvas.tabIndex = 0;
    
    // 2. 強制的にcanvasにフォーカスを当てる
    // これがIDEの制約を乗り越えるための鍵となる
    canvas.focus();
    // ★★★ 改変箇所 1: ここまで ★★★

    startGame(canvas);
    isGameInitialized.current = true;

    return () => {
      stopGame();
      isGameInitialized.current = false;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={360}
      height={580}
      // ★★★ 改変箇所 2: styleプロパティを修正 ★★★
      style={{ border: '1px solid white', outline: 'none' }}
    />
  );
}
