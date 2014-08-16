/* In this app $rootScope is mostly used for
 * changing the route and managing visibly of navigation bar.
 */
angular.module('twitter',['ngRoute','ngAppbase'])
 .run(function($rootScope,userSession,$location) {
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
 // Route management
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
  /* Controller: login
   * Shows all tweets when no one is logged in
   */
 .controller('login', function ($scope, userSession, $location,$rootScope,$appbaseRef) {
   // Navigation bar shouldn't be visible if no one is logged in
   $rootScope.hideNav()

   // Called when the user enter a name, or the user is already logged in
   $scope.login = function() {
     userSession.setUser($scope.userId)
     $location.path('/loading')
   }
   // Check if a user is already logged in the session
   if( $scope.userId = userSession.getUser()){
     $scope.login()
   }
   //Show all tweets
   $appbaseRef('global/tweets').$bindEdges($scope,'tweets')
 })
  /* Controller: search
   * Search's for tweets in Appbase and shows results
   */
 .controller('search', function ($scope, $rootScope, $routeParams) {
   // Getting the 'query text' from route parameters
   $scope.currentQuery = $routeParams.text
   // Searching in the namespace: __tweet__ for vertices, which contain 'query text' in the property: __msg__
   Appbase.search('tweet',{text: $routeParams.text, properties:['msg']},function(error, array) {
     $scope.tweets = array
     $scope.$apply()
   })
 })
  /* Controller: Loading
   * It inits the __data__ factory, which is used everywhere in the app to fetch and set data from/to Appbase.
   * After the _init_ completes, it takes the user to _home_ screen, showing personal tweets of the user.
   */
 .controller('loading', function ($rootScope,$scope, userSession, data) {
   if(!userSession.getUser()){
     $rootScope.exit()
     return
   }
   data.init(function() {
     $scope.$apply(function() {
       $rootScope.goHome('personal')
     })
   })
 })
  /* Controller: navbar
   * Handles button clicks and visibility of buttons
   */
 .controller('navbar',function($scope,userSession,$location,$rootScope,$routeParams){
   $scope.bahar = true
   // Called when user enters a text in the search box and presses Enter key
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
       var userId = userSession.getUser()
     $rootScope.gotoProfile(userId)
   }
   $scope.goHome = function(feed){
     $rootScope.goHome(feed)
   }
 })
  /* Controller: home
   * This is what the user sees first when logged in. It shows the personal and global tweet feeds
   * The personal tweet feed: shows tweets from people he follows
   * The global feed: tweets by everyone
   */
 .controller('home',function($scope,userSession,$location,$rootScope,$appbaseRef,$routeParams,data){
   //
   if(!userSession.initComplete) {
     if(!userSession.getUser())
       $rootScope.exit()
     else
       $rootScope.load()
     return
   }
   $rootScope.showNav()
   var feed = $routeParams.feed === undefined? 'global': $routeParams.feed
   $scope.tweets = []
   $scope.people = []
   $scope.userName = userSession.getUser()
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
     $scope.arraysOfTweets.push($appbaseRef('user/'+userSession.getUser()+'/tweets').$bindEdges($scope))
     var usrRef = Appbase.ref('user/'+userSession.getUser()+'/following')
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
     if(!userSession.getUser())
       $rootScope.exit()
     else
       $rootScope.load()
     return
   }
   $rootScope.showNav()
   var userId = $routeParams.userId
   $scope.userId = $routeParams.userId
   $scope.isMe = userSession.getUser() === userId
   $scope.userName = $routeParams.userId
   $scope.isReady = false
   !$scope.isMe && data.isUserBeingFollowed(userId,function(boolean){
     $scope.isBeingFollowed = boolean
     $scope.isReady = true
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
     var userId = userSession.getUser()
     refs.user = Appbase.create('user',userSession.getUser())
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
         refs.user.setEdge(Appbase.create('misc',Appbase.uuid()),'following')
         refs.user.setEdge(Appbase.create('misc',Appbase.uuid()),'followers')
         refs.user.setEdge(Appbase.create('misc',Appbase.uuid()),'tweets',function(error){
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
     var tweetRef = Appbase.create('tweet',Appbase.uuid())
     tweetRef.setData({ 'msg': msg, 'by': userSession.getUser() },function(error, tweetRef) {
       if(error) {
         throw error
         return
       }
       var randomEdgeName = Appbase.uuid()
       refs.usersTweets.setEdge(tweetRef,randomEdgeName)
       refs.globalTweets.setEdge(tweetRef,randomEdgeName)
     })
   }
   data.isUserBeingFollowed = function(userId,callback){
     var ref = refs.usersFollowing.outVertex(userId)
     ref.on('properties',function(error){
       ref.off('properties')
       callback(!(error && error.message === '101: Resource does not exist'))
     })
   }
   data.follow = function(userId) {
     refs.usersFollowing.setEdge(Appbase.ref('user/'+userId),userId)
     Appbase.ref('user/'+userId+'/followers').setEdge(refs.user,userSession.getUser())
   }
   data.unFollow = function(userId) {
     refs.usersFollowing.removeEdge(userId)
     Appbase.ref('user/'+userId+'/followers').removeEdge(userSession.getUser())
   }
   return data
 })
 .factory('userSession',function() {
   var userSession = {}
   userSession.initComplete = false
   userSession.setUser = function(userId){
     localStorage.setItem("currentLoggedInUser", userId)
   }
   userSession.exit = function(){
     localStorage.removeItem("currentLoggedInUser")
   }
   userSession.getUser = function(){
     return localStorage.getItem("currentLoggedInUser")
   }
   return userSession
 })