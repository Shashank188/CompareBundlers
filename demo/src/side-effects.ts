// Side effectful module - should be retained even if not all used
console.log('Side effect executed!');

export function usedSideEffect() {
  return 'Used side';
}

export function unusedSideEffect() {
  return 'This may be retained due to side effects';
}
