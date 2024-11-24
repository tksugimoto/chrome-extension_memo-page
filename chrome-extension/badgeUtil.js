
const badgeUtil = {
	show: memoCount => {
		chrome.action.setBadgeText({
			text: String(memoCount),
		});
	},
};

export default badgeUtil;
