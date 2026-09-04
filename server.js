const express = require('express')
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const userFormat = require('./userdataformat')
const postFormat = require('./postsdataformat')
const notificationFormat = require('./notificationformat')
// const userFormat = require('./models/User');
require('dotenv').config();


app.use(express.json());
app.use(cors());
cloudinary.config({
    cloud_name:  process.env.Cloudinary_cloud_name,
    api_key: process.env.Cloudinary_api_key,
    api_secret: process.env.Cloudinary_api_secret
});



const path = require('path');
const { constants } = require('buffer');

app.use(express.static(path.join(__dirname, '../frontend')));


// mongoose.connect('mongodb+srv://maragoka22_db_user:mymongopASS1@cluster0black.fj4aqpp.mongodb.net/gymUsers?appName=Cluster0black')

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB successful! '))
  .catch((err) => console.log('MongoDB no connect oo Connection failed', err));


  const upload = multer({
    storage: multer.memoryStorage()
});


const JWT_SECRET = process.env.JWT_SECRET;

  const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    console.log(authHeader);
console.log(token);

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.json({ message: "Invalid Token" });
        }

        req.userId = decoded.id;
        next();
    });
};


app.get('/' ,(req,res)=>{
    res.send("working")
})



app.post('/signup', async(req,res)=>{
    
    const{fullName,matricNumber,email,phoneNumber,password} = req.body;
    
                if (!fullName || !matricNumber || !email || !phoneNumber || !password) {
            return res.status(400).json({
                message: 'Please fill all fields'
            });
        }

        const existingUser = await userFormat.findOne({
            $or: [
                { email },
                { matricNumber }
            ]
        });

        if (existingUser) {
            return res.status(409).json({
                message: 'Email or matric number already registered'
            });
        }


    const hashedPassword = await bcrypt.hash(password,10);
    const student = new userFormat({fullName,matricNumber,email,phoneNumber,password:hashedPassword});

    
    await student.save();
    // console.log(student)

    res.json({message:'Signup Successful.Kindly proceed to Login',data: {
        fullName: student.fullName,
        matricNumber: student.matricNumber,
        email: student.email,
        phoneNumber: student.phoneNumber
    }})

})



app.post('/forgotPassword',async(req,res)=>{
    const {identifier,passwordnew} =req.body
    const user = await userFormat.findOne({email:identifier})
    if(!user) return res.status(404).json({message:'user not found'})
    const newpassword = passwordnew
    const hashedPassword = await bcrypt.hash(newpassword,10);
    user.password = hashedPassword
    await user.save()

    res.status(200).json({message:`password changed succesfully`})
})

app.post('/signin', async(req,res)=>{
    
    const{matricNumber,email,password} = req.body;
      if(!matricNumber) return res.json({message:'Matric Number not found'})
    const user = await userFormat.findOne({
    email: email.toLowerCase(),
    matricNumber
});




    if(!user) return res.json({message:'User not Found!'});
  

    const isMatch = await bcrypt.compare(password,user.password);
    if(!isMatch) return res.json({message:'Wrong password!'});


    const token = jwt.sign({id:user._id},JWT_SECRET,{expiresIn:'1h'});
    res.json({message:'login Successful',token})
  
})


app.get('/home', verifyToken, async (req, res) => {
    try {
        const user = await userFormat
            .findById(req.userId)
            .select('-password');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user);

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Server error",
            error: err.message
        });
    }
});

//   app.get('/home', verifyToken, async (req, res) => {
//     try {
//         const user = await userFormat.findById(req.userId);
//         if (!user) return res.status(404).json({ message: "User not found" });
//         res.json(user);
        
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: "Server error", error: err.message });
//     }
// })


app.post('/posts',verifyToken , async(req,res)=>{
    try{
    console.log(req.body);
    const{title,description,price,location,roomType,amenities,images} = req.body;
    const posts = await new postFormat({title,description,price,location,roomType,amenities,images,postedBy : req.userId})
    await posts.save();
    res.status(201).json({message:'Post created successfully', data:posts}) 
    console.log(posts)
    }catch(err){
    res.status(500).json({message: err.message})
}

})


  app.get('/posts', verifyToken, async (req, res) => {
    try {
        // const posts = await postFormat.find();
        const posts = await postFormat.find().populate('postedBy', '_id fullName phoneNumber');
         const user = await userFormat.findById(req.userId);

                const postsWithSaved = posts.map(post => {

            const saved = user.savedPosts.some(
                id => id.toString() === post._id.toString()
            );

            return {
                ...post.toObject(),
                saved: saved
            };
        });

       
        res.status(200).json(postsWithSaved)

    } catch (err) {
        console.error(err);
        res.status(500).json({ message : err.message });
    }
})

app.post('/posts/:id/save', verifyToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const user = await userFormat.findById(req.userId)
        const post = await postFormat.findById(postId);


        if(!post){
            return res.status(404).json({mesage:'post not found'})
        }
        

        const alreadySaved = user.savedPosts.some(id => id.toString() === postId);

        if (alreadySaved) {
            user.savedPosts = user.savedPosts.filter(id => id.toString() !== postId);
        } else {
            user.savedPosts.push(postId);


            

            const notification = new notificationFormat({
                    user: post.postedBy,
                    message: "Someone saved your post"
                });
                await notification.save()
        }

        await user.save();

        //background refresh
        const saved = user.savedPosts.some(
            id => id.toString() === postId
        );


        

        res.status(200).json({
            
            message: alreadySaved ? 'Post unsaved' : 'Post saved',
            savedPosts: user.savedPosts,
            saved
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// app.get("/mylistings", verifyToken, async (req, res) => {
//     try {
//         const posts = await postFormat.find({
//             user: req.userId
//         });

//         res.json(posts);

//     } catch (error) {
//         res.status(500).json({
//             message: "Failed to fetch your posts"
//         });
//     }
// });


app.get("/mylistings", verifyToken, async (req, res) => {
    try {
        console.log("USER ID:", req.userId);

        const posts = await postFormat.find({
            postedBy: req.userId

        });

        console.log("POSTS:", posts);

        res.json(posts);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch your posts"
        });
    }
});

app.get('/notifications', verifyToken, async (req, res) => {
    try {

        const notifications = await notificationFormat.find({
            user: req.userId
        });

        res.status(200).json(notifications);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


app.patch('/notifications/:id/read', verifyToken, async (req, res) => {

    const notification = await notificationFormat.findById(req.params.id);

    if (!notification) {
        return res.status(404).json({
            message: 'Notification not found'
        });
    }

    notification.read = true;

    await notification.save();

    res.json({
        message: 'Notification marked as read'
    });

});



app.get('/saved', verifyToken, async (req, res) => {
    try {

        const user = await userFormat.findById(req.userId)
            .populate('savedPosts');

        res.json(user.savedPosts);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});



app.post('/upload', upload.array('images'), async (req, res) => {
    try {

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                message: "No images received"
            });
        }

        const imageUrls = [];

        for (const file of req.files) {

            const result = await cloudinary.uploader.upload(
                `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
            );

            imageUrls.push(result.secure_url);
        }

        console.log(imageUrls);

        res.json({
            message: "Upload successful",
            images: imageUrls
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: "Upload failed",
            error: err.message
        });
    }
});




app.get('/mylistings', verifyToken, async (req, res) => {
    try {
        const posts = await postFormat.find({
            postedBy: req.userId
        });

        res.json(posts);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>{
    console.log(`Dear blackoh ..server listening via Port ${PORT}`)
})