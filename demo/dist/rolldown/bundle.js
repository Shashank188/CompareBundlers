//#region utils.ts
function usedFunction() {
	return "Used function";
}

//#endregion
//#region barrel-internal.ts
function usedBarrel() {
	return "Used from barrel";
}

//#endregion
//#region side-effects.ts
console.log("Side effect executed!");
function usedSideEffect() {
	return "Used side";
}

//#endregion
//#region index.ts
console.log(usedFunction());
console.log(usedBarrel());
console.log(usedSideEffect());

//#endregion
export { usedFunction };
//# sourceMappingURL=bundle.js.map