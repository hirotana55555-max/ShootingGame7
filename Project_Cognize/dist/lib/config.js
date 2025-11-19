"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require('path');
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const config = {
    // パス設定
    PROJECT_ROOT,
    POLICY_DIR: path.join(PROJECT_ROOT, 'Project_Cognize'),
    SCRIPT_DIR: path.join(PROJECT_ROOT, 'Project_Cognize', 'scripts'),
    TEMPLATE_DIR: path.join(PROJECT_ROOT, 'Project_Cognize', 'templates'),
    OUTPUT_FILE: path.join(PROJECT_ROOT, 'auto_prompt.md'),
    COMPONENTS_DIR: path.join(PROJECT_ROOT, 'game', 'components'),
    SYSTEMS_DIR: path.join(PROJECT_ROOT, 'game', 'systems'),
    // トークン設定
    QWEN_INPUT_LIMIT: 32768,
    QWEN_SAFE_LIMIT: 30000,
    QWEN_WARNING_THRESHOLD: 25000,
    // タイムアウト設定
    TSC_TIMEOUT: 30000,
    DEPS_TIMEOUT: 10000,
};
exports.default = config;
