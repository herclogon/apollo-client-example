const express = require('express');
const bodyParser = require('body-parser');
const {graphqlExpress, graphiqlExpress} = require('apollo-server-express');
const {makeExecutableSchema} = require('graphql-tools');
const {SubscriptionServer} = require('subscriptions-transport-ws');
const {createServer} = require('http');
const {execute, subscribe} = require('graphql');
const {PubSub, withFilter} = require('graphql-subscriptions');
const cors = require('cors');
const sleep = require('sleep');
const _ = require('lodash');


var PORT = 3000;

// The GraphQL schema in string form
const typeDefs = `
  #
  # queries
  #

  type Query { 
      blocks: [Block] 
  }
   
  type Block {
      name: String!
      uid: String!
      color: String!
      position: BlockPosition
  }
  
  type BlockPosition { 
      top: Int
      left: Int 
  }
  
  #
  # mutations
  #
  
  type Mutation {    
     blockMove(input: BlockMoveInput): BlockMovePayload    
     blockAdd(input: BlockAddInput): BlockAddPayload
  }
    
  input BlockMoveInput {
      uid: String!
      position: BlockPositionInput
  }
  
  input BlockPositionInput {
      top: Int!
      left: Int!
  }

  type BlockMovePayload {
      result: Boolean!
  }
  
  type BlockAddPayload {
      block: Block!
  }

  input BlockAddInput {
      uid: String!
      name: String!
      position: BlockPositionInput
  }
  
  #
  # subscriptions
  #
  
  type Subscription { 
      blockAdd(input: blockAddSubscriptionInput): blockAddSubscriptionPayload
      blockMove(input: blockMoveSubscriptionInput): blockMoveSubscriptionPayload
  }

  type BlockMoveEvent {
      input: BlockMoveParams!,
      payload: BlockMovePayload! 
  }

  type BlockAddEvent {
      input: BlockMoveParams!,
      payload: BlockAddPayload
  }
  
  type BlockAddParams {
      uid: String!
      name: String!
      position: BlockPosition!
  }  
  
  type BlockMoveParams {
      uid: String!
      position: BlockPosition!  
  }
`;

const pubsub = new PubSub();

this.blocks = [
    {
        name: 'Block #1',
        uid: 'block_uid1',
        color: 'green',
        position: {
            top: 5,
            left: 10
        }
    }, {
        name: 'Block #2',
        uid: 'block_uid2',
        color: 'gray',
        position: {
            top: 200,
            left: 200
        }
    }
];

// The resolvers
const resolvers = {
    //
    Query: {
        //books: () => books,
        blocks: () => {
            sleep.sleep(1);
            return this.blocks;
        }
    },

    //
    Mutation: {
        blockAdd: {
            resolve: (payload, args, context, info) => {
                console.log('mutation.blockAdd', payload, args, context, info);
                let block = {
                    name: args.input.name,
                    uid: args.input.uid,
                    color: _.sample(['khaki', 'hotpink', 'grey', 'lightblue', 'red']),
                    position: {
                        top: args.input.position.top,
                        left: args.input.position.left
                    }
                };

                this.blocks.push(block);

                setTimeout(function() {
                    pubsub.publish('blockAdd', {args, result: block});
                }, 2);

                sleep.sleep(1);
                return block;
            },
        },
        blockMove: {
            resolve: (payload, args, context, info) => {
                console.log('mutation.blockMove', payload, args, context, info);

                let block = _.find(this.blocks, function(block) {
                    return block.uid === args.input.uid
                });

                block.position.top = args.input.position.top;
                block.position.left = args.input.position.left;

                setTimeout(function() {
                    pubsub.publish('blockMove', {
                        args: args.input,
                        result: true
                    });
                }, 1000);

                return true;
            },
        }
    },

    //
    Subscription: {
        blockAdd: {
            resolve: (payload, args, context, info) => {
                console.log('subscription move', payload, args, context, info);
                return payload;

            },
            subscribe: (res) => {
                console.log('!!!! res', arguments);
                return pubsub.asyncIterator('blockAdd')
            }
        },
        blockMove: {
            resolve: (payload, args, context, info) => {
                console.log('subscription blockMove', payload, args, context, info);
                return payload;
            },
            subscribe: (res) => {
                return pubsub.asyncIterator('blockMove')
            }
        }
    }
};

// Put together a schema
const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
});

// Initialize the app
const app = express();

app.use(cors());

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// The GraphQL endpoint
app.use('/graphql', bodyParser.json(), graphqlExpress({schema}));

// GraphiQL, a visual editor for queries
app.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql',
    subscriptionsEndpoint: `ws://localhost:${PORT}/subscriptions`
}));

// start subscription server
const ws = createServer(app);
ws.listen(PORT, () => {
    console.log(`Apollo Server is now running on http://localhost:${PORT}`);
    // Set up the WebSocket for handling GraphQL subscriptions
    new SubscriptionServer({
        execute,
        subscribe,
        schema
    }, {
        server: ws,
        path: '/subscriptions',
    });
});