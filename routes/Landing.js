'use strict';
const router = require('express').Router();
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const auth = require('../middleware/checkAuthCookie');
const User = require('../models/User');
const settings = require('../models/LandingSettings');
const { defaults, validate } = require('../utils/landingContent');
router.use(auth, asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.user._id);
  if (!user || Number(user.role_id) !== 1) return res.status(403).send('Administrator access required.');
  res.set('Cache-Control', 'no-store');
  next();
}));
function token(req) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(`landing:${req.cookies.jwtToken}`).digest('hex');
}
function render(req, res, content, error, saved) {
  return res.render(require('path').join(__dirname, '../views/portal/landing-settings.ejs'), {
    name: req.user.name, email: req.user.email, roleName: req.user.roleName,
    content, defaults, csrf: token(req), error, saved
  });
}
router.get('/', asyncHandler(async (req, res) => render(req, res, await settings.get(), '', req.query.saved === '1')));
router.post('/', asyncHandler(async (req, res) => {
  const expected = Buffer.from(token(req));
  const actual = Buffer.from(typeof req.body.csrf === 'string' ? req.body.csrf : '');
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return res.status(403).send('Please reload the editor and try again.');
  let content;
  try { content = validate(req.body); }
  catch (error) { res.status(400); return render(req, res, { ...defaults, ...req.body }, error.message, false); }
  await settings.save(content);
  res.redirect('/portal/landing-settings?saved=1');
}));
module.exports = router;
