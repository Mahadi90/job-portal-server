const express = require('express');
const cors = require('cors')
require('dotenv').config()
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wpfolqw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const jobsCollection = client.db('jobPortal').collection('jobs')
    const jobApplicationCollection = client.db('jobPortal').collection('jobApplicatoion')

    app.get('/jobs', async (req, res) => {
      const result = await jobsCollection.find().toArray();
      res.json(result)
    })

    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.findOne(query)
      res.json(result)
    })

    //  job application related apis

    app.get('/job-application', async (req, res) => {
      const email = req.query.email;
      const query = { applicants_email: email }
      const result = await jobApplicationCollection.find(query).toArray()

      for(const application of result){
        const query1 = {_id : new ObjectId(application.job_id)}
        const job = await jobsCollection.findOne(query1)
        if(job){
          application.title = job.title,
          application.company = job.company,
          application.company_logo = job.company_logo
          application.location = job.location
        }
      }
      
      res.json(result)
    })

    app.post('/job-application', async (req, res) => {
      const application = req.body;
      const result = await jobApplicationCollection.insertOne(application);
      res.json(result)
    })

    app.delete('/job-application/:id', async(req, res) => {
      const id = req.params.id;
      console.log(id)
      const query = {_id : new ObjectId(id)}
      const result = await jobApplicationCollection.deleteOne(query)
      res.json(result)
    })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Job is coming for you')
})
app.listen(port, () => {
  console.log(`job portal running on port ${port}`)
})


