var ab = {
  cache: {},
  server: {
    realtime:{}
  },
  interface: {},
  util: {},
  firing: {}
}

var Appbase = {}

ab.server.realtime.socket = io('http://aphrodite.api1.appbase.io:80/')
ab.server.realtime.socket.on('reconnect', function() {
  console.log('reconnect')
  //re-emit events, with timestamp
  for(var url in ab.server.vertex.urlsListening){
    ab.server.vertex.urlsListening[url].timestamp = ab.cache.timestamps[url] !== undefined?
       ab.cache.timestamps[url]['vertex']:undefined
    console.log('re-emitting:', url,'properties')
    ab.server.realtime.socket.emit('properties', ab.server.vertex.urlsListening[url])
  }

  for(var url in ab.edges.vertex.urlsListening){
    ab.server.edges.urlsListening[url].timestamp = ab.cache.timestamps[url] !== undefined?
       ab.cache.timestamps[url]['edges']:undefined
    console.log('re-emitting:', url,'edges')
    ab.server.realtime.socket.emit('edges', ab.server.vertex.urlsListening[url])
  }

})

ab.cache = {
  memStore: {},
  timestamps: {},
  newVertices: {},
  // Vertex cache methods - set, get, remove
  set: function(type, url, data) {
    if (!ab.cache.memStore.hasOwnProperty(url)) {
      ab.cache.memStore[url] = {"vertex":{}, "edges":{}}
      ab.cache.timestamps[url] = {}
    }
    for (var key in data) {
      if(type !== 'vertex' || (key != '_id' && key != 'timestamp')) {
        ab.cache.memStore[url][type][key] = data[key]
        if(type === 'edges' && (ab.cache.timestamps[url][type] === undefined 
            || ab.cache.timestamps[url][type] < data[key]['timestamp'] ))
          ab.cache.timestamps[url][type] = data[key]['timestamp']
      }
    }
    if(type === 'vertex')
      ab.cache.timestamps[url][type] = data['timestamp']
  },

  get: function(type, url, isClone) {
    var isClone = typeof isClone !== 'undefined' ? isClone : true
    if (isClone && ab.cache.memStore.hasOwnProperty(url)) {
      return JSON.parse(JSON.stringify(ab.cache.memStore[url][type]))
    } else if (!isClone && ab.cache.memStore.hasOwnProperty(url)) {
      return ab.cache.memStore[url][type]
    } else {
      return {}
    }
  },

  remove: function(type, url, data) {
    if (ab.cache.memStore.hasOwnProperty(url) && typeof data === "undefined")
      ab.cache.memStore[url][type] = {}
    else if (ab.cache.memStore.hasOwnProperty(url)) {
      for (var key in data)
        delete ab.cache.memStore[url][type][data[key]]
    }
  }
}

ab.server.vertex = {
  urlsListening: {},
  set: function(url, data, callback) {
    // catch data validation errors at the user interface level function
    atomic.patch(url + "/~properties", {"data":data, "secret": ab.server.getAppSecret()})
      .success(function(result) {
        if(typeof result === 'string') {
          callback(new Error(result))
        } else {
          callback(null, result)
        }
      })
      .error(callback)
  },
  listen: function(url, requestdata, callback) {
    // url format - 'http://appname.localhost:5005/Materials/Ice/dad/dsd'
    var data = ab.util.parseURL(url)
    data["all"] = requestdata.all
    data["data"] = requestdata.data
    data["secret"] = ab.server.getAppSecret()
    ab.server.realtime.socket.on(JSON.stringify(data), function(result) {
      console.log(result)
      if(typeof result === 'string') {
        console.log(result)
        delete ab.server.vertex.urlsListening[url]
        if(result === 'STOPPED')
          return

        try {
          callback(new Error(result))
        } catch(e) {
          console.log(e)
        }
      } else {
        var previous = ab.cache.get("vertex", url)
        switch(result.optype) {
          case 'REMOVE ALL':
            ab.cache.remove("vertex", url)
            break
          case 'REMOVE':
            ab.cache.remove("vertex", url, Object.keys(result.vertex))
            break
          default :
            ab.cache.set("vertex", url, result.vertex)
        }
        result.vertexCache = ab.cache.get("vertex", url)
        try{
          ab.firing.prepareForProperties(result.optype, url, previous, result.vertexCache)
        } catch(e) {
          console.log(e)
        }

        try {
          callback(null, result)
        } catch(e) {
          console.log(e)
        }
      }
    })
    ab.server.vertex.urlsListening[url] = data
    ab.server.realtime.socket.emit("properties", data)
  },
  unlisten: function(url) {
    var data = ab.server.vertex.urlsListening[url]
    delete ab.server.vertex.urlsListening[url]
    if(data){
      delete data.timestamp
      ab.server.realtime.socket.emit("properties off", data)
    }
  },
  delete: function(url, data, callback) {
    data.secret = ab.server.getAppSecret()
    atomic.delete(url+"/~properties", data)
      .success(function(result) {
        if(typeof result === 'string') {
          callback(new Error(result))
        } else {
          callback(null, result)
        }
      })
      .error(callback)
  }
} /* End of server vertices */

ab.server.edges = {
  urlsListening: {},
  set: function(url, data, callback) {
    // catch data validation errors at the user interface level function
    atomic.patch(url + "/~edges", {"data":data, "secret":ab.server.getAppSecret()})
      .success(function(result) {
        if(typeof result === 'string') {
          callback(new Error(result))
        } else {
          callback(null, result)
        }
      })
      .error(callback)
  },
  unlisten: function(url) {
    var data = ab.server.edges.urlsListening[url]
    delete ab.server.edges.urlsListening[url]
    if(data){
      delete data.timestamp
      ab.server.realtime.socket.emit("edges off", data)
    }
  },
  listen: function(url, requestdata, callback) {
    // url format - 'http://appname.localhost:5005/Materials/Ice/dad/dsd'
    var data = ab.util.parseURL(url)
    data["filters"] = requestdata.filters
    data["secret"] = ab.server.getAppSecret()
    ab.server.realtime.socket.on(JSON.stringify(data), function(result) {
      console.log(result)
      if(typeof result === 'string') {
        console.log(result)
        delete ab.server.edges.urlsListening[url]
        if(result === 'STOPPED')
          return
        try {
          callback(new Error(result))
        } catch(e) {
          console.log(e)
        }
      } else {
        var previous = ab.cache.get("edges", url)
        try {
          switch(result.optype) {
            case 'REMOVE ALL':
              ab.cache.remove("edges", url)
              ab.firing.prepareForEdges(result.optype, url, previous, {})
              break
            case 'REMOVE':
              ab.cache.remove("edges", url, Object.keys(result.edges))
              ab.firing.prepareForEdges(result.optype, url, previous, result.edges)
              break
            default:
              for(var edge in result.edges) {
                if(result.edges[edge].t_id === "") {
                  delete result.edges[edge]
                }
              }
              ab.cache.set("edges", url, result.edges)
              ab.firing.prepareForEdges(result.optype, url, previous, result.edges)
          }
        } catch(e) {
          console.log(e)
        }
        result.edgeCache = ab.cache.get("edges", url)
        try {
          callback(null, result)
        } catch(e) {
          console.log(e)
        }
      }
    })

    ab.server.edges.urlsListening[url] = data
    ab.server.realtime.socket.emit("edges", data)
  },
  delete: function(url, data, callback) {
    data.secret = ab.server.getAppSecret()
    atomic.delete(url+"/~edges", data)
      .success(function(result) {
        if(typeof result === 'string') {
          callback(new Error(result))
        } else {
          callback(null, result)
        }
      })
      .error(callback)
  }
} /* End of server edges */

ab.interface.ref = function(path) {
  var referenceID = ab.util.uuid()

  var internalFunctions = {
    onProperties: function(interfaceCallback) {
      if(ab.server.vertex.urlsListening[exports.URL()]) {
        ab.firing.prepareForProperties('RETR', exports.URL(), {}, 
          ab.cache.get('vertex', exports.URL()), interfaceCallback)
      }
      amplify.subscribe("properties:"+exports.URL(), referenceID, interfaceCallback)
      if(!ab.server.vertex.urlsListening[exports.URL()]) {
        ab.server.vertex.listen(exports.URL(), {all:true}, function(error, request) {
          if(error) {
            interfaceCallback(error)
            amplify.unsubscribe("properties:"+exports.URL(), referenceID)
            if(amplify.subscriptionCount("properties:"+exports.URL()) === 0){
              ab.server.vertex.unlisten(exports.URL())
            }
          }
        })
      }
    },
    onEdges: function(event, interfaceCallback) {
      if(ab.server.edges.urlsListening[exports.URL()]) {
        if(event == "edge_added")
          ab.firing.prepareForEdges('RETR', exports.URL(), {},
            ab.cache.get('edges', exports.URL()), interfaceCallback)
      }
      amplify.subscribe(event+":"+exports.URL(), referenceID, interfaceCallback)
      if(!ab.server.edges.urlsListening[exports.URL()]) {
        ab.server.edges.listen(exports.URL(), {"filters": {}}, function(error, request) {
          if(error) {
            interfaceCallback(error)
            amplify.unsubscribe(event+":"+exports.URL(), referenceID)
          }
        })
      }
    }
  }

  var exports = {}

  exports.URL = function() {
    return ab.util.pathToURL(path)
  }

  exports.path = function() {
    return path
  }

  exports.outVertex = function(edgeName) {
    return new ab.interface.ref(path+'/'+edgeName)
  }

  exports.inVertex = function() {
    return new ab.interface.ref(path.slice(0, path.lastIndexOf('/')))
  }

  exports.on = function(event, callback) {
    if(!(typeof event === "string" && typeof callback === "function"))
      throw  "Invalid arguments."

    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path]) {
        setTimeout(checkForCreationAndGoAhead,200)
      } else {
        if(event == 'properties')
          internalFunctions.onProperties(callback)
        else internalFunctions.onEdges(event, callback)
      }
    }
    checkForCreationAndGoAhead()
  }

  exports.off = function(event) {
    if(event) {
      amplify.unsubscribe(event + ":" + exports.URL(), referenceID)
      if(event === "properties" && amplify.subscriptionCount("properties:"+exports.URL()) === 0) {
        ab.server.vertex.unlisten(exports.URL())
      }

      if(event !== "properties" && amplify.subscriptionCount("edge_added:"+exports.URL()) === 0
         && amplify.subscriptionCount("edge_removed:"+exports.URL()) === 0
         && amplify.subscriptionCount("edge_changed:"+exports.URL()) === 0) {
        ab.server.edges.unlisten(exports.URL())
      }


    } else {
      amplify.unsubscribe("properties:" + exports.URL(), referenceID)
      amplify.unsubscribe("edge_added:" + exports.URL(), referenceID)
      amplify.unsubscribe("edge_removed:" + exports.URL(), referenceID)
      amplify.unsubscribe("edge_changed:" + exports.URL(), referenceID)

      if(amplify.subscriptionCount("properties:"+exports.URL()) === 0) {
        ab.server.vertex.unlisten(exports.URL())
      }

      if(amplify.subscriptionCount("edge_added:"+exports.URL()) === 0
       && amplify.subscriptionCount("edge_removed:"+exports.URL()) === 0
       && amplify.subscriptionCount("edge_changed:"+exports.URL()) === 0) {
        ab.server.edges.unlisten(exports.URL())
      }
    }
  }

  exports.setData = function(data, callback) {
    ab.server.vertex.set(exports.URL(), data, function(error) {
      if(!error)
        callback && callback(error, exports)
      else {
        if(callback)
          callback(error)
        else
          throw error
      }
    })
  }

  exports.removeData = function(data, callback) {
    if(typeof data === "boolean") {
      if(data) {
        var all = data
        data = undefined
      } else {
        throw "data can't be `false`."
      }
    }

    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path]) {
        setTimeout(checkForCreationAndGoAhead,200)
      } else {
        ab.server.vertex.delete(exports.URL(), {data:data, all:all}, function(error) {
          if(!error)
            callback && callback(error, exports)
          else {
            if(callback)
              callback(error)
            else
              throw error
          }
        })
      }
    }
    checkForCreationAndGoAhead()
  }

  exports.setEdge = function(ref, name, priority, callback) {
    if(typeof priority == 'function' && callback === undefined) {
      var callback = priority
      priority = undefined
    }

    var data = {}

    data[name] = {
      path: ref.path(),
      order: priority === undefined? null:priority
    }

    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path] || ab.cache.newVertices[ref.path()]) {
        setTimeout(checkForCreationAndGoAhead,200)
      } else {
        ab.server.edges.set(exports.URL(), data, function(error, result) {
          if(!error) {
            callback && callback(error, exports)
          } else {
            if(callback)
              callback(error)
            else
              throw error
          }
        })
      }
    }
    checkForCreationAndGoAhead()
  }

  exports.removeEdge = function(edgeName, callback) {
    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path]) {
        setTimeout(checkForCreationAndGoAhead, 200)
      } else {
        ab.server.edges.delete(exports.URL(), {data:[edgeName]}, function(error, result) {
          if(!error) {
            callback && callback(error, exports)
          } else {
            if(callback)
              callback(error)
            else
              throw error
          }
        })
      }
    }
    checkForCreationAndGoAhead()
  }
  return exports
}

ab.firing = {
  prepareForProperties: function(optype, url, previous, current, callback) {
    ab.firing.fireForProperties(url, previous, current, callback)
  },
  prepareForEdges: function(optype, url, previous, current, callback) {
    switch(optype) {
      case "REMOVE ALL":
        for(var edgeName in previous) {
          ab.firing.fireForEdges(url, "edge_removed", previous[edgeName], {}, 
              edgeName, callback)
        }
        break
      case "REMOVE":
        for(var edgeName in current) {
          if(previous[edgeName] !== undefined)
            ab.firing.fireForEdges(url, "edge_removed", previous[edgeName], {}, 
                edgeName, callback)
        }
        break
      default :
        for(var edgeName in current) {
          if(previous[edgeName] !== undefined)
            ab.firing.fireForEdges(url, "edge_changed",
                previous[edgeName], current[edgeName], edgeName, callback)
          else 
            ab.firing.fireForEdges(url, "edge_added", {}, current[edgeName], 
                edgeName, callback)
        }
    }
  },
  fireForProperties: function(url, previous, current, callback) {
    var vertexSnapshot = ab.util.createVertexSnapshot(previous, current)
    if(typeof callback == 'function') {
      callback(null, ab.interface.ref(ab.util.URLToPath(url)), vertexSnapshot)
    } else {
      amplify.publish('properties:'+url, null, ab.interface.ref(ab.util.URLToPath(url)),
          vertexSnapshot)
    }
  },
  fireForEdges: function(url, event, previous, current, edgeName, callback) {
    var edgeSnapshot = ab.util.createEdgeSnapshot(previous, current, edgeName)
    if(typeof callback == 'function') {
      callback(null, ab.interface.ref(ab.util.URLToPath(url)+'/'+edgeName), edgeSnapshot)
    } else {
      amplify.publish(event+':'+url, null, ab.interface.ref(ab.util.URLToPath(url)
          +'/'+edgeName), edgeSnapshot)
    }
  }
}

Appbase.credentials = function(appName, appSecret) {
  ab.server.setBaseURL('http://'+ appName + '.' + 'api1.appbase.io')
  ab.server.setAppSecret(appSecret) // TODO: Use server method to set secret
  return true
}

ab.server.setBaseURL = function(baseURL) {
  ab.server.baseURL = ab.util.cutLeadingTrailingSlashes(baseURL)
}

ab.server.setAppSecret = function(appSecret) {
  ab.server.appSecret = appSecret
}

ab.server.getAppSecret = function() {
  return ab.server.appSecret
}

ab.server.getBaseURL = function() {
  return ab.server.baseURL
}

Appbase.ref = function(path) {
  return ab.interface.ref(path)
}

Appbase.create = function(namespace, key) {
  if(key === undefined){
    key = ab.util.uuid()
  } else if (namespace && key) {
  } else {
    throw 'Invalid arguments'
  }
  var path = namespace+'/'+key
  ab.cache.newVertices[path] = true
  ab.server.vertex.set(ab.util.pathToURL(path), {}, function(error) {
    delete ab.cache.newVertices[path]
  })
  return ab.interface.ref(path)
}

ab.util = {
  createVertexSnapshot: function(previous, current) {
    return {
      properties: function() {
        return current
      },
      prevProperties: function() {
        return previous
      }
    }
  },
  createEdgeSnapshot: function(previous, current, edgeName) {
    return {
      name: function() {
        return edgeName
      },
      prevPriority: function() {
        return previous.order
      },
      priority: function() {
        return current.order
      }
    }
  },
  cutLeadingTrailingSlashes: function(input) {
    while(input.charAt(input.length - 1) === '/') {
      input = input.slice(0,-1);
    }
    while(input.charAt(0) === '/') {
      input = input.slice(1);
    }
    return input;
  },
  pathToURL: function(path) {
    if(ab.server.baseURL) {
      return ab.server.baseURL+ '/' +ab.util.cutLeadingTrailingSlashes(path)
    } else {
      throw 'baseURL is not set.'
    }
  },
  URLToPath: function(URL) {
    return URL.replace(ab.server.baseURL + '/','')
  },
  uuid: function() {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8)
      return v.toString(16)
    })
  },
  parseURL: function(url) {
    var intermediate
    intermediate = url.split(/\/\/(.+)?/)[1].split(/\.(.+)?/)
    var appname = intermediate[0]
    intermediate = intermediate[1].split(/\/(.+)?/)[1].split(/\/(.+)?/)
    var namespace = intermediate[0]
    if(intermediate[1]) {
      intermediate = intermediate[1].split(/\/(.+)?/)
      var key = intermediate[0]
      var obj_path = intermediate[1]
    }
    return {
      appname: appname,
      namespace: namespace,
      key: key,
      obj_path: obj_path
    }
  }
}