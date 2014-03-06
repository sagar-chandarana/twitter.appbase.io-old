(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],2:[function(require,module,exports){
window['abFuncs'] = {};

Appbase = {};


if (!Object.keys) {
	console.log('setting Object.keys');
    Object.keys = function (obj) {
        var keys = [],
            k;
        for (k in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, k)) {
                keys.push(k);
            }
        }
        return keys;
    };
}






Promise = require('promise')
//var http = require('http');




var ab = {
	util:{},
	net:{
		server:'http://162.242.213.228:3000/'
		//server:'http://192.168.0.18:3000/'
	},
	pro:{},
	auth:{},
	store:{
		obj:{
			put:{
				q:{
					objs:{}
				}
			}
			,storage:{}
			,get:{}
			,parent:{
				objs:{

				}
			}
		}
	}
};

stored = ab.store.obj.storage;

ab.store.obj.parent.addParent = function(childUuid,parentObj,k){
	if(typeof ab.store.obj.parent.objs[childUuid] == 'undefined'){
		ab.store.obj.parent.objs[childUuid] = {	parents: {} }
	}
	ab.store.obj.parent.objs[childUuid].parents[parentObj.id] = {parent:parentObj,forKey:k};
}

ab.store.obj.parent.removeParent = function(childUuid,parentObj){
	if(typeof ab.store.obj.parent.objs[childUuid] == 'undefined'){
		ab.store.obj.parent.objs[childUuid] = {	parents: {} }
	}
	delete ab.store.obj.parent.objs[childUuid].parents[parentObj.id]
}

ab.store.obj.parent.getParents = function(childUuid){
	if(typeof ab.store.obj.parent.objs[childUuid] == 'undefined'){
		ab.store.obj.parent.objs[childUuid] = {	parents: {} }
	}
	return ab.store.obj.parent.objs[childUuid].parents;
}

ab.util.postToUrl = function (path, params, method) {
    method = method || "post"; // Set method to post by default if not specified.

    // The rest of this code assumes you are not using a library.
    // It can be made less wordy if you use one.
    var form = document.createElement("form");
    form.setAttribute("method", method);
    form.setAttribute("action", path);

    for(var key in params) {
        if(params.hasOwnProperty(key)) {
            var hiddenField = document.createElement("input");
            hiddenField.setAttribute("type", "hidden");
            hiddenField.setAttribute("name", key);
            hiddenField.setAttribute("value", params[key]);

            form.appendChild(hiddenField);
         }
    }

    document.body.appendChild(form);
    form.submit();
}

ab.auth.login = function (uid,pwd,callback){
	/*
	req = new XMLHttpRequest();
	req.open('POST', 'http://192.168.0.18:3000/');
	req.setRequestHeader('Content-Type', 'application/json');
	req.send({'username':uid,'password':pwd});
	*/
	ab.util.postToUrl('http://192.168.0.18:3000/signup',{'username':uid,'password':pwd})
}


ab.store.obj.get.now = function(uuid,createNew,callback){
	if (typeof ab.store.obj.storage[uuid] == 'undefined'){
		
		if(typeof ab.store.obj.get.noRq[uuid] == 'undefined') {
			ab.store.obj.get.noRq[uuid] = [callback];
		} else {
			ab.store.obj.get.noRq[uuid].push(callback);
			return;
		}
		
		
		ab.net.listenToUuid(uuid,function(uuid,createNew){
			return function (err,obj){
				var isANewObj = false;
				if(!err){
					if(!obj)
						if(createNew){
							obj = {id:uuid,collection:createNew}
							isANewObj = true;
						} else {
							callback(err,false);
							return;
						}
					
					if(typeof ab.store.obj.storage[uuid] == 'undefined'){
						ab.store.obj.storage[uuid] = new AppbaseObj(obj);
						if(isANewObj)
							ab.store.obj.put.nowId(uuid);
					}
					
					
					if(typeof ab.store.obj.get.noRq[uuid] == 'undefined') {
						//real patcher
						//console.log('patching')
						//console.log(obj)
						ab.store.obj.storage[obj.id].setNewSelfObj(obj);
					} else { //get requests
						while(ab.store.obj.get.noRq[uuid].length){
							cbc = ab.store.obj.get.noRq[uuid].shift();
							cbc(err,ab.store.obj.storage[uuid]);
						}
						delete ab.store.obj.get.noRq[uuid];
					}					
				} else {
					throw  Error ('error here!')
				}
			}
		
		}(uuid,createNew));
	}
	else{
		callback(false,ab.store.obj.storage[uuid]);
	}
}

ab.store.obj.get.nowPro = Promise.denodeify(ab.store.obj.get.now);
ab.store.obj.get.noRq = {};

ab.store.obj.put.nowId = function (uuid){
	if(typeof ab.store.obj.put.q.objs[uuid] == 'undefined')
		ab.store.obj.put.q.objs[uuid] = true;
		setTimeout(ab.store.obj.put.q.process,0);
}
ab.store.obj.put.nowRef = function(abRef){
	abRef.uuid(function(err,uuid){
		ab.store.obj.put.nowId(uuid);
	});
}

ab.store.obj.put.q.isInProcess = false;

ab.store.obj.put.q.process = function (){
	if(ab.store.obj.put.q.isInProcess)
		return;
		
	for (var uuid in ab.store.obj.put.q.objs){
		if(ab.store.obj.put.q.objs[uuid]){
			ab.store.obj.put.q.objs[uuid] = false;
			ab.net.putByUuid(ab.store.obj.storage[uuid].generateSelfObj(),function(uuid){
				return function(err){
					delete ab.store.obj.put.q.objs[uuid];
					if(err){
						ab.store.obj.put.nowId(uuid);
					}
				};
			}(uuid));
		}
	}
	ab.store.obj.put.q.isInProcess = false;
}

//ab.socket = io.connect('http://192.168.0.18:3000/');
ab.socket = io.connect(ab.net.server);
//root immortalspectre

ab.net.listenToUuid = function(uuid, done) {
	//console.log("listening:"+uuid);
   ab.socket.emit('get', uuid);
   ab.socket.on(uuid, function(obj) {
       if(obj === "false") {
			console.log('uuid not found on server');
			done(false, false);
       }
       else {
			//console.log('arrived')
			//console.log(obj);
			done(false, obj);
       }
   });
}

ab.net.putByUuid = function(obj, done) {
	//console.log('putting')
	//console.log(obj);
	ab.socket.emit('put', obj);
	done(false);
}

/*
ab.net.getByUuid = function (uuid,callback){
	/* callback function(err,obj). 
	err - true/false (only network error).
	obj - false in case of err or uuid not found.
	*
	
	//TODO: ab.net.listenToUuid(collection,uuid,obj){}
	
	callback(false,false);
}

ab.net.putByUuid = function (obj,callback){
	//console.log(obj);
	//uuid = obj.id
	//collection = obj.collection
	/*
		callback function(err). 
	*
	callback(false);
}


ab.net.listenToUuid = function (uuid,callback){
	//callback err(network),obj

	callback(false,false);
} */

ab.util.getTreePro = function (levels,selfRef){
	//console.log(levels,baseUuid)
	return new Promise(
		function(resolve,reject){

			if (levels < 0)
				reject('levels<0');
			else{

				var treeObj = {}
				treeObj.$key = ab.util.parseKeyFromPath(selfRef.getPath());
				treeObj.$ref = selfRef;
				treeObj.$links = null;
				treeObj.$properties = null;
		
				if (levels == 0){
					resolve(treeObj);
				} else {
					selfRef.uuidPro().then(function(baseUuid){
						return ab.store.obj.get.nowPro(baseUuid,false);
					}).then(function(obj){

						treeObj.$properties = ab.util.clone(obj.properties);
						treeObj.$links = {$count:{},$ordered:{}};
						var pros = []
						var i = 0;
						
						for (var linkCollection in obj.links){
							for (var linkKey in obj.links[linkCollection]){
								pros[i] = ab.util.getTreePro(levels-1,Appbase.ref(selfRef.getPath()+'/'+linkCollection+':'+linkKey,true));
								//pros[i] = (ab.util.getTreePro(levels-1, obj.links[linkCollection][linkKey]));
								i++;
							}
						}
						Promise.all(pros).then(function (results){
							i = 0;
							for (var linkCollection in obj.links){
								treeObj.$links[linkCollection] = {};
								for (var linkKey in obj.links[linkCollection]){
									//console.log(results[i]);
									treeObj.$links[linkCollection][linkKey] = results[i];
									i++;
								}
							}

							for (var linkCollection in obj.linksOrdered){
								treeObj.$links.$count[linkCollection] = obj.linksOrdered[linkCollection].length;
								treeObj.$links.$ordered[linkCollection] = [];
								for(var i = 0;i< obj.linksOrdered[linkCollection].length;i++){
									treeObj.$links.$ordered[linkCollection][i] = treeObj.$links[linkCollection][obj.linksOrdered[linkCollection][i]]; 
								}
							}

							resolve(treeObj);
						});
							
						
					});
				}
			}
		}
	);
};

//treePro = ab.util.getTreePro;
/*
ab.util.getTree = function (levels,baseUuid,callback){
	if (levels < 1)
		return null;
	if (levels == 1)
		return ab.util.clone(ab.store.obj.storage[baseUuid].properties);
	
	var obj = ab.util.clone(ab.store.obj.storage[baseUuid].properties);
	
	
		for (var linkKey in ab.store.obj.storage[baseUuid].links[linkCollection]){
			obj['@'+linkCollection][linkKey] = ab.util.createSnapshot(levels-1, ab.store.obj.storage[baseUuid].links[linkCollection][linkKey]);
		}
	}
	
	return ab.util.clone(obj);
}
*/
//ab.util.getTreePro = Promise.denodeify(ab.util.getTree);

ab.util.clone = function (obj){
	return JSON.parse(JSON.stringify(obj));
}

ab.util.pathToUuid = function (path,callback,parentUuid){
	
	var front = path.indexOf('/') == -1? path: path.slice(0,path.indexOf('/'));
	
	var collection = ab.util.parseCollectionFromPath(front);
	var key = ab.util.parseKeyFromPath(front);
	
	if(typeof parentUuid == 'undefined'){
		
		if( path == front){
			//unique key 
			callback(false,key);
			return;
		}
		else{ //fetch front uuid
			ab.util.pathToUuid(front,function(orgPath,orgCallback){
				return function (err,frontUuid){ // for front err = always false
					var newPath = orgPath.indexOf('/') == -1? '': orgPath.slice(path.indexOf('/')+1); //cut front
					ab.util.pathToUuid(newPath,orgCallback,frontUuid);
					return;
				};
			}(path,callback));
		}
	} else{ //we have the parentUuid and a path.
		//if(path == ''){ //we came to the end
		//	callback(false,parentUuid);
		//	return;
		//} else {
			//console.log('here fetching:'+parentUuid);
			ab.store.obj.get.now(parentUuid,false,function(orgPath,orgCallback){
					return function(err,parentObj){
						if(!err){
							if(!parentObj){ //path not found
								orgCallback(false,false);
								return;
							} else{
								
								if(orgPath == ''){ //we came to the end
									orgCallback(false,parentObj.id);
									return;
								}
								
								var newFront = orgPath.indexOf('/') == -1? orgPath: orgPath.slice(0,orgPath.indexOf('/'));
								var newCollection = ab.util.parseCollectionFromPath(front);
								var newKey = ab.util.parseKeyFromPath(front);
								
								if(typeof parentObj.links[newCollection] == 'undefined' || typeof parentObj.links[newCollection][newKey] == 'undefined' ) {
									orgCallback(false,false);
									return;
								}
								var newParentUuid = parentObj.links[newCollection][newKey];
								var newPath = orgPath.indexOf('/') == -1? '': orgPath.slice(path.indexOf('/')+1); //cut front
								ab.util.pathToUuid(newPath,orgCallback,newParentUuid,parentObj,newKey);
								//ab.util.pathToUuid(newPath,orgCallback,newParentUuid);
							}
						} else{	
							orgCallback(err,false);
							return;
						}
					};
			}(path,callback));
		//}
		
	}
}

ab.util.pathToUuidPro = Promise.denodeify(ab.util.pathToUuid);

ab.util.uuid = function (){
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
		return v.toString(16);
	});
}
ab.util.compare = function (obj1,obj2){

	/*
	for(var x in obj1){
		if(obj1[x] != obj2[x])
			return false;
	}
	
	for(var x in obj2){
		if(obj1[x] != obj2[x])
			return false;
	}
	*/
}

ab.util.parseCollectionFromPath = function (Path){
	var temp = Path.slice(Path.lastIndexOf('/')+1);
	temp = temp.lastIndexOf(':')== -1 ? temp.slice(temp.lastIndexOf('@')+1): temp.slice(temp.lastIndexOf('@')+1,temp.lastIndexOf(':'));
	return temp
}

ab.util.isNumber = function (n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

ab.util.parseKeyFromPath = function (Path){
	return Path.lastIndexOf(':') == -1? '': Path.slice(Path.lastIndexOf(':')+1);
}

ab.util.parseGroupCollectionFromPath = function (Path){
	var temp = Path.slice(Path.lastIndexOf('/')+1);
	temp = temp.slice(0,temp.lastIndexOf(':'));
	return temp
}

ab.util.parseOrderFromUuid = function(linkName){
	var temp = linkName.slice(0,linkName.indexOf(':'));
	if(ab.util.isNumber(temp)){
		return parseInt(temp)
	}else {
		return undefined;
	}
}



/* AppbaseRef(path)

//path must not end with an '/'
//eg. 'User:sagar/Tweet:lkjajlal'
//eg. 'User:sagar/follows@User:abc'
*/

 


var AppbaseObj = function (obj){

	//this.paths[path]=true;
	//this.key = ab.util.parseKeyFromPath(path);
	
	this.links = {};
	this.linksUuid = {};
	this.linksOrdered = {};

	this.listeners = { 
		link_added:{},
		link_removed:{},
		value_changed:{},
		subtree_changed:{},
		link_changed:{}
	};
	
	this.setSelfObj(obj);
}

AppbaseObj.prototype.setSelfObj = function(obj){
	this.id = obj.id;
	this.properties = typeof obj.properties != "undefined"? JSON.parse(obj.properties):{};
	this.collection = obj.collection;

	delete obj["properties"];
	delete obj["collection"];
	delete obj["id"];
	
	
	
	for (var newLink in obj){
		var order = ab.util.parseOrderFromUuid(obj[newLink]);
		if(typeof order == 'undefined'){
			this.addLink(newLink,obj[newLink],true);
		} else {
			var splicedUuid = obj[newLink].slice(obj[newLink].indexOf(':')+1)
			this.addLink(newLink,splicedUuid,true,order);
		}
	}
}

AppbaseObj.prototype.generateSelfObj = function(){
	var obj = {id:this.id};
	obj.properties = JSON.stringify(this.properties);
	
	obj.collection = this.collection;
	
	for (var oldLinkCollection in this.linksOrdered){
		//console.log(this.linksOrdered[oldLinkCollection])
		for (var i = 0;i< this.linksOrdered[oldLinkCollection].length;i++){
			var oldLinkKey = this.linksOrdered[oldLinkCollection][i];
			obj[oldLinkCollection+':'+oldLinkKey] = i.toString()+':'+this.links[oldLinkCollection][oldLinkKey];
		}
	}

	return obj;
}

AppbaseObj.prototype.setNewSelfObj = function(obj){
	if (JSON.stringify(this.properties) != obj.properties){
		this.properties = JSON.parse(obj.properties);
		this.fire('value_changed',ab.util.clone(this.properties))
	}
	
	delete obj["properties"];
	delete obj["collection"];
	delete obj["id"];
	
	for (var newLink in obj){
		
		var order = ab.util.parseOrderFromUuid(obj[newLink]);
		if(typeof order == 'undefined'){
			var splicedUuid = obj[newLink];
		} else {
			var splicedUuid = obj[newLink].slice(obj[newLink].indexOf(':')+1)
		}

		var newLinkCollection = ab.util.parseCollectionFromPath(newLink)
		var newLinkKey = ab.util.parseKeyFromPath(newLink)
		
		

		if (typeof this.links[newLinkCollection] == 'undefined' || typeof this.links[newLinkCollection][newLinkKey] == 'undefined')
			this.addLink(newLink,splicedUuid,order);
		//todo: if link uuid has been changed
	}
	
	/*
	for (var oldLinkCollection in this.linksOrdered){
		console.log(this.linksOrdered[oldLinkCollection])
		for (var i = 0;i< this.linksOrdered[oldLinkCollection].length;i++){
			var oldLinkKey = this.linksOrdered[oldLinkCollection][i];
			obj[i.toString()+':'+oldLinkCollection+':'+oldLinkKey] = this.links[oldLinkCollection][oldLinkKey];
		}
	}*/


	for (var oldLinkCollection in this.links){
		for (var oldLinkKey in this.links[oldLinkCollection])
			if (typeof obj[oldLinkCollection+':'+oldLinkKey] == 'undefined')
				this.removeLink(oldLinkCollection+':'+oldLinkKey);
	}
}

AppbaseObj.prototype.setProps = function(prop){
	for (var x in prop) {
		this.properties[x] = prop[x]; 
	}
	this.fire('value_changed',ab.util.clone(this.properties));
}


AppbaseObj.prototype.addLink = function(linkName,uuid,noFire,order){
	noFire = false || noFire;
	
	var linkCollection = ab.util.parseCollectionFromPath(linkName);
	var linkGroupC =  ab.util.parseGroupCollectionFromPath(linkName);
	var linkKey = ab.util.parseKeyFromPath(linkName);
	
	if(typeof this.links[linkCollection] == 'undefined'){
		this.links[linkCollection] = {};
		this.linksOrdered[linkCollection] = [];
    }
	else {
		if(this.links[linkCollection][linkKey] == uuid)
			return; //link already exists
	}
	
	this.links[linkCollection][linkKey] = uuid;
	this.linksUuid[uuid] = linkName;
	
	if(typeof order != 'undefined'){
		if(typeof this.linksOrdered[linkCollection][order] == 'undefined')
			this.linksOrdered[linkCollection][order] = linkKey;
		else
			this.linksOrdered[linkCollection].splice(order,0,linkKey);
	}
	else{
		this.linksOrdered[linkCollection].unshift(linkKey);
	}

	
	ab.store.obj.parent.addParent(uuid,this,linkKey);

	/*
	var thisRef = this;
	ab.store.obj.get.nowPro(uuid,false).then(function(childObj){
		childObj.addParent(thisRef,ab.util.parseKeyFromPath(linkName));
	}).then(null,console.log);
	*/
	
	if(!noFire)
		this.fire('link_added',Appbase.ref(ab.util.parseCollectionFromPath(linkName)+":"+uuid))
	
}

AppbaseObj.prototype.fire = function(event,obj){
	//console.log('firing:'+event)
	//console.log(obj)
	for (var refId in this.listeners[event]){
		if(this.listeners[event][refId])
			setTimeout(this.listeners[event][refId].bind(undefined,obj),0);
	}
	
	switch(event){
		case 'value_changed':
			for (var id in ab.store.obj.parent.getParents(this.id)){
				ab.store.obj.parent.getParents(this.id)[id].parent.fire('link_changed',Appbase.ref(this.collection+':'+this.id))
			}
		break;
		case  'link_changed':
		case  'link_added':
		case  'link_removed':
			this.fire('subtree_changed',[obj[0],event]);
			//this.fire('link_changed',[obj[0],event]);
			/*
			for (var id in ab.store.obj.parent.getParents(this.id)){
				
				ab.store.obj.parent.getParents(this.id)[id].parent.fire('subtree_changed',[this.collection+':'+ab.store.obj.parent.getParents(this.id)[id].forKey+'/'+obj[0],event])
			}*/
		//break;
		
		case  'subtree_changed':
			for (var id in ab.store.obj.parent.getParents(this.id)){
				ab.store.obj.parent.getParents(this.id)[id].parent.fire('subtree_changed',[this.collection+':'+ab.store.obj.parent.getParents(this.id)[id].forKey+'/'+obj[0],obj[1]])
			}
		break;
		
		default:
			break;
	}
}

AppbaseObj.prototype.addListener = function(event,id,func){
	this.listeners[event][id] = func;
}

AppbaseObj.prototype.removeLinkUuid = function(uuid){
	
	if (this.linksUuid[uuid] != 'undefined'){
		
		this.removeLink(this.linksUuid[uuid]);
	}
}

AppbaseObj.prototype.removeLink = function(linkName){
	
	var linkCollection = ab.util.parseCollectionFromPath(linkName);
	var linkGroupC =  ab.util.parseGroupCollectionFromPath(linkName);
	var linkKey = ab.util.parseKeyFromPath(linkName);
	


	if(typeof this.links[linkCollection] == 'undefined' || typeof this.links[linkCollection][linkKey] == 'undefined' )
		return;
	var uuid = this.links[linkCollection][linkKey]
	

	delete this.links[linkCollection][linkKey];
	delete this.linksUuid[uuid];

	var order = this.linksOrdered[linkCollection].indexOf(linkKey);
	this.linksOrdered[linkCollection].splice(order,1);
	
	ab.store.obj.parent.removeParent(uuid,this);

	/*
	var thisRef = this;
	ab.store.obj.get.nowPro(uuid,false).then(function(childObj){
		childObj.removeParent(thisRef);
	}).then(null,console.log);
	*/

	this.fire('link_removed',Appbase.ref(ab.util.parseCollectionFromPath(linkName)+":"+uuid))
}

var AppbaseRef = function(path,dontFetch){
	this.path = path;
	this.refId = ab.util.uuid(); //this id is used to make this ref a unique identity, which will be used to add/remove listeners
	
	var isAPath = false;
	if (this.path == ab.util.parseCollectionFromPath(this.path)){
		var id = ab.util.uuid();
		this.path = this.path+":"+id;
		
	}

	if(path.indexOf('/')>=0){
		isAPath = true;
	}
	
	/*
	abc = function(thisRef){
		thisRef.uuidPro().then(function(uuid){
			console.log(uuid);
			if(uuid){
				return ab.store.obj.get.nowPro(uuid,ab.util.parseCollectionFromPath(thisRef.path));
			} else {
				throw Error(thisRef.path+": Path doesn't exist");
			}
		}).then(console.log,console.log)
	}
	abc(this);
	*/
	if(dontFetch) {
		//light weight
	} else {
		this.uuid(function(path,isAPath){
			return function(err,uuid){
				if(uuid){
					if(isAPath){
						ab.store.obj.get.now(uuid,false,function(err,obj){ if(!obj) throw new Error(path+": Path doesn't exist");});
					} else {
						ab.store.obj.get.now(uuid,ab.util.parseCollectionFromPath(path),function(){});
					}
				} else{
					throw new Error(path+": Path doesn't exist");
				}
			};
		}(this.path,isAPath));
	}


	/*
	if (typeof ab.store.obj.storage[this.uuid()] == 'undefined'){
		var obj = {id:this.uuid(),collection:ab.util.parseCollectionFromPath(path)}
		ab.store.obj.storage[this.uuid()] = new AppbaseObj(obj);
	
	}*/

}

Appbase.ref = function(arg,dontFetch){
	return new AppbaseRef(arg,dontFetch);
}

Appbase.new = function(arg){
	return new AppbaseRef(arg);
}

/*
AppbaseRef.prototype.getLinks = function(collection,levels,limit,callback){
	this.getTree(1,function(treeObj){
		var pros = [];
		if(typeof treeObj.$links.$ordered[collection] == 'undefined'){
			treeObj.$links.$ordered[collection] = [];
		}

		for(var i = 0;i<limit && treeObj.$links.$ordered[collection].length;i++){
			treeObj.$links.$ordered[collection][i].$ref.get
		}
		Promise.all(treeObj.$linksOrdered.$)

	})
	this.uuidPro().then(function(uuid){
			return ab.util.getTreePro(levels,uuid);
	}).then(function(treeObj){
		var arry = [];
		for(var x in treeObj['@'+collection]){
			treeObj['@'+collection][x]['_id'] = x;
			arry.push(treeObj['@'+collection][x]);
		};
		callback(arry);
	})
}
*/


AppbaseRef.prototype.uuidPro = function(){
	return ab.util.pathToUuidPro(this.getPath()).then(function(uuid){ return uuid; });
}

AppbaseRef.prototype.uuid = function(callback) {
	ab.util.pathToUuid(this.path,callback);
}

AppbaseRef.prototype.linkRef = function (path){
	if(path == parseCollectionFromPath)
		isACollection = true;
	return new AppbaseRef(this.path+'/'+path)
}

/*
AppbaseRef.prototype.countLinks = function(collection,cb){
	
	this.uuidPro().then(function(uuid) { 
		return ab.store.obj.get.nowPro(uuid,false)
	}).then(function(obj){ 
		cb(Object.keys(obj[links][collection]).length);
	});

}
*/

AppbaseRef.prototype.getPath = function(){
	return this.path;
}

AppbaseRef.prototype.getKey = function(){
	return ab.util.parseKeyFromPath(this.path);
}

AppbaseRef.prototype.getCollection = function(){
	return ab.util.parseCollectionFromPath(this.path);
}

AppbaseRef.prototype.set= function(prop,val){
	var obj = {};
	obj[prop] = val;
	this.uuid(function(collection, propObj){
		return function(err,uuid){
			ab.store.obj.get.now(uuid,false,function(propObj){
				return function(err,obj){
					obj.setProps(propObj);
					ab.store.obj.put.nowId(obj.id)
				};
			}(propObj));
		};
	}(this.collection,obj));
	return this;
}

AppbaseRef.prototype.getTree = function (levels,cb){
	ab.util.getTreePro(levels,this).then(function(tree){
		cb(tree);
	});
}

AppbaseRef.prototype.get= function(prop,cb){
	if( typeof prop == typeof (function(){})) {
		var cb = prop;
		prop = null;
	}

	
	this.uuid(function( prop,cb){
		return function(err,uuid){
			ab.store.obj.get.now(uuid,false,function(prop,cb){
				return function(err,obj){
					if(prop){
						if(typeof  obj.properties[prop] == 'undefined')
							cb(null);
						else
							cb(obj.properties[prop]);
					} else {
						cb(ab.util.clone(obj.properties));
					}
				};
			}(prop,cb));
		};
	}(prop,cb));
}

AppbaseRef.prototype.on= function(event,fun,levels){
	var listenObj = [event,this.refId,fun,levels];
	
	/*
	this.uuidPro().then(function (uuid){
		return ab.store.obj.get.nowPro(uuid,false);
	}).then(function(obj){
		obj.listeners[listenObj[0]][listenObj[1]] = listenObj[2];;
	}).catch(console.log)
	
	*/
	var thisRef = this;
	this.uuid(function(collection, listenObj){
		return function(err,uuid){
			if (listenObj[0] =='link_changed' || listenObj[0] == 'subtree_changed'){
				ab.util.getTreePro(typeof listenObj[3] == 'undefined'? 2: listenObj[3],thisRef);
			}
			
			ab.store.obj.get.now(uuid,false,function(listenObj){
				return function(err,obj){
					obj.listeners[listenObj[0]][listenObj[1]] = listenObj[2];;
				};
			}(listenObj));
			
		};
	}(this.collection,listenObj)); 
}

AppbaseRef.prototype.off= function(event){
	var listenObj = [event,this.refId]
	/*
	this.uuidPro().then(function (uuid){
		return ab.store.obj.get.nowPro(uuid,false);
	}).then(function(obj){
		delete  obj.listeners[listenObj[0]][listenObj[1]];
	}).catch(console.log)
	*/
	
	this.uuid(function(collection, listenObj){
		return function(err,uuid){
			ab.store.obj.get.now(uuid,false,function(listenObj){
				return function(err,obj){
					delete  obj.listeners[listenObj[0]][listenObj[1]];
				};
			}(listenObj));
		};
	}(this.collection,listenObj));
	
}



AppbaseRef.prototype.addLink= function(linkKey,abRef){
	if(typeof linkKey == 'object'){
		var abRef = linkKey;
		linkKey = ab.util.parseKeyFromPath(abRef.getPath());
	}

	var linkPath = abRef.getPath();
	var linkCollection = ab.util.parseCollectionFromPath(linkPath);
	var linkName = linkCollection+':'+linkKey;
	
	Promise.all([this.getPath(),linkPath].map(function (path){return ab.util.pathToUuidPro(path)}))
	.then(function (uuids){
		return Promise.all(uuids.map(function (uuid) { return ab.store.obj.get.nowPro(uuid,false)}))
	}).then(function(objs){
		//objs[1].addParent(objs[0],ab.util.parseKeyFromPath(linkName));
		objs[0].addLink(linkName,objs[1].id);
		ab.store.obj.put.nowId(objs[0].id);
	});
	
	/*
	ab.util.pathToUuid(linkPath,function(linkName,linkPath,thisRef){
		return function(err,linkUuid){
			var linkCollection = ab.util.parseCollectionFromPath(linkName);
			var linkKey = ab.util.parseKeyFromPath(linkName) ;
			if(linkKey == '')
				linkKey = ab.util.parseKeyFromPath(linkPath);
				linkName = linkCollection+':'+linkKey;
			
			if(linkCollection != ab.util.parseCollectionFromPath(linkPath)){
				throw new Error("Collections don't match.");
				return;
			}
			else { //success
				ab.store.obj.get.now(linkUuid,false,function(linkName,linkPath,thisRef){
					return function(err,refObj){
						thisRef.uuid(function(linkName,refObj){
							return function(err,thisUuid){
								ab.store.obj.get.now(thisUuid,false,function(linkName,refObj){
									return function(err,thisObj){
										refObj.addParent(ab.store.obj.storage[thisObj.id],ab.util.parseKeyFromPath(linkName));
										thisObj.addLink(linkName,refObj.id);
										ab.store.obj.put.nowId(thisObj.id);
									}
								}(linkName,refObj));
							}
						}(linkName,refObj,thisRef.collection));
						
					}
				}(linkName,linkPath,thisRef));
			}
		};
	}(linkName,linkPath,this));
	*/
	
}

AppbaseRef.prototype.removeLink= function(abRef){	
	console.log('remove:'+abRef);
	Promise.all([this.getPath(),abRef.getPath()].map(function (path){return ab.util.pathToUuidPro(path)}))
	.then(function (uuids){
		return Promise.all(uuids.map(function (uuid) { return ab.store.obj.get.nowPro(uuid,false)}))
	}).then(function(objs){
		objs[0].removeLinkUuid(objs[1].id);
		ab.store.obj.put.nowId(objs[0].id);
	}); 

	/*
	this.uuidPro().then(
		function(uuid){ 
			return ab.store.obj.get.nowPro(uuid,false);
		}
	).then(
		function(obj){
			obj.removeLink(linkName);
			ab.store.obj.put.nowId(obj.id);
		}
	)
	*/
}
	

//test


//console.log(ab.util.parseCollectionFromPath('Tweet:s'))
//AbO.setProps({lala:"mama"});
//laafasf = AbO.generateSelfObj;
//laafasf["Tweet:asfasf"] = "zdsrhzdth"
//AbO.setNewSelfObj(laafasf);
//delete laafasf["Tweet:asfasf"]
//AbO.setNewSelfObj(laafasf);
//setTimeout(AbO.setNewSelfObj.bind(AbO,laafasf),5000);


//ab.auth.login('sdfSD','SDFSDF');
//abR = new Appbase.ref.('User:sagar/Tweet:ABC');

//abR.set('as','asdd');

/*
abR.on('subtree_changed',function(obj){
	console.log(obj);
});

ab21 = new Appbase.ref.('User:faad');


abR.addLink('User',ab21.getPath());

ab21.addLink('Tweet',(new Appbase.ref.('Tweet:123')).getPath())


abRNew = new Appbase.ref.('User:sagar/User:faad');


ab3 = new Appbase.ref.('Tweet:123')

abRNew.on('subtree_changed',function(obj){
	console.log(obj);
});

ab3.set('asd','rezdybry5')
*/
//console.log(abR.getSnapshot(8));

/*
abR = new Appbase.ref.('User:sagar');

abR.on('link_removed',function(obj){
	console.log(obj);
})

abc =  new Appbase.ref.('User:faad');



abR.addLink('User',abc.getPath())
setTimeout(function () {abR.removeLink('User:faad')},2000);





//uuidPro(abR.getPath()).then(console.log)
*/






//signup(ab.net.server+'signup', "sagar", "pass", function(){
	//authenticate(ab.net.server+'login', "sagar", "pass", function(){
		
	//});
//});
//authenticate(ab.net.server+'login', "abc@d.com", "pass", callback);

window['abFuncs'] = {};
Appbase.search = function( query, dn) {
	var path = ab.net.server;
	var uuidFunc = 'fchut'+ab.util.uuid().replace(/-/g,'');
	var closure = function(dn,uuidFunc){
		//console.log('asf')
		return function(uuids){	
			//console.log(uuids);
			delete window[uuidFunc];
			//uuids = ['sagar']
			Promise.all(uuids.map(function (uuid) {  return ab.store.obj.get.nowPro(uuid,false)})).then(function(objs){
				//console.log(objs);
				var refArray = [];
				objs.forEach(function(obj){
					refArray.push(Appbase.ref(obj.collection+':'+obj.id));
				});
				dn(refArray);
			});
		}
	}

	window[uuidFunc] = closure(dn,uuidFunc);
   var scr = document.createElement("script");
   scr.type = "text/javascript";
   scr.src = path+"search?callback="+uuidFunc+"&collection="+query.collection+"&property="+query.property+"&sstring="+query.sstring;
   document.body.appendChild(scr);
}
/*
abR = Appbase.ref('User:sagar');
abR.getTree(2);

abR.on('subtree_changed',function(obj){console.log(obj)});
abR.addLink(Appbase.ref('Tweet:ABC',true));
Appbase.ref('Tweet:ABC',true).set('asda','asdsd');
ab2 = Appbase.ref('Tweet:yo'); //ref turns invalid after removing link??
ab2.set('ads','asfasc');

//abR.removeLink('Tweet:ABC');
ab2.set('ads','ase');

/*abR.getLinks('Tweet',3,10,function(obj){
	console.log(obj);
});
console.log(typeof abR);

//abR.set('mood','happy');

for(var i = 0;i<10;i++){
	new Appbase.new('User:ad3'+i).set('yo',i)
}

Appbase.search({collection:'User',sstring:'happy',limit:10},function(a){
	//console.log(a);
	
	a.forEach(function(b){
		
		//b.getTree(2,function(txt){console.log(txt)});
	})
});
*/


},{"promise":4}],3:[function(require,module,exports){
'use strict';

var asap = require('asap')

module.exports = Promise
function Promise(fn) {
  if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new')
  if (typeof fn !== 'function') throw new TypeError('not a function')
  var state = null
  var value = null
  var deferreds = []
  var self = this

  this.then = function(onFulfilled, onRejected) {
    return new Promise(function(resolve, reject) {
      handle(new Handler(onFulfilled, onRejected, resolve, reject))
    })
  }

  function handle(deferred) {
    if (state === null) {
      deferreds.push(deferred)
      return
    }
    //asap(function() {
      var cb = state ? deferred.onFulfilled : deferred.onRejected
      if (cb === null) {
        (state ? deferred.resolve : deferred.reject)(value)
        return
      }
      var ret
      try {
        ret = cb(value)
      }
      catch (e) {
        deferred.reject(e)
        return
      }
      deferred.resolve(ret)
    //})
  }

  function resolve(newValue) {
    try { //Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
      if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.')
      if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
        var then = newValue.then
        if (typeof then === 'function') {
          doResolve(then.bind(newValue), resolve, reject)
          return
        }
      }
      state = true
      value = newValue
      finale()
    } catch (e) { reject(e) }
  }

  function reject(newValue) {
    state = false
    value = newValue
    finale()
  }

  function finale() {
    for (var i = 0, len = deferreds.length; i < len; i++)
      handle(deferreds[i])
    deferreds = null
  }

  doResolve(fn, resolve, reject)
}


function Handler(onFulfilled, onRejected, resolve, reject){
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null
  this.onRejected = typeof onRejected === 'function' ? onRejected : null
  this.resolve = resolve
  this.reject = reject
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, onFulfilled, onRejected) {
  var done = false;
  try {
    fn(function (value) {
      if (done) return
      done = true
      onFulfilled(value)
    }, function (reason) {
      if (done) return
      done = true
      onRejected(reason)
    })
  } catch (ex) {
    if (done) return
    done = true
    onRejected(ex)
  }
}

},{"asap":5}],4:[function(require,module,exports){
'use strict';

//This file contains then/promise specific extensions to the core promise API

var Promise = require('./core.js')
var asap = require('asap')

module.exports = Promise

/* Static Functions */

function ValuePromise(value) {
  this.then = function (onFulfilled) {
    if (typeof onFulfilled !== 'function') return this
    return new Promise(function (resolve, reject) {
      //asap(function () {
        try {
          resolve(onFulfilled(value))
        } catch (ex) {
          reject(ex);
        }
      //})
    })
  }
}
ValuePromise.prototype = Object.create(Promise.prototype)

var TRUE = new ValuePromise(true)
var FALSE = new ValuePromise(false)
var NULL = new ValuePromise(null)
var UNDEFINED = new ValuePromise(undefined)
var ZERO = new ValuePromise(0)
var EMPTYSTRING = new ValuePromise('')

Promise.from = Promise.cast = function (value) {
  if (value instanceof Promise) return value

  if (value === null) return NULL
  if (value === undefined) return UNDEFINED
  if (value === true) return TRUE
  if (value === false) return FALSE
  if (value === 0) return ZERO
  if (value === '') return EMPTYSTRING

  if (typeof value === 'object' || typeof value === 'function') {
    try {
      var then = value.then
      if (typeof then === 'function') {
        return new Promise(then.bind(value))
      }
    } catch (ex) {
      return new Promise(function (resolve, reject) {
        reject(ex)
      })
    }
  }

  return new ValuePromise(value)
}
Promise.denodeify = function (fn, argumentCount) {
  argumentCount = argumentCount || Infinity
  return function () {
    var self = this
    var args = Array.prototype.slice.call(arguments)
    return new Promise(function (resolve, reject) {
      while (args.length && args.length > argumentCount) {
        args.pop()
      }
      args.push(function (err, res) {
        if (err) reject(err)
        else resolve(res)
      })
      fn.apply(self, args)
    })
  }
}
Promise.nodeify = function (fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments)
    var callback = typeof args[args.length - 1] === 'function' ? args.pop() : null
    try {
      return fn.apply(this, arguments).nodeify(callback)
    } catch (ex) {
      if (callback === null || typeof callback == 'undefined') {
        return new Promise(function (resolve, reject) { reject(ex) })
      } else {
        //asap(function () {
          callback(ex)
        //})
      }
    }
  }
}

Promise.all = function () {
  var args = Array.prototype.slice.call(arguments.length === 1 && Array.isArray(arguments[0]) ? arguments[0] : arguments)

  return new Promise(function (resolve, reject) {
    if (args.length === 0) return resolve([])
    var remaining = args.length
    function res(i, val) {
      try {
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          var then = val.then
          if (typeof then === 'function') {
            then.call(val, function (val) { res(i, val) }, reject)
            return
          }
        }
        args[i] = val
        if (--remaining === 0) {
          resolve(args);
        }
      } catch (ex) {
        reject(ex)
      }
    }
    for (var i = 0; i < args.length; i++) {
      res(i, args[i])
    }
  })
}

/* Prototype Methods */

Promise.prototype.done = function (onFulfilled, onRejected) {
  var self = arguments.length ? this.then.apply(this, arguments) : this
  self.then(null, function (err) {
    //asap(function () {
      throw err
    //})
  })
}

Promise.prototype.nodeify = function (callback) {
  if (callback === null || typeof callback == 'undefined') return this

  this.then(function (value) {
    //asap(function () {
      callback(null, value)
    //})
  }, function (err) {
    //asap(function () {
      callback(err)
    //})
  })
}

Promise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected);
}


Promise.resolve = function (value) {
  return new Promise(function (resolve) { 
    resolve(value);
  });
}

Promise.reject = function (value) {
  return new Promise(function (resolve, reject) { 
    reject(value);
  });
}

Promise.race = function (values) {
  return new Promise(function (resolve, reject) { 
    values.map(function(value){
      Promise.cast(value).then(resolve, reject);
    })
  });
}

},{"./core.js":3,"asap":5}],5:[function(require,module,exports){
(function (process){

// Use the fastest possible means to execute a task in a future turn
// of the event loop.

// linked list of tasks (single, with head node)
var head = {task: void 0, next: null};
var tail = head;
var flushing = false;
var requestFlush = void 0;
var isNodeJS = false;

function flush() {
    /* jshint loopfunc: true */

    while (head.next) {
        head = head.next;
        var task = head.task;
        head.task = void 0;
        var domain = head.domain;

        if (domain) {
            head.domain = void 0;
            domain.enter();
        }

        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them synchronously to interrupt flushing!

                // Ensure continuation if the uncaught exception is suppressed
                // listening "uncaughtException" events (as domains does).
                // Continue in next event to avoid tick recursion.
                if (domain) {
                    domain.exit();
                }
                setTimeout(flush, 0);
                if (domain) {
                    domain.enter();
                }

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function() {
                   throw e;
                }, 0);
            }
        }

        if (domain) {
            domain.exit();
        }
    }

    flushing = false;
}

if (typeof process !== "undefined" && process.nextTick) {
    // Node.js before 0.9. Note that some fake-Node environments, like the
    // Mocha test runner, introduce a `process` global without a `nextTick`.
    isNodeJS = true;

    requestFlush = function () {
        process.nextTick(flush);
    };

} else if (typeof setImmediate === "function") {
    // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
    if (typeof window !== "undefined") {
        requestFlush = setImmediate.bind(window, flush);
    } else {
        requestFlush = function () {
            setImmediate(flush);
        };
    }

} else if (typeof MessageChannel !== "undefined") {
    // modern browsers
    // http://www.nonblocking.io/2011/06/windownexttick.html
    var channel = new MessageChannel();
    channel.port1.onmessage = flush;
    requestFlush = function () {
        channel.port2.postMessage(0);
    };

} else {
    // old browsers
    requestFlush = function () {
        setTimeout(flush, 0);
    };
}

function asap(task) {
    tail = tail.next = {
        task: task,
        domain: isNodeJS && process.domain,
        next: null
    };

    if (!flushing) {
        flushing = true;
        requestFlush();
    }
};

module.exports = asap;


}).call(this,require("C:\\Users\\Sagar\\AppData\\Roaming\\npm\\node_modules\\browserify\\node_modules\\insert-module-globals\\node_modules\\process\\browser.js"))
},{"C:\\Users\\Sagar\\AppData\\Roaming\\npm\\node_modules\\browserify\\node_modules\\insert-module-globals\\node_modules\\process\\browser.js":1}]},{},[2])