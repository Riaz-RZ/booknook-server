
import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';
import cors from 'cors';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import multer from 'multer';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Multer Configuration

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
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

// MongoDB Connection


const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log('Successfully connected to MongoDB!');
        return client;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

const mongoClient = await connectToMongoDB();

const db = mongoClient.db('booknook');

const bookCollection = db.collection('book');
const borrowedCollection = db.collection('borrows');

// One active borrowing per user per book.
await borrowedCollection.createIndex(
    { bookId: 1, userEmail: 1 },
    { unique: true }
);


// Authentication Middleware


const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).send({
                message: 'Unauthorized. Please log in.',
            });
        }

        const token = authHeader.split(' ')[1];

        const { payload } = await jwtVerify(token, JWKS);

        // Store verified JWT information.
        req.user = payload;

        next();
    } catch (error) {
        console.error('Token verification error:', error);

        return res.status(401).send({
            message: 'Invalid or expired token.',
        });
    }
};

// Helper: Get Authenticated User


const getAuthenticatedUser = (req) => {
    const email = req.user?.email;
    const name = req.user?.name;

    if (!email) {
        return null;
    }

    return {
        email: String(email).toLowerCase(),
        name: name || String(email),
    };
};

// ImgBB Image Upload


app.post(
    '/upload-image',
    verifyToken,
    upload.single('image'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).send({
                    message: 'Please select an image',
                });
            }

            const formData = new FormData();

            formData.append(
                'image',
                req.file.buffer.toString('base64')
            );

            const response = await fetch(
                `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
                {
                    method: 'POST',
                    body: formData,
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                return res.status(400).send({
                    message: 'Image upload failed',
                    error: result.error?.message,
                });
            }

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
    }
);

// Add Book

app.post('/books', verifyToken, async (req, res) => {
    try {
        const data = req.body;

        const result = await bookCollection.insertOne(data);

        res.status(201).send(result);
    } catch (error) {
        console.error(error);

        res.status(500).send({
            message: 'Failed to add book',
        });
    }
});


// Get All Books


app.get('/books', async (req, res) => {
    try {
        const result = await bookCollection.find().toArray();

        res.send(result);
    } catch (error) {
        res.status(500).send({
            message: 'Failed to fetch books',
        });
    }
});


// Get Single Book


app.get('/book/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).send({
                message: 'Invalid book ID',
            });
        }

        const result = await bookCollection.findOne({
            _id: new ObjectId(id),
        });

        if (!result) {
            return res.status(404).send({
                message: 'Book not found',
            });
        }

        res.send(result);
    } catch (error) {
        res.status(500).send({
            message: 'Failed to fetch book',
        });
    }
});


// Borrow Book
// POST /borrows


app.post('/borrows', verifyToken, async (req, res) => {
    const user = getAuthenticatedUser(req);

    if (!user) {
        return res.status(401).send({
            message: 'Your authentication token does not contain an email.',
        });
    }

    const { bookId } = req.body;

    if (!bookId || !ObjectId.isValid(bookId)) {
        return res.status(400).send({
            message: 'Valid book ID is required.',
        });
    }

    const session = mongoClient.startSession();

    try {
        let borrowedBook;

        await session.withTransaction(async () => {
            const bookObjectId = new ObjectId(bookId);

            // Check if the user already borrowed this book.
            const existingBorrow = await borrowedCollection.findOne(
                {
                    bookId: bookObjectId,
                    userEmail: user.email,
                },
                { session }
            );

            if (existingBorrow) {
                const error = new Error(
                    'You have already borrowed this book.'
                );
                error.statusCode = 409;
                throw error;
            }

            // Atomically decrease available copies.
            const updateResult = await bookCollection.updateOne(
                {
                    _id: bookObjectId,
                    copies: { $gt: 0 },
                },
                {
                    $inc: { copies: -1 },
                },
                { session }
            );

            if (updateResult.matchedCount === 0) {
                const book = await bookCollection.findOne(
                    { _id: bookObjectId },
                    { session }
                );

                const error = new Error(
                    book
                        ? 'This book is currently unavailable.'
                        : 'Book not found.'
                );

                error.statusCode = book ? 400 : 404;
                throw error;
            }

            // Get the book information.
            const book = await bookCollection.findOne(
                { _id: bookObjectId },
                { session }
            );

            // Calculate borrowing and expected return dates.
            const borrowedAt = new Date();

            const returnDate = new Date(borrowedAt);
            returnDate.setDate(returnDate.getDate() + 14);

            // Create borrowing record.
            const borrowData = {
                bookId: bookObjectId,
                bookTitle: book.title,
                bookImage: book.image,
                userName: user.name,
                userEmail: user.email,
                borrowedAt,
                returnDate,
            };

            const result = await borrowedCollection.insertOne(
                borrowData,
                { session }
            );

            borrowedBook = {
                ...borrowData,
                _id: result.insertedId,
            };
        });

        res.status(201).send({
            message: 'Book borrowed successfully!',
            borrowedBook,
        });
    } catch (error) {
        console.error('Borrow error:', error);

        if (error.code === 11000) {
            return res.status(409).send({
                message: 'You have already borrowed this book.',
            });
        }

        res.status(error.statusCode || 500).send({
            message: error.message || 'Failed to borrow book.',
        });
    } finally {
        await session.endSession();
    }
});


// Get My Borrowed Books
// GET /borrows/my-borrows


app.get('/borrows/my-borrows', verifyToken, async (req, res) => {
    try {
        const user = getAuthenticatedUser(req);

        if (!user) {
            return res.status(401).send({
                message: 'Your authentication token does not contain an email.',
            });
        }

        const result = await borrowedCollection
            .find({ userEmail: user.email })
            .sort({ borrowedAt: -1 })
            .toArray();

        res.send(result);
    } catch (error) {
        console.error('Fetch borrowing records error:', error);

        res.status(500).send({
            message: 'Failed to fetch borrowed books.',
        });
    }
});


// Return Book
// DELETE /borrows/:borrowId


app.delete('/borrows/:borrowId', verifyToken, async (req, res) => {
    const user = getAuthenticatedUser(req);

    if (!user) {
        return res.status(401).send({
            message: 'Your authentication token does not contain an email.',
        });
    }

    const { borrowId } = req.params;

    if (!ObjectId.isValid(borrowId)) {
        return res.status(400).send({
            message: 'Invalid borrowing ID.',
        });
    }

    const session = mongoClient.startSession();

    try {
        await session.withTransaction(async () => {
            // Find the borrowing record belonging to this user.
            const borrow = await borrowedCollection.findOne(
                {
                    _id: new ObjectId(borrowId),
                    userEmail: user.email,
                },
                { session }
            );

            if (!borrow) {
                const error = new Error(
                    'Borrowing record not found.'
                );
                error.statusCode = 404;
                throw error;
            }

            // Delete the borrowing record.
            const deleteResult = await borrowedCollection.deleteOne(
                {
                    _id: borrow._id,
                    userEmail: user.email,
                },
                { session }
            );

            if (deleteResult.deletedCount === 0) {
                const error = new Error(
                    'Unable to return this book.'
                );
                error.statusCode = 400;
                throw error;
            }

            // Restore one available copy.
            const updateResult = await bookCollection.updateOne(
                { _id: borrow.bookId },
                { $inc: { copies: 1 } },
                { session }
            );

            if (updateResult.matchedCount === 0) {
                const error = new Error(
                    'Book not found. Return operation cancelled.'
                );
                error.statusCode = 404;
                throw error;
            }
        });

        res.send({
            message: 'Book returned successfully!',
        });
    } catch (error) {
        console.error('Return book error:', error);

        res.status(error.statusCode || 500).send({
            message: error.message || 'Failed to return book.',
        });
    } finally {
        await session.endSession();
    }
});


// Root Route


app.get('/', (req, res) => {
    res.send({
        message: 'BookNook server is running fine!',
    });
});


    app.listen(PORT, () => {
        console.log(`App is running on port ${PORT}`);
    });

export default app;