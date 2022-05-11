### 14期学习promisify
``` js
const execFile = promisify(childProcess.execFile);
```
关于childProcess:childProcess模块是node.js的一个子流程，包含了以下四种方法执行外部应用。
* exexfile
* spawn
* exec
* fork
以上所有方法都是异步的，执行以后会返回一个对象，这个对象是childProcess的实例。
源码中的execFile()执行以后会返回一个带有缓存输出的callback，换句话说，execFile是当我们需要执行外部应用并获得输出时使用，我的理解就是返回操作的回调函数。
了解这些，继续来看
```js
promisify(childProcess.execFile)
```
官方文档中对于它的解释是：采用遵循常见的错误优先的回调风格的函数（也就是将 (err, value) => ... 回调作为最后一个参数），并返回一个返回 promise 的版本。也就是将execFile()返回的callback转换成promise形式。
###### 最初的回调实现
```js
const fs = require('fs')
fs.readFile('./txt','utf-8',(err,data)=>{
	if(err){
		throw err
	}
	console.log(data)
})
```
###### 官方的promise优化实现
```js
const fs = require('fs')
promisify(fs.readFile('./txt','utf-8').then(data => {
	console.log(data)
}).catch(err => {
	console.log(err)
}))
```
###### 总结一下promise和callback
引用stack overflow 上大神的描述 其实callback 很简单也很纯粹>A "callback" is any function that is called by another function which takes the first function as a parameter. （在一个函数中调用另外一个函数就是callback）。
举一个简单的小demo
```js
function a(){
	return 1
}
function b(aa){
	return aa + 3
}
const c = b(a())
console.log(c) // c = 4
```
a作为一个函数被函数b调用，这就是一个简单的回调函数,接下来引出一个异步的概念，异步任务不进入主线程，而是进入异步队列，前一个任务是否执行完毕不影响下一个任务的执行。常见的比如定时器。存在异步任务的代码，不能保证能按照顺序执行，但是如果需要被顺序执行呢？这个时候就可以用到回调函数，但是嵌套层一多，就会有一个比较常见的问题，江湖人称：回调地狱。这里有一个网站推荐给大家，里面专门介绍了如何解决回调地狱的问题。http://callbackhell.com/，有兴趣可以了解一下。
```js
// callback
function handler(done) {
  validateParams((error) => {
    if (error) return done(error);
    dbQuery((error, dbResults) => {
      if (error) return done(error);
      serviceCall(dbResults, (error, serviceResults) => {
        console.log(result);
        done(error, serviceResults);
      });
    });
  });
}
// promise
function handler() {
  return validateParams()
    .then(dbQuery)
    .then(serviceCall)
    .then(result => {
      console.log(result);
      return result;
    });
}
```
###### 手写promise实现
```js
new promise((resolve, reject) => {})
```
简单理解：resolve是成功执行的事件，reject是失败执行的事件
```js
// 先定义一个类 promise
class promise {
	constructor(executor){
		// 成功
		let resolve = () => {}
		// 失败
		let reject = () => {}
		// 执行
		executor(resolve, reject)
	}
}
// promise 有三种状态，pending 初始态,fulfilled 完成态,rejected 失败态。成功时，不可以转变为其他状态，且必须有一个不可改变的value。失败时，不可转为其他状态，且必须有reason。executor函数报错，直接执行reject，于是上面的代码就是
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
// resolvePromise函数实现放在promise.js文件中
```
回到源码中，promisify是callback和promise之间的桥梁。那么promisify是如何实现的呢，这里引入nodeCallback。nodeCallback 有两个条件：1. 回调函数在主函数中的参数位置必须是最后一个；2. 回调函数参数中的第一个参数必须是 error 。通过nodeCallback我们规定了一个能被promisify的函数格式。接下来，手动实现一个promisify。
```js
var Promisify = (fun) => {
  return fun() {
	  var a = this
	  return new Promise(resolve => {
		  return fun.call(a, ...arguments,function() {
                var args = Array.prototype.map.call(arguments, item => item);
                var err = args.shift();
                if (err) {
                    reject(err);
                } else {
                    resolve(args);
                }
			})
	  })
  }
}
```
###### 总结
通过这次的学习，复习了一下callback和promise，了解了怎样实现promisify。巩固了一些基础知识。





