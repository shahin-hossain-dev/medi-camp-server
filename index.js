const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bistro boss server is running");
});

const user = process.env.DB_USER;
const password = process.env.DB_PASS;

// mongodb database

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${user}:${password}@cluster0.kdwhpbt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // database collections
    const campCollection = client.db("mediCampDB").collection("camps");
    const participantsCollection = client
      .db("mediCampDB")
      .collection("participants");

    // get all camps data
    app.get("/camps", async (req, res) => {
      const result = await campCollection.find().toArray();
      res.send(result);
    });

    // sort camp data
    app.get("/campsAll", async (req, res) => {
      const query = req.query;
      // console.log(query);
      if (query.sort === "Most Registered") {
        const sortOption = { participantCount: -1 };
        const result = await campCollection.find().sort(sortOption).toArray();
        res.send(result);
      }
      if (query.sort === "A-Z Order") {
        const sortOption = { campName: 1 };
        const result = await campCollection.find().sort(sortOption).toArray();
        res.send(result);
      }
      if (query.sort === "Camp Fees") {
        const sortOption = { fees: -1 };
        const result = await campCollection.find().sort(sortOption).toArray();
        res.send(result);
      }
    });

    //--- Problem solved, now it it working --- problem was {strict:true} in client object
    // app.get("/camps/:searchText", async (req, res) => {
    //   const text = req.params.searchText;
    //   await campCollection.createIndex({
    //     name: "text",
    //     description: "text",
    //   });
    //   const query = { $text: { $search: text } };
    //   const result = await campCollection.find(query).toArray();

    //   res.send(result);
    // });

    // get popular camp data
    app.get("/popular-camps", async (req, res) => {
      const query = req.query;
      const result = await campCollection
        .find()
        .sort({ participantCount: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    // get popular camp data id wise

    app.get("/camps/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await campCollection.findOne(query);
      res.send(result);
    });

    // // sort camp items
    // app.get('/camps-sort', async() => {
    //   const
    // })

    //registered-participant post to database

    app.post("/registered-participant", async (req, res) => {
      const registerData = req.body;
      // insert a new participant
      const result = await participantsCollection.insertOne(registerData);

      // increase participant count field
      const filter = { _id: new ObjectId(registerData.campId) };
      const updatedDoc = {
        $inc: { participantCount: 1 },
      };
      const increaseCount = await campCollection.updateOne(filter, updatedDoc);
      res.send(result);
      // console.log(increaseCount);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Bistro boss server running port on ${port}`);
});
