//importing
import express from "express";
import mongoose from "mongoose";
import Messages from "./dbMessages.js";
import Pusher from "pusher";
import cors from "cors";

//app config
const app = express();
const port = process.env.PORT || 9000;

const pusher = new Pusher({
  appId: "1071810",
  key: "76c0bcb7ac16a2794dd2",
  secret: "d88f7dc1c777829f8113",
  cluster: "eu",
  encrypted: true,
});

//middleware
app.use(express.json());

app.use(cors());

//DB config
const connection_url =
  "mongodb+srv://admin:kepler452b@cluster0.gphgu.mongodb.net/whatsappdb?retryWrites=true&w=majority";

mongoose.connect(connection_url, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//mongodb change stream, this change stream triggers the pusher:

const db = mongoose.connection;

db.once("open", () => {
  console.log("DB connected");

  const msgCollection = db.collection("messagecontents"); //this is the collection in dbMessage.js
  const changeStream = msgCollection.watch();

  changeStream.on("change", (change) => {
    console.log("change occured", change);

    if (change.operationType === "insert") {
      const messageDetails = change.fullDocument;
      pusher.trigger("messages", "inserted", {
        name: messageDetails.name,
        message: messageDetails.message,
        timestamp: messageDetails.timestamp,
        received: messageDetails.received,
      });
    } else {
      console.log("Error triggering Pusher");
    }
  });
});

//api routes
app.get("/", (req, res) => res.status(200).send("hello world"));

//to get data from the server

app.get("/messages/sync", (req, res) => {
  Messages.find((err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send(data);
    }
  });
});

//to post data on the server

app.post("/messages/new", (req, res) => {
  const dbMessage = req.body;

  Messages.create(dbMessage, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(data);
    }
  });
});

//listen
app.listen(port, () => console.log(`Listening on local host:${port}`));
