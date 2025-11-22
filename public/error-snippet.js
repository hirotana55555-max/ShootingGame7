(function() {
  console.log('[ErrorSnippet] 初期化を開始します。');

  if (window.dem) {
    console.log('[ErrorSnippet] すでに初期化済みです。');
    return;
  }

  window.dem = {
    collect: function(error, context) {
      console.log('[DEM/collect] エラー収集プロセスを開始します。');
      console.log('[DEM/collect] 受信したエラー:', error);
      console.log('[DEM/collect] 受信したコンテキスト:', context);

      try {
        const dsn = "{{GLITCHTIP_DSN}}";
        console.log('[DEM/collect] DSNを読み込みました:', dsn);

        if (!dsn || dsn.startsWith("{{")) {
          console.error('[DEM/collect] 致命的エラー: DSNが設定されていません。送信を中止します。');
          return;
        }

        const payload = {
          type: error.name || 'Error',
          value: error.message || 'No message',
          stacktrace: {
            frames: [], // 本来はここでスタックトレースを解析する
          },
          extra: context || {},
        };
        console.log('[DEM/collect] 送信ペイロードを作成しました:', payload);

        console.log('[DEM/collect] fetchを使用してGlitchTipに送信を試みます...');
        fetch(dsn, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          mode: 'cors',
        })
        .then(response => {
          console.log('[DEM/collect] fetchからの応答を受信しました:', response);
          if (response.ok) {
            console.log('[DEM/collect] 成功: GlitchTipへの送信に成功しました。ステータス:', response.status);
          } else {
            console.error('[DEM/collect] 失敗: GlitchTipへの送信に失敗しました。ステータス:', response.status);
            response.text().then(text => console.error('[DEM/collect] サーバーからの応答:', text));
          }
        })
        .catch(err => {
          console.error('[DEM/collect] 致命的エラー: fetch自体が失敗しました。ネットワークエラーの可能性があります。', err);
        });

      } catch (e) {
        console.error('[DEM/collect] 致命的エラー: collect関数内部で予期せぬエラーが発生しました。', e);
      }
    }
  };

  window.addEventListener('error', function(event) {
    console.log('[ErrorSnippet] window.errorイベントを捕捉しました。');
    window.dem.collect(event.error, { source: 'window.error' });
  });

  window.addEventListener('unhandledrejection', function(event) {
    console.log('[ErrorSnippet] unhandledrejectionイベントを捕捉しました。');
    window.dem.collect(event.reason, { source: 'unhandledrejection' });
  });

  console.log('[ErrorSnippet] イベントリスナーの登録が完了しました。');
})();
