import { createServer } from "@graphql-yoga/node";
import { Resolvers } from "../../types";
import { join } from "path";
import { readFileSync } from "fs";
import type { PrismaClient } from "@prisma/client";
import type { NextApiRequest,NextApiResponse } from "next";
import prisma from "../../lib/prisma";
import currencyformatter from 'currency-formatter'

export type GraphQLContext = {
  prisma: PrismaClient;
};

export async function createContext(): Promise<GraphQLContext> {
  return {
    prisma,
  };
}

const typeDefs = readFileSync(join(process.cwd(), "schema.graphql"), {
  encoding: "utf-8",
});

const currencyCode = 'USD'

const resolvers:Resolvers = {
  Query: {
    cart: async (_, { id },{prisma}) => {
      let cart = await prisma.cart.findUnique({
        where: {
          id,
        }
      })
      if (!cart){
        cart = await prisma.cart.create({
          data: {
            id,
          }
        })
      }
      return cart;
    },
  },
  Cart : {
    items: async({id},_,{prisma}) => {
      const items = await prisma.cart
        .findUnique({
          where: { id },
        })
        .items();

      return items;

    },
    totalItems: async ({ id }, _, { prisma }) => {
      const items = await prisma.cart
        .findUnique({
          where: { id },
        })
        .items();
  
      return items.reduce((total, item) => total + item.quantity || 1, 0);
    },
    subTotal:async ({ id }, _, { prisma }) => {
      const items = await prisma.cart
        .findUnique({
          where: { id },
        })
        .items();
      const amount = items.reduce((total, item) => total + item.price * item.quantity || 0, 0) ?? 0
  
      return {
        formatted: currencyformatter.format(amount/100, {
          code: currencyCode
        }),
        amount,
      };
    }
  },
};
const server = createServer<{
  req: NextApiRequest;
  res: NextApiResponse;
}>({
  cors: false,
  endpoint: "/api",
  // logging: {
  //   prettyLog:false,     //prettyLog:false,
  // },
  schema: {
    typeDefs,
    resolvers,
  },
  context: createContext(),
});

export default server;