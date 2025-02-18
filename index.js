const express = require('express');
var jwt = require('jsonwebtoken');
const cookieParser= require('cookie-parser')
const cors = require('cors')
require('dotenv').config()
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// midleware
app.use(cors({
  origin  : ['http://localhost:5173'],
  credentials : true
}))
app.use(express.json())
app.use(cookieParser())

const verifyToken = (req,res, next) => {
  const token = req.cookies?.token
 if(!token){
  return res.status(401).send({message : 'unauthorized access'})
 }
 jwt.verify(token, process.env.ACCESS_SECRET_TOKEN , (err, decoded) => {
  if(err){
   return res.status(401).send({message : 'unauthorized access'})
  }
  req.user = decoded
  next()
 })
  
}

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

    // jobs related api
    app.get('/jobs', async (req, res) => {
      const email = req.query.email;
      let query = {}
      if (email) {
        query = { hr_email: email }
      }
      const result = await jobsCollection.find(query).toArray();
      res.json(result)
    })

    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.findOne(query)
      res.json(result)
    })

    app.post('/jobs', async (req, res) => {
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.json(result)
    })

    app.delete('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.deleteOne(query)
      res.json(result)
    })

    // jwt related api
    app.post('/jwt', async(req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, {expiresIn : '5hr'})
      
      res
      .cookie('token', token, {
        httpOnly : true,
        secure : false
      })
      .send({Succes : true})
    })

    app.post('/logout', (req, res) => {
      res
      .clearCookie('token', {
        httpOnly : true,
        secure : false
      })
      .send({Success : true})
    })

    //  job application related apis

    app.get('/job-application', verifyToken ,async(req, res) => {
      const email = req.query.email;
      const query = { applicants_email: email }
      if(req.user.email !== req.query.email){
        return res.status(403).send({message : 'Forbidden access'})
      }
     
      const result = await jobApplicationCollection.find(query).toArray()
      
      for (const application of result) {
        const query1 = { _id: new ObjectId(application.job_id) }
        const job = await jobsCollection.findOne(query1)
        if (job) {
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
     

      // update application count
      const id = application.job_id
      const query = { _id: new ObjectId(id) }
      const job = await jobsCollection.findOne(query);
      let newCount = 0;
      if (job.applicationCount) {
        newCount = job.applicationCount + 1
      }
      else {
        newCount = 1;
      }
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          applicationCount: newCount
        }
      }
      const updateResult = await jobsCollection.updateOne(filter, updateDoc)
      res.json(result)
    })

    app.delete('/job-application/:id', async (req, res) => {
      const id = req.params.id;
      // console.log(id)
      const query = { _id: new ObjectId(id) }
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


