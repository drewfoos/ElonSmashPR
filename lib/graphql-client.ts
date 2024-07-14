import { GraphQLClient } from "graphql-request";

const endpoint = "https://api.start.gg/gql/alpha";

console.log("API Key:", process.env.STARTGG_API_KEY ? "Loaded" : "Not loaded");

export const graphQLClient = new GraphQLClient(endpoint, {
  headers: {
    authorization: `Bearer ${process.env.STARTGG_API_KEY}`,
  },
});
