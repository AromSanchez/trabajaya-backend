require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const prisma = new PrismaClient({ adapter });

module.exports = prisma;