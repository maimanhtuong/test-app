const fs = require('fs')
const bodyParser = require('body-parser')
const jsonServer = require('json-server')
const jwt = require('jsonwebtoken')

const server = jsonServer.create()
const router = jsonServer.router('./database.json')
const db = JSON.parse(fs.readFileSync('./database.json', 'UTF-8'))

server.use(bodyParser.urlencoded({extended: true}))
server.use(bodyParser.json())
server.use(jsonServer.defaults());

const SECRET_KEY = '123456789'
const expiresIn = '1h'

// Create a token from a payload 
function createToken(payload){
  return jwt.sign(payload, SECRET_KEY, {expiresIn})
}

// Verify the token 
function verifyToken(token){
  return  jwt.verify(token, SECRET_KEY, (err, decode) => decode !== undefined ?  decode : err)
}

// Check if the user exists in database
function isAuthenticated({email, password}){
  return db.users.findIndex(user => user.email === email && user.password === password) !== -1
}
/////////////////////////////////////
server.get('/users',(req, res) => {
  res.json(db.users)
})

////////////////////////////
server.get('/auth/finduser/:email', (req, res) => {
  const {email} = req.params
  const user = db.users.find(user => user.email === email)
  if(user){
    res.status(200).send(user)
  }else{
    res.status(404).send({message: 'User not found'})
  }
})
////////////////////////////
server.get('/books', (req, res) => {
  const {author} = req.query
  const data = db.books.filter(book => !author || book.author === author)
  res.status(200).json(data)
})
////////////////////////////
server.get('/books/:bookId', (req, res) => {
  const {bookId} = req.params
  const book = db.books.find(book => book.id === parseInt(bookId))
  if(book){
    res.status(200).json(book)
  }else{
    res.status(404).send({message: 'Book not found'})
  }
})



////////////////////////////
server.get('/auth/orders',(req, res) => {
  const data = db.orders
  res.status(200).json(data)
})



/////////////////////////////
// Register New User
server.post('/register', (req, res) => {
  console.log("register endpoint called; request body:");
  console.log(req.body);
  const {email, password} = req.body;

  if(isAuthenticated({email, password}) === true) {
    const status = 401;
    const message = 'Email and Password already exist';
    res.status(status).json({status, message});
    return 
  }
//Đọc và ghi vào file database.json nếu email và password hơp lệ
fs.readFile("./database.json", (err, data) => {  
    if (err) {
      const status = 401
      const message = err
      res.status(status).json({status, message})
      return
    };

    // Get current users data
    var data = JSON.parse(data.toString());

    // Get the id of last user
    var last_item_id = (data.users[data.users.length-1].id);


    //Add new user
    data.users.push({id: last_item_id + 1, email: email, password: password}); //add some data
    var writeData = fs.writeFile("./database.json", JSON.stringify(data), (err, result) => {  // write in disk
        if (err) {
          const status = 401
          const message = err
          res.status(status).json({status, message})
          return
        }
    });
});

// Create token for new user
  const access_token = createToken({email, password})
  console.log("Access Token:" + access_token);
  res.status(200).json({access_token,email,password})
})

////////////////////////////
// Login to one of the users from ./users.json
server.post('/auth/login', (req, res) => {
  console.log("login endpoint called; request body:");
  console.log(req.body);
  const {email, password} = req.body;
  if (isAuthenticated({email, password}) === false) {
    const status = 401
    const message = 'Incorrect email or password'
    res.status(status).json({status, message})
    return
  }
  const access_token = createToken({email, password})
  console.log("Access Token:" + access_token);
  res.status(200).json({access_token})
})





/////////////////////////////////////////////
server.get('/books/:id', (req, res) => {
  const book_id = req.params.id
  const book_found = db.books.findIndex(book => book.id == book_id)
  if(book_found !== -1) {
    return res.status(200).json({
      status: 200,
      message: "Success",
      data: {
        "book": db.books[book_found]
      }
    })
  } else {
    return res.status(404).json({
      status: 404,
      message: "Book not found!!",
    })
  }
})

////////////////////////////////////////////////////////
server.get('/auth/orders/:id', (req, res) => {
  const order_id = req.params.id
  const exist_order = db.orders.findIndex(order => order.id == order_id)
  if(exist_order !== -1) {
    let data = db.orders[exist_order]
    return res.status(200).json({
      status: 200,
      message: "Success",
      data
    })
  } else {
    return res.status(401).json({
      status: 401,
      message: "Order not found!!",
    })
  }
})

server.post('/auth/orders', (req, res) => {
  const {bookId, customerName} = req.body
  const exist_book_id = db.books.findIndex(book => book.id === bookId)

  if(exist_book_id === -1) {
    res.status(401).json({
      status: 401,
      message: "Book not found!!",
    })
  }

  const order_book = db.books[exist_book_id]
  if(order_book.available) {
    const new_order = {
      'id': db.orders.length+1,
      bookId,
      customerName,
      "quantity": 1,
      "timestamp": new Date().getTime()
    }
  
    db.orders.push(new_order);
    fs.writeFileSync('./database.json', JSON.stringify(db), () => {
      if (err) return console.log(err);
      console.log('writing to ' + fileName);
    })
    res.status(200).json({
      status: 200,
      message: "Success",
      data: new_order
    })
  } else {
    res.status(401).json({
      status: 401,
      message: "Book is out of stock!!",
    })
  }
})

server.delete('/auth/orders/:id', (req, res) => {
  const order_id = req.params.id

  const exist_order = db.orders.findIndex(order => order.id == order_id)
  if(exist_order !== -1) {
    db.orders.splice(exist_order, 1);

    fs.writeFileSync('./database.json', JSON.stringify(db), () => {
      if (err) return console.log(err);
      console.log('writing to ' + fileName);
    })

    res.status(200).json({
      status: 200,
      message: "Success",
    })
  } else {
    res.status(401).json({
      status: 401,
      message: "Order not found!!",
    })
  }

})

server.patch('/auth/orders/:id', (req, res) => {
  const order_id = req.params.id
  const customerName = req.body.customerName

  const exist_order = db.orders.findIndex(order => order.id == order_id)
  if(exist_order !== -1) {
    db.orders[exist_order].customerName = customerName

    fs.writeFileSync('./database.json', JSON.stringify(db), () => {
      if (err) return console.log(err);
      console.log('writing to ' + fileName);
    })

    res.status(200).json({
      status: 200,
      message: "Success",
      data: {
        'order': db.orders[exist_order]
      }
    })
  } else {
    res.status(401).json({
      status: 401,
      message: "Order not found!!",
    })
  }

})

server.use(/^(?!\/auth).*$/,  (req, res, next) => {
  if (req.headers.authorization === undefined || req.headers.authorization.split(' ')[0] !== 'Bearer') {
    const status = 401
    const message = 'Error in authorization format'
    res.status(status).json({status, message})
    return
  }
  try {
    let verifyTokenResult;
     verifyTokenResult = verifyToken(req.headers.authorization.split(' ')[1]);

     if (verifyTokenResult instanceof Error) {
       const status = 401
       const message = 'Access token not provided'
       res.status(status).json({status, message})
       return
     }
     next()
  } catch (err) {
    const status = 401
    const message = 'Error access_token is revoked'
    res.status(status).json({status, message})
  }
})

server.use(router)

server.listen(3000, () => {
  console.log('Run Auth API Server at http://localhost:3000')
})