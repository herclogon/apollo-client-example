import { HttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client/ApolloClient';
import gql from 'graphql-tag';
import { WebSocketLink } from 'apollo-link-ws';
import { getMainDefinition } from 'apollo-utilities';
import { split } from 'apollo-link';


declare var window: any;
window.gql = gql;
window.apolloWebSocketLink = WebSocketLink;
window.apolloInMemoryCache = InMemoryCache;
window.apolloClient = ApolloClient;
window.apolloHttpLink = HttpLink;

window.apolloHttpLinkUrl = 'http://localhost:2000/graphql';
window.apolloWebSocketLinkUrl = 'ws://localhost:3000/sss';


// Create an http link:
const httpLink = new HttpLink({
    uri: window.apolloHttpLinkUrl
});

// Create a WebSocket link:
const wsLink = new WebSocketLink({
    uri: window.apolloWebSocketLinkUrl,
    options: {
        reconnect: true
    }
});

// using the ability to split links, you can send data to each link
// depending on what kind of operation is being sent
const link = split(
    // split based on operation type
    ({query}) => {
        const {kind, operation} = getMainDefinition(query);
        return kind === 'OperationDefinition' && operation === 'subscription';
    },
    wsLink,
    httpLink,
);

window.apolloUniLink = link;

console.log('Module loaded.');

