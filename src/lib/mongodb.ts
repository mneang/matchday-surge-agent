import { Db, MongoClient } from "mongodb";

const dbName = process.env.MONGODB_DB || "matchday_surge";

const globalForMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

function getMongoUri() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }

  return uri;
}

function getClientPromise(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    if (!globalForMongo._mongoClientPromise) {
      const client = new MongoClient(getMongoUri());
      globalForMongo._mongoClientPromise = client.connect();
    }

    return globalForMongo._mongoClientPromise;
  }

  const client = new MongoClient(getMongoUri());
  return client.connect();
}

export async function getMongoDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(dbName);
}
