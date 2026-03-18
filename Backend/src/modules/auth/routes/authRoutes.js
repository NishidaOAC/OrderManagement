const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../../../middleware/authMiddleware');
const User = require('../../../models/User');

const router = express.Router();

const getAuthConfig = () => ({
  secret: process.env.JWT_SECRET || 'dev-secret',
  expiresIn: process.env.JWT_EXPIRES_IN || '1d',
});

router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body || {};

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'fullName, email and password are required' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    const password_hash = await bcrypt.hash(String(password), 10);
    const newUser = await User.create({
      full_name: String(fullName).trim(),
      email: normalizedEmail,
      password_hash,
      role: role || 'admin',
    });

    return res.status(201).json({
      user: {
        id: newUser.id,
        fullName: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create user', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ where: { email: normalizedEmail, is_active: true } });
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const isValidPassword = await bcrypt.compare(String(password), user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const authConfig = getAuthConfig();
  const token = jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      role: user.role,
    },
    authConfig.secret,
    { expiresIn: authConfig.expiresIn }
  );

  return res.json({
    token,
    userId: String(user.id),
    fullName: user.full_name,
  });
});

router.get('/me', authMiddleware, (req, res) => {
  return res.json({
    user: {
      email: req.user.email,
      role: req.user.role,
      sub: req.user.sub,
    },
  });
});

module.exports = router;
