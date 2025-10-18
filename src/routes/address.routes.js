const express = require('express');
const router = express.Router();
const addressController = require('../controllers/address.controller');
const customerAuth = require('../middleware/customerAuth');

// All address routes require customer auth
router.use(customerAuth);

router.get('/', addressController.getAddresses);
router.post('/', addressController.createAddress);
router.put('/:id', addressController.updateAddress);
router.delete('/:id', addressController.deleteAddress);

module.exports = router;
