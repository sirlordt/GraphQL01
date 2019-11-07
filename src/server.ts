import { GraphQLServer } from 'graphql-yoga'
import { rule, shield, and, or, not } from 'graphql-shield'

const typeDefs = `
  type Query {
    frontPage: [Fruit!]!
    fruits: [Fruit!]!
    customers: [Customer!]!
  }

  type Mutation {
    addFruitToBasket: Boolean!
  }

  type Fruit {
    name: String!
    count: Int!
  }

  type Customer {
    id: ID!
    basket: [Fruit!]!
  }
`

const resolvers = {
  Query: {
    frontPage: () => [
      { name: 'orange', count: 10 },
      { name: 'apple', count: 1 },
    ],
    fruits: () => [
      { name: 'orange', count: 10 },
      { name: 'apple', count: 1 },
    ]
  },
}

// Auth
const users = {
  mathew: {
    id: 1,
    name: 'Mathew',
    role: 'admin',
  },
  george: {
    id: 2,
    name: 'George',
    role: 'editor',
  },
  johnny: {
    id: 3,
    name: 'Johnny',
    role: 'customer',
  },
}

function getUser( context: any ) {

  //console.log( "Request => ", context.request.headers );
  //console.log( "Response => ", req.response );
  //In the bottom left of playground web page (HTTP HEADERS section) need put the next data
  /*
  {
    "authorization": "mathew"
  }
  */
  const auth = context.request.headers.authorization ? context.request.headers.authorization : "";

  //console.log( auth );

  if ( users[auth] ) {

    return users[auth]

  }
  else {

    return null

  }

  //return null;

}

// Rules

// Read more about cache options down in the `rules/cache` section.
const isAuthenticated = rule({ cache: 'contextual' })(
  async (parent, args, ctx, info) => {
    return ctx.user !== null
  },
)

const isAdmin = rule({ cache: 'contextual' })(
  async (parent, args, ctx, info) => {
    return ctx.user.role === 'admin'
  },
)

const isEditor = rule({ cache: 'contextual' })(
  async (parent, args, ctx, info) => {
    return ctx.user.role === 'editor'
  },
)

// Permissions
const permissions = shield({
  Query: {
    frontPage: not(isAuthenticated),
    fruits: and(isAuthenticated, or(isAdmin, isEditor)),
    customers: and(isAuthenticated, isAdmin),
  },
  Mutation: {
    addFruitToBasket: isAuthenticated,
  },
  Fruit: isAuthenticated,
  Customer: isAdmin,
})

const server = new GraphQLServer({
  typeDefs,
  resolvers,
  middlewares: [permissions],
  context: context => ({
    ...context,
    user: getUser( context ),
  }),
})

const options = {
  port: 8000,
  endpoint: '/graphql',
  subscriptions: '/subscriptions',
  playground: '/playground',
}

server.start( options, () => console.log( 'Server is running on http://localhost:8000' ) );
