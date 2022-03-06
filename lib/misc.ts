/**
 * 返回一个Promise，在指定的时间后完成，可用于模拟耗时的操作。
 *
 * @param time 时间，毫秒
 * @return 在指定的时间后完成的 Promise
 */
export function sleep(time: number) {
	return new Promise(resolve => setTimeout(resolve, time));
}
