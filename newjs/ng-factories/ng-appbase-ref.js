/**
 * Created by Sagar on 12/8/14.
 */
angular.module('ngAppbase',[])
 .factory('$appbaseRef',function() {
   var ngAppbaseRef = function(input) {
     /* accepts a path, or an appbase reference and returns ngAppbaseRef,
          a wrapper that supports $bindProperties and $bindEdges, which binds
          a model to vertex's properties or edges.
          'bindProperties' binds model to a JSON object
          'bindEdges'binds model to an array, where edges are sorted by priorities. Each object in array: {name: 'edgeName', priority:'edge priority', properties: {out vertex's properties}}
      */
     var ref;
     if(typeof input === "string")
       ref = Appbase.ref(input)
     else if(typeof input === "object" && typeof input.path() === "string")
       ref = input
     else throw ("Invalid argument to create an ngAppbaseRef")

     var bindProperties = function(remoteScope, varName) {
       ref.on('properties',function(error, ref, vSnap) {
         if(error) {
           throw error
           return
         }
         remoteScope.$apply(function(){
           remoteScope[varName] = vSnap.properties()
         })
       })

       remoteScope.$on('$destroy', function() {
         ref.off('properties')
       })
     }

     var bindEdges = function(remoteScope, varName) {
       var edges = []
       var toBeDeleted = {}
       varName && (remoteScope[varName] = edges)

       var add = function(name, priority, properties) {
         if(toBeDeleted[name+priority] > 0) {
           toBeDeleted[name+priority]--
           return
         }
         var added;
         /* using angular filters for ordering
         for(var i = 0; i<edges.length; i++) {
           if(edges[i].priority > priority) {
             remoteScope.$apply(function(){
               edges.splice(i, 0, {name:name,priority:priority,properties:properties})
             })
             added = true
             break
           }
         }
         */
         if(!added) {
           remoteScope.$apply(function(){
             edges.push({name:name,priority:priority,properties:properties})
           })
         }
       }

       var remove = function(name, priority) {
         var deleted;
         for(var i = 0; i < edges.length; i++) {
           if(edges[i].priority ===  priority && edges[i].name === name) {
             remoteScope.$apply(function(){
               edges.splice(i,1)
             })
             deleted = true
             break
           }
         }
         if(!deleted){
           if(toBeDeleted[name+priority] === undefined)
             toBeDeleted[name+priority] = 0

           toBeDeleted[name+priority]++
         }

       }

       ref.on('edge_added',function(error,edgeRef,edgeSnap) {
         if(error){
           throw error
           return
         }
         edgeRef.on('properties',function(error,r,outVertexSnap) {
           edgeRef.off()
           add(edgeSnap.name(),edgeSnap.priority(),outVertexSnap.properties())
         })
       })

       ref.on('edge_removed',function(error,edgeRef,edgeSnap) {
         if(error){
           throw error
           return
         }
         remove(edgeSnap.name(),edgeSnap.prevPriority())
       })

       ref.on('edge_changed',function(error,edgeRef,edgeSnap) {
         if(error){
           throw error
           return
         }
         remove(edgeSnap.name(),edgeSnap.prevPriority())
         edgeRef.on('properties',function(error,r,outVertexSnap) {
           edgeRef.off()
           add(edgeSnap.name(),edgeSnap.priority(),outVertexSnap.properties())
         })
       })

       remoteScope.$on('$destroy', function() {
         ref.off('edge_added')
         ref.off('edge_removed')
         ref.off('edge_changed')
       })

       return edges
     }

     return {
       $ref: function() {
         return ref
       },
       $setData: ref.setData,
       $removeData: ref.removeData,
       $path: ref.path,
       $URL: ref.URL,
       $setEdge: function($abRef, name ,priority ,callback){
         return ref.setEdge($abRef.$ref(), name, priority, callback)
       },
       $removeEdge: ref.removeEdge,
       $inVertex: function() {
         return ngAppbaseRef(ref.inVertex())
       },
       $outVertex: function(edgeName){
         return ngAppbaseRef(ref.outVertex(edgeName))
       },
       $bindProperties:bindProperties,
       $bindEdges:bindEdges
     }
   }

   return ngAppbaseRef
 })
