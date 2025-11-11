// ===================================================================
// ManusまとめクローラーVER 6.8 - MVP設計書 v1.3
// フェーズ1-4: 分析スクリプト (generate_index.js)
// 目的: プロジェクト内のJS/TSファイルを解析し、構造情報をJSONL形式で出力する
// ===================================================================

// 必要なツールを読み込む
const fs = require('fs'); // ファイルを読み書きするツール
const path = require('path'); // ファイルのパスを扱うツール
const { parse } = require('@babel/parser'); // JavaScriptを解析するツール

// --- 設定項目 ---
const projectRoot = path.resolve(__dirname, '../..'); // プロジェクトのルートディレクトリ
const targetDirs = ['app', 'components', 'game', 'pages', 'scripts']; // 解析対象のフォルダ (既存のscriptsも対象に含める)
const targetExtensions = ['.js', '.jsx', '.ts', '.tsx']; // 解析対象のファイルの拡張子
const outputFilePath = path.join(projectRoot, 'Project_Cognize/workspace/outputs/static_index.jsonl'); // ★★★ 正しい出力先のファイルパス ★★★

/**
 * 指定されたディレクトリを再帰的に探索し、対象となるファイルのリストを返す関数
 * @param {string} dir - 探索を開始するディレクトリ
 * @returns {string[]} - 対象ファイルのフルパスの配列
 */
function findTargetFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir); // ディレクトリ内のファイル/フォルダ一覧を取得
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            // もしフォルダなら、再帰的に探索
            results = results.concat(findTargetFiles(filePath));
        } else if (targetExtensions.includes(path.extname(filePath))) {
            // もし対象の拡張子を持つファイルなら、リストに追加
            results.push(filePath);
        }
    });
    return results;
}

/**
 * メインの処理を実行する非同期関数
 */
async function main() {
    console.log('プロジェクトの解析を開始します...');

    // 1. 解析対象のファイルを探す
    let allFiles = [];
    for (const dir of targetDirs) {
        const targetPath = path.join(projectRoot, dir);
        if (fs.existsSync(targetPath)) {
            console.log(`  -> '${dir}' フォルダを探索中...`);
            allFiles = allFiles.concat(findTargetFiles(targetPath));
        }
    }
    console.log(`✅ ${allFiles.length}個の対象ファイルが見つかりました。`);

    // 2. 各ファイルを解析し、JSONL形式の文字列を生成
    const jsonlData = allFiles.map(filePath => {
        console.log(`  -> '${path.relative(projectRoot, filePath)}' を解析中...`);
        const code = fs.readFileSync(filePath, 'utf-8'); // ファイルの内容を読み込む
        let ast;
        try {
            // Babel ParserでコードをAST（抽象構文木）に変換
            ast = parse(code, {
                sourceType: 'module', // ESモジュールとして解釈
                plugins: ['jsx', 'typescript'], // JSXとTypeScriptの構文を許可
                errorRecovery: true, // 多少のエラーがあっても頑張って解析する
            });
        } catch (error) {
            console.error(`❌ '${filePath}' の解析中にエラーが発生しました:`, error.message);
            return null; // エラーがあった場合はnullを返す
        }

        // 出力する情報をまとめる
        const fileInfo = {
            file_path: path.relative(projectRoot, filePath), // プロジェクトルートからの相対パス
            last_modified: fs.statSync(filePath).mtime.toISOString(), // 最終更新日時
        };

        return JSON.stringify(fileInfo); // オブジェクトをJSON文字列に変換
    }).filter(Boolean); // エラーでnullになったものを除去

    // 3. 結果をファイルに書き出す
    fs.writeFileSync(outputFilePath, jsonlData.join('\n'));
    console.log(`✅ 解析結果を '${outputFilePath}' に書き出しました。`);
    console.log('🎉 全ての処理が完了しました！');
}

// メイン処理を実行
main().catch(console.error);
