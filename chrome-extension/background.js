
const showMemoCountBadge = () => {
	const PageMemos = new PageMemoStorage();
	PageMemos.getAll().then(memos => {
		badgeUtil.show(memos.length);
	});
};

chrome.runtime.onInstalled.addListener(showMemoCountBadge);
