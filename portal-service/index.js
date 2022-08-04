const express = require("express");
const bodyParser = require("body-parser");
const amqplib = require("amqplib/callback_api");
const { MongoClient } = require("mongodb");
const os = require("os");

const app = express();
const port = 3000;
const host = "localhost";
const queue = "sales/amcom";
const amqp = `amqp://${host}:5672`;
const mongoUrl = `mongodb://${host}:27017`;
const mongoClient = new MongoClient(mongoUrl);
const dbName = "portaldb";
const hostname = os.hostname();

let channel = null;
let portalCollection = null;

app.use(bodyParser.json());

app.listen(port, () => {
  amqplib.connect(amqp, (err, conn) => {
    if (err) throw err;
    conn.createChannel((err, ch1) => {
      if (err) throw err;
      ch1.assertQueue(queue);
      channel = ch1;
      console.log(
        `portal-service connected to AMQP, queue ${queue} running at ${amqp}`
      );
      channel.consume(queue, (msg) => {
        const obj = msg.content.toString();
        console.log(`msg received ${obj}`);
        portalCollection.insertOne(JSON.parse(obj)).then((result) => {
          console.log(`inserted id is ${result.insertedId.toString()}`);
        });
      });
    });
  });

  mongoClient
    .connect()
    .then(() => {
      console.log(`portal-service connected to MongoDB running at ${mongoUrl}`);
      const db = mongoClient.db(dbName);
      portalCollection = db.collection("portal");
    })
    .catch((err) => console.err(err));

  console.log(`portal-service ready at the port ${port}`);
});
