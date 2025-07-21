const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://dictionary-app-1fb07.firebaseio.com"
});
const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 3000;

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'mysecret',
    resave: false,
    saveUninitialized: true
}));

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Routes
app.get('/', (req, res) => {
    res.redirect('/signup');
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.get('/dashboard', (req, res) => {
    if (req.session.user) {
        res.render('dashboard', { user: req.session.user });
    } else {
        res.redirect('/login');
    }
});

app.get('/addWord', (req, res) => {
    if (req.session.user) {
        res.render('addWord');
    } else {
        res.redirect('/login');
    }
});

app.get('/dictionary', async (req, res) => {
    if (req.session.user) {
        const dictionarySnapshot = await db.collection('dictionary').get();
        const dictionary = dictionarySnapshot.docs.map(doc => doc.data());
        res.render('dictionary', { dictionary });
    } else {
        res.redirect('/login');
    }
});

// Handle signup
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    if (username && password) {
        const usersRef = db.collection('users').doc(username);
        const doc = await usersRef.get();
        if (!doc.exists) {
            await usersRef.set({ username, password });
            res.redirect('/login');
        } else {
            res.status(400).send('Username already exists!');
        }
    } else {
        res.status(400).send('Username and password are required!');
    }
});

// Handle login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const usersRef = db.collection('users').doc(username);
    const doc = await usersRef.get();
    if (doc.exists && doc.data().password === password) {
        req.session.user = doc.data();
        res.redirect('/dashboard');
    } else {
        res.render('login', { error: 'Invalid credentials!' });
    }
});

// Handle fetching word meaning and storing it in Firestore
app.post('/getMeaning', async (req, res) => {
    if (req.session.user) {
        const word = req.body.word;
        if (word) {
            try {
                const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
                if (response.ok) {
                    const data = await response.json();
                    const meaning = data[0]?.meanings[0]?.definitions[0]?.definition || 'No definition found';

                    // Store word and meaning in Firestore
                    await db.collection('searchedWords').doc(word).set({
                        word: word,
                        meaning: meaning,
                        user: req.session.user.username,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    });

                    res.json({ meaning });
                } else {
                    res.status(400).json({ meaning: 'No definition found' });
                }
            } catch (error) {
                res.status(500).json({ meaning: 'Error fetching definition' });
            }
        } else {
            res.status(400).json({ meaning: 'Word is required' });
        }
    } else {
        res.status(401).send('Unauthorized');
    }
});

// Handle retrieving search history
app.get('/history', async (req, res) => {
    if (req.session.user) {
        const historySnapshot = await db.collection('searchedWords')
            .where('user', '==', req.session.user.username)
            .orderBy('timestamp', 'desc')
            .get();
        const history = historySnapshot.docs.map(doc => doc.data());
        res.render('history', { history });
    } else {
        res.status(401).send('Unauthorized');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
