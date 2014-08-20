/* In this app $rootScope is mostly used for
 * changing the route and managing visibly of navigation bar.
 */
Appbase.credentials("aphrodite", "4d8d0072580912343cd74a09015cd217");
angular.module('twitter',['ngRoute','ngAppbase'])
  .run(function($rootScope,userSession,$location) {
    $rootScope.exit = function() {
      userSession.exit()
      $location.path('/global')
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
        controller:'global',
        templateUrl:'views/global.html'
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
  /* Controller: global
   * Shows all tweets when no one is logged in
   */
  .controller('global', function ($scope, userSession, $location,$rootScope,$appbaseRef) {
    // Navigation bar shouldn't be visible if no one is logged in
    $rootScope.hideNav()

    // Called when the user enter a name, or the user is already logged in
    $scope.login = function() {
      userSession.setUser($scope.userId.replace(/ /g, "_"))
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
    // Check if the session is properly initiated,
    // i.e. the 'data' factory set the flag 'initComplete' in userSession
    if(!userSession.initComplete) {
      if(!userSession.getUser())
        $rootScope.exit()
      else
        $rootScope.load()
      return
    }
    $rootScope.showNav()
    //Get __feed__ from route parameters
    var feed = $routeParams.feed === undefined? 'global': $routeParams.feed
    $scope.tweets = []
    $scope.people = []
    $scope.userName = userSession.getUser()
    $scope.gotoProfile = $rootScope.gotoProfile
    //Show _People on Twitter_, user's _Followers_ and _Followings_
    $appbaseRef(data.refs.allUsers).$bindEdges($scope,'people')
    $appbaseRef(data.refs.usersFollowers).$bindEdges($scope,'followers')
    $appbaseRef(data.refs.usersFollowing).$bindEdges($scope,'following')

    //Called when user posts a new tweet
    $scope.addTweet = function() {
      data.addTweet($scope.msg)
      $scope.msg = ''
    }
    if(feed === 'global') {
      // Show all tweets
      $appbaseRef(data.refs.globalTweets).$bindEdges($scope,'tweets')
    } else {
      /* Fetch tweets of the people followed by the user. Every following's tweets are pushed into `arraysOfTweets` as an array,
       * and in the end, these arrays are merged into personalTweets by calling `personalTweets.concat.apply(personalTweets, arraysOfTweets)`
       * in _home.html_
       */
      $scope.personalTweets = []
      $scope.arraysOfTweets = []
      $scope.arraysOfTweets.push($appbaseRef('user/'+userSession.getUser()+'/tweets').$bindEdges($scope))
      var usrRef = Appbase.ref('user/'+userSession.getUser()+'/following')
      usrRef.on('edge_added',function(error, followUserRef) {
        if(error) throw error
        $scope.arraysOfTweets.push($appbaseRef(followUserRef).$outVertex('tweets').$bindEdges($scope))
      })
      $scope.$on('$destroy',function() {
        //Stop listening to user's followings when the view is destroyed.
        usrRef.off()
      })
    }
  })
  /* Controller: profile
   * Where a user's followings, followers and tweets are shown.
   * A user can also see other's profiles and choose to follow/unfollow the person from his/her profile.
   */
  .controller('profile',function($scope,userSession,$location,$rootScope,$routeParams,$appbaseRef,data){
    if(!userSession.initComplete) {
      if(!userSession.getUser())
        $rootScope.exit()
      else
        $rootScope.load()
      return
    }
    $rootScope.showNav()

    //Get the userId from route params
    var userId = $routeParams.userId
    $scope.userId = $routeParams.userId
    //Check whether this profile is of the logged in user
    $scope.isMe = userSession.getUser() === userId
    $scope.userName = $routeParams.userId
    $scope.isReady = false

    //Check whether this user is being followed by the logged in user
    // This has to be an async function, as it interacts with the Appbase server
    !$scope.isMe && data.isUserBeingFollowed(userId,function(boolean){
      //If true, _unfollow_ button will appear, otherwise _follow_ one
      $scope.isBeingFollowed = boolean
      //Show _follow_ or _unfollow_ buttons only when the data is arrived
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
    //Fetch user's followers, followings and tweets
    $appbaseRef('user/'+userId+'/followers').$bindEdges($scope,'followers')
    $appbaseRef('user/'+userId+'/following').$bindEdges($scope,'following')
    $appbaseRef('user/'+userId+'/tweets').$bindEdges($scope,'tweets')
  })
  /*
   * Factory: data
   * Stores frequently useful Appbase references and interacts with Appbase for data needs
   */
  .factory('data',function(userSession) {
    // Appbase references
    var refs = {
      globalTweets: Appbase.ref('global/tweets'),
      allUsers: Appbase.ref('global/users')
    }
    // Factory to be exported
    var data = {
      refs:refs
    }
    // Called when the user just logs in.
    // It sets required references and creates basic data for a new user
    data.init = function(ready) {
      var userId = userSession.getUser()
      refs.user = Appbase.create('user',userSession.getUser())
      refs.usersTweets = refs.user.outVertex('tweets')
      refs.usersFollowers = refs.user.outVertex('followers')
      refs.usersFollowing = refs.user.outVertex('following')
      refs.user.on('properties',function(error, ref, snap) {
        refs.user.off()
        if(error) throw error
        if (snap.properties().name === undefined) {
          // The user logged in for the first time
          Appbase.ref('global/users').setEdge(refs.user,userId)
          // Set user's name
          refs.user.setData({
            name: userId
          })
          // Create vertices which will store user's followers, followings and tweets
          refs.user.setEdge(Appbase.create('misc',Appbase.uuid()),'tweets',function(error){
            if(error) throw error
            refs.user.setEdge(Appbase.create('misc',Appbase.uuid()),'followers', function(error){
              if(error) throw error
              refs.user.setEdge(Appbase.create('misc',Appbase.uuid()),'following', function(error){
                if(error) throw error
                //Set the flag true in userSession
                userSession.initComplete = true
                ready()
              })
            })
          })
        } else {
          //The user exists in Appbase
          userSession.initComplete = true
          ready()
        }
      })
    }
    data.addTweet = function(msg) {
      //Create a new 'tweet' vertex and store the tweet message
      var tweetRef = Appbase.create('tweet',Appbase.uuid())
      tweetRef.setData({ 'msg': msg, 'by': userSession.getUser() },function(error, tweetRef) {
        if(error) throw error
        //Add this tweet as an edge, in user's own tweets and global tweets.
        //We really don't care about the edge's name here
        var randomEdgeName = Appbase.uuid()
        refs.usersTweets.setEdge(tweetRef,randomEdgeName)
        refs.globalTweets.setEdge(tweetRef,randomEdgeName)
      })
    }
    // Checks whether provided userId is being followed by the logged in user
    data.isUserBeingFollowed = function(userId,callback){
      refs.usersFollowing.outVertex(userId).isValid(function(error, bool){
        if(error) throw error
        callback(bool)
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
  // Stores logged in user's id.
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