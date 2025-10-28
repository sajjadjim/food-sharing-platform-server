require('dotenv').config()
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-admin-service-key.json");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//middleware
app.use(cors());
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@sajjadjim15.ac97xgz.mongodb.net/?appName=SajjadJim15`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});



admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});



const verifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = await admin.auth().verifyIdToken(token)
        console.log('decoded token', decoded)
        req.decoded = decoded;
        next();
    }
    catch (error) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    // console.log('token in the middleware',token)

}

const verifyTokenEmail=(req,res,next)=>{
    if(req.query.email !==req.decoded.email){
        return res.status(403).send({ message: 'forbidden access' })
    }
    next();
}


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const foodCollection = client.db('food_sharing_platform').collection('foods')
        const requestsCollection = client.db('food_sharing_platform').collection('requests')

        //food api


        app.get('/foods', async (req, res) => {
            try {
                const sortOrder = req.query.sort === 'desc' ? -1 : 1;
                const search = req.query.search || '';
                const filter = {
                    status: 'available',
                    ...(search && {
                        name: { $regex: search, $options: 'i' }
                    })
                };

                const foods = await foodCollection.find(filter).sort({ expireDate: sortOrder }).toArray();

                res.send(foods);
            } catch (error) {
                console.error('Error fetching foods:', error);
                res.status(500).send({ error: 'Failed to fetch foods' });
            }
        });


        app.get('/foods/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await foodCollection.findOne(query)
            res.send(result)
        })

        app.delete('/foods/:id', async (req, res) => {
            const id = req.params.id;
            try {
                const result = await foodCollection.deleteOne({ _id: new ObjectId(id) });
                res.send(result);
            } catch (err) {
                res.status(500).json({ message: 'Failed to delete food' });
            }
        });


        app.post('/foods', async (req, res) => {
            try {
                const food = req.body;
                food.status = 'available';
                const result = await foodCollection.insertOne(food);
                res.status(201).json(result);
            } catch (err) {
                res.status(500).json({ message: "Failed to add food" });
            }
        });

        app.post('/requests', async (req, res) => {
            const newRequest = req.body;

            const result = await requestsCollection.insertOne(newRequest);

            res.send(result);
        });

        app.patch('/foods/:id', async (req, res) => {
            const id = req.params.id;
            const updated = req.body;
            const result = await foodCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updated }
            );
            res.send(result);
        });


        app.get('/myFood', verifyFirebaseToken,verifyTokenEmail, async (req, res) => {
            const email = req.query.email;
            if (!email) return res.status(400).send({ message: 'Email required' });
            const result = await foodCollection.find({ donorEmail: email }).toArray();
            res.send(result);
        });

        app.get('/myRequests', verifyFirebaseToken,verifyTokenEmail, async (req, res) => {
            const email = req.query.email;
            if (!email) return res.status(400).send({ message: 'Email required' });
            const result = await requestsCollection.find({ userEmail: email }).toArray();
            console.log(result)
            res.send(result);
        });




        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Food code is cooking')
})

app.listen(port, () => {
    console.log(`Food is cooking on port ${port}`)
})