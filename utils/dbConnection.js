const mongoose = require('mongoose');

const dbConnection = ()=>{
    mongoose.connect(process.env.DB_URL)
    .then(()=>console.log('Database connected successfully...'))
    .catch((e)=>console.log(e))
}

module.exports = dbConnection;