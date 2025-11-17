/**
 * Stack Trace Parser
 * ChatGPT指摘対応：正規表現強化、エッジケース対応
 */

function parseStack(stack) {
  if (!stack || typeof stack !== 'string') return [];
  
  const lines = stack.split('\n');
  const frames = [];
  
  // Multiple regex patterns for different stack formats
  const patterns = [
    // Chrome/Node: at funcName (file:line:col)
    /at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/,
    // Chrome/Node: at file:line:col
    /at\s+(.+?):(\d+):(\d+)/,
    // Firefox: funcName@file:line:col
    /(.+?)@(.+?):(\d+):(\d+)/
  ];
  
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const isFirstPattern = pattern === patterns[0];
        frames.push({
          func: isFirstPattern ? match[1].trim() : (match[1] || 'anonymous'),
          file: normalizeFilePath(isFirstPattern ? match[2] : match[2]),
          line: parseInt(isFirstPattern ? match[3] : match[3]),
          col: parseInt(isFirstPattern ? match[4] : match[4])
        });
        break; // Found match, skip other patterns
      }
    }
  }
  
  return frames;
}

function normalizeFilePath(path) {
  if (!path) return '';
  
  // Remove protocol
  path = path.replace(/^file:\/\/\//, '');
  path = path.replace(/^https?:\/\/[^\/]+\//, '');
  
  // Remove query strings and fragments
  path = path.split('?')[0].split('#')[0];
  
  // Normalize separators
  path = path.replace(/\\/g, '/');
  
  return path;
}

module.exports = { parseStack, normalizeFilePath };