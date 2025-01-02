const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();

// Middleware
app.use(cors({
  origin: ["http://localhost:5173", "https://book-hub-library.surge.sh"],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials:true
}));
app.use(express.json())


app.get('/', (req, res) => {
  res.send("Server is running...")
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u6vhn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const bookCollection = client.db('bookHubDB').collection('books');
    const borrowedBookCollection = client.db('bookHubDB').collection('borrowedBooks');
    const featuredBookCollection = client.db('bookHubDB').collection('featuredBooks');

    

    // get all booke from db:
    app.get('/allBooks', async (req, res) => {
      const { showAvailable } = req.query;
      let filter = {};  // Default filter (all books)

      if (showAvailable === 'true') {
        filter = {
          bookQuantity: { $gt: 0 }
        };  
      }
      const result = await bookCollection.find(filter).toArray();
      res.send(result);
    })


    // get all featured booke from db:
    app.get('/featuredBooks', async (req, res) => {
    
      const result = await featuredBookCollection.find().toArray();
      res.send(result);
    })


    // get categorized books data from db:
    app.get('/category/:category', async (req, res) => {
      const category = req.params.category;
      const query = { bookCategory: category };
      const result = await bookCollection.find(query).toArray();
      res.send(result);
    })


    // get unique book data from db:
    app.get('/book/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookCollection.findOne(query);
      res.send(result);
    })


    // add book data to db:
    app.post('/addBook', async (req, res) => {
      const bookData = req.body;
      const result = await bookCollection.insertOne(bookData);
      res.send(result);
    })

    app.put('/update/:id', async (req, res) => {
      const id = req.params.id;
      const updateBook = req.body;
      const query = { _id: new ObjectId(id) };
      const updated = {
        $set: updateBook,
      }
      const options = { upsert: true }
      const result = await bookCollection.updateOne(query, updated, options);
      res.send(result);
    })


    // add borrowed book data to db:
    app.post('/borrowedBook/:id', async (req, res) => {
      const borrowedBookData = req.body;

      // check if a user borrowed book before:
      const query = { userEmail: borrowedBookData?.userEmail, bookId: borrowedBookData?.bookId }
      const alreadyBorrowed = await borrowedBookCollection.findOne(query)
      const borrowedBooksCount = await borrowedBookCollection.countDocuments({ userEmail: borrowedBookData?.userEmail });
      if (alreadyBorrowed) {
        return res.status(400).json({ message: "You already borrowed the book!!!" });
      }
      
      if (borrowedBooksCount >= 3) {
        return res.status(400).json({ message: "You already borrowed 3 books!!!" });
      }
      const result = await borrowedBookCollection.insertOne(borrowedBookData);


      // decrease book quentity for new borrow 
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $inc: { bookQuantity: -1 }
      }
      const updateBookQuantity = await bookCollection.updateOne(filter, update);
      res.send(result);
    })


    // get all borrowed book from db:
    app.get('/borrowedBooks/:email', async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email }
      const result = await borrowedBookCollection.find(query).toArray();
      res.send(result);
    })

    // return book remove from db:
    app.delete('/returnBook/:id/:bookId/:userMail', async (req, res) => {
      const id = req.params.id;
      const bookId = req.params.bookId;
      const userMail = req.params.userMail;

      // remove borrowed book from db:
      const query = { _id: new ObjectId(id), userEmail: userMail };
      const result = await borrowedBookCollection.deleteOne(query);

      // increase book quentity in db
      const filter = { _id: new ObjectId(bookId) };
      const update = {
        $inc: { bookQuantity: 1 }
      }
      const updateBookQuantity = await bookCollection.updateOne(filter, update);

      res.send(result);

    })

  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)



app.listen(port, () => console.log(`Server running on port ${port}`))
