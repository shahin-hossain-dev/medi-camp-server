const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

// middleware
// app.use(
//   cors({
//     origin: [
//       "http://localhost:5173",
//       "medi-camp-86354.web.app",
//       "medi-camp-86354.firebaseapp.com",
//     ],
//   })
// );
app.use(express.json());
app.use(cors());
app.get("/", (req, res) => {
  res.send("Medi Camp server is running");
});

// const user = process.env.DB_USER;
// const password = process.env.DB_PASS;

// console.log(user, password);
// mongodb database

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kdwhpbt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // await client.connect();

    // database collections
    const campCollection = client.db("mediCampDB").collection("camps");
    const registeredCamps = client.db("mediCampDB").collection("participants");
    const userCollection = client.db("mediCampDB").collection("users");
    const paymentCollection = client.db("mediCampDB").collection("payments");
    const feedbackCollection = client.db("mediCampDB").collection("feedback");

    // jwt integrated

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middleware

    const verifyToken = (req, res, next) => {
      const config = req.headers.authorization;
      if (!config) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = config.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (error, decoded) => {
        if (error) {
          res.status(401).send({ message: "unauthorized access" });
        }
        req.user = decoded;
      });

      next();
    };
    const adminVerify = () => {};
    const organizerVerify = async (req, res, next) => {
      const email = req.user.email;

      const query = { email };
      const user = await userCollection.findOne(query);
      const organizer = user?.role === "organizer";
      if (!organizer) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // user role
    app.get("/user/role/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.user.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      // console.log(user);
      res.send(user);
    });

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

    // camp related api
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

    // manage camp count
    app.get(
      "/organizer-camp-count",
      verifyToken,
      organizerVerify,
      async (req, res) => {
        const email = req.query.email;
        const query = { createdBy: email };
        const count = await campCollection.countDocuments(query);
        res.send({ count });
      }
    );

    // manage camp data based on organizer

    app.get(
      "/organizer-camp",
      verifyToken,
      organizerVerify,
      async (req, res) => {
        const email = req.query.email;
        const query = { createdBy: email };
        const size = parseInt(req.query.size);
        const page = parseInt(req.query.page);

        const result = await campCollection
          .find(query)
          .skip(size * page)
          .limit(size)
          .toArray();
        res.send(result);
      }
    );

    /**
     * ----------------------------
     * participant related API
     * ----------------------------
     */
    app.get(
      "/registered-camp-count",
      verifyToken,
      organizerVerify,
      async (req, res) => {
        const count = await registeredCamps.estimatedDocumentCount();
        res.send({ count });
      }
    );
    // get all participants data
    app.get(
      "/registered-camps",
      verifyToken,
      organizerVerify,
      async (req, res) => {
        const page = parseInt(req.query.page);
        const size = parseInt(req.query.size);
        const result = await registeredCamps
          .find()
          .skip(size * page)
          .limit(size)
          .toArray();
        res.send(result);
      }
    );

    // participants registered camps
    app.get("/participant-camps", verifyToken, async (req, res) => {
      const email = req.query.email;
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const query = { participantEmail: email };
      const result = await registeredCamps
        .find(query)
        .skip(size * page)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/registered-camp/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await registeredCamps.findOne(query);
      res.send(result);
    });

    app.get("/paymentCount", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };

      const count = await paymentCollection.countDocuments(query);
      res.send({ count });
    });

    app.get("/payments", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { email };
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const result = await paymentCollection
        .find(query)
        .skip(size * page)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/feedback", async (req, res) => {
      const result = await feedbackCollection.find().toArray();
      res.send(result);
    });

    app.get("/campCount", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { participantEmail: email };

      const count = await registeredCamps.countDocuments(query);
      res.send({ count });
    });

    // --------------------------
    // user related API
    // ----------------------------
    app.post("/users", async (req, res) => {
      const user = req.body;
      const exist = await userCollection.findOne({ email: user?.email });
      if (exist?.email === user.email) {
        return res.send({ message: "user already exist" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
      // console.log(user);
    });
    // insert new camp to database

    app.post(
      "/camp-register",
      verifyToken,
      organizerVerify,
      async (req, res) => {
        const newCamp = req.body;
        const result = await campCollection.insertOne(newCamp);
        res.send(result);
      }
    );

    //registered-participant post to database

    app.post("/registered-participant", verifyToken, async (req, res) => {
      const registerData = req.body;
      // insert a new participant
      const result = await registeredCamps.insertOne(registerData);

      // increase participant count field
      const filter = { _id: new ObjectId(registerData.campId) };
      const updatedDoc = {
        $inc: { participantCount: 1 },
      };
      const increaseCount = await campCollection.updateOne(filter, updatedDoc);
      res.send(result);
      // console.log(increaseCount);
    });

    // payment integrated System
    app.post("/create-payment-intent", verifyToken, async (req, res) => {
      const { pay } = req.body;
      const amount = pay * 100; //stripe

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });
    // update registered camps payment transaction
    app.post("/payments/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const { transactionId, transactionDate, paymentStatus } = req.body;
      // update registered camp
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          transactionId,
          transactionDate,
          paymentStatus,
        },
      };
      const result = await registeredCamps.updateOne(
        filter,
        updatedDoc,
        option
      );
      // insert payments database
      const paymentResult = await paymentCollection.insertOne(payment);
      // res.send(result);
      res.send(paymentResult);
    });

    // participants feedback API
    app.post("/feedback", verifyToken, async (req, res) => {
      const feedback = req.body;
      const result = await feedbackCollection.insertOne(feedback);
      res.send(result);
    });

    // ------------------------------
    // Update Related API
    //  ------------------------------

    // update camp data
    app.patch("/update-camp/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const {
        campName,
        description,
        image,
        fees,
        healthcareProfessional,
        location,
        dateAndTime,
      } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          campName,
          description,
          image,
          fees,
          healthcareProfessional,
          location,
          dateAndTime,
        },
      };
      const result = await campCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // Delete Related API
    //delete camp by organizer
    app.delete("/camp-delete/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await campCollection.deleteOne(query);
      res.send(result);
    });

    // Cancel Registered Participants
    app.delete("/camp-cancel/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await registeredCamps.deleteOne(query);
      res.send(result);
    });

    app.put("/confirm-camp/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          confirmationStatus: "confirmed",
        },
      };
      const result = await registeredCamps.updateOne(
        filter,
        updatedDoc,
        option
      );
      // payment database confirm status update
      const paymentResult = await paymentCollection.updateOne(
        { registeredId: id },
        updatedDoc,
        option
      );
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
  console.log(`Medi-camp server running port on ${port}`);
});
