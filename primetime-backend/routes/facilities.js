const router = require('express').Router();
const facilitiesController = require('../controllers/facilitiesController');
const venueController = require('../controllers/venueController');

router.get('/', facilitiesController.getAll);
// Declared before /:idOrSlug so "menu"/"rooms" aren't swallowed as a slug.
router.get('/:slug/menu', venueController.getMenu);
router.get('/:slug/rooms', venueController.getRooms);
router.get('/:idOrSlug', facilitiesController.getOne);
router.get('/:idOrSlug/media', facilitiesController.getMedia);

module.exports = router;
