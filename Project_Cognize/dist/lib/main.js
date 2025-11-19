"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("./config"));
const information_provider_1 = require("./information_provider");
const prompt_strategist_1 = require("./prompt_strategist");
const system_interface_1 = require("./system_interface");
async function main(phase, targetFile) {
    console.log(`🚀 プロンプト生成を開始 (Project_Cognize v4.0 - Orchestrated Actor Model)`);
    console.log(`   フェーズ: ${phase}`);
    console.log(`   対象ファイル: ${targetFile}\n`);
    const projectConfig = config_1.default;
    const absoluteTargetFile = path_1.default.resolve(projectConfig.PROJECT_ROOT, targetFile);
    const collectedInfo = await (0, information_provider_1.gatherAllInfo)(absoluteTargetFile, projectConfig);
    const { fullPrompt, analysisResult } = (0, prompt_strategist_1.buildPrompt)(phase, targetFile, collectedInfo, projectConfig);
    (0, system_interface_1.output)(fullPrompt, analysisResult, projectConfig);
}
