const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 5000;
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://book-hub-library.surge.sh']
}));
app.use(express.json())


app.get('/', (req, res) =>{
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

    // get all booke from db:
    app.get('/allBooks', async(req, res) =>{
      const result = await bookCollection.find().toArray();
      res.send(result);
    })


    // get categorized books data from db:
    app.get('/category/:category', async(req, res) =>{
      const category = req.params.category;
      const query = {bookCategory: category};
      const result = await bookCollection.find(query).toArray();
      res.send(result);
    })


    // get categorized books data from db:
    app.get('/book/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await bookCollection.findOne(query);
      res.send(result);
    })


    // add book data to db:
    app.post('/addBook', async(req, res) =>{
      const bookData = req.body;
      const result = await bookCollection.insertOne(bookData);
      res.send(result);
    })

    app.put('/update/:id', async(req, res) =>{
      const id = req.params.id;
      const updateBook = req.body;
      const query = {_id : new ObjectId(id)};
      const updated = {
        $set: updateBook,
      }
      const options = {upsert : true}
      const result = await bookCollection.updateOne(query, updated, options);
      res.send(result);
    })


    // add borrowed book data to db:
    app.post('/borrowedBook/:id', async(req, res) =>{
      const borrowedBookData = req.body;

      // check if a user borrowed book before:
      const query = {userEmail: borrowedBookData?.userEmail, bookId: borrowedBookData?.bookId}
      const alreadyBorrowed = await borrowedBookCollection.findOne(query)

      if (alreadyBorrowed) {
        return res.status(400).json({ message: "You already borrowed the book!!!" });
      }
      const result = await borrowedBookCollection.insertOne(borrowedBookData);
     

      // decrease book quentity for new borrow 
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const update = {
        $inc: { bookQuantity: -1 }
      }
      const updateBookQuantity = await bookCollection.updateOne(filter, update);
      res.send(result);
    })
    

    // get all borrowed booke from db:
    app.get('/borrowedBooks/:email', async(req, res) =>{
      const email = req.params.email;
      const query = {userEmail: email}
      const result = await borrowedBookCollection.find(query).toArray();
      res.send(result);
    })

  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)



app.listen(port, () => console.log(`Server running on port ${port}`))
