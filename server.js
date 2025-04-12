const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const app = express();
const USERS_FILE = path.join(__dirname, 'users.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(compression());

// Utilitaires
function readFile(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function writeFile(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Créer fichier s'il n'existe pas
if (!fs.existsSync(USERS_FILE)) writeFile(USERS_FILE, []);

// Validation des entrées utilisateur
const validateUser = [
  body('username').isString().trim().notEmpty().withMessage('Nom d’utilisateur requis'),
  body('password').isString().trim().notEmpty().withMessage('Mot de passe requis')
];

// Accueil
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Mini-Blog API is running!',
    routes: [
      { method: 'POST', path: '/register', description: 'Inscription d\'un nouvel utilisateur' },
      { method: 'POST', path: '/login', description: 'Connexion d\'un utilisateur existant' }
    ]
  });
});

// Inscription
app.post('/register', validateUser, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { username, password } = req.body;
  const users = readFile(USERS_FILE);

  // Vérifier si l'utilisateur existe déjà
  if (users.find(u => u.username === username)) {
    return res.status(409).json({
      success: false,
      error: 'Utilisateur déjà inscrit.'
    });
  }

  // Hachage du mot de passe
  const hashedPassword = bcrypt.hashSync(password, 10);

  users.push({ username, password: hashedPassword });
  writeFile(USERS_FILE, users);

  res.status(201).json({
    success: true,
    message: 'Inscription réussie.'
  });
});

// Connexion
app.post('/login', validateUser, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { username, password } = req.body;
  const users = readFile(USERS_FILE);
  const user = users.find(u => u.username === username);

  // Vérification de l'existence de l'utilisateur
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Utilisateur introuvable.'
    });
  }

  // Vérification du mot de passe
  const isPasswordValid = bcrypt.compareSync(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      error: 'Mot de passe incorrect.'
    });
  }

  res.json({
    success: true,
    message: 'Connexion réussie.'
  });
});

// Lancement du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mini-Blog API is running on port ${PORT}`);
});
