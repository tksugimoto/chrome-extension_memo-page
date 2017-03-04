
class PageMemo {
	constructor(data) {
		if (!data) throw new Error("第1引数が必須です");
		const requiredPropertyNames = ["title", "url"];
		requiredPropertyNames.forEach(name => {
			if (name in data) {
				this[name] = data[name];
			} else {
				throw new Error(`${name}プロパティが必須です`);
			}
		});
		const allowedPropertyNames = ["favIconUrl", "savedTime"];
		allowedPropertyNames.forEach(name => {
			if (name in data) {
				this[name] = data[name];
			}
		});
	}

	withSavedTime(savedTime) {
		this.savedTime = savedTime;
		return this;
	}

	equals(target) {
		if (!target) return false;
		return ["title", "url"].every(key => {
			return this[key] === target[key];
		});
	}
}

class PageMemoStorage {
	constructor(key = "default") {
		this._key = key;
		this._promise = Promise.resolve();
	}

	_load() {
		return new Promise(resolve => {
			chrome.storage.local.get({
				[this._key]: []
			}, items => {
				const memos = items[this._key];
				resolve(memos);
			});
		});
	}

	add(data) {
		return new Promise(resolveResult => {
			this._promise = this._promise.then(() => {
				return this._load();
			}).then(memos => {
				if (!data || !data.url) {
					resolveResult(false);
					return memos;
				} else {
					const savedTime = Date.now();
					const memo = new PageMemo(data).withSavedTime(savedTime);
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
		return this._promise.then(this._load.bind(this));
	}

	remove(data) {
		return new Promise(resolveResult => {
			this._promise = this._promise.then(() => {
				return this._load();
			}).then(memos => {
				const targetMemo = new PageMemo(data);
				memos = memos.filter(memo => {
					return !targetMemo.equals(memo);
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

const PageMemos = new PageMemoStorage();

document.getElementById("save").addEventListener("click", () => {
	chrome.tabs.query({
		currentWindow: true,
		active: true
	}, tabs => {
		const tab = tabs[0];
		PageMemos.add(tab).then(ok => {
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
	saveThisWindow.addEventListener("click", () => {
		const promises = tabs.map(tab => {
			return PageMemos.add(tab).then(ok => {
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
			PageMemos.remove(memo).then(ok => {
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
				PageMemos.remove(memo).then(ok => {
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

		const favIcon = document.createElement("img");
		favIcon.classList.add("favIcon");
		if (memo.favIconUrl) {
			favIcon.src = memo.favIconUrl;
		}
		li.appendChild(favIcon);

		const a = document.createElement("a");
		a.href = memo.url;
		a.target = "_blank";
		a.innerText = memo.title;
		li.appendChild(a);

		this.container.appendChild(li);
		return li;
	}
};

PageMemos.getAll().then(memos => {
	updateDownloadLink(memos);
	const list = memos.map(memo => {
		const elem = MemoList.append(memo);
		return {elem, memo};
	});
	const searchInput = document.getElementById("search");
	searchInput.addEventListener("keyup", evt => {
		const text = evt.target.value.toLowerCase();
		list.forEach(({memo, elem}) => {
			const targetText = (memo.title + " " + memo.url).toLowerCase();
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
