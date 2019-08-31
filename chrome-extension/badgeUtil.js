
const badgeUtil = {
	show: memoCount => {
		chrome.browserAction.setBadgeText({
			text: String(memoCount),
		});
	},
};
