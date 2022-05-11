class promise {
	constructor(executor){
		// 设置初始的状态
		this.state = 'pending'
		// 成功
		this.value = 'undefined'
		// 失败
		this.reason = 'undefined'
		// 创建成功的数组
		this.onResolveCallbacks = []
		// 创建失败
		this.onRejectedCallbacks = []
		let resolve = (value) => {
          if(this.state === 'pending'){
			  this.state = 'fulfilled'
			  this.value = value
			  this.onResolveCallbacks.forEach(fun => fun())
		  }
		}
		let reject = (reason) => {
		  if(this.state === 'pending'){
			  this.state = 'rejected'
			  this.reason = reason
			  this.onRejectedCallbacks.forEach(fun => fun())
		  }
		}
		try {
		  executor(resolve,reject)
		} catch(err) {
			reject(err)
		}
	}
	// promise有一个then方法，该方法有两个方法，onFulfilled,onRejected
	then(unFulfilled,onRejected) {
		let promise2 = new promise((resolve,reject) => {
          // 状态为fulfilled
		if(this.state === 'fulfilled'){
			let x = unFulfilled(this.value)
			resolvePromise(promise2, x, resolve, reject)
		}
		if(this.state === 'rejected'){
			let x = unRejected(this.reason)
			resolvePromise(promise2, x, resolve, reject)
		}
		if(this.state === 'pending'){
			// 传入成功数组
	        this.onResolveCallbacks.push(() => {
				let x = unFulfilled(this.value)
				resolvePromise(promise2, x, resolve, reject)
			})
			// 传入失败数组
			this.onRejectedCallbacks.push(() => {
				let x = unRejected(this.reason)
				resolvePromise(promise2, x, resolve, reject)
			})
		}
		})
		return promise2;
	}
}

function resolvePromise(promise2, x, resolve, reject){
	// 循环引用报错
	if(x === promise2){
	  // reject报错
	  return reject(new TypeError('Chaining cycle detected for promise'));
	}
	// 防止多次调用
	let called;
	// x不是null 且x是对象或者函数
	if (x != null && (typeof x === 'object' || typeof x === 'function')) {
	  try {
		// A+规定，声明then = x的then方法
		let then = x.then;
		// 如果then是函数，就默认是promise了
		if (typeof then === 'function') {
		  // 就让then执行 第一个参数是this   后面是成功的回调 和 失败的回调
		  then.call(x, y => {
			// 成功和失败只能调用一个
			if (called) return;
			called = true;
			// resolve的结果依旧是promise 那就继续解析
			resolvePromise(promise2, y, resolve, reject);
		  }, err => {
			// 成功和失败只能调用一个
			if (called) return;
			called = true;
			reject(err);// 失败了就失败了
		  })
		} else {
		  resolve(x); // 直接成功即可
		}
	  } catch (e) {
		// 也属于失败
		if (called) return;
		called = true;
		// 取then出错了那就不要在继续执行了
		reject(e);
	  }
	} else {
	  resolve(x);
	}
  }

