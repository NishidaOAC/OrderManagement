const express = require('express');
const { DeliveryChannel } = require('../../../models');

const router = express.Router();

// GET /channels - fetch all delivery channels
router.get('/', async (_req, res) => {
  try {
    const channels = await DeliveryChannel.findAll({
      where: {},
      order: [['name', 'ASC']],
      attributes: ['id', 'name', 'description', 'is_active', 'createdAt', 'updatedAt']
    });
    return res.json({ channels });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch delivery channels', error: error.message });
  }
});

// POST /channels - create a new delivery channel
router.post('/', async (req, res) => {
  try {
    const { name, description, is_active } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Channel name is required' });
    }
    const channel = await DeliveryChannel.create({
      name: name.trim(),
      description: description ? description.trim() : null,
      is_active: is_active !== undefined ? !!is_active : true
    });
    return res.status(201).json({ channel });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create delivery channel', error: error.message });
  }
});

module.exports = router;
