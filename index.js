import express from 'express'
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'
import cors from 'cors'

const app = express();
const PORT = 8000

app.use(cors())
app.use(express.json())


const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}
const mongoClient = await connectToMongoDB();

const db = mongoClient.db('booknook')
const bookCollection = db.collection('book')
const borrowedCollection = db.collection('borrowed')



// http://localhost:8000/books
app.post('/books', async (req, res) => {
    const data = req.body
    const result = await bookCollection.insertOne(data)
    console.log(result);
    res.send(result)
})

app.get('/books', async (req, res) => {
    const result = await bookCollection.find().toArray()
    res.send(result)
})

// http://localhost:8000/book/:id
app.get('/book/:id', async (req, res) => {
    const { id } = req.params
    const result = await bookCollection.findOne({ _id: new ObjectId(id) })
    res.send(result)
})

// http://localhost:8000/borrows
app.post('/borrows', async (req, res) => {
    const data = req.body
    const result = await borrowedCollection.insertOne(data)
    res.send(result)
})


// http://localhost:8000

app.get('/', (req, res) => {
    res.send({ message: 'server is running fine!' })
})

app.listen(PORT, () => {
    console.log(`app is running to the port ${PORT}`);
})