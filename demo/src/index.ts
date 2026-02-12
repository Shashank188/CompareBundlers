import { usedFunction } from './utils';
import { usedBarrel as barrelUsed } from './barrel';
import * as side from './side-effects';

// Use some things
console.log(usedFunction());
console.log(barrelUsed());
console.log(side.usedSideEffect());

// Unused import is not present, but analysis will show dead exports

export { usedFunction } from './utils'; // re-export
