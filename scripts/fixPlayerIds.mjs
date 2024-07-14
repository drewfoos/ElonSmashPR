import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.DATABASE_URL;
const client = new MongoClient(uri);

async function fixPlayerIds() {
  try {
    await client.connect();
    console.log("Connected to the database");

    const database = client.db();
    const players = database.collection("Player");

    const cursor = players.find({});
    let fixedCount = 0;
    let totalCount = 0;

    for await (const player of cursor) {
      totalCount++;
      if (typeof player._id === "number" || !ObjectId.isValid(player._id)) {
        const newId = new ObjectId();

        // Update the existing document with a new _id
        await players.updateOne(
          { _id: player._id },
          {
            $set: { _id: newId },
            $currentDate: { updatedAt: true },
          }
        );

        console.log(
          `Fixed player: ${player.name}, old id: ${player._id}, new id: ${newId}`
        );
        fixedCount++;
      }
    }

    console.log(
      `Inspection complete. Total players: ${totalCount}, Fixed: ${fixedCount}`
    );
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
    console.log("Disconnected from the database");
  }
}

fixPlayerIds();
