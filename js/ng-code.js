uuid = function() {
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8)
    return v.toString(16)
  })
}
var twitterApp = angular.module('twitter',['ngRoute','ngAppbase'])
twitterApp.run(function($rootScope,userSession,$location) {
  $rootScope.$on("$locationChangeStart", function(){
    $(".temp-container").remove()
  })
  $rootScope.exit = function(){
    userSession.exit()
    $location.path('/login')
  }
  $rootScope.gotoProfile = function(userId){
    $location.path('/profile/'+userId)
  }
  $rootScope.goHome = function(feed){
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
twitterApp.controller('login', function ($scope, userSession, $location,$rootScope,$appbaseRef) {
  $rootScope.hideNav()

  $scope.login = function() {
    userSession.setCurrentUser($scope.userId)
    $location.path('/loading')
  }

  if( $scope.userId = userSession.getCurrentLoggedInUserId()){
    $scope.login()
  }

  //$appbaseRef('global/tweets').$bindEdges($scope,'tweets')

})
twitterApp.controller('loading', function ($rootScope,$scope, userSession, $location,$appbaseRef) {
  if(userSession.getCurrentLoggedInUserId()){
    //good!!
  } else {
    $rootScope.exit()
    return //exit the controller too
  }
  var ready = function() {
    userSession.setUserName(userId)
    $scope.$apply(function(){
      $rootScope.goHome('personal')
    })
  }
  var userId = userSession.getCurrentLoggedInUserId()
  var userRef = Appbase.create('user',userSession.getCurrentLoggedInUserId())
  userRef.on('properties',function(error, ref, snap) {
    userRef.off()
    if(error){
      throw error
      return
    }

    if(snap.properties().name === undefined) {
      Appbase.ref('global/users').setEdge(userRef,userId)
      userRef.setData({
        name: userId
      })
      userRef.setEdge(Appbase.create('misc'),'following')
      userRef.setEdge(Appbase.create('misc'),'followers')
      userRef.setEdge(Appbase.create('misc'),'tweets',function(error){
        if(error){
          throw error
          return
        }
        ready()
      })
    } else {
      ready()
    }
  })
})
twitterApp.controller('navbar',function($scope,userSession,$location,$rootScope,$routeParams){
  $scope.bahar = true
  $scope.$on('showNav',function(){
    $scope.bahar = false
  })
  $scope.$on('hideNav',function(){
    $scope.bahar = true
  })
  $scope.exit= function(){
    $rootScope.exit()
  }
  $scope.gotoProfile= function(){
    $rootScope.gotoProfile(userSession.getCurrentLoggedInUserId())
  }
  $scope.goHome = function(feed){
    $rootScope.goHome(feed)
  }
})

twitterApp.controller('home',function($scope,userSession,$location,$rootScope,$appbaseRef,$routeParams){
  $rootScope.showNav()
  if(userSession.getCurrentLoggedInUserId()){
    //good!!
  } else{
    $rootScope.exit()
    return //exit the controller too
  }
  if(userSession.getUserName()){
    //good
  } else {
    $location.path('/loading')
    return
  }
  var feed = typeof $routeParams.feed == 'undefined'? 'global': $routeParams.feed

  $scope.tweets = []
  $scope.people = []
  $scope.userName = userSession.getUserName()
  $scope.gotoProfile= function(userId){
    $rootScope.gotoProfile(userId)
  }

  $appbaseRef('global/users').$bindEdges($scope,'people')

  $appbaseRef('user/'+userSession.getCurrentLoggedInUserId()+'/followers').$bindEdges($scope,'followers')
  $appbaseRef('user/'+userSession.getCurrentLoggedInUserId()+'/following').$bindEdges($scope,'following')

  $scope.addTweet = function() {
    var tweetRef = Appbase.create('tweet')
    var tweetData = {
      'msg': $scope.msg,
      'by': userSession.getUserName()
    }
    console.log(tweetData)
    tweetRef.setData(tweetData,function(error, tweetRef) {
      if(error) {
        throw error
        return
      }
      Appbase.ref('user/'+userSession.getCurrentLoggedInUserId()+'/tweets').setEdge(tweetRef,uuid())
      Appbase.ref('global/tweets').setEdge(tweetRef,uuid())
    })

    $scope.msg = ''
    $scope.time = new Date().getTime()
  }

  if(feed == 'global') {
    $appbaseRef('global/tweets').$bindEdges($scope,'tweets')
  } else {
    $scope.personalTweets = []
    $scope.arraysOfTweets = []

    $scope.arraysOfTweets.push($appbaseRef('user/'+userSession.getCurrentLoggedInUserId()+'/tweets').$bindEdges($scope))
    Appbase.ref('user/'+userSession.getCurrentLoggedInUserId()+'/following').on('edge_added',function(error, followUserRef, edgeSnap) {
      $scope.arraysOfTweets.push($appbaseRef(followUserRef).$outVertex('tweets').$bindEdges($scope))
    })
  }
})

twitterApp.controller('profile',function($scope,userSession,$location,$rootScope,$routeParams,$appbaseRef){
  $rootScope.showNav()
  if(userSession.getCurrentLoggedInUserId()){
    //good!!
  } else {
    $rootScope.exit()
    return //exit the controller too
  }

  if(userSession.getUserName()) {
    //good
  } else {
    $location.path('/loading')
    return
  }

  $scope.tweets = []
  $scope.followers = []
  $scope.following = []
  var userId = $routeParams.userId
  $scope.userId = $routeParams.userId
  $scope.isMe = userSession.getCurrentLoggedInUserId() == userId
  $scope.userName = $routeParams.userId
  $scope.isReady = false

  Appbase.ref('user/'+userSession.getCurrentLoggedInUserId()+'/following/'+userId).on('properties',function(error,ref,snap){
    $scope.$apply(function(){
      $scope.isBeingFollowed = !(error && error.message === '101: Resource does not exist')
      $scope.isReady = !error || error.message === '101: Resource does not exist'
    })
  })

  $scope.gotoProfile= function(userId){
    $rootScope.gotoProfile(userId)
  }

  $scope.follow = function(userId,i){
    $scope.isBeingFollowed = true
    Appbase.ref('user/'+userSession.getCurrentLoggedInUserId()+'/following').setEdge(Appbase.ref('user/'+userId),userId)
    Appbase.ref('user/'+userId+'/followers').setEdge(Appbase.ref('user/'+userSession.getCurrentLoggedInUserId()),userSession.getCurrentLoggedInUserId())
  }
  $scope.unFollow = function(userId,i){
    $scope.isBeingFollowed = false
    Appbase.ref('user/'+userSession.getCurrentLoggedInUserId()+'/following').removeEdge(userId)
    Appbase.ref('user/'+userId+'/followers').removeEdge(userSession.getCurrentLoggedInUserId())
  }

  $appbaseRef('user/'+userId+'/followers').$bindEdges($scope,'followers')
  $appbaseRef('user/'+userId+'/following').$bindEdges($scope,'following')
  var userTweets = Appbase.ref('user/'+userId+'/tweets')
  $scope.addTweet = function() {

    var tweetRef = Appbase.create('tweet')
    var tweetData = {
      'msg': $scope.msg,
      'by': userSession.getUserName()
    }
    console.log(tweetData)
    tweetRef.setData(tweetData,function(error, tweetRef) {
      if(error) {
        throw error
        return
      }
      userTweets.setEdge(tweetRef,uuid())
      Appbase.ref('global/tweets').setEdge(tweetRef,uuid())
    })

    $scope.msg = ''
    $scope.time = new Date().getTime()
  }

  $appbaseRef(userTweets).$bindEdges($scope,'tweets')

})
twitterApp.factory('userSession',function(){
  fact = {}
  var userName
  fact.setUserName = function(name){
    userName = name
  }
  fact.getUserName = function(){
    return userName
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