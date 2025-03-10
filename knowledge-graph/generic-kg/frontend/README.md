# Knowledge Graph - Frontend

The frontend for this recipe is a Next.js app that uses Apollo Client to interact with our Modus API
app.


## Getting Started

Set environment variables for the Modus GraphQL API and API token

> Note: if running locally the API token is not needed.

```sh
NEXT_PUBLIC_GRAPHQL_API_URL=<YOUR_GRAPHQL_URI_HERE>
NEXT_PUBLIC_GRAPHQL_API_KEY=<YOUR_API_TOKEN_HERE>
```

Install project dependencies

```sh
npm i
```

Start the Next.js app

```sh
npm run dev
```

This will start a local web server at `http://localhost:3000` 