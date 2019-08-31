
class PageMemo {
	constructor(data) {
		if (!data) throw new Error('第1引数が必須です');
		const requiredPropertyNames = ['title', 'url'];
		requiredPropertyNames.forEach(name => {
			if (name in data) {
				this[name] = data[name];
			} else {
				throw new Error(`${name}プロパティが必須です`);
			}
		});
		const allowedPropertyNames = ['favIconUrl', 'savedTime'];
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
		return ['title', 'url'].every(key => {
			return this[key] === target[key];
		});
	}
}

class PageMemoStorage {
	constructor(key = 'default') {
		this._key = key;
		this._promise = Promise.resolve();
	}

	_load() {
		return new Promise(resolve => {
			chrome.storage.local.get({
				[this._key]: [],
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
					resolveResult({
						memos,
						success: false,
					});
					return memos;
				} else {
					const savedTime = Date.now();
					const memo = new PageMemo(data).withSavedTime(savedTime);
					memos.push(memo);
					return new Promise(resolve => {
						chrome.storage.local.set({
							[this._key]: memos,
						}, () => {
							resolveResult({
								memos,
								success: true,
							});
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
						[this._key]: memos,
					}, () => {
						resolveResult({
							memos,
							success: true,
						});
						resolve(memos);
					});
				});
			});
		});
	}
}

export default PageMemoStorage;
