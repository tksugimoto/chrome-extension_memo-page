
const PageMemos = new PageMemoStorage();

document.getElementById('save').addEventListener('click', () => {
	chrome.tabs.query({
		currentWindow: true,
		active: true,
	}, tabs => {
		const tab = tabs[0];
		PageMemos.add(tab).then(({memos, success}) => {
			badgeUtil.show(memos.length);
			if (success) {
				chrome.tabs.remove(tab.id);
			}
		});
	});
});

function getTabs() {
	return new Promise(resolve => {
		chrome.windows.getCurrent({
			populate: true,
		}, ({tabs}) => {
			resolve(tabs);
		});
	});
}

getTabs().then(tabs => {
	saveThisWindow.addEventListener('click', () => {
		const promises = tabs.map(tab => {
			return PageMemos.add(tab).then(({memos, success}) => {
				badgeUtil.show(memos.length);
				return success ? tab.id : null;
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



const MemoView = {
	setup: function (memos) {
		// TODO: memosが削除されたらダウンロードされるjsonも変更する
		this.updateDownloadLink(memos);
		const list = memos.map(memo => {
			const elem = MemoListView.append(memo);
			return {elem, memo};
		});
		this.setupSearchBox(list);
	},
	setupSearchBox: function (list) {
		const searchInput = document.getElementById('search');
		searchInput.addEventListener('keyup', evt => {
			const text = evt.target.value.toLowerCase();
			list.forEach(({memo, elem}) => {
				const targetText = (memo.title + ' ' + memo.url).toLowerCase();
				elem.style.display = targetText.includes(text) ? '' : 'none';
			});
		});
		searchInput.style.display = '';
		searchInput.focus();
	},
	updateDownloadLink: function (memos) {
		const text = JSON.stringify(memos, null, '\t');
		const blob = new Blob([
			text,
		], {
			type: 'application/json',
		});
		document.getElementById('download').href = window.URL.createObjectURL(blob);
	},
};

const MemoListView = {
	container: document.getElementById('memo'),
	append: function (memo) {
		const li = document.createElement('li');

		const button = document.createElement('button');
		button.innerText = '開いて削除';
		button.addEventListener('click', () => {
			PageMemos.remove(memo).then(({memos, success}) => {
				badgeUtil.show(memos.length);
				if (success) {
					chrome.tabs.create({
						url: memo.url,
					});
				}
			});
		});
		li.appendChild(button);

		const delButton = document.createElement('button');
		delButton.innerText = '削除';
		delButton.addEventListener('click', () => {
			if (window.confirm('削除してよいですか？')) {
				PageMemos.remove(memo).then(({memos, success}) => {
					badgeUtil.show(memos.length);
					if (success) {
						this.container.removeChild(li)
					}
				});
			}
		});
		li.appendChild(delButton);

		const date = new Date(memo.savedTime).toLocaleString()
			// 秒を削除
			.replace(/:\d+$/, '')
			.replace(/([/ :])(\d)(?!\d)/g, (match, sep, num) => {
				// 数字が1桁しかない場合は2桁にする
				return `${sep}0${num}`
			});
		li.append(date);

		const favIcon = document.createElement('img');
		favIcon.classList.add('favIcon');
		if (memo.favIconUrl) {
			favIcon.src = memo.favIconUrl;
		}
		li.appendChild(favIcon);

		const a = document.createElement('a');
		a.href = memo.url;
		a.target = '_blank';
		a.innerText = memo.title;
		li.appendChild(a);

		this.container.appendChild(li);
		return li;
	},
};

PageMemos.getAll().then(memos => {
	badgeUtil.show(memos.length);
	MemoView.setup(memos);
});
