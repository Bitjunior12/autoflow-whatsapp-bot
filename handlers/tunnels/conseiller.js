const { MENU_CONSEILLER } = require('../../menus');

async function handleConseiller(from, msg, text, session) {
  return MENU_CONSEILLER;
}

module.exports = { handleConseiller };
