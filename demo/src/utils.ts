export function usedFunction() {
  return 'Used function';
}

export function unusedFunction() {
  return 'This should be tree-shaken';
}

export const usedConst = 'used';
export const unusedConst = 'unused';

export function deadCode() {
  console.log('dead');
  return 'dead';
}
