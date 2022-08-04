const express = require("express");
const bodyParser = require("body-parser");
const amqplib = require("amqplib/callback_api");
const { MongoClient } = require("mongodb");
const os = require("os");

const app = express();
const port = 3030;
const host = "localhost";
const queue = "sales/amcom";
const amqp = `amqp://${host}:5672`;
const mongoUrl = `mongodb://${host}:27017`;
const mongoClient = new MongoClient(mongoUrl);
const dbName = "salesdb";
const hostname = os.hostname();

let channel = null;
let salesCollection = null;

app.use(bodyParser.json());

app.listen(port, () => {
  amqplib.connect(amqp, (err, conn) => {
    if (err) throw err;
    conn.createChannel((err, ch1) => {
      if (err) throw err;
      ch1.assertQueue(queue);
      channel = ch1;
      console.log(
        `sales-service connected to AMQP, queue ${queue} running at ${amqp}`
      );
    });
  });

  mongoClient
    .connect()
    .then(() => {
      console.log(`sales-service connected to MongoDB running at ${mongoUrl}`);
      const db = mongoClient.db(dbName);
      salesCollection = db.collection("sales");
    })
    .catch((err) => console.err(err));

  console.log(`sales-service ready at the port ${port}`);
});

app.post("/sales-service/sales", (req, res) => {
  const { body } = req;
  salesCollection.insertOne(body).then((result) => {
    delete body._id;
    body.saleId = result.insertedId.toString();
    console.log("sending message", body);
    channel.sendToQueue(queue, Buffer.from(JSON.stringify({ ...body })));
  });
  res.status(200).send({ "os.name": hostname });
});

app.get("/sales-service/courses", (req, res) => {
  //TODO retrieve course from database and return it here
  res.status(200).send({ course: "Course id", status: 'downloading' });
});
