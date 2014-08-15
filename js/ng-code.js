uuid = function() {
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8)
    return v.toString(16)
  })
}
angular.module('twitter',['ngRoute','ngAppbase'])
.run(function($rootScope,userSession,$location) {
  $rootScope.$on("$locationChangeStart", function(){
    $(".temp-container").remove()
    console.log('View changed')
  })
  $rootScope.exit = function(){
    userSession.exit()
    $location.path('/login')
  }
  $rootScope.gotoProfile = function(userId){
    $location.path('/profile/'+userId)
  }
  $rootScope.search = function(text){
    $location.path('/search/'+text)
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
  $rootScope.load = function() {
    $location.path('/loading')
  }
})
.config(function($routeProvider){
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
  ).when('/search/:text',
   {
     controller:'search',
     templateUrl:'views/search.html'
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
.controller('login', function ($scope, userSession, $location,$rootScope,$appbaseRef) {
  $rootScope.hideNav()
  $scope.login = function() {
    userSession.setCurrentUser($scope.userId)
    $location.path('/loading')
  }
  if( $scope.userId = userSession.getCurrentLoggedInUserId()){
    $scope.login()
  }
  $appbaseRef('global/tweets').$bindEdges($scope,'tweets')
})
.controller('search', function ($scope, $rootScope, $routeParams) {
  $scope.currentQuery = $routeParams.text
  Appbase.search('tweet',{text: $routeParams.text, properties:['msg']},function(error,array){
    $scope.tweets = array
    $scope.$apply()
    console.log(array)
  })
})
.controller('loading', function ($rootScope,$scope, userSession, data) {
  if(!userSession.getCurrentLoggedInUserId()){
    $rootScope.exit()
    return
  }
  data.init(function() {
    $scope.$apply(function(){
      $rootScope.goHome('global')
    })
  })
})
.controller('navbar',function($scope,userSession,$location,$rootScope,$routeParams){
  $scope.bahar = true
  $scope.search = function() {
    $rootScope.search($scope.searchText)
    $scope.searchText = ''
  }
  $scope.$on('showNav',function() {
    $scope.bahar = false
  })
  $scope.$on('hideNav',function() {
    $scope.bahar = true
  })
  $scope.exit= function() {
    $rootScope.exit()
  }
  $scope.gotoProfile= function(userId){
    if(userId === undefined)
      var userId = userSession.getCurrentLoggedInUserId()
    $rootScope.gotoProfile(userId)
  }
  $scope.goHome = function(feed){
    $rootScope.goHome(feed)
  }
})
.controller('home',function($scope,userSession,$location,$rootScope,$appbaseRef,$routeParams,data){
  if(!userSession.initComplete) {
    if(!userSession.getCurrentLoggedInUserId())
      $rootScope.exit()
    else
      $rootScope.load()
    return
  }
  $rootScope.showNav()
  var feed = $routeParams.feed === undefined? 'global': $routeParams.feed
  $scope.tweets = []
  $scope.people = []
  $scope.userName = userSession.getCurrentLoggedInUserId()
  $scope.gotoProfile = $rootScope.gotoProfile
  $appbaseRef(data.refs.allUsers).$bindEdges($scope,'people')
  $appbaseRef(data.refs.usersFollowers).$bindEdges($scope,'followers')
  $appbaseRef(data.refs.usersFollowing).$bindEdges($scope,'following')
  $scope.addTweet = function() {
    data.addTweet($scope.msg)
    $scope.msg = ''
  }
  if(feed === 'global') {
    $appbaseRef(data.refs.globalTweets).$bindEdges($scope,'tweets')
  } else {
    $scope.personalTweets = []
    $scope.arraysOfTweets = []
    $scope.arraysOfTweets.push($appbaseRef('user/'+userSession.getCurrentLoggedInUserId()+'/tweets').$bindEdges($scope))
    var usrRef = Appbase.ref('user/'+userSession.getCurrentLoggedInUserId()+'/following')
    usrRef.on('edge_added',function(error, followUserRef) {
      $scope.arraysOfTweets.push($appbaseRef(followUserRef).$outVertex('tweets').$bindEdges($scope))
    })
    $scope.$on('$destroy',function() {
      usrRef.off()
    })
  }
})
.controller('profile',function($scope,userSession,$location,$rootScope,$routeParams,$appbaseRef,data){
  if(!userSession.initComplete) {
    if(!userSession.getCurrentLoggedInUserId())
      $rootScope.exit()
    else
      $rootScope.load()
    return
  }
  $rootScope.showNav()
  var userId = $routeParams.userId
  $scope.userId = $routeParams.userId
  $scope.isMe = userSession.getCurrentLoggedInUserId() === userId
  $scope.userName = $routeParams.userId
  $scope.isReady = false
  !$scope.isMe && data.isUserBeingFollowed(userId,function(boolean){
    //$scope.$apply(function(){
      $scope.isBeingFollowed = boolean
      $scope.isReady = true
    //})
  })
  $scope.gotoProfile = $rootScope.gotoProfile
  $scope.follow = function(userId){
    $scope.isBeingFollowed = true
    data.follow(userId)
  }
  $scope.unFollow = function(userId){
    $scope.isBeingFollowed = false
    data.unFollow(userId)
  }
  $scope.addTweet = function() {
    data.addTweet($scope.msg)
    $scope.msg = ''
  }
  $appbaseRef('user/'+userId+'/followers').$bindEdges($scope,'followers')
  $appbaseRef('user/'+userId+'/following').$bindEdges($scope,'following')
  $appbaseRef('user/'+userId+'/tweets').$bindEdges($scope,'tweets')
})
.factory('data',function(userSession) {
  var refs = {
    globalTweets: Appbase.ref('global/tweets'),
    allUsers: Appbase.ref('global/users')
  }
  var data = {
    refs:refs
  }
  data.init = function(ready) {
    var userId = userSession.getCurrentLoggedInUserId()
    refs.user = Appbase.create('user',userSession.getCurrentLoggedInUserId())
    refs.usersTweets = refs.user.outVertex('tweets')
    refs.usersFollowers = refs.user.outVertex('followers')
    refs.usersFollowing = refs.user.outVertex('following')
    refs.user.on('properties',function(error, ref, snap) {
      refs.user.off()
      if(error){
        throw error
        return
      }
      if(snap.properties().name === undefined) {
        Appbase.ref('global/users').setEdge(refs.user,userId)
        refs.user.setData({
          name: userId
        })
        refs.user.setEdge(Appbase.create('misc'),'following')
        refs.user.setEdge(Appbase.create('misc'),'followers')
        refs.user.setEdge(Appbase.create('misc'),'tweets',function(error){
          if(error){
            throw error
            return
          }
          userSession.initComplete = true
          ready()
        })
      } else {
        userSession.initComplete = true
        ready()
      }
    })
  }
  data.addTweet = function(msg) {
    var tweetRef = Appbase.create('tweet')
    var tweetData = {
      'msg': msg,
      'by': userSession.getCurrentLoggedInUserId()
    }
    console.log(tweetData)
    tweetRef.setData(tweetData,function(error, tweetRef) {
      if(error) {
        throw error
        return
      }
      var randomEdgeName = uuid()
      refs.usersTweets.setEdge(tweetRef,randomEdgeName)
      refs.globalTweets.setEdge(tweetRef,randomEdgeName)
    })
  }
  data.isUserBeingFollowed = function(userId,callback){
    Appbase.ref('user/'+userSession.getCurrentLoggedInUserId()+'/following/'+userId).on('properties',function(error,ref,snap){
      callback(!(error && error.message === '101: Resource does not exist'))
    })
  }
  data.follow = function(userId) {
    refs.usersFollowing.setEdge(Appbase.ref('user/'+userId),userId)
    Appbase.ref('user/'+userId+'/followers').setEdge(refs.user,userSession.getCurrentLoggedInUserId())
  }
  data.unFollow = function(userId) {
    refs.usersFollowing.removeEdge(userId)
    Appbase.ref('user/'+userId+'/followers').removeEdge(userSession.getCurrentLoggedInUserId())
  }
  return data
})
.factory('userSession',function() {
  var userSession = {}
  userSession.initComplete = false
  userSession.setCurrentUser = function(userId){
    localStorage.setItem("currentLoggedInUser", userId)
  }
  userSession.exit = function(){
    localStorage.removeItem("currentLoggedInUser")
  }
  userSession.getCurrentLoggedInUserId = function(){
    return localStorage.getItem("currentLoggedInUser")
  }
  return userSession
})