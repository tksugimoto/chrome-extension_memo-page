
class TabMemo {
	constructor(key = "default") {
		this._key = key;
		this.load();
	}

	load() {
		this._promise = new Promise(resolve => {
			chrome.storage.local.get({
				[this._key]: []
			}, items => {
				const memos = items[this._key];
				resolve(memos);
			});
		});
	}

	add({title, url}) {
		return new Promise(resolveResult => {
			this._promise = this._promise.then(memos => {
				if (!url) {
					resolveResult(false);
					return memos;
				} else {
					const savedTime = Date.now();
					const memo = {title, url, savedTime};
					memos.push(memo);
					return new Promise(resolve => {
						chrome.storage.local.set({
							[this._key]: memos
						}, () => {
							resolveResult(true);
							resolve(memos);
						});
					});
				}
			});
		});
	}

	getAll() {
		return new Promise(resolveResult => {
			this._promise.then(resolveResult);
		});
	}

	remove({title, url}) {
		return new Promise(resolveResult => {
			this._promise = this._promise.then(memos => {
				memos = memos.filter(memo => {
					return !(memo.title === title && memo.url === url);
				});
				return new Promise(resolve => {
					chrome.storage.local.set({
						[this._key]: memos
					}, () => {
						resolveResult(true);
						resolve(memos);
					});
				});
			});
		});
	}
}

const tabMemo = new TabMemo();

document.getElementById("save").addEventListener("click", () => {
	chrome.tabs.query({
		currentWindow: true,
		active: true
	}, tabs => {
		const tab = tabs[0];
		const {title, url} = tab;
		tabMemo.add({title, url}).then(ok => {
			if (ok) {
				chrome.tabs.remove(tab.id);
			}
		});
	});
});

function getTabs() {
	return new Promise(resolve => {
		chrome.windows.getCurrent({	
			populate: true
		}, ({tabs}) => {
			resolve(tabs);
		});
	});
}

getTabs().then(tabs => {
	const container = document.getElementById("nowTabs");
	tabs.forEach(tab => {
		const li = document.createElement("li");
		li.append(tab.title);
		container.appendChild(li);
	});
	saveThisWindow.addEventListener("click", () => {
		const promises = tabs.map(tab => {
			const {title, url} = tab;
			return tabMemo.add({title, url}).then(ok => {
				return ok ? tab.id : null;
			});
		});
		Promise.all(promises).then(tabIds => {
			tabIds.forEach(tabId => {
				if (tabId !== null) {
					chrome.tabs.remove(tabId);
				}
			});
		})
	});
});

const MemoList = {
	container: document.getElementById("memo"),
	append: function (memo) {
		const li = document.createElement("li");

		const button = document.createElement("button");
		button.innerText = "開いて削除";
		button.addEventListener("click", () => {
			tabMemo.remove(memo).then(ok => {
				if (ok) {
					chrome.tabs.create({
						url: memo.url
					});
				}
			});
		});
		li.appendChild(button);

		const delButton = document.createElement("button");
		delButton.innerText = "削除";
		delButton.addEventListener("click", () => {
			if (window.confirm("削除してよいですか？")) {
				tabMemo.remove(memo).then(ok => {
					if (ok) {
						this.container.removeChild(li)
					}
				});
			}
		});
		li.appendChild(delButton);

		const date = new Date(memo.savedTime).toLocaleString()
			// 秒を削除
			.replace(/:\d+$/, "")
			.replace(/([/ :])(\d)(?!\d)/g, (match, sep, num) => {
				// 数字が1桁しかない場合は2桁にする
				return `${sep}0${num}`
			});
		li.append(date);

		const a = document.createElement("a");
		a.href = memo.url;
		a.target = "_blank";
		a.innerText = memo.title;
		a.title = memo.url;
		li.appendChild(a);

		this.container.appendChild(li);
		return li;
	}
};

tabMemo.getAll().then(memos => {
	updateDownloadLink(memos);
	const list = memos.map(memo => {
		const elem = MemoList.append(memo);
		return {elem, memo};
	});
	const searchInput = document.getElementById("search");
	searchInput.addEventListener("keyup", evt => {
		const text = evt.target.value.toLowerCase();
		list.forEach(({memo, elem}) => {
			const targetText = memo.title + " " + memo.url;
			elem.style.display = targetText.includes(text) ? "" : "none";
		});
	});
	searchInput.style.display = "";
	searchInput.focus();
});

function updateDownloadLink(memos) {
	const text = JSON.stringify(memos, null, "\t");
	const blob = new Blob([
		text
	], {
		type: "application/json"
	});
	document.getElementById("download").href = window.URL.createObjectURL(blob);
}
