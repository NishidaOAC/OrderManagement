const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../../../models/User');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'full_name', 'email', 'role', 'is_active', 'createdAt', 'updatedAt'],
      order: [['id', 'DESC']],
    });
    return res.json({ users });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'full_name', 'email', 'role', 'is_active', 'createdAt', 'updatedAt'],
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
});

router.post('/', async (req, res) => {
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
    const user = await User.create({
      full_name: String(fullName).trim(),
      email: normalizedEmail,
      password_hash,
      role: role || 'admin',
      is_active: true,
    });

    return res.status(201).json({
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create user', error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { fullName, email, password, role, isActive } = req.body || {};

    if (email) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const duplicate = await User.findOne({ where: { email: normalizedEmail } });
      if (duplicate && duplicate.id !== user.id) {
        return res.status(409).json({ message: 'User with this email already exists' });
      }
      user.email = normalizedEmail;
    }

    if (fullName) {
      user.full_name = String(fullName).trim();
    }

    if (role) {
      user.role = String(role).trim();
    }

    if (typeof isActive === 'boolean') {
      user.is_active = isActive;
    }

    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      user.password_hash = await bcrypt.hash(String(password), 10);
    }

    await user.save();

    return res.json({
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.is_active = false;
    await user.save();

    return res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
});

module.exports = router;
