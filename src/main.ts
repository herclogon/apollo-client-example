import { HttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client/ApolloClient';
import { setContext } from 'apollo-link-context';
import gql from 'graphql-tag';
import { WebSocketLink } from 'apollo-link-ws';
import { getMainDefinition } from 'apollo-utilities';
import { split } from 'apollo-link';
import * as jsCookie from 'js-cookie';
import * as _ from 'lodash';

declare var window: any;
window.gql = gql;
window.apolloWebSocketLink = WebSocketLink;
window.apolloInMemoryCache = InMemoryCache;
window.apolloClient = ApolloClient;
window.apolloHttpLink = HttpLink;
window.apolloSetContext = setContext;
window.jsCookie = jsCookie;
window._ = _;

window.apolloCreateUniLink = function (httpLink, wsLink) {
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
    return link;
};

console.log('Module loaded.');
