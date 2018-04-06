const express = require('express');
const bodyParser = require('body-parser');
const {graphqlExpress, graphiqlExpress} = require('apollo-server-express');
const {makeExecutableSchema} = require('graphql-tools');
const {SubscriptionServer} = require('subscriptions-transport-ws');
const {createServer} = require('http');
const {execute, subscribe} = require('graphql');
const {PubSub} = require('graphql-subscriptions');
const cors = require('cors');
const sleep = require('sleep');
const _ = require('lodash');


var PORT = 3000;
var blockNameCounter = 10;

// The GraphQL schema in string form
const typeDefs = `

  #
  # Why we use input object pattern for mutations? Please read the following:
  # https://dev-blog.apollodata.com/designing-graphql-mutations-e09de826ed97
  #
  
  #
  # Queries
  #

  type Query { 
      blocks: [Block] 
  }
   
  type Block {
      name: String!
      uid: String!
      color: String!
      position: BlockPosition!
  }
  
  type BlockPosition { 
      top: Int
      left: Int 
  }
  
  #
  # Mutations
  #
  
  type Mutation {    
     blockMove(input: BlockMoveMutationInput!): BlockMoveMutationPayload     
     blockAdd(input: BlockAddMutationInput!): BlockAddMutationPayload
  }
    
  input BlockMoveMutationInput {
      uid: String!
      position: BlockPositionInput
  }
   
  input BlockAddMutationInput {
      uid: String!
      name: String!
      position: BlockPositionInput
  }
  
  input BlockPositionInput {
      top: Int!
      left: Int!
  }
  
  type BlockMoveMutationPayload {
      result: Boolean!
  }

  type BlockAddMutationPayload {
      block: Block!
  }

  #
  # Subscriptions
  #
  
  type Subscription { 
      blockAdd(input: BlockAddSubscriptionInput): BlockAddSubscriptionPayload
      blockMove(input: BlockMoveSubscriptionInput): BlockMoveSubscriptionPayload
  }

  input BlockAddSubscriptionInput {
    nothing: String
  }
  
  type BlockAddSubscriptionPayload {
      input: BlockAddMutationType
      payload: BlockAddMutationPayload
  }
  
  type BlockAddMutationType {
      uid: String!
      name: String!
      position: BlockPosition!
  }  

  input BlockMoveSubscriptionInput {
    nothing: String
  }

  type BlockMoveSubscriptionPayload {
      input: BlockMoveMutationType!
      payload: Boolean! 
  }
 
  type BlockMoveMutationType {
      uid: String!
      position: BlockPosition!  
  }
`;

const pubsub = new PubSub();

// Server initial data.
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
        blocks: () => {
            sleep.sleep(1);
            return this.blocks;
        }
    },

    //
    Mutation: {
        blockAdd: {
            resolve: (payload, args, context, info) => {
                let block = {
                    name: 'Block #' + blockNameCounter++,
                    uid: args.input.uid,
                    color: _.sample(['khaki', 'hotpink', 'grey', 'lightblue', 'red']),
                    position: {
                        top: args.input.position.top,
                        left: args.input.position.left
                    }
                };

                this.blocks.push(block);

                sleep.sleep(1);

                setTimeout(function () {
                    let subscriptionPayload = {input: args, payload: {block}};
                    pubsub.publish('blockAdd', subscriptionPayload);
                }, 500);

                return {block};
            },
        },
        blockMove: {
            resolve: (payload, args, context, info) => {
                let block = _.find(this.blocks, function (block) {
                    return block.uid === args.input.uid
                });

                block.position.top = args.input.position.top;
                block.position.left = args.input.position.left;

                let result = {result: true};
                setTimeout(function () {
                    pubsub.publish('blockMove', {
                        input: args.input,
                        payload: result
                    });
                }, 1000);

                return result;
            },
        }
    },

    //
    Subscription: {
        blockAdd: {
            resolve: (payload, args, context, info) => {
                return payload;

            },
            subscribe: () => {
                return pubsub.asyncIterator('blockAdd')
            }
        },
        blockMove: {
            resolve: (payload, args, context, info) => {
                return payload;
            },
            subscribe: () => {
                return pubsub.asyncIterator('blockMove')
            }
        }
    }
};

// Put together a schema.
const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
});

// Initialize the app.
const app = express();

app.use(cors());

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// The GraphQL endpoint.
app.use('/graphql', bodyParser.json(), graphqlExpress({schema}));

// GraphiQL, a visual editor for queries.
app.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql',
    subscriptionsEndpoint: `ws://localhost:${PORT}/subscriptions`
}));

// Start subscription server.
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