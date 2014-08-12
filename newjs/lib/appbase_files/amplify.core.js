/*!
 * Amplify Core 1.1.2
 *
 * Copyright 2011 - 2013 appendTo LLC. (http://appendto.com/team)
 * Dual licensed under the MIT or GPL licenses.
 * http://appendto.com/open-source-licenses
 *
 * http://amplifyjs.com
 */
(function( global, undefined ) {

  var uuid = function (){
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  }

  var slice = [].slice,
   subscriptions = {};

  var amplify = global.amplify = {
    publish: function( topic ) {
      if ( typeof topic !== "string" ) {
        throw new Error( "You must provide a valid topic to publish." );
      }
      console.log(arguments)

      var args = slice.call( arguments, 1 ),
       topicSubscriptions,
       subscription,
       length,
       i = 0,
       ret;

      if ( !subscriptions[ topic ] ) {
        return true;
      }

      topicSubscriptions = subscriptions[ topic ].slice();
      for ( length = topicSubscriptions.length; i < length; i++ ) {
        subscription = topicSubscriptions[ i ];
        ret = subscription.callback.apply( null, args );
        if ( ret === false ) {
          break;
        }
      }
      return ret !== false;
    },

    subscriptionCount: function(topic){
      if ( !subscriptions[ topic ] ) {
        return 0;
      } else {
        return subscriptions[ topic ].length;
      }
    },

    subscribe: function( topic, name, callback ) {
      if ( typeof topic !== "string" ) {
        throw new Error( "You must provide a valid topic to create a subscription." );
      }

      if ( arguments.length === 2 ) {
        callback = name;
        name = uuid();
      }

      var topicIndex = 0,
       topics = topic.split( /\s/ ),
       topicLength = topics.length,
       added;
      for ( ; topicIndex < topicLength; topicIndex++ ) {
        topic = topics[ topicIndex ];
        added = false;
        if ( !subscriptions[ topic ] ) {
          subscriptions[ topic ] = [];
        }

        var i = subscriptions[ topic ].length - 1,
         subscriptionInfo = {
           callback: callback,
           name: name
         };

        for ( ; i >= 0; i-- ) {
          if ( subscriptions[ topic ][ i ].name == name ) {
            subscriptions[ topic ].splice( i, 1, subscriptionInfo );
            added = true;
            break;
          }
        }

        if ( !added ) {
          subscriptions[ topic ].unshift( subscriptionInfo );
        }
      }

      return name;
    },

    unsubscribe: function( topic, name ) {
      var turned_off;
      if ( typeof topic !== "string" ) {
        throw new Error( "You must provide a valid topic to remove a subscription." );
      }

      if ( !subscriptions[ topic ] ) {
        return;
      }

      if(! name ){
        turned_off = [];
        var length = subscriptions[ topic ].length,
         i = 0;

        for ( ; i < length; i++ ) {
          turned_off.push(subscriptions[ topic ][ i ].name);
        }

        subscriptions[ topic ] = []; //remove all subscriptions

      } else {

        var length = subscriptions[ topic ].length,
         i = 0;

        for ( ; i < length; i++ ) {
          if ( subscriptions[ topic ][ i ].name === name ) {
            turned_off = name;
            subscriptions[ topic ].splice( i, 1 );
            i--;
            length--;
          }

        }

      }

      return turned_off;

    }
  };

}( this ) );
