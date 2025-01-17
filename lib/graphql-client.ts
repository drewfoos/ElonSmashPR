import { GraphQLClient } from "graphql-request";
const endpoint = "https://api.start.gg/gql/alpha";

console.log("Creating GraphQL client");
console.log("API Key status:", process.env.STARTGG_API_KEY ? "Present" : "Missing");
console.log("API Key length:", process.env.STARTGG_API_KEY?.length || 0);

export const graphQLClient = new GraphQLClient(endpoint, {
  headers: {
    authorization: `Bearer ${process.env.STARTGG_API_KEY}`,
  },
});