
const router = require('express').Router();
const Role = require('../../models/roles.models');

router.post('/', async (req, res) => {
  try {
    const { name, description, permissions, createdBy } = req.body;
    const role = new Role({ name, description, permissions, createdBy });
    await role.save();
    res.status(201).json({ message: 'Role created successfully', role });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const roles = await Role.find({ isActive: true }).populate('createdBy', 'name email');
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.put('/:id', async (req, res) => {
  try {
    const { name, description, permissions, isActive } = req.body;
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      { name, description, permissions, isActive },
      { new: true, runValidators: true }
    );
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json({ message: 'Role updated successfully', role });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// router.delete('/:id', async (req, res) => {
//   try {
//     const role = await Role.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
//     if (!role) {
//       return res.status(404).json({ error: 'Role not found' });
//     }
//     res.json({ message: 'Role deactivated successfully' });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

module.exports = router;