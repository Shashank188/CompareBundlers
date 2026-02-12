export function completelyUnused() {
  return 'This module should be eliminated';
}

console.log('This should not run if tree-shaken');
