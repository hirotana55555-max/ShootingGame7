/**
 * Stack Trace Parser (TypeScript version)
 * Converted from DynamicErrorMonitor/src/collector/parser.js
 */

export interface StackFrame {
  func: string;
  file: string;
  line: number;
  col: number;
}

export function parseStack(stack: string | null | undefined): StackFrame[] {
  if (!stack || typeof stack !== 'string') return [];
  
  const lines = stack.split('\n');
  const frames: StackFrame[] = [];
  
  const patterns = [
    /at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/,
    /at\s+(.+?):(\d+):(\d+)/,
    /(.+?)@(.+?):(\d+):(\d+)/
  ];
  
  for (const line of lines) {
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const match = line.match(pattern);
      if (match) {
        const isFirstPattern = i === 0;
        frames.push({
          func: isFirstPattern ? match[1].trim() : (match[1] || 'anonymous'),
          file: normalizeFilePath(isFirstPattern ? match[2] : match[2]),
          line: parseInt(isFirstPattern ? match[3] : match[3]),
          col: parseInt(isFirstPattern ? match[4] : match[4])
        });
        break;
      }
    }
  }
  
  return frames;
}

function normalizeFilePath(path: string): string {
  if (!path) return '';
  
  path = path.replace(/^file:\/\/\//, '');
  path = path.replace(/^https?:\/\/[^\/]+\//, '' );
  path = path.split('?')[0].split('#')[0];
  path = path.replace(/\\/g, '/');
  
  return path;
}
