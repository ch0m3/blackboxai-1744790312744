const express = require('express');
const Interaction = require('../models/Interaction');
const authMiddleware = require('./auth').authMiddleware;
const router = express.Router();

// Save user interaction
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { query, response } = req.body;
    if (!query || !response) {
      return res.status(400).json({ message: 'Query and response are required' });
    }

    const newInteraction = new Interaction({
      userId: req.user.id,
      query,
      response,
      timestamp: new Date(),
    });

    await newInteraction.save();
    res.status(201).json(newInteraction);
  } catch (error) {
    console.error('Error saving interaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user interaction history
router.get('/', authMiddleware, async (req, res) => {
  try {
    const interactions = await Interaction.find({ userId: req.user.id }).sort({ timestamp: -1 });
    res.json(interactions);
  } catch (error) {
    console.error('Error fetching interactions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
