
import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();
const PORT = process.env.PORT || 8000;

const client = new MongoClient(process.env.MONGODB_URI);

// MongoDB Connection
export async function connectToMongoDB() {
  try {
    await client.connect();

    console.log("You successfully connected to MongoDB!");

    return client;
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
}

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

// MongoDB Database
const mongoClient = await connectToMongoDB();

const db = mongoClient.db("BookNook");

const booksCollection = db.collection("books");
const borrowsCollection = db.collection("borrows");

// JWT JWKS
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.BETTER_AUTH_URL}/api/auth/jwks`),
);

// VERIFY TOKEN
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).send({ message: "Unauthorized!" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);

    req.user = {
      id: payload.sub,
      email: payload.email,
    };

    next();
  } catch (error) {
    console.log("JWT Error:", error.message);
    res.status(401).send({ message: "Invalid or expired token!" });
  }
};

// ADD BOOK
app.post("/add-book", verifyToken, async (req, res) => {
  const data = req.body;

  const totalCopies = Number(data.totalCopies);

  if (
    !data.title ||
    !data.author ||
    !data.category ||
    !Number.isInteger(totalCopies) ||
    totalCopies < 1
  ) {
    return res.status(400).send({
      message: "Please provide valid book information!",
    });
  }

  const bookData = {
    title: data.title,
    author: data.author,
    category: data.category,
    image: data.image,
    description: data.description,

    // Use verified user information
    userName: data.userName,
    userEmail: req.user.email,

    dateAdded: new Date(),

    totalCopies,
    availableCopies: totalCopies,
  };

  const result = await booksCollection.insertOne(bookData);

  res.send(result);
});

// GET ALL BOOKS (PUBLIC)
app.get("/books", async (req, res) => {
  const limit = Number(req.query.limit);

  let query = booksCollection.find().sort({ dateAdded: -1 });

  if (Number.isInteger(limit) && limit > 0) {
    query = query.limit(limit);
  }

  const result = await query.toArray();

  res.send(result);
});

// GET SINGLE BOOK (PRIVATE)
app.get("/books/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({
      message: "Invalid book ID!",
    });
  }

  const result = await booksCollection.findOne({
    _id: new ObjectId(id),
  });

  if (!result) {
    return res.status(404).send({
      message: "Book not found!",
    });
  }

  res.send(result);
});

// UPDATE BOOK (OWNER ONLY)
app.patch("/books/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({
      message: "Invalid book ID!",
    });
  }

  // Only the book owner can update it
  const oldBook = await booksCollection.findOne({
    _id: new ObjectId(id),
    userEmail: req.user.email,
  });

  if (!oldBook) {
    return res.status(404).send({
      message: "Book not found or you are not the owner!",
    });
  }

  // Only allow editable fields
  const updateData = {};

  const allowedFields = [
    "title",
    "author",
    "category",
    "image",
    "description",
  ];

  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  });

  if (data.totalCopies !== undefined) {
    const newTotalCopies = Number(data.totalCopies);

    const borrowedCopies =
      oldBook.totalCopies - oldBook.availableCopies;

    if (
      !Number.isInteger(newTotalCopies) ||
      newTotalCopies < borrowedCopies ||
      newTotalCopies < 1
    ) {
      return res.status(400).send({
        message:
          "Total copies cannot be less than borrowed copies!",
      });
    }

    updateData.totalCopies = newTotalCopies;
    updateData.availableCopies =
      newTotalCopies - borrowedCopies;
  }

  const result = await booksCollection.updateOne(
    {
      _id: new ObjectId(id),
      userEmail: req.user.email,
    },
    {
      $set: updateData,
    },
  );

  res.send(result);
});

// DELETE BOOK (OWNER ONLY)
app.delete("/books/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({
      message: "Invalid book ID!",
    });
  }

  const result = await booksCollection.deleteOne({
    _id: new ObjectId(id),
    userEmail: req.user.email,
  });

  if (result.deletedCount === 0) {
    return res.status(404).send({
      message: "Book not found or you are not the owner!",
    });
  }

  res.send(result);
});

// GET MY BOOKS
app.get("/my-books/:email", verifyToken, async (req, res) => {
  // Ignore email from URL and use verified email
  const result = await booksCollection
    .find({ userEmail: req.user.email })
    .sort({ dateAdded: -1 })
    .toArray();

  res.send(result);
});

// ADD BORROW
app.post("/borrows", verifyToken, async (req, res) => {
  const data = req.body;
  const bookId = data.bookId;

  if (!ObjectId.isValid(bookId)) {
    return res.status(400).send({
      message: "Invalid book ID!",
    });
  }

  if (!data.borrowDate || !data.returnDate) {
    return res.status(400).send({
      message: "Borrow date and return date are required!",
    });
  }

  const borrowDate = new Date(data.borrowDate);
  const returnDate = new Date(data.returnDate);

  if (
    Number.isNaN(borrowDate.getTime()) ||
    Number.isNaN(returnDate.getTime()) ||
    returnDate <= borrowDate
  ) {
    return res.status(400).send({
      message: "Please provide valid borrow and return dates!",
    });
  }

  const book = await booksCollection.findOne({
    _id: new ObjectId(bookId),
  });

  if (!book) {
    return res.status(404).send({
      message: "Book not found!",
    });
  }

  if (book.availableCopies < 1) {
    return res.status(400).send({
      message: "Book is not available!",
    });
  }

  // Check duplicate borrow for verified user
  const existingBorrow = await borrowsCollection.findOne({
    bookId,
    userEmail: req.user.email,
  });

  if (existingBorrow) {
    return res.status(400).send({
      message: "You have already borrowed this book!",
    });
  }

  const borrowData = {
    bookId,
    bookTitle: book.title,
    bookImage: book.image,
    userEmail: req.user.email,
    borrowDate,
    returnDate,
  };

  // Decrease available copies
  const updateResult = await booksCollection.updateOne(
    {
      _id: new ObjectId(bookId),
      availableCopies: { $gt: 0 },
    },
    {
      $inc: { availableCopies: -1 },
    },
  );

  if (updateResult.modifiedCount === 0) {
    return res.status(400).send({
      message: "Book is no longer available!",
    });
  }

  try {
    const result = await borrowsCollection.insertOne(borrowData);

    res.send(result);
  } catch (error) {
    // Restore copy if borrow insertion fails
    await booksCollection.updateOne(
      { _id: new ObjectId(bookId) },
      { $inc: { availableCopies: 1 } },
    );

    throw error;
  }
});

// GET MY BORROWS
app.get("/borrows/:email", verifyToken, async (req, res) => {
  // Use verified email, not URL email
  const result = await borrowsCollection
    .find({ userEmail: req.user.email })
    .sort({ borrowDate: -1 })
    .toArray();

  res.send(result);
});

// RETURN BOOK
app.delete("/borrows/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({
      message: "Invalid borrow ID!",
    });
  }

  // Find borrow belonging to logged-in user
  const borrow = await borrowsCollection.findOne({
    
    _id: new ObjectId(id),
    userEmail: req.user.email,
  });

  if (!borrow) {
    return res.status(404).send({
      message: "Borrow record not found!",
    });
  }

  const result = await borrowsCollection.deleteOne({
    _id: new ObjectId(id),
    userEmail: req.user.email,
  });

  if (result.deletedCount === 1) {
    await booksCollection.updateOne(
      { _id: new ObjectId(borrow.bookId) },
      { $inc: { availableCopies: 1 } },
    );
  }

  res.send(result);
});



app.get("/", (req, res) => {
  res.send({
    message: "BookNook server is running fine!",
  });
});

app.listen(PORT, () => {
  console.log(`BookNook server is running at ${PORT}`);
});

export default app;
