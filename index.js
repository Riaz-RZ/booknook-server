import express from 'express'
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'
import cors from 'cors'
import { createRemoteJWKSet, jwtVerify } from 'jose';
import multer from 'multer';

const app = express();
const PORT = 8000

app.use(cors())
app.use(express.json({ limit: '10mb' }))
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // Maximum 5 MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG and WEBP images are allowed'));
        }
    },
});


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


const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log(authHeader);

    if (!authHeader) {
        return res.status(401).send({ msg: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).send({ msg: 'Unauthorized' })
    }

    const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))
    try {
        const { payload } = await jwtVerify(token, JWKS)
        next();
    } catch (error) {
        return res.status(500).send({ msg: 'server error' })
    }
}

// Upload book image to ImgBB
app.post('/upload-image', verifyToken, upload.single('image'), async (req, res) => {
    try {
        // Check whether an image was selected
        if (!req.file) {
            return res.status(400).send({
                message: 'Please select an image',
            });
        }

        // Prepare image data for ImgBB
        const formData = new FormData();

        formData.append(
            'image',
            req.file.buffer.toString('base64')
        );

        // Upload image to ImgBB
        const response = await fetch(
            `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
            {
                method: 'POST',
                body: formData,
            }
        );

        const result = await response.json();

        // Check ImgBB response
        if (!response.ok || !result.success) {
            return res.status(400).send({
                message: 'Image upload failed',
                error: result.error?.message,
            });
        }

        // Send image URL to frontend
        res.status(200).send({
            message: 'Image uploaded successfully',
            imageUrl: result.data.display_url,
        });

    } catch (error) {
        console.error('ImgBB upload error:', error);

        res.status(500).send({
            message: 'Failed to upload image',
        });
    }
});






// http://localhost:8000/books
app.post('/books', verifyToken, async (req, res) => {
    const data = req.body
    const result = await bookCollection.insertOne(data)
    res.send(result)
})

app.get('/books', async (req, res) => {
    const result = await bookCollection.find().toArray()
    res.send(result)
})

// http://localhost:8000/book/:id
app.get('/book/:id', verifyToken, async (req, res) => {
    const { id } = req.params
    const result = await bookCollection.findOne({ _id: new ObjectId(id) })
    res.send(result)
})

// http://localhost:8000/borrows
app.post('/borrows', verifyToken, async (req, res) => {
    const data = req.body
    const result = await borrowedCollection.insertOne(data)
    res.send(result)
})

// http://localhost:8000/borrows/:email
app.get('/borrows/:email', verifyToken, async (req, res) => {
    const { email } = req.params
    const result = await borrowedCollection.find({ email: email }).toArray()
    res.send(result)
})

//http://localhost:8000/borrows/:borrowId
app.delete('/borrows/:borrowId', verifyToken, async (req, res) => {
    const { borrowId } = req.params
    const result = await borrowedCollection.deleteOne({ _id: borrowId })
    res.send(result)
})


// http://localhost:8000

app.get('/', (req, res) => {
    res.send({ message: 'server is running fine!' })
})

app.listen(PORT, () => {
    console.log(`app is running to the port ${PORT}`);
})

export default app