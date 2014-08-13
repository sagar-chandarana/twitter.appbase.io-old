var twitterApp = angular.module('twitter',['ngRoute','ngAppbase'])
twitterApp.run(function($rootScope,data,$location) {
  $rootScope.cleanup = function (){
    if($( ".temp-container" ).length >1){
      //$( ".temp-container" ).remove()
    }
  }
  $rootScope.$on("$locationChangeStart", function(){
    console.log('changing loc')
    $( ".temp-container" ).remove()
  })
  $rootScope.exit = function(){
    $rootScope.cleanup()
    data.exit()
    $location.path('/login')
  }
  $rootScope.gotoProfile = function(userId){
    $rootScope.cleanup()
    $location.path('/profile/'+userId)
  }
  $rootScope.goHome = function(feed){
    $rootScope.cleanup()
    $location.path('/home/'+feed)
  }
  $rootScope.hideNav = function (){
    $rootScope.$broadcast('hideNav',[1])
  }
  $rootScope.showNav = function (){
    $rootScope.$broadcast('showNav')
  }
})
twitterApp.config(function($routeProvider){
  $routeProvider
   .when('/',
   {
     controller:'login',
     templateUrl:'views/login.html'
   }
  ).when('/loading',
   {
     controller:'loading',
     templateUrl:'views/loading.html'
   }
  ).when('/profile/:userId',
   {
     controller:'profile',
     templateUrl:'views/profile.html'
   }
  ).when('/home/:feed',
   {
     controller:'home',
     templateUrl:'views/home.html'
   }
  ).otherwise({redirectTo:'/'})
})
twitterApp.controller('login', function ($scope, data, $location,$rootScope,$appbaseRef) {
  $rootScope.hideNav()
  $scope.tweets
  $scope.login = function() {
    data.setCurrentUser($scope.userId)
    $rootScope.cleanup()
    $location.path('/loading')
  }
  $appbaseRef('global/tweets').$bindEdges($scope,'tweets')
  if( $scope.userId = data.getCurrentLoggedInUserId()){
    $scope.login()
  }
  $scope.getSuperFeed = function(){
    AppbaseOld.ref('Global:SuperFeed').getTree(1,function(treeObj){
      treeObj.$links.$ordered['Tweet'].forEach(function(ref){
        ref.$ref.getTree(1,function(obj){
          //console.log(obj)
          $scope.tweets.push(obj)
          $scope.$apply()
        })
      })
    })
    AppbaseOld.ref('Global:SuperFeed').on('link_added',function(abRef){
      if (abRef.getCollection() == 'Tweet'){
        abRef.getTree(1,function(obj){
          $scope.tweets.unshift(obj)
          $scope.$apply()
        })
      }
    })
  }
  //OLD: $scope.getSuperFeed()
})
twitterApp.controller('loading', function ($rootScope,$scope, data, $location,$routeParams) {
  if(data.getCurrentLoggedInUserId()){
    //good!!
  } else{
    $rootScope.exit()
    return //exit the controller too
  }
  $scope.isNew = false
  $scope.goHome = function(){
    $rootScope.cleanup()
    $location.path('/home/personal')
  }
  var userId = data.getCurrentLoggedInUserId()
  data.getTreePro('User:'+data.getCurrentLoggedInUserId()).then(function(treeObj){
    console.log(treeObj)
    if(typeof treeObj.$properties.name == 'undefined' ){
      AppbaseOld.ref('Global:AllUsers').addLink(treeObj.$ref)
      treeObj.$ref.set('name',userId)
      treeObj.$ref.addLink('Following',AppbaseOld.new('UGroup'))
      treeObj.$ref.addLink('Followers',AppbaseOld.new('UGroup'))
      console.log(treeObj)
      data.setUserName( userId)
      setTimeout(function(){
        $scope.goHome()
        $scope.$apply()
      },2000)
    } else {
      data.setUserName( treeObj.$properties.name)
      $scope.goHome()
      $scope.$apply()
    }
  })
  /*
   $scope.setName = function(){
   AppbaseOld.ref('User:'+userId).set('name',$scope.name)
   data.setUserName($scope.name) 
   $scope.goHome()
   }*/
})
twitterApp.controller('navbar',function($scope,data,$location,$rootScope,$routeParams){
  $scope.bahar = true
  $scope.$on('showNav',function(){
    $scope.bahar = false
    $scope.$apply()
  })
  $scope.$on('hideNav',function(){
    $scope.bahar = true
    $scope.$apply()
  })
  $scope.exit= function(){
    $rootScope.exit()
  }
  $scope.gotoProfile= function(){
    $rootScope.gotoProfile(data.getCurrentLoggedInUserId())
  }
  $scope.goHome = function(feed){
    $rootScope.goHome(feed)
  }
})
twitterApp.controller('home',function($scope,data,$location,$rootScope,$routeParams){
  $rootScope.showNav()
  if(data.getCurrentLoggedInUserId()){
    //good!!
  } else{
    $rootScope.exit()
    return //exit the controller too
  }
  if(data.getUserName()){
    //good
  } else {
    $rootScope.cleanup()
    $location.path('/loading')
    return
  }
  var feed = typeof $routeParams.feed == 'undefined'? 'global': $routeParams.feed
  $scope.tweets = []
  $scope.people = []
  $scope.userName = data.getUserName()
  $scope.gotoProfile= function(userId){
    $rootScope.gotoProfile(userId)
  }
  data.getNoFollowers(data.getCurrentLoggedInUserId(),function(n){
    $scope.nFollowers = n
    $scope.$apply()
  })
  data.getNoFollowing(data.getCurrentLoggedInUserId(),function(n){
    $scope.nFollowing = n
    $scope.$apply()
  })
  AppbaseOld.ref('User:'+data.getCurrentLoggedInUserId()+'/UGroup:Followers').on('link_added',function(){
    data.getNoFollowers(data.getCurrentLoggedInUserId(),function(n){
      $scope.nFollowers = n
      $scope.$apply()
    })
  })
  AppbaseOld.ref('User:'+data.getCurrentLoggedInUserId()+'/UGroup:Following').on('link_added',function(userObj){
    userObj.getTree(1,function(obj){
      obj.$links.$ordered['Tweet'].forEach(function(tweetRef){
        //console.log(tweetRef)
        tweetRef.$ref.getTree(1,function(tObj){
          //console.log(tObj)
          $scope.personalTweets.unshift(tObj)
          $scope.$apply()
        })
      })
    })
    data.getNoFollowers(data.getCurrentLoggedInUserId(),function(n){
      $scope.nFollowers = n
      $scope.$apply()
    })
  })
  $scope.addTweet = function(){
    data.addTweet($scope.msg)
    $scope.msg = ''
  }
  data.getTreePro('Global:AllUsers',1).then(function(treeOfUsers){
    //console.log(treeOfUsers)
    treeOfUsers.$ref.on('link_added',function(ref){
      ref.getTree(1,function(obj){
        obj.$properties.name = obj.$key
        $scope.people.unshift(obj)
        $scope.$apply()
      })
    })
    userObjs = treeOfUsers.$links.$ordered['User']
    console.log(userObjs)
    data.getTreePro('User:'+data.getCurrentLoggedInUserId()+'/UGroup:Following').then(function(aayaObj){
      //console.log(aayaObj)
      userObjs.forEach(function(userObj){
        //console.log(userObj)
        if((typeof aayaObj.$links['User']== 'undefined' || typeof aayaObj.$links['User'][userObj.$key] == 'undefined') && data.getCurrentLoggedInUserId() != userObj.$key ){
          userObj.$ref.getTree(1,function(obj){
            //console.log(obj)
            $scope.people.push(obj)
            $scope.$apply()
          })
        }
      })
    })
  },function(obj){console.log(obj)})

  $scope.follow = function(userId,i){
    //console.log(userId,i)
    $scope.nFollowing++
    $scope.people.splice(i,1)
    AppbaseOld.ref('User:'+data.getCurrentLoggedInUserId()+'/UGroup:Following').addLink( AppbaseOld.ref('User:'+userId))
    AppbaseOld.ref('User:'+userId+'/UGroup:Followers').on('link_added',function(obj){
      console.log(obj)
    })
    AppbaseOld.ref('User:'+userId+'/UGroup:Followers').addLink(AppbaseOld.ref('User:'+data.getCurrentLoggedInUserId()))
    AppbaseOld.ref('User:'+userId+'/UGroup:Followers').addLink(AppbaseOld.ref('User:'+data.getCurrentLoggedInUserId()))
    AppbaseOld.ref('User:'+userId+'/UGroup:Followers').addLink(AppbaseOld.ref('User:'+data.getCurrentLoggedInUserId()))
  }
  if(feed == 'global'){
    $scope.tweets = []
    $scope.getSuperFeed = function(){
      AppbaseOld.ref('Global:SuperFeed').getTree(1,function(treeObj){
        treeObj.$links.$ordered['Tweet'].forEach(function(ref){
          //console.log(ref)
          ref.$ref.getTree(1,function(obj){
            //console.log(obj)
            $scope.tweets.push(obj)
            $scope.$apply()
          })
        })
      })
      AppbaseOld.ref('Global:SuperFeed').on('link_added',function(abRef){
        if (abRef.getCollection() == 'Tweet'){
          abRef.getTree(1,function(obj){
            $scope.tweets.unshift(obj)
            $scope.$apply()
          })
        }
      })
    }
    $scope.getSuperFeed()
  } else {
    $scope.personalTweets = []
    data.getTreePro('User:'+data.getCurrentLoggedInUserId(),2).then(function(userObj){
      userObj.$links.$ordered['Tweet'].forEach(function(tweet){
        $scope.personalTweets.push(tweet)
        $scope.$apply()
      })
      userObj.$ref.on('link_added',function(abRef){
        if (abRef.getCollection() == 'Tweet'){
          abRef.getTree(1,function(obj){
            $scope.personalTweets.unshift(obj)
            $scope.$apply()
          })
        }
      })
    })
    AppbaseOld.ref('User:'+data.getCurrentLoggedInUserId()+'/UGroup:Following').getTree(1,function(treeObj){
      console.log(treeObj)
      treeObj.$links.$ordered['User'].forEach(function(userObj){
        console.log(userObj)
        userObj.$ref.getTree(1,function(obj){
          obj.$links.$ordered['Tweet'].forEach(function(tweetRef){
            console.log(tweetRef)
            tweetRef.$ref.getTree(1,function(tObj){
              console.log(tObj)
              $scope.personalTweets.push(tObj)
              $scope.$apply()
            })
          })
        })
        userObj.$ref.on('link_added',function(abRef){
          if (abRef.getCollection() == 'Tweet'){
            abRef.getTree(1,function(obj){
              $scope.personalTweets.unshift(obj)
              $scope.$apply()
            })
          }
        })
      })
      $scope.$apply()
    })
  }
})
twitterApp.controller('profile',function($scope,data,$location,$rootScope,$routeParams){
  $rootScope.showNav()
  if(data.getCurrentLoggedInUserId()){
    //good!!
  } else{
    $rootScope.exit()
    return //exit the controller too
  }
  console.log(data.getUserName())
  if(data.getUserName()){
    //good
  } else {
    $rootScope.cleanup()
    $location.path('/loading')
    return
  }
  $scope.tweets = []
  $scope.followers = []
  $scope.following = []
  var userId = $routeParams.userId
  $scope.userId = $routeParams.userId
  $scope.isMe = data.getCurrentLoggedInUserId() == userId
  $scope.userName = $routeParams.userId
  $scope.isBeingFollowed = true
  $scope.isReady = false
  data.getTreePro('User:'+data.getCurrentLoggedInUserId()+'/UGroup:Following').then(function(aayaObj){
    //console.log(aayaObj)
    if((typeof aayaObj.$links['User']== 'undefined' || typeof aayaObj.$links['User'][userId] == 'undefined') ){
      $scope.isBeingFollowed = false
    }
    $scope.isReady = true
    $scope.$apply()
  })
  $scope.gotoProfile= function(userId){
    $rootScope.gotoProfile(userId)
  }
  $scope.follow = function(userId,i){
    //console.log(userId,i)
    $scope.nFollowers++
    $scope.isBeingFollowed = true
    AppbaseOld.ref('User:'+data.getCurrentLoggedInUserId()+'/UGroup:Following').addLink( AppbaseOld.ref('User:'+userId))
    AppbaseOld.ref('User:'+userId+'/UGroup:Followers').on('link_added',function(obj){
      console.log(obj)
    })
    AppbaseOld.ref('User:'+userId+'/UGroup:Followers').addLink(AppbaseOld.ref('User:'+data.getCurrentLoggedInUserId()))
    AppbaseOld.ref('User:'+userId+'/UGroup:Followers').addLink(AppbaseOld.ref('User:'+data.getCurrentLoggedInUserId()))
    AppbaseOld.ref('User:'+userId+'/UGroup:Followers').addLink(AppbaseOld.ref('User:'+data.getCurrentLoggedInUserId()))
    $scope.getFollowers()
  }
  $scope.unFollow = function(userId,i){
    console.log(userId,i)
    if(typeof i != 'undefined') $scope.following.splice(i,1)
    AppbaseOld.ref('User:'+data.getCurrentLoggedInUserId()+'/UGroup:Following').removeLink( AppbaseOld.ref('User:'+userId))
    AppbaseOld.ref('User:'+userId+'/UGroup:Followers').removeLink(AppbaseOld.ref('User:'+data.getCurrentLoggedInUserId()))
    if($scope.isMe){
      $scope.nFollowing--
      $scope.getFollowing()
    }
    else{
      $scope.nFollowers--
      $scope.isBeingFollowed = false
      $scope.getFollowers()
    }
  }
  data.getNoFollowers(userId,function(n){
    $scope.nFollowers = n
    $scope.$apply()
  })
  data.getNoFollowing(userId,function(n){
    $scope.nFollowing = n
    $scope.$apply()
  })
  $scope.getUserTweets = function(){
    AppbaseOld.ref('User:'+userId).getTree(2,function(treeObj){
      treeObj.$links.$ordered['Tweet'].forEach(function(obj){
        $scope.tweets.push(obj)
      })
      $scope.$apply()
    })
    AppbaseOld.ref('User:'+userId).on('link_added',function(abRef){
      if (abRef.getCollection() == 'Tweet'){
        abRef.getTree(1,function(obj){
          //console.log(obj)
          $scope.tweets.unshift(obj)
          $scope.personalTweets.unshift(obj)
          $scope.$apply()
        })
      }
    })
  }
  $scope.getFollowers = function(){
    $scope.followers = []
    AppbaseOld.ref('User:'+userId+'/UGroup:Followers').getTree(2,function(treeObj){
      //console.log(treeObj)
      treeObj.$links.$ordered['User'].forEach(function(obj){
        $scope.followers.push(obj)
      })
      $scope.$apply()
    })
  }
  $scope.getFollowing = function(){
    $scope.following = []
    AppbaseOld.ref('User:'+userId+'/UGroup:Following').getTree(2,function(treeObj){
      //console.log(treeObj)
      treeObj.$links.$ordered['User'].forEach(function(obj){
        $scope.following.push(obj)
      })
      $scope.$apply()
    })
  }
  $scope.addTweet = function(){
    data.addTweet($scope.msg)
    $scope.msg = ''
    $scope.time = new Date().getTime()
  }
  //console.log(isMe)
  $scope.getUserTweets()
  $scope.getFollowers()
  $scope.getFollowing()
})
twitterApp.factory('data',function(){
  fact = {}
  var userName
  fact.setUserName = function(name){
    userName = name
  }
  fact.getUserName = function(){
    return userName
  }
  fact.getNoFollowers = function(userId,cb){
    fact.getTreePro('User:'+userId+"/UGroup:Followers").then(function(treeObj){
      cb(typeof treeObj.$links.$count['User'] != 'undefined'?  treeObj.$links.$count['User']:0 )
    })
  }
  fact.getNoFollowing = function(userId,cb){
    fact.getTreePro('User:'+userId+"/UGroup:Following").then(function(treeObj){
      cb(typeof treeObj.$links.$count['User'] != 'undefined'?  treeObj.$links.$count['User']:0 )
    })
  }
  fact.getTreePro = function (link,levels){
    return new Promise(function(resolve,reject){
      AppbaseOld.ref(link).getTree((typeof levels == 'undefined'? 1: levels),function(treeObj){
        //console.log(treeObj)
        resolve(treeObj)
      })
    })
  }
  fact.addTweet = function(msg){
    var ab = AppbaseOld.new('Tweet').set('msg',msg).set('by',userName)
    AppbaseOld.ref('User:'+fact.getCurrentLoggedInUserId()).addLink(ab)
    AppbaseOld.ref('Global:SuperFeed').addLink(ab)
  }
  fact.setCurrentUser = function(userId){
    localStorage.setItem("currentLoggedInUser", userId)
  }
  fact.exit = function(){
    localStorage.removeItem("currentLoggedInUser")
    fact.userName = null
  }
  fact.getCurrentLoggedInUserId = function(){
    return localStorage.getItem("currentLoggedInUser")
  }
  return fact
})