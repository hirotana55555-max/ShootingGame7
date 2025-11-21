"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require('path');
const config_1 = __importDefault(require("./config"));
const informationProvider = __importStar(require("./information_provider"));
const promptStrategist = __importStar(require("./prompt_strategist"));
const systemInterface = __importStar(require("./system_interface"));
/**
 * 各アクターを指揮し、プロンプト生成プロセス全体を管理する司令塔。
 * @param {string} phase - 実行フェーズ (e.g., 'refactor')
 * @param {string} targetFile - 対象ファイルのパス
 */
async function main(phase, targetFile) {
    console.log(`\n🚀 プロンプト生成を開始 (Project_Cognize v4.0 - Orchestrated Actor Model)`);
    console.log(`   フェーズ: ${phase}`);
    console.log(`   対象ファイル: ${targetFile}\n`);
    // 1. 書記官からプロジェクトの憲法（設定）を取得
    const projectConfig = config_1.default;
    // 2. 情報収集の専門家から、分析に必要な全ての情報を収集
    const absoluteTargetFile = path.resolve(projectConfig.PROJECT_ROOT, targetFile);
    const collectedInfo = await informationProvider.gatherAllInfo(absoluteTargetFile, projectConfig);
    // 3. プロンプト戦略家に、収集した情報と設定を渡し、最終プロンプトを構築させる
    const { fullPrompt, analysisResult } = promptStrategist.buildPrompt(phase, targetFile, collectedInfo, projectConfig);
    // 4. 外部システム担当に、完成したプロンプトと分析結果を渡し、出力させる
    systemInterface.output(fullPrompt, analysisResult, projectConfig);
}
module.exports = { main };
