import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.DATABASE_URL;
const client = new MongoClient(uri);

async function resetDatabase() {
  try {
    await client.connect();
    console.log("Connected to the database");

    const database = client.db();

    // List of all collections
    const collections = [
      "Player",
      "SemesterStatus",
      "SemesterScore",
      "Tournament",
      "Participation",
      "Semester",
    ];

    // Drop all existing collections
    for (const collectionName of collections) {
      try {
        await database.collection(collectionName).drop();
        console.log(`Dropped collection: ${collectionName}`);
      } catch (error) {
        if (error.code === 26) {
          console.log(`Collection ${collectionName} does not exist, skipping`);
        } else {
          throw error;
        }
      }
    }

    // Recreate collections with correct structure
    await database.createCollection("Player");
    await database
      .collection("Player")
      .createIndex({ startggId: 1 }, { unique: true });

    await database.createCollection("SemesterStatus");
    await database
      .collection("SemesterStatus")
      .createIndex({ playerId: 1, semesterId: 1 }, { unique: true });

    await database.createCollection("SemesterScore");
    await database
      .collection("SemesterScore")
      .createIndex({ playerId: 1, semesterId: 1 }, { unique: true });

    await database.createCollection("Tournament");
    await database
      .collection("Tournament")
      .createIndex({ startggId: 1 }, { unique: true });

    await database.createCollection("Participation");
    await database
      .collection("Participation")
      .createIndex({ playerId: 1, tournamentId: 1 }, { unique: true });

    await database.createCollection("Semester");
    await database
      .collection("Semester")
      .createIndex({ name: 1 }, { unique: true });

    console.log("All collections recreated with correct structure");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
    console.log("Disconnected from the database");
  }
}

resetDatabase();
