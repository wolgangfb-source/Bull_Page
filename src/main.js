import { initHeader } from './sections/header/header.js';
import { initCover } from './sections/cover/cover.js';
import { initJourney } from './sections/journey/journey.js';
import { initCatalog } from './sections/catalog/catalog.js';
import { initDetailDialog } from './sections/detail-dialog/detail-dialog.js';

const header = initHeader();
const detailDialog = initDetailDialog();
const journey = initJourney({ onExplore: detailDialog.show });
initCatalog({ onSelect: journey.goTo });
initCover({ setHeaderTone: header.setTone });
